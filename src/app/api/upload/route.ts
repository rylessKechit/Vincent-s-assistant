import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ObjectId } from 'mongodb';
import { DatabaseFactory } from '@/lib/mongodb';
import { pythonClient } from '@/lib/python-client';
import { createEmbeddings, extractDocumentMetadata } from '@/lib/openai';
import { FILE_CONFIG } from '@/lib/config';
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
        pythonAnalysis: processingResult.pythonAnalysis,
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
 * Traite un fichier avec l'API Python - 100% compatible avec votre code existant
 */
async function processFileWithPython(file: File): Promise<{
  documentId: ObjectId;
  filename: string;
  type: string;
  chunksCount: number;
  summary: string;
  keyFacts: string[];
  tokensUsed: number;
  pythonAnalysis: any; // Type any pour éviter les erreurs TypeScript
}> {
  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || '';
  const filename = `${timestamp}_${randomSuffix}.${fileExtension}`;

  // Sauvegarder temporairement le fichier
  await saveFileTemporarily(filename, await file.arrayBuffer());

  const { documents } = await DatabaseFactory.getRepositories();

  // Créer l'entrée document initiale - EXACT comme votre interface Document
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
    // PAS de pythonAnalysis car pas dans votre interface Document
  });

  let totalTokensUsed = 0;

  try {
    // 🐍 ÉTAPE 1 : Analyse Python
    console.log('🐍 Démarrage analyse Python...');
    const pythonResult = await pythonClient.processFileComplete(file);
    
    if (!pythonResult.success) {
      throw new Error(pythonResult.error || 'Erreur analyse Python');
    }

    console.log('✅ Analyse Python terminée');

    // 🤖 ÉTAPE 2 : Métadonnées OpenAI
    const textForMetadata = generateTextFromPythonAnalysis(pythonResult);
    const metadata = await extractDocumentMetadata(textForMetadata, 'csv');
    totalTokensUsed += metadata.tokensUsed;

    // 🔗 ÉTAPE 3 : Créer les chunks
    const chunks = createChunksFromPythonData(pythonResult);
    
    // 🧠 ÉTAPE 4 : Générer les embeddings
    const embeddingResult = await createEmbeddings(
      chunks.map(chunk => chunk.text)
    );
    totalTokensUsed += embeddingResult.tokensUsed;

    // 📦 ÉTAPE 5 : Construire les chunks finaux
    const finalChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
      text: chunk.text,
      embedding: embeddingResult.embeddings[index],
      chunkIndex: index,
      metadata: chunk.metadata || {}
    }));

    // 💾 ÉTAPE 6 : Sauvegarder avec VOS méthodes existantes UNIQUEMENT
    await documents.updateChunks(documentId, finalChunks);

    // Sauvegarder les agrégations Python (format adapté à votre CsvAggregations)
    if (pythonResult.analysis) {
      const aggregations = convertPythonToMongoAggregations(pythonResult);
      await documents.updateAggregations(documentId, aggregations);
    }

    // Marquer comme terminé
    await documents.updateStatus(documentId, 'completed');

    // 🔄 ÉTAPE 7 : Mise à jour finale via accès direct (comme dans votre code)
    // Utilisation de la même approche que dans votre upload existant
    const { documents: documentsRepo } = await DatabaseFactory.getRepositories();
    const collection = (documentsRepo as any).collection;
    
    await collection.updateOne(
      { _id: documentId },
      {
        $set: {
          summary: metadata.summary,
          keyFacts: metadata.keyFacts,
          'processing.tokensUsed': totalTokensUsed,
          'processing.chunksCount': finalChunks.length,
          'processing.processingTimeMs': pythonResult.performance?.total_time || 0,
          // Sauvegarder pythonAnalysis comme champ libre (pas dans interface Document)
          pythonAnalysis: pythonResult,
          processedAt: new Date()
        }
      }
    );

    console.log(`✅ Document ${filename} traité avec succès`);
    
    return {
      documentId,
      filename,
      type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
      chunksCount: finalChunks.length,
      summary: metadata.summary,
      keyFacts: metadata.keyFacts,
      tokensUsed: totalTokensUsed,
      pythonAnalysis: pythonResult // Retour du résultat Python complet
    };

  } catch (error) {
    console.error('❌ Erreur traitement:', error);
    
    // Utiliser VOTRE méthode existante setError
    await documents.setError(
      documentId,
      error instanceof Error ? error.message : 'Erreur de traitement',
      error instanceof Error ? error.stack : undefined
    );
    
    throw error;
  }
}

/**
 * Génère du texte pour les métadonnées depuis l'analyse Python
 */
function generateTextFromPythonAnalysis(pythonResult: any): string {
  const parts: string[] = [];

  // Accès sécurisé aux données Python
  if (pythonResult.extraction?.metadata) {
    const meta = pythonResult.extraction.metadata;
    if (meta.shape) {
      parts.push(`Dataset avec ${meta.shape.rows || 0} lignes et ${meta.shape.columns || 0} colonnes`);
    }
    
    if (meta.columns && Array.isArray(meta.columns)) {
      parts.push(`Colonnes: ${meta.columns.join(', ')}`);
    }
  }

  if (pythonResult.analysis?.business_patterns) {
    const patterns = pythonResult.analysis.business_patterns;
    
    if (patterns.exit_employees?.count) {
      parts.push(`Exit Employees détectés: ${patterns.exit_employees.count}`);
    }
    
    if (patterns.financial_metrics) {
      const metrics = Object.keys(patterns.financial_metrics);
      if (metrics.length > 0) {
        parts.push(`Métriques financières: ${metrics.join(', ')}`);
      }
    }
  }

  if (pythonResult.recommendations && Array.isArray(pythonResult.recommendations)) {
    parts.push('Recommandations: ' + pythonResult.recommendations.slice(0, 3).join(', '));
  }

  return parts.length > 0 ? parts.join('\n') : 'Analyse de données effectuée';
}

/**
 * Crée des chunks à partir des données Python
 */
function createChunksFromPythonData(pythonResult: any): Array<{
  text: string;
  metadata?: {
    pageNumber?: number;
    section?: string;
    rowNumber?: number;
  };
}> {
  const chunks: Array<{ text: string; metadata?: any }> = [];

  // Chunk 1: Métadonnées
  if (pythonResult.extraction?.metadata) {
    const meta = pythonResult.extraction.metadata;
    const metaText = [
      `Dataset: ${meta.shape?.rows || 0} lignes, ${meta.shape?.columns || 0} colonnes`,
      meta.columns && Array.isArray(meta.columns) ? `Colonnes: ${meta.columns.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    if (metaText.trim()) {
      chunks.push({
        text: metaText,
        metadata: { section: 'metadata' }
      });
    }
  }

  // Chunk 2: Patterns business
  if (pythonResult.analysis?.business_patterns) {
    const patterns = pythonResult.analysis.business_patterns;
    const patternsText = [
      'Analyse business:',
      patterns.exit_employees?.count ? `Exit Employees: ${patterns.exit_employees.count}` : '',
      patterns.performance_segments?.high_performers?.count ? `Top performers: ${patterns.performance_segments.high_performers.count}` : ''
    ].filter(Boolean).join('\n');

    if (patternsText !== 'Analyse business:') {
      chunks.push({
        text: patternsText,
        metadata: { section: 'business_patterns' }
      });
    }
  }

  // Chunk 3: Échantillon de données
  if (pythonResult.extraction?.sample_data?.head && Array.isArray(pythonResult.extraction.sample_data.head)) {
    const sampleData = pythonResult.extraction.sample_data.head;
    const sampleRows = sampleData.slice(0, 3).map((row: any, idx: number) => {
      if (row && typeof row === 'object') {
        const rowData = Object.entries(row)
          .map(([col, val]) => `${col}: ${val}`)
          .join(', ');
        return `Ligne ${idx + 1}: ${rowData}`;
      }
      return `Ligne ${idx + 1}: ${JSON.stringify(row)}`;
    });

    if (sampleRows.length > 0) {
      chunks.push({
        text: 'Échantillon de données:\n' + sampleRows.join('\n'),
        metadata: { section: 'sample_data' }
      });
    }
  }

  // Chunk par défaut si aucun chunk créé
  if (chunks.length === 0) {
    chunks.push({
      text: 'Document analysé par Python avec succès',
      metadata: { section: 'default' }
    });
  }

  return chunks;
}

/**
 * Convertit l'analyse Python au format CsvAggregations MongoDB existant
 */
function convertPythonToMongoAggregations(pythonResult: any): any {
  // Format exact de votre interface CsvAggregations
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

  // Convertir les métriques financières Python si disponibles
  if (pythonResult.analysis?.business_patterns?.financial_metrics) {
    const financial = pythonResult.analysis.business_patterns.financial_metrics;
    
    Object.entries(financial).forEach(([col, metrics]: [string, any]) => {
      if (metrics && typeof metrics === 'object') {
        aggregations.sums[col] = metrics.total || 0;
        aggregations.averages[col] = metrics.average || 0;
        aggregations.mins[col] = metrics.min || 0;
        aggregations.maxs[col] = metrics.max || 0;
        aggregations.counts[col] = metrics.count || 0;
      }
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