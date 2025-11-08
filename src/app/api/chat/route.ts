import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { DatabaseFactory, MongoDBClient } from '@/lib/mongodb';
import { detectQueryType, synthesizeAnswer, createEmbedding } from '@/lib/openai';
import { QUERY_CONFIG } from '@/lib/config';
import type { QueryType } from '@/types/database';

// Configuration pour Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatRequest {
  question: string;
  documentIds?: string[]; // IDs des documents à interroger (optionnel)
}

interface ChatResponse {
  success: boolean;
  answer?: string;
  confidence?: number;
  queryType?: QueryType;
  sources?: Array<{
    documentId: string;
    filename: string;
    snippet: string;
    relevanceScore: number;
  }>;
  processingTimeMs?: number;
  tokensUsed?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  const startTime = Date.now();
  let totalTokensUsed = 0;

  try {
    // Parser la requête
    const body: ChatRequest = await request.json();
    const { question, documentIds } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question manquante ou vide'
      }, { status: 400 });
    }

    // Assurer la connexion MongoDB avant d'utiliser les repositories
    const client = MongoDBClient.getInstance();
    await client.connect();

    // Obtenir les repositories
    const { documents } = await DatabaseFactory.getRepositories();

    // 1. Détecter le type de question
    console.log('🔍 Détection du type de question...');
    const queryTypeResult = await detectQueryType(question);
    totalTokensUsed += queryTypeResult.tokensUsed;
    const queryType = queryTypeResult.type;
    
    console.log(`📋 Type détecté: ${queryType} (confiance: ${queryTypeResult.confidence})`);

    let contextData: Array<{ text: string; source: string; score: number }> = [];
    let searchedDocuments: any[] = [];

    // 2. Rechercher selon le type de question
    if (queryType === 'numeric' || queryType === 'hybrid') {
      // Recherche dans les agrégations pour questions numériques
      console.log('📊 Recherche dans les agrégations...');
      
      const documentsWithAggregations = await documents.searchAggregations(
        question,
        documentIds?.map(id => new ObjectId(id))
      );

      searchedDocuments = documentsWithAggregations;

      for (const doc of documentsWithAggregations) {
        if (doc.aggregations) {
          // Construire le contexte à partir des agrégations
          const aggContext = buildAggregationContext(doc, question);
          contextData.push({
            text: aggContext,
            source: doc.filename,
            score: 1.0 // Score élevé pour les agrégations exactes
          });
        }
      }
    }

    if (queryType === 'semantic' || queryType === 'hybrid') {
      // Recherche vectorielle pour questions sémantiques
      console.log('🔮 Recherche vectorielle...');
      
      const embeddingResult = await createEmbedding(question);
      totalTokensUsed += embeddingResult.tokensUsed;

      const vectorResults = await documents.vectorSearch(
        embeddingResult.embedding,
        QUERY_CONFIG.maxResults,
        documentIds?.map(id => new ObjectId(id))
      );

      for (const result of vectorResults) {
        if (result.score >= QUERY_CONFIG.similarityThreshold) {
          contextData.push({
            text: result.chunk.text,
            source: result.document.filename,
            score: result.score
          });
          
          if (!searchedDocuments.find(doc => doc._id.equals(result.document._id))) {
            searchedDocuments.push(result.document);
          }
        }
      }
    }

    if (contextData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune donnée pertinente trouvée pour cette question'
      }, { status: 404 });
    }

    // 3. Synthétiser la réponse avec OpenAI
    console.log('🤖 Synthèse de la réponse...');
    const synthesisResult = await synthesizeAnswer(question, contextData, queryType);
    totalTokensUsed += synthesisResult.tokensUsed;

    // 4. Construire les sources
    const sources = contextData.map((context, index) => ({
      documentId: searchedDocuments[0]?._id?.toString() || 'unknown',
      filename: context.source,
      snippet: context.text.substring(0, 200) + (context.text.length > 200 ? '...' : ''),
      relevanceScore: context.score
    }));

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      answer: synthesisResult.answer,
      confidence: synthesisResult.confidence,
      queryType,
      sources,
      processingTimeMs: processingTime,
      tokensUsed: totalTokensUsed
    });

  } catch (error: any) {
    console.error('Erreur API Chat:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur interne du serveur',
      processingTimeMs: processingTime,
      tokensUsed: totalTokensUsed
    }, { status: 500 });
  }
}

/**
 * Construit le contexte d'agrégation pour une question numérique
 */
function buildAggregationContext(document: any, question: string): string {
  const agg = document.aggregations;
  const contextParts: string[] = [];

  // Ajouter les informations générales
  contextParts.push(`Fichier: ${document.filename}`);
  contextParts.push(`Total de lignes: ${agg.totalRows}`);
  contextParts.push(`Colonnes: ${agg.columns.join(', ')}`);

  // Ajouter les totaux et moyennes des colonnes numériques
  if (Object.keys(agg.sums).length > 0) {
    contextParts.push('\nTotaux par colonne:');
    Object.entries(agg.sums).forEach(([col, sum]: [string, any]) => {
      const avg = agg.averages[col];
      const min = agg.mins[col];
      const max = agg.maxs[col];
      contextParts.push(`- ${col}: total=${sum}, moyenne=${avg?.toFixed(2)}, min=${min}, max=${max}`);
    });
  }

  // Ajouter les top valeurs pertinentes pour la question
  const questionLower = question.toLowerCase();
  Object.entries(agg.topValues || {}).forEach(([col, values]: [string, any]) => {
    if (questionLower.includes(col.toLowerCase()) || 
        questionLower.includes('agent') && col.toLowerCase().includes('agent')) {
      contextParts.push(`\nTop valeurs ${col}:`);
      values.slice(0, 5).forEach((item: any) => {
        contextParts.push(`- ${item.value}: ${item.count} occurrences`);
      });
    }
  });

  return contextParts.join('\n');
}

// Endpoint GET pour obtenir la liste des documents disponibles
export async function GET(request: NextRequest) {
  try {
    // Assurer la connexion MongoDB avant d'utiliser les repositories
    const client = MongoDBClient.getInstance();
    await client.connect();
    
    const { documents } = await DatabaseFactory.getRepositories();
    
    const allDocs = await documents.findByStatus('completed');
    
    const documentList = allDocs.map(doc => ({
      id: doc._id.toString(),
      filename: doc.filename,
      type: doc.type,
      uploadedAt: doc.uploadedAt,
      summary: doc.summary,
      rowCount: doc.aggregations?.totalRows || 0,
      chunksCount: doc.processing?.chunksCount || 0
    }));

    return NextResponse.json({
      success: true,
      documents: documentList,
      total: documentList.length
    });

  } catch (error: any) {
    console.error('Erreur liste documents:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur récupération documents'
    }, { status: 500 });
  }
}