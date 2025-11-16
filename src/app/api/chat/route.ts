import { NextRequest, NextResponse } from 'next/server';
import { MongoDBClient, DatabaseFactory } from '@/lib/mongodb';
import { pythonClient } from '@/lib/python-client';
import { openai, detectQueryType, createEmbedding } from '@/lib/openai';

export const dynamic = 'force-dynamic';

// ✅ Configuration locale compatible si QUERY_CONFIG n'existe pas
const LOCAL_QUERY_CONFIG = {
  maxResults: 10,
  similarityThreshold: 0.7,
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let totalTokensUsed = 0;

  try {
    const body = await request.json();
    const { question, documentIds } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question requise' },
        { status: 400 }
      );
    }

    // ✅ Connexion à la base de données - UTILISE votre système existant
    const client = MongoDBClient.getInstance();
    await client.connect();
    const { documents } = await DatabaseFactory.getRepositories();

    // Récupérer les documents pertinents
    let relevantDocuments;
    if (documentIds && documentIds.length > 0) {
      // Documents spécifiques demandés
      relevantDocuments = await Promise.all(
        documentIds.map((id: string) => documents.findById(id))
      );
      relevantDocuments = relevantDocuments.filter(doc => doc !== null);
    } else {
      // ✅ Utilise la méthode compatible du nouveau repository
      relevantDocuments = await documents.findDocumentsWithPythonAnalysis();
      
      if (relevantDocuments.length === 0) {
        relevantDocuments = await documents.findDocumentsWithAggregations();
      }
    }

    if (relevantDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun document trouvé ou analysé. Veuillez d\'abord uploader des documents.'
      }, { status: 404 });
    }

    // ✅ Classification de la question - UTILISE votre fonction OpenAI existante
    const availableColumns = extractColumnsFromDocuments(relevantDocuments);
    const classificationResult = await detectQueryType(question);

    let synthesisResult;
    let sources: any[] = [];
    let pythonInsights: any = null;

    // Traitement selon le type de question détecté
    if (classificationResult.type === 'numeric' || classificationResult.type === 'hybrid') {
      // 🐍 PRIORISER L'ANALYSE PYTHON pour les questions numériques
      const pythonDocument = relevantDocuments.find(doc => !!doc.pythonAnalysis);
      
      if (pythonDocument && pythonDocument.pythonAnalysis) {
        try {
          // Utiliser l'API Python pour les calculs avancés
          const pythonAggregations = await pythonClient.computeAggregations(
            question,
            pythonDocument.pythonAnalysis.extraction,
            'smart'
          );

          if (pythonAggregations.success) {
            // Construire le contexte avec les résultats Python
            const pythonContext = buildPythonAggregationContext(
              pythonDocument, 
              question, 
              pythonAggregations.aggregations
            );

            // ✅ Synthèse avec OpenAI utilisant votre client existant
            synthesisResult = await synthesizeAnswerWithOpenAI(
              question,
              pythonContext,
              classificationResult.type
            );
            
            totalTokensUsed += synthesisResult.tokensUsed || 0;
            
            sources.push({
              documentId: pythonDocument._id.toString(),
              filename: pythonDocument.filename,
              type: 'python_aggregation',
              relevanceScore: 0.95,
              snippet: `Calculs Python: ${Object.keys(pythonAggregations.aggregations).join(', ')}`
            });

            pythonInsights = {
              aggregations: pythonAggregations.aggregations,
              processing_time: pythonAggregations.processing_time_ms,
              quality_score: pythonDocument.pythonAnalysis.quality?.overall_score,
              business_patterns: pythonDocument.pythonAnalysis.analysis?.business_patterns
            };

          } else {
            throw new Error('Échec calculs Python, fallback vers MongoDB');
          }
        } catch (error) {
          console.warn('Erreur Python, fallback vers MongoDB:', error);
          
          // ✅ Fallback vers les agrégations MongoDB classiques
          const classicContext = buildClassicAggregationContext(pythonDocument, question);
          if (classicContext) {
            synthesisResult = await synthesizeAnswerWithOpenAI(
              question,
              classicContext,
              classificationResult.type
            );
            totalTokensUsed += synthesisResult.tokensUsed || 0;
          }
        }
      } else {
        // ✅ Pas d'analyse Python, utiliser MongoDB classique
        const documentsWithAggregations = relevantDocuments.filter(doc => doc.aggregations);
        
        if (documentsWithAggregations.length > 0) {
          const aggregationContext = documentsWithAggregations.map(doc => 
            buildClassicAggregationContext(doc, question)
          ).filter(Boolean).join('\n\n');

          synthesisResult = await synthesizeAnswerWithOpenAI(
            question,
            aggregationContext,
            classificationResult.type
          );
          totalTokensUsed += synthesisResult.tokensUsed || 0;

          sources = documentsWithAggregations.map(doc => ({
            documentId: doc._id.toString(),
            filename: doc.filename,
            type: 'mongodb_aggregation',
            relevanceScore: 0.8,
            snippet: `${doc.aggregations?.totalRows} lignes, ${doc.aggregations?.columns.length} colonnes`
          }));
        }
      }
    } else {
      // ✅ Questions sémantiques : utiliser la recherche vectorielle
      const embeddingResult = await createEmbedding(question);
      totalTokensUsed += embeddingResult.tokensUsed;

      const documentObjectIds = relevantDocuments.map(doc => doc._id);
      const searchResults = await documents.vectorSearch(
        embeddingResult.embedding,
        LOCAL_QUERY_CONFIG.maxResults,
        documentObjectIds
      );

      if (searchResults.length > 0) {
        const context = searchResults.map(result => ({
          text: result.chunk?.text || '',
          filename: result.document.filename,
          score: result.score
        }));

        synthesisResult = await synthesizeAnswerWithOpenAI(
          question,
          context.map(c => `${c.filename}: ${c.text}`).join('\n\n'),
          'semantic'
        );
        totalTokensUsed += synthesisResult.tokensUsed || 0;

        sources = context.map((ctx, idx) => ({
          documentId: searchResults[idx].document._id.toString(),
          filename: ctx.filename,
          type: 'vector_search',
          relevanceScore: ctx.score,
          snippet: ctx.text.substring(0, 200) + (ctx.text.length > 200 ? '...' : ''),
        }));
      }
    }

    // Vérifier qu'on a une réponse
    if (!synthesisResult) {
      return NextResponse.json({
        success: false,
        error: 'Impossible de générer une réponse avec les documents disponibles'
      }, { status: 500 });
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      answer: synthesisResult.answer,
      confidence: synthesisResult.confidence,
      queryType: classificationResult.type,
      sources,
      processingTimeMs: processingTime,
      tokensUsed: totalTokensUsed,
      pythonInsights, // ✅ Inclure les insights Python
      metadata: {
        documentsSearched: relevantDocuments.length,
        pythonDocuments: relevantDocuments.filter(doc => !!doc.pythonAnalysis).length,
        classicDocuments: relevantDocuments.filter(doc => !!doc.aggregations).length,
        availableColumns: availableColumns.length,
        classification: classificationResult
      }
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
 * ✅ Extrait les colonnes disponibles depuis les documents - COMPATIBLE
 */
function extractColumnsFromDocuments(documents: any[]): string[] {
  const allColumns = new Set<string>();
  
  documents.forEach(doc => {
    // Prioriser les colonnes Python
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
 * ✅ Construit le contexte d'agrégation avec les données Python
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
  
  return contextParts.join('\n');
}

/**
 * ✅ Fallback : contexte d'agrégation classique MongoDB
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

/**
 * ✅ Synthèse de réponse avec OpenAI - UTILISE votre client existant
 */
async function synthesizeAnswerWithOpenAI(
  question: string, 
  context: string, 
  queryType: string
): Promise<{ answer: string; confidence: number; tokensUsed: number }> {
  
  const systemPrompt = queryType === 'numeric' 
    ? "Tu es un assistant d'analyse de données. Réponds précisément aux questions numériques avec les calculs fournis. Utilise les données exactes du contexte."
    : "Tu es un assistant d'analyse de données. Réponds aux questions en utilisant le contexte fourni. Sois précis et informatif.";

  // ✅ UTILISE votre client OpenAI existant
  const completionResult = await openai.createChatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Question: ${question}\n\nContexte des données:\n${context}\n\nRéponds de manière claire et structurée.` }
  ], {
    temperature: 0.1,
    maxTokens: 500
  });

  const answer = completionResult.content || 'Réponse non disponible';
  const tokensUsed = completionResult.tokensUsed || 0;
  
  // Estimation simple de la confiance
  const confidence = answer.length > 50 && !answer.includes('je ne sais pas') ? 0.9 : 0.6;

  return {
    answer,
    confidence,
    tokensUsed
  };
}

// ✅ Endpoint GET pour obtenir la liste des documents - COMPATIBLE
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
      hasPythonAnalysis: !!doc.pythonAnalysis, // ✅ Propriété compatible
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