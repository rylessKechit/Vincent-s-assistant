/**
 * API Upload - VERSION VERCEL COMPATIBLE
 * AUCUN stockage local - tout dans MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
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

    // Traitement du fichier SANS stockage local
    const startTime = Date.now();
    const processingResult = await processFileDirectly(file);
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
        pythonAnalysis: processingResult.pythonAnalysis, // ✅ Données Python complètes
        aggregations: processingResult.aggregations, // ✅ Agrégations pré-calculées
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
 * ✅ NOUVEAU: Traite un fichier DIRECTEMENT sans stockage local
 */
async function processFileDirectly(file: File): Promise<{
  documentId: ObjectId;
  filename: string;
  type: string;
  chunksCount: number;
  summary: string;
  keyFacts: string[];
  tokensUsed: number;
  pythonAnalysis: any;
  aggregations: any;
}> {
  // Générer un nom de fichier unique (juste pour l'identification)
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || '';
  const filename = `${timestamp}_${randomSuffix}.${fileExtension}`;

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
      // 🐍 ÉTAPE 1 : Analyse Python DIRECTE (sans fichier temporaire)
      console.log('🐍 Démarrage analyse Python directe...');
      
      // ✅ Passer le fichier DIRECTEMENT à Python
      const pythonResult = await pythonClient.processFileComplete(file);
      
      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Erreur analyse Python');
      }

      console.log('✅ Analyse Python terminée');

      // 🤖 ÉTAPE 2 : Extraire métadonnées avec OpenAI
      const textForMetadata = generateTextFromPythonAnalysis(pythonResult.data);
      const metadata = await extractDocumentMetadata(textForMetadata, 'csv');
      totalTokensUsed += metadata.tokensUsed;

      // 🔗 ÉTAPE 3 : Créer les chunks pour recherche vectorielle
      const chunks = createChunksFromPythonData(pythonResult.data);
      
      // 🧠 ÉTAPE 4 : Générer les embeddings pour les chunks
      const embeddingResult = await createEmbeddings(
        chunks.map(chunk => chunk.text)
      );
      totalTokensUsed += embeddingResult.tokensUsed;

      // 📦 ÉTAPE 5 : Construire les chunks finaux
      const finalChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        text: chunk.text,
        embedding: embeddingResult.embeddings[index],
        chunkIndex: index,
        metadata: chunk.metadata
      }));

      // 📊 ÉTAPE 6 : Convertir agrégations Python pour MongoDB
      const aggregations = convertPythonToMongoAggregations(pythonResult.data);

      // 💾 ÉTAPE 7 : Sauvegarder TOUT dans MongoDB
      const finalDocument = {
        summary: metadata.summary,
        keyFacts: metadata.keyFacts,
        chunks: finalChunks,
        aggregations: aggregations,
        pythonAnalysis: pythonResult.data, // ✅ Analyse complète sauvegardée
        status: 'completed' as const,
        processedAt: new Date(),
        processing: {
          chunksCount: finalChunks.length,
          embeddingModel: 'text-embedding-ada-002',
          tokensUsed: totalTokensUsed,
          processingTimeMs: 0, // Sera calculé par l'appelant
        },
      };

      // Mettre à jour le document
      await documents.updateDocument(documentId, finalDocument);

      console.log(`✅ Document sauvegardé: ${finalChunks.length} chunks, ${totalTokensUsed} tokens`);

      return {
        documentId,
        filename,
        type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
        chunksCount: finalChunks.length,
        summary: metadata.summary,
        keyFacts: metadata.keyFacts,
        tokensUsed: totalTokensUsed,
        pythonAnalysis: pythonResult.data,
        aggregations: aggregations
      };

    } catch (error) {
      // Marquer le document comme erreur
      await documents.updateDocument(documentId, {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          timestamp: new Date()
        }
      });
      throw error;
    }

  } catch (error) {
    console.error('❌ Erreur traitement fichier:', error);
    throw error;
  }
}

/**
 * Génère du texte pour OpenAI à partir de l'analyse Python
 */
function generateTextFromPythonAnalysis(pythonResult: any): string {
  const extraction = pythonResult?.extraction;
  const analysis = pythonResult?.analysis;
  
  if (!extraction) {
    return 'Document CSV analysé automatiquement';
  }

  const parts = [
    `Document CSV: ${extraction.metadata?.shape?.rows || 0} lignes, ${extraction.metadata?.shape?.columns || 0} colonnes`,
    `Colonnes: ${extraction.metadata?.columns?.join(', ') || 'N/A'}`,
  ];

  // Ajouter les insights business si disponibles
  if (analysis?.business_patterns) {
    const patterns = analysis.business_patterns;
    if (patterns.sixt_agents?.total_agents) {
      parts.push(`Agents SIXT: ${patterns.sixt_agents.total_agents}`);
    }
    if (patterns.financial_data?.total_revenue) {
      parts.push(`Revenue total: ${patterns.financial_data.total_revenue}`);
    }
    if (patterns.exit_employees?.count) {
      parts.push(`Exit Employees: ${patterns.exit_employees.count}`);
    }
  }

  // Ajouter un échantillon de données
  if (extraction.sample_data?.head) {
    parts.push('Échantillon de données:');
    parts.push(...extraction.sample_data.head.slice(0, 2).map((row: any, idx: number) => {
      const rowData = Object.entries(row).slice(0, 3).map(([col, val]) => `${col}: ${val}`).join(', ');
      return `Ligne ${idx + 1}: ${rowData}`;
    }));
  }

  return parts.join('\n');
}

/**
 * Crée des chunks à partir des données Python
 */
function createChunksFromPythonData(pythonResult: any): Array<{
  text: string;
  metadata?: any;
}> {
  const chunks: Array<{ text: string; metadata?: any }> = [];

  // Chunk 1: Métadonnées et structure
  const extraction = pythonResult?.extraction;
  if (extraction?.metadata) {
    const metadataText = [
      `Analyse du fichier CSV:`,
      `Dimensions: ${extraction.metadata.shape?.rows || 0} lignes × ${extraction.metadata.shape?.columns || 0} colonnes`,
      `Colonnes: ${extraction.metadata.columns?.join(', ') || 'N/A'}`,
      `Types détectés: ${Object.entries(extraction.dataframe_data?.dtypes || {}).map(([col, type]) => `${col}: ${type}`).join(', ')}`
    ].join('\n');

    chunks.push({
      text: metadataText,
      metadata: { type: 'metadata', section: 'structure' }
    });
  }

  // Chunk 2: Patterns business
  const analysis = pythonResult?.analysis;
  if (analysis?.business_patterns) {
    const patterns = analysis.business_patterns;
    const patternsText = [
      'Patterns métier détectés:',
      patterns.sixt_agents ? `Agents SIXT: ${patterns.sixt_agents.total_agents} agents détectés` : '',
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
  if (extraction?.sample_data?.head) {
    const sampleData = extraction.sample_data.head;
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

  // Si aucun chunk généré, créer un chunk par défaut
  if (chunks.length === 0) {
    chunks.push({
      text: 'Document CSV analysé et indexé pour recherche',
      metadata: { type: 'default', section: 'fallback' }
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
      if (metrics.total !== undefined) aggregations.sums[col] = metrics.total;
      if (metrics.average !== undefined) aggregations.averages[col] = metrics.average;
      if (metrics.min !== undefined) aggregations.mins[col] = metrics.min;
      if (metrics.max !== undefined) aggregations.maxs[col] = metrics.max;
      if (metrics.count !== undefined) aggregations.counts[col] = metrics.count;
    });
  }

  // Ajouter les groupements si disponibles
  if (pythonResult.analysis?.aggregations) {
    aggregations.byColumn = pythonResult.analysis.aggregations;
  }

  return aggregations;
}

// Export pour les tests
export { validateFile, processFileDirectly };