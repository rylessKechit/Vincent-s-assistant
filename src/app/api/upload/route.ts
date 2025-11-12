import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ObjectId } from 'mongodb';
import { DatabaseFactory } from '@/lib/mongodb';
import { pythonClient } from '@/lib/python-client';
import { createEmbeddings, extractDocumentMetadata } from '@/lib/openai';
import { FILE_CONFIG, CHUNK_CONFIG } from '@/lib/config';
import type { Document, DocumentChunk } from '@/types/database';

// Configuration pour Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Vérifier le Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type multipart/form-data requis' },
        { status: 400 }
      );
    }

    // Parser les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validation du fichier
    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Traitement du fichier
    const startTime = Date.now();
    const processingResult = await processFileWithPython(file);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      document: {
        id: processingResult.documentId.toString(),
        filename: processingResult.filename,
        originalName: file.name,
        type: processingResult.type,
        size: file.size,
        status: 'completed',
        chunksCount: processingResult.chunksCount,
        summary: processingResult.summary,
        keyFacts: processingResult.keyFacts,
        processingTimeMs: processingTime,
        tokensUsed: processingResult.tokensUsed,
        pythonAnalysis: processingResult.pythonAnalysis, // ✅ Nouvelles données Python
      }
    });

  } catch (error: any) {
    console.error('Erreur upload:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Erreur interne du serveur',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Valide un fichier uploadé
 */
function validateFile(file: File): string | null {
  // Vérifier la taille
  if (file.size > FILE_CONFIG.maxSize) {
    return `Fichier trop volumineux. Maximum: ${FILE_CONFIG.maxSize / (1024 * 1024)}MB`;
  }

  // Vérifier le type MIME
  if (!Object.keys(FILE_CONFIG.supportedTypes).includes(file.type)) {
    const supportedTypes = Object.values(FILE_CONFIG.supportedTypes).join(', ');
    return `Type de fichier non supporté. Types acceptés: ${supportedTypes}`;
  }

  // Vérifier le nom de fichier
  if (!file.name || file.name.length > 255) {
    return 'Nom de fichier invalide';
  }

  return null;
}

/**
 * Traite un fichier avec l'API Python + Next.js hybride
 */
async function processFileWithPython(file: File): Promise<{
  documentId: ObjectId;
  filename: string;
  type: string;
  chunksCount: number;
  summary: string;
  keyFacts: string[];
  tokensUsed: number;
  pythonAnalysis: any;
}> {
  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || '';
  const filename = `${timestamp}_${randomSuffix}.${fileExtension}`;

  // Sauvegarder temporairement le fichier
  await saveFileTemporarily(filename, await file.arrayBuffer());

  try {
    // Obtenir les repositories
    const { documents } = await DatabaseFactory.getRepositories();

    // Créer l'entrée document initiale
    const documentId = await documents.create({
      filename,
      originalName: file.name,
      type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
      size: file.size,
      uploadedAt: new Date(),
      status: 'processing',
      summary: '',
      keyFacts: [],
      chunks: [],
      processing: {
        chunksCount: 0,
        embeddingModel: 'text-embedding-ada-002',
        tokensUsed: 0,
        processingTimeMs: 0,
      },
    });

    let totalTokensUsed = 0;

    try {
      // 🐍 ÉTAPE 1 : Analyse Python Complète
      console.log('🐍 Démarrage analyse Python...');
      const pythonResult = await pythonClient.processFileComplete(file);
      
      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Erreur analyse Python');
      }

      console.log('✅ Analyse Python terminée');

      // 🤖 ÉTAPE 2 : Extraire métadonnées avec OpenAI
      const textForMetadata = generateTextFromPythonAnalysis(pythonResult);
      const metadata = await extractDocumentMetadata(textForMetadata, 'csv');
      totalTokensUsed += metadata.tokensUsed;

      // 🔗 ÉTAPE 3 : Créer les chunks pour recherche vectorielle
      const chunks = createChunksFromPythonData(pythonResult);
      
      // 🧠 ÉTAPE 4 : Générer les embeddings pour les chunks
      const embeddingResult = await createEmbeddings(
        chunks.map(chunk => chunk.text)
      );
      totalTokensUsed += embeddingResult.tokensUsed;

      // 📦 ÉTAPE 5 : Construire les chunks finaux
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        text: chunk.text,
        embedding: embeddingResult.embeddings[index],
        chunkIndex: index,
        metadata: chunk.metadata,
      }));

      // 💾 ÉTAPE 6 : Sauvegarder tout dans MongoDB
      await documents.updateChunks(documentId, documentChunks);

      // Sauvegarder les agrégations Python (format adapté)
      if (pythonResult.analysis) {
        const aggregations = convertPythonToMongoAggregations(pythonResult);
        await documents.updateAggregations(documentId, aggregations);
      }

      // Marquer comme terminé
      await documents.updateStatus(documentId, 'completed');

      // Mettre à jour les métadonnées
      const { documents: documentsRepo } = await DatabaseFactory.getRepositories();
      const collection = (documentsRepo as any).collection;
      
      await collection.updateOne(
        { _id: documentId },
        {
          $set: {
            summary: metadata.summary,
            keyFacts: metadata.keyFacts,
            'processing.tokensUsed': totalTokensUsed,
            'processing.chunksCount': documentChunks.length,
            pythonAnalysis: pythonResult, // ✅ Sauvegarder l'analyse Python complète
          }
        }
      );

      return {
        documentId,
        filename,
        type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
        chunksCount: documentChunks.length,
        summary: metadata.summary,
        keyFacts: metadata.keyFacts,
        tokensUsed: totalTokensUsed,
        pythonAnalysis: pythonResult,
      };

    } catch (processingError: any) {
      // Marquer le document comme en erreur
      await documents.setError(
        documentId, 
        processingError.message,
        processingError.stack
      );
      
      throw processingError;
    }

  } finally {
    // Nettoyer le fichier temporaire si nécessaire
  }
}

/**
 * Génère un texte descriptif à partir de l'analyse Python pour OpenAI
 */
function generateTextFromPythonAnalysis(pythonResult: any): string {
  const parts: string[] = [];

  if (pythonResult.extraction?.metadata) {
    const meta = pythonResult.extraction.metadata;
    parts.push(`Dataset CSV: ${meta.shape?.rows} lignes × ${meta.shape?.columns} colonnes`);
    parts.push(`Colonnes: ${meta.columns?.join(', ')}`);
  }

  if (pythonResult.insights?.business_highlights) {
    parts.push('Highlights métier:');
    pythonResult.insights.business_highlights.forEach((highlight: string) => {
      parts.push(`- ${highlight}`);
    });
  }

  if (pythonResult.recommendations) {
    parts.push('Recommandations:');
    pythonResult.recommendations.slice(0, 3).forEach((rec: string) => {
      parts.push(`- ${rec}`);
    });
  }

  return parts.join('\n');
}

/**
 * Crée des chunks optimisés pour la recherche vectorielle
 */
function createChunksFromPythonData(pythonResult: any): Array<{
  text: string;
  metadata: any;
}> {
  const chunks: Array<{ text: string; metadata: any }> = [];

  // Chunk 1: Métadonnées et résumé
  if (pythonResult.extraction?.metadata) {
    const meta = pythonResult.extraction.metadata;
    const summaryText = [
      `Fichier: ${meta.filename}`,
      `Dataset: ${meta.shape?.rows} lignes × ${meta.shape?.columns} colonnes`,
      `Colonnes: ${meta.columns?.join(', ')}`,
      `Encodage: ${meta.encoding}`
    ].join('\n');

    chunks.push({
      text: summaryText,
      metadata: { type: 'summary', section: 'metadata' }
    });
  }

  // Chunk 2: Patterns métier
  if (pythonResult.analysis?.business_patterns) {
    const patterns = pythonResult.analysis.business_patterns;
    const patternsText = [
      'Patterns métier détectés:',
      patterns.exit_employees ? `Exit Employees: ${patterns.exit_employees.count}` : '',
      patterns.financial_data ? `Données financières: ${patterns.financial_data.columns_detected?.join(', ')}` : '',
      patterns.performance_segments ? `Segments performance: ${patterns.performance_segments.high_performers?.count} top performers` : ''
    ].filter(Boolean).join('\n');

    chunks.push({
      text: patternsText,
      metadata: { type: 'business_patterns', section: 'analysis' }
    });
  }

  // Chunk 3: Échantillon de données
  if (pythonResult.extraction?.sample_data?.head) {
    const sampleData = pythonResult.extraction.sample_data.head;
    const sampleText = [
      'Échantillon de données:',
      ...sampleData.slice(0, 3).map((row: any, idx: number) => {
        const rowData = Object.entries(row).map(([col, val]) => `${col}: ${val}`).join(', ');
        return `Ligne ${idx + 1}: ${rowData}`;
      })
    ].join('\n');

    chunks.push({
      text: sampleText,
      metadata: { type: 'sample_data', section: 'data' }
    });
  }

  return chunks;
}

/**
 * Convertit l'analyse Python au format MongoDB
 */
function convertPythonToMongoAggregations(pythonResult: any): any {
  const aggregations: any = {
    totalRows: pythonResult.extraction?.metadata?.shape?.rows || 0,
    columns: pythonResult.extraction?.metadata?.columns || [],
    sums: {},
    averages: {},
    mins: {},
    maxs: {},
    counts: {},
    byColumn: {},
    topValues: {},
  };

  // Convertir les métriques financières Python
  if (pythonResult.analysis?.business_patterns?.financial_metrics) {
    const financial = pythonResult.analysis.business_patterns.financial_metrics;
    
    Object.entries(financial).forEach(([col, metrics]: [string, any]) => {
      aggregations.sums[col] = metrics.total;
      aggregations.averages[col] = metrics.average;
      aggregations.mins[col] = metrics.min;
      aggregations.maxs[col] = metrics.max;
    });
  }

  return aggregations;
}

/**
 * Sauvegarde temporairement un fichier
 */
async function saveFileTemporarily(filename: string, buffer: ArrayBuffer): Promise<void> {
  const uploadDir = join(process.cwd(), 'temp', 'uploads');
  
  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(buffer));
  } catch (error) {
    console.error('Erreur sauvegarde temporaire:', error);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Erreur sauvegarde fichier');
    }
  }
}

// Export pour les tests
export { validateFile, processFileWithPython };