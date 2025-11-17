/**
 * Client Python - VERSION VERCEL COMPATIBLE
 * Traitement DIRECT des fichiers sans stockage local
 */

// Types pour les réponses Python
interface PythonExtractionResult {
  success: boolean;
  data: any;
  processing_time_ms: number;
  error?: string;
}

interface QueryClassificationResult {
  type: 'numeric' | 'semantic' | 'hybrid';
  confidence: number;
  relevant_columns: string[];
  suggested_strategy: string;
  processing_time_ms: number;
}

interface AggregationResult {
  success: boolean;
  aggregations: any;
  processing_time_ms: number;
}

class PythonClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PYTHON_API_URL || 'http://localhost:8001';
  }

  /**
   * ✅ NOUVEAU: Extraction DIRECTE sans fichier temporaire
   */
  async extractAndAnalyzeFile(file: File): Promise<PythonExtractionResult> {
    try {
      // ✅ Convertir le fichier en buffer directement
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // ✅ Créer FormData avec le buffer directement
      const formData = new FormData();
      
      // Créer un nouveau File object à partir du buffer
      const fileBlob = new Blob([buffer], { type: file.type });
      const fileObject = new File([fileBlob], file.name, { type: file.type });
      
      formData.append('file', fileObject);
      formData.append('filename', file.name);
      formData.append('analysis_level', 'complete');

      console.log(`🐍 Envoi vers Python API: ${file.name} (${file.size} bytes)`);

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        body: formData, // FormData avec fichier direct
        // Ne pas définir Content-Type, fetch le fait automatiquement
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail: string;
        
        try {
          const errorData = JSON.parse(errorText);
          errorDetail = errorData.detail || errorData.error || errorText;
        } catch {
          errorDetail = errorText || `HTTP ${response.status}`;
        }
        
        throw new Error(`Erreur Python API: ${errorDetail}`);
      }

      const result = await response.json();
      
      console.log('✅ Réponse Python reçue avec succès');
      return {
        success: true,
        data: result,
        processing_time_ms: result.performance?.total_time || 0
      };

    } catch (error) {
      console.error('❌ Erreur extraction Python:', error);
      return {
        success: false,
        data: {},
        processing_time_ms: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ✅ NOUVEAU: Traitement orchestré complet DIRECT
   */
  async processFileComplete(file: File): Promise<{
    success: boolean;
    data: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 1. Extraction et analyse Python DIRECTE
      console.log('🐍 Démarrage extraction Python directe...');
      const pythonResult = await this.extractAndAnalyzeFile(file);
      
      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Erreur extraction Python');
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ Traitement Python terminé en ${totalTime}ms`);

      // 2. Structure de réponse enrichie
      return {
        success: true,
        data: {
          extraction: pythonResult.data.extraction,
          analysis: pythonResult.data.analysis,
          insights: pythonResult.data.insights || {},
          recommendations: pythonResult.data.recommendations || [],
          performance: {
            extraction_time: pythonResult.processing_time_ms,
            analysis_time: totalTime - pythonResult.processing_time_ms,
            total_time: totalTime
          }
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Erreur traitement complet:', error);
      
      return {
        success: false,
        data: {
          extraction: {},
          analysis: {},
          insights: {},
          recommendations: ['Erreur lors du traitement du fichier'],
          performance: {
            extraction_time: 0,
            analysis_time: 0,
            total_time: totalTime
          }
        },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Classification intelligente d'une question
   */
  async classifyQuery(
    question: string,
    availableColumns: string[],
    context?: any
  ): Promise<QueryClassificationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          available_columns: availableColumns,
          context: context || {}
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur classification Python:', error);
      
      // Fallback vers classification simple
      return {
        type: this.simpleFallbackClassification(question),
        confidence: 0.5,
        relevant_columns: [],
        suggested_strategy: 'Classification par fallback',
        processing_time_ms: 0
      };
    }
  }

  /**
   * Calculs d'agrégations avancées
   */
  async computeAggregations(
    question: string,
    dataframeData: any,
    aggregationType: 'smart' | 'statistical' | 'business' = 'smart'
  ): Promise<AggregationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/aggregate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          dataframe_data: dataframeData,
          aggregation_type: aggregationType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur agrégations Python:', error);
      return {
        success: false,
        aggregations: {},
        processing_time_ms: 0
      };
    }
  }

  /**
   * Orchestration intelligente des questions
   */
  async answerQuestion(
    question: string,
    documentData: any,
    availableColumns: string[]
  ): Promise<{
    success: boolean;
    answer: any;
    strategy: string;
    confidence: number;
    sources: string[];
    performance: {
      classification_time: number;
      processing_time: number;
      total_time: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // 1. Classification de la question
      console.log('🧠 Classification de la question...');
      const classification = await this.classifyQuery(question, availableColumns);
      const classificationTime = Date.now() - startTime;

      // 2. Traiter selon le type de question
      let answer: any;
      let strategy: string;

      if (classification.type === 'numeric' || classification.type === 'hybrid') {
        // Questions numériques -> Agrégations
        const aggResult = await this.computeAggregations(question, documentData);
        answer = aggResult.aggregations;
        strategy = 'python_aggregations';
      } else {
        // Questions sémantiques -> Recherche
        answer = { 
          message: 'Question sémantique - utiliser la recherche vectorielle',
          suggested_approach: 'semantic_search'
        };
        strategy = 'semantic_search';
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        answer,
        strategy,
        confidence: classification.confidence,
        sources: classification.relevant_columns,
        performance: {
          classification_time: classificationTime,
          processing_time: totalTime - classificationTime,
          total_time: totalTime
        }
      };

    } catch (error) {
      console.error('❌ Erreur traitement question:', error);
      
      const totalTime = Date.now() - startTime;
      return {
        success: false,
        answer: { error: 'Erreur lors du traitement de la question' },
        strategy: 'error',
        confidence: 0,
        sources: [],
        performance: {
          classification_time: 0,
          processing_time: 0,
          total_time: totalTime
        }
      };
    }
  }

  /**
   * Classification simple de fallback
   */
  private simpleFallbackClassification(question: string): 'numeric' | 'semantic' {
    const numericKeywords = [
      'total', 'somme', 'moyenne', 'maximum', 'minimum', 'combien',
      'prix', 'revenus', 'IRPD', 'agent', 'performance', '%',
      'compare', 'évolution', 'tendance', 'top', 'classement'
    ];

    const lowerQuestion = question.toLowerCase();
    const hasNumericKeywords = numericKeywords.some(keyword => 
      lowerQuestion.includes(keyword.toLowerCase())
    );

    return hasNumericKeywords ? 'numeric' : 'semantic';
  }

  /**
   * Générer des insights automatiques
   */
  private generateInsights(data: any): any {
    const insights: any = {
      summary: 'Données analysées avec succès',
      key_metrics: [],
      anomalies: [],
      trends: []
    };

    // Ajouter des insights basiques basés sur les patterns détectés
    if (data.analysis?.business_patterns) {
      const patterns = data.analysis.business_patterns;
      
      if (patterns.sixt_agents?.total_agents) {
        insights.key_metrics.push(`${patterns.sixt_agents.total_agents} agents SIXT détectés`);
      }
      
      if (patterns.financial_data?.total_revenue) {
        insights.key_metrics.push(`Revenue total: ${patterns.financial_data.total_revenue}`);
      }
      
      if (patterns.exit_employees?.count) {
        insights.anomalies.push(`${patterns.exit_employees.count} Exit Employees identifiés`);
      }
    }

    return insights;
  }

  /**
   * ✅ Vérifier la disponibilité de l'API Python
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Python API non disponible:', error);
      return false;
    }
  }
}

// Export du client singleton
export const pythonClient = new PythonClient();

// Export des types pour utilisation ailleurs
export type {
  PythonExtractionResult,
  QueryClassificationResult,
  AggregationResult
};