/**
 * Client pour l'API Python depuis Next.js
 * Orchestration des appels entre Next.js et FastAPI
 */

interface PythonAnalysisResult {
  success: boolean;
  data: {
    extraction: any;
    analysis: any;
    quality: any;
    business_patterns: any;
    recommendations: string[];
  };
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

export class PythonAPIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
  }

  /**
   * Vérifier la santé de l'API Python
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Erreur health check Python API:', error);
      return false;
    }
  }

  /**
   * Extraction et analyse complète d'un fichier
   */
  async extractAndAnalyzeFile(file: File): Promise<PythonAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur extraction Python:', error);
      return {
        success: false,
        data: {
          extraction: {},
          analysis: {},
          quality: {},
          business_patterns: {},
          recommendations: []
        },
        processing_time_ms: 0,
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
   * Traitement orchestré complet : extraction + analyse + insights
   */
  async processFileComplete(file: File): Promise<{
    success: boolean;
    extraction: any;
    analysis: any;
    insights: any;
    recommendations: string[];
    performance: {
      extraction_time: number;
      analysis_time: number;
      total_time: number;
    };
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 1. Extraction et analyse Python
      console.log('🐍 Démarrage extraction Python...');
      const pythonResult = await this.extractAndAnalyzeFile(file);
      
      if (!pythonResult.success) {
        throw new Error(pythonResult.error || 'Erreur extraction Python');
      }

      const extractionTime = pythonResult.processing_time_ms;
      
      // 2. Générer des insights supplémentaires
      const insights = this.generateInsights(pythonResult.data);
      const totalTime = Date.now() - startTime;

      console.log(`✅ Traitement Python terminé en ${totalTime}ms`);

      return {
        success: true,
        extraction: pythonResult.data.extraction,
        analysis: pythonResult.data.analysis,
        insights,
        recommendations: pythonResult.data.recommendations,
        performance: {
          extraction_time: extractionTime,
          analysis_time: totalTime - extractionTime,
          total_time: totalTime
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Erreur traitement complet:', error);
      
      return {
        success: false,
        extraction: {},
        analysis: {},
        insights: {},
        recommendations: ['Erreur lors du traitement du fichier'],
        performance: {
          extraction_time: 0,
          analysis_time: 0,
          total_time: totalTime
        },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
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

      // 2. Traitement selon le type détecté
      let answer: any = {};
      let sources: string[] = ['Python Analysis'];

      if (classification.type === 'numeric' || classification.type === 'hybrid') {
        // Utiliser les agrégations Python
        const aggregationResult = await this.computeAggregations(
          question,
          documentData.dataframe,
          'smart'
        );
        
        if (aggregationResult.success) {
          answer = aggregationResult.aggregations;
          sources.push('Smart Aggregations');
        }
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        answer,
        strategy: classification.suggested_strategy,
        confidence: classification.confidence,
        sources,
        performance: {
          classification_time: classificationTime,
          processing_time: totalTime - classificationTime,
          total_time: totalTime
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ Erreur réponse question:', error);
      
      return {
        success: false,
        answer: {},
        strategy: 'Error fallback',
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
   * Classification simple en fallback
   */
  private simpleFallbackClassification(question: string): 'numeric' | 'semantic' | 'hybrid' {
    const numericKeywords = ['total', 'somme', 'moyenne', 'top', 'combien', 'revenus'];
    const questionLower = question.toLowerCase();
    
    if (numericKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'numeric';
    }
    
    return 'semantic';
  }

  /**
   * Génération d'insights supplémentaires
   */
  private generateInsights(data: any): any {
    const insights = {
      data_quality_summary: {},
      business_highlights: [] as string[],
      performance_metrics: {},
      recommendations_summary: [] as string[]
    };

    try {
      // Résumer la qualité des données
      if (data.quality) {
        insights.data_quality_summary = {
          overall_score: data.quality.overall_score || 0,
          completeness: data.quality.completeness || 0,
          status: data.quality.overall_score > 80 ? 'excellent' : 
                  data.quality.overall_score > 60 ? 'good' : 'needs_attention'
        };
      }

      // Highlights business
      if (data.business_patterns) {
        if (data.business_patterns.exit_employees) {
          insights.business_highlights.push(
            `${data.business_patterns.exit_employees.count || 0} Exit Employees détectés`
          );
        }
        
        if (data.business_patterns.performance_segments) {
          const segments = data.business_patterns.performance_segments;
          insights.business_highlights.push(
            `Segmentation: ${segments.high_performers?.count || 0} top performers`
          );
        }
      }

      // Métriques de performance
      if (data.analysis && data.analysis.basic_stats) {
        const stats = data.analysis.basic_stats;
        const numericColumns = Object.keys(stats);
        
        insights.performance_metrics = {
          numeric_columns_count: numericColumns.length,
          has_correlations: data.analysis.correlations && 
                          Object.keys(data.analysis.correlations).length > 0,
          outliers_detected: data.analysis.outliers && 
                           Object.values(data.analysis.outliers).some((col: any) => col.count > 0)
        };
      }

      // Résumé des recommandations
      if (data.recommendations && Array.isArray(data.recommendations)) {
        insights.recommendations_summary = data.recommendations.slice(0, 3);
      }

    } catch (error) {
      console.warn('Erreur génération insights:', error);
    }

    return insights;
  }
}

// Export du client singleton
export const pythonClient = new PythonAPIClient();

// Types pour TypeScript
export type {
  PythonAnalysisResult,
  QueryClassificationResult,
  AggregationResult
};