import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { DatabaseFactory, MongoDBClient } from '@/lib/mongodb';
import { pythonClient } from '@/lib/python-client';
import { synthesizeAnswer, createEmbedding } from '@/lib/openai';
import { QUERY_CONFIG } from '@/lib/config';
import type { QueryType } from '@/types/database';

// Configuration pour Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChatRequest {
  question: string;
  documentIds?: string[];
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
  pythonInsights?: any;
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

    // Assurer la connexion MongoDB
    const client = MongoDBClient.getInstance();
    await client.connect();
    const { documents } = await DatabaseFactory.getRepositories();

    // 🐍 ÉTAPE 1 : Classification Intelligente avec Python
    console.log('🧠 Classification Python de la question...');
    
    // Récupérer les documents et leurs colonnes
    const availableDocs = await documents.findByStatus('completed');
    const availableColumns = extractColumnsFromDocuments(availableDocs);
    
    const classificationResult = await pythonClient.classifyQuery(
      question,
      availableColumns,
      { documentCount: availableDocs.length }
    );
    
    console.log(`📋 Type détecté: ${classificationResult.type} (confiance: ${classificationResult.confidence})`);

    let contextData: Array<{ text: string; source: string; score: number }> = [];
    let searchedDocuments: any[] = [];
    let pythonInsights: any = null;

    // 🔍 ÉTAPE 2 : Recherche Selon le Type Détecté
    if (classificationResult.type === 'numeric' || classificationResult.type === 'hybrid') {
      // 🐍 Utiliser l'API Python pour les agrégations intelligentes
      console.log('📊 Recherche Python pour question numérique...');
      
      // ✅ CORRIGÉ: Utiliser la bonne méthode
      let relevantDocuments: any[] = [];
      
      if (documentIds && documentIds.length > 0) {
        const objectIds = documentIds.map(id => new ObjectId(id));
        relevantDocuments = await documents.findDocumentsWithPythonAnalysis(objectIds);
        
        if (relevantDocuments.length === 0) {
          relevantDocuments = await documents.findDocumentsWithAggregations(objectIds);
        }
      } else {
        // ✅ Utilise les nouvelles méthodes compatibles
        relevantDocuments = await documents.findDocumentsWithPythonAnalysis();
        
        if (relevantDocuments.length === 0) {
          relevantDocuments = await documents.findDocumentsWithAggregations();
        }
      }
      
      for (const doc of relevantDocuments) {
        // ✅ DEBUG: Afficher la structure pour comprendre le problème
        console.log(`🔍 Analyse document ${doc.filename}:`);
        console.log(`- pythonAnalysis existe: ${!!doc.pythonAnalysis}`);
        
        if (doc.pythonAnalysis) {
          console.log(`- pythonAnalysis.extraction existe: ${!!doc.pythonAnalysis.extraction}`);
          if (doc.pythonAnalysis.extraction) {
            console.log(`- dataframe_data existe: ${!!doc.pythonAnalysis.extraction.dataframe_data}`);
          } else {
            console.log('- extraction est null - structure pythonAnalysis:', Object.keys(doc.pythonAnalysis));
          }
        }
        
        if (doc.pythonAnalysis?.extraction?.dataframe_data) {
          try {
            console.log(`🐍 Tentative agrégation Python pour ${doc.filename}...`);
            const aggregationResult = await pythonClient.computeAggregations(
              question,
              doc.pythonAnalysis.extraction.dataframe_data,
              'smart'
            );
            
            if (aggregationResult.success) {
              pythonInsights = aggregationResult.aggregations;
              
              // Construire le contexte à partir des agrégations Python
              const aggContext = buildPythonAggregationContext(doc, question, aggregationResult.aggregations);
              contextData.push({
                text: aggContext,
                source: doc.filename,
                score: 1.0
              });
              
              searchedDocuments.push(doc);
              console.log(`✅ Agrégations Python réussies pour ${doc.filename}`);
            } else {
              console.warn(`⚠️ Agrégations Python échouées pour ${doc.filename}`);
            }
          } catch (error) {
            console.error(`❌ Erreur agrégation Python pour ${doc.filename}:`, error);
          }
        } else if (doc.aggregations) {
          // Fallback sur les agrégations MongoDB classiques
          console.log(`📊 Utilisation agrégations MongoDB pour ${doc.filename}`);
          const aggContext = buildClassicAggregationContext(doc, question);
          if (aggContext) {
            contextData.push({
              text: aggContext,
              source: doc.filename,
              score: 0.8
            });
            searchedDocuments.push(doc);
            console.log(`✅ Agrégations MongoDB réussies pour ${doc.filename}`);
          }
        } else {
          console.warn(`⚠️ Document ${doc.filename} sans données analysées utilisables (ni pythonAnalysis.extraction.dataframe_data ni aggregations)`);
        }
      }
    }

    if (classificationResult.type === 'semantic' || classificationResult.type === 'hybrid') {
      // 🔮 Recherche vectorielle classique
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

    // 🤖 ÉTAPE 3 : Synthèse avec OpenAI
    console.log('🤖 Synthèse de la réponse...');
    const synthesisResult = await synthesizeAnswer(question, contextData, classificationResult.type);
    totalTokensUsed += synthesisResult.tokensUsed;

    // 📋 ÉTAPE 4 : Construire la réponse finale
    const sources = contextData.map((context, index) => ({
      documentId: searchedDocuments[index]?._id?.toString() || searchedDocuments[0]?._id?.toString() || 'unknown',
      filename: context.source,
      snippet: context.text.substring(0, 200) + (context.text.length > 200 ? '...' : ''),
      relevanceScore: context.score
    }));

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      answer: synthesisResult.answer,
      confidence: synthesisResult.confidence,
      queryType: classificationResult.type,
      sources,
      processingTimeMs: processingTime,
      tokensUsed: totalTokensUsed,
      pythonInsights,
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
 * Extrait les colonnes disponibles depuis les documents
 */
function extractColumnsFromDocuments(documents: any[]): string[] {
  const allColumns = new Set<string>();
  
  documents.forEach(doc => {
    if (doc.pythonAnalysis?.extraction?.metadata?.columns) {
      doc.pythonAnalysis.extraction.metadata.columns.forEach((col: string) => {
        allColumns.add(col);
      });
    } else if (doc.aggregations?.columns) {
      doc.aggregations.columns.forEach((col: string) => {
        allColumns.add(col);
      });
    }
  });
  
  return Array.from(allColumns);
}

/**
 * Construit le contexte d'agrégation avec les données Python
 */
function buildPythonAggregationContext(document: any, question: string, pythonAggregations: any): string {
  const contextParts: string[] = [];
  
  contextParts.push(`Fichier: ${document.filename}`);
  
  if (document.pythonAnalysis?.extraction?.metadata) {
    const meta = document.pythonAnalysis.extraction.metadata;
    contextParts.push(`Dataset: ${meta.shape?.rows} lignes, ${meta.shape?.columns} colonnes`);
  }
  
  // Ajouter les résultats d'agrégation Python
  if (pythonAggregations.totals) {
    contextParts.push('\nTotaux calculés par Python:');
    Object.entries(pythonAggregations.totals).forEach(([col, total]: [string, any]) => {
      contextParts.push(`- ${col}: ${typeof total === 'number' ? total.toLocaleString() : total}`);
    });
  }
  
  if (pythonAggregations.averages) {
    contextParts.push('\nMoyennes calculées par Python:');
    Object.entries(pythonAggregations.averages).forEach(([col, avg]: [string, any]) => {
      contextParts.push(`- ${col}: ${typeof avg === 'number' ? avg.toFixed(2) : avg}`);
    });
  }
  
  if (pythonAggregations.top_performers) {
    contextParts.push('\nTop performers (Python):');
    const topData = pythonAggregations.top_performers;
    if (topData.top_5) {
      topData.top_5.slice(0, 3).forEach((performer: any, idx: number) => {
        const agentName = performer.Agent || 'Agent inconnu';
        const metric = topData.column;
        const value = performer[metric];
        contextParts.push(`${idx + 1}. ${agentName}: ${typeof value === 'number' ? value.toLocaleString() : value}`);
      });
    }
  }
  
  if (pythonAggregations.by_agent) {
    const questionLower = question.toLowerCase();
    // Rechercher un agent spécifique dans la question
    const mentionedAgent = Object.keys(pythonAggregations.by_agent).find(agent => 
      questionLower.includes(agent.toLowerCase().split(' - ')[1]?.toLowerCase() || '')
    );
    
    if (mentionedAgent) {
      contextParts.push(`\nDonnées pour ${mentionedAgent}:`);
      const agentData = pythonAggregations.by_agent[mentionedAgent];
      Object.entries(agentData).forEach(([metric, value]: [string, any]) => {
        contextParts.push(`- ${metric}: ${typeof value === 'number' ? value.toLocaleString() : value}`);
      });
    }
  }
  
  return contextParts.join('\n');
}

/**
 * Fallback : contexte d'agrégation classique MongoDB
 */
function buildClassicAggregationContext(document: any, question: string): string | null {
  if (!document.aggregations) return null;
  
  const agg = document.aggregations;
  const contextParts: string[] = [];

  contextParts.push(`Fichier: ${document.filename}`);
  contextParts.push(`Total de lignes: ${agg.totalRows}`);
  contextParts.push(`Colonnes: ${agg.columns.join(', ')}`);

  // Ajouter les totaux et moyennes
  if (Object.keys(agg.sums).length > 0) {
    contextParts.push('\nTotaux par colonne:');
    Object.entries(agg.sums).forEach(([col, sum]: [string, any]) => {
      const avg = agg.averages[col];
      const min = agg.mins[col];
      const max = agg.maxs[col];
      contextParts.push(`- ${col}: total=${sum}, moyenne=${avg?.toFixed(2)}, min=${min}, max=${max}`);
    });
  }

  return contextParts.join('\n');
}

// Endpoint GET pour obtenir la liste des documents disponibles
export async function GET(request: NextRequest) {
  try {
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
      rowCount: doc.pythonAnalysis?.extraction?.metadata?.shape?.rows || doc.aggregations?.totalRows || 0,
      chunksCount: doc.processing?.chunksCount || 0,
      hasPythonAnalysis: !!doc.pythonAnalysis,
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