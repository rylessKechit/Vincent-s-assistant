'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export function UploadSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [aiOpinion, setAiOpinion] = useState<string>('');

  const updateHighlights = (analysis: any) => {
    const newHighlights: string[] = [];
    
    if (analysis?.domain_detection?.primary_domain) {
      const domain = analysis.domain_detection.primary_domain;
      const confidence = Math.round((analysis.domain_detection.confidence || 0) * 100);
      
      if (domain === 'rental_car') {
        newHighlights.push(`🚗 Secteur location de voitures détecté (${confidence}% confiance)`);
      } else if (domain === 'sales') {
        newHighlights.push(`💼 Données de ventes identifiées (${confidence}% confiance)`);
      } else if (domain === 'hr') {
        newHighlights.push(`👥 Données RH détectées (${confidence}% confiance)`);
      } else {
        newHighlights.push(`📊 Domaine: ${domain} (${confidence}% confiance)`);
      }
    }

    // Highlights sur les métriques
    if (analysis?.business_metrics?.identified_metrics?.length > 0) {
      const metricsCount = analysis.business_metrics.identified_metrics.length;
      newHighlights.push(`📈 ${metricsCount} métriques business identifiées automatiquement`);
    }

    // Highlights sur les performances
    if (analysis?.performance_ranking) {
      const rankings = Object.keys(analysis.performance_ranking);
      if (rankings.length > 0) {
        newHighlights.push(`🏆 Classements de performance disponibles pour ${rankings.length} métriques`);
      }
    }

    // Highlights sur la qualité des données
    if (analysis?.analysis_summary?.data_quality_overview?.completeness) {
      const completeness = analysis.analysis_summary.data_quality_overview.completeness;
      if (completeness > 95) {
        newHighlights.push(`✅ Excellente qualité des données (${completeness}% complet)`);
      } else if (completeness > 80) {
        newHighlights.push(`⚠️ Bonne qualité des données (${completeness}% complet)`);
      } else {
        newHighlights.push(`❌ Qualité des données à améliorer (${completeness}% complet)`);
      }
    }

    // Highlights sur les insights
    if (analysis?.insights?.length > 0) {
      const keyInsight = analysis.insights[0];
      newHighlights.push(`💡 Insight principal: ${keyInsight}`);
    }

    setHighlights(newHighlights.slice(0, 5)); // Limiter à 5 highlights
  };

  const generateAiOpinion = (analysis: any) => {
    let opinion = '';
    
    // Opinion sur le domaine
    const domain = analysis?.domain_detection?.primary_domain;
    const confidence = analysis?.domain_detection?.confidence || 0;
    
    if (confidence > 0.8) {
      opinion += `🎯 **Détection excellent** - J'ai identifié clairement qu'il s'agit de données ${domain}. `;
    } else if (confidence > 0.5) {
      opinion += `🤔 **Détection modérée** - Les données semblent être du type ${domain} mais avec quelques incertitudes. `;
    }

    // Opinion sur la structure
    const rows = analysis?.analysis_summary?.dataset_characteristics?.rows || 0;
    const columns = analysis?.analysis_summary?.dataset_characteristics?.columns || 0;
    
    if (rows > 1000 && columns > 10) {
      opinion += `📊 **Dataset riche** - Avec ${rows} lignes et ${columns} colonnes, vous avez suffisamment de données pour des analyses approfondies. `;
    } else if (rows < 100) {
      opinion += `⚠️ **Dataset limité** - Avec seulement ${rows} lignes, les analyses statistiques seront limitées. `;
    }

    // Opinion sur les métriques
    const metricsCount = analysis?.business_metrics?.identified_metrics?.length || 0;
    if (metricsCount > 5) {
      opinion += `🚀 **Très analytique** - ${metricsCount} métriques détectées, excellent pour le suivi de performance. `;
    } else if (metricsCount > 0) {
      opinion += `📈 **Bon potentiel** - ${metricsCount} métriques trouvées pour vos analyses. `;
    }

    // Opinion sur les recommandations
    const recommendations = analysis?.analysis_summary?.analysis_recommendations;
    if (recommendations?.length > 0) {
      opinion += `💼 **Actionnable** - J'ai ${recommendations.length} recommandations concrètes pour optimiser vos résultats.`;
    }

    if (!opinion) {
      opinion = '🤖 En attente d\'une analyse plus approfondie pour donner mon avis...';
    }

    setAiOpinion(opinion);
  };

  const updateDisplaySections = (analysis: any) => {
    updateHighlights(analysis);
    generateAiOpinion(analysis);
    
    // Mettre à jour l'affichage dans le DOM
    const highlightsElement = document.getElementById('analysis-highlights');
    if (highlightsElement && highlights.length > 0) {
      highlightsElement.innerHTML = `
        <div class="space-y-3">
          <div class="text-sm text-slate-600 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p class="font-medium text-emerald-800 mb-3">🔥 Points clés détectés :</p>
            <div class="space-y-2">
              ${highlights.map(highlight => 
                `<div class="flex items-start space-x-2">
                  <span class="text-emerald-600 mt-0.5">•</span>
                  <span class="text-emerald-700 text-sm">${highlight}</span>
                </div>`
              ).join('')}
            </div>
          </div>
        </div>
      `;
    }
    
    const opinionElement = document.getElementById('ai-opinion');
    if (opinionElement && aiOpinion) {
      opinionElement.innerHTML = `
        <div class="space-y-3">
          <div class="text-sm text-slate-600 bg-violet-50 p-4 rounded-lg border border-violet-200">
            <p class="font-medium text-violet-800 mb-3">🧠 Mon analyse experte :</p>
            <div class="text-violet-700 text-sm leading-relaxed">
              ${aiOpinion}
            </div>
          </div>
        </div>
      `;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisResult(null);

    try {
      // Phase 1: Upload
      setUploadProgress(20);
      const formData = new FormData();
      formData.append('file', file);

      // Phase 2: Envoi
      setUploadProgress(40);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Phase 3: Réception
      setUploadProgress(70);
      const result = await response.json();

      // Phase 4: Analyse
      setUploadProgress(90);
      
      if (result.success) {
        setAnalysisResult(result);
        
        // Mettre à jour les sections highlights et opinion
        updateDisplaySections(result);
        
        setUploadProgress(100);
        
        // Notification de succès
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 1000);
      } else {
        throw new Error(result.error || 'Erreur lors de l\'analyse');
      }

    } catch (error) {
      console.error('Erreur upload:', error);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Afficher l'erreur dans les highlights
      const highlightsElement = document.getElementById('analysis-highlights');
      if (highlightsElement) {
        highlightsElement.innerHTML = `
          <div class="text-sm text-slate-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <p class="font-medium text-red-800 mb-2">❌ Erreur d'analyse :</p>
            <p class="text-red-700">${error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          </div>
        `;
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-6">
      {/* Zone de drop principale */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-orange-400 bg-orange-50 scale-105' 
            : 'border-orange-300 bg-orange-50/30 hover:bg-orange-50/50 hover:border-orange-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-orange-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-orange-800">Analyse en cours...</p>
              <p className="text-sm text-orange-600 mt-1">
                {uploadProgress < 40 ? 'Envoi du fichier...' :
                 uploadProgress < 70 ? 'Traitement des données...' :
                 uploadProgress < 90 ? 'Génération des insights...' :
                 'Finalisation...'}
              </p>
              <div className="mt-3 bg-orange-200 rounded-full h-2 max-w-xs mx-auto">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              {isDragActive ? (
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 13l3-3m0 0l3 3m3-3v12" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </div>
            
            <div>
              <p className="text-lg font-semibold text-slate-800">
                {isDragActive ? 'Déposez votre fichier ici' : 'Glissez-déposez ou cliquez pour uploader'}
              </p>
              <p className="text-sm text-slate-600 mt-2">
                CSV, Excel, PDF, TXT - Maximum 50MB
              </p>
              <div className="flex justify-center space-x-4 mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  📊 Analyse automatique
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  🤖 IA intégrée
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  ⚡ Ultra-rapide
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Résumé de l'analyse */}
      {analysisResult && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">📋 Résumé de l'Analyse</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">
                {analysisResult?.analysis_summary?.dataset_characteristics?.rows || 0}
              </div>
              <div className="text-sm text-blue-600 font-medium">Lignes</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">
                {analysisResult?.analysis_summary?.dataset_characteristics?.columns || 0}
              </div>
              <div className="text-sm text-purple-600 font-medium">Colonnes</div>
            </div>
            
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-700">
                {analysisResult?.analysis_summary?.data_quality_overview?.completeness || 0}%
              </div>
              <div className="text-sm text-emerald-600 font-medium">Qualité</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">
                {Math.round((analysisResult?.domain_detection?.confidence || 0) * 100)}%
              </div>
              <div className="text-sm text-orange-600 font-medium">Confiance IA</div>
            </div>
          </div>

          {/* Domaine détecté */}
          {analysisResult?.domain_detection?.primary_domain && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <span className="font-medium">🎯 Domaine identifié:</span>
                <span className="ml-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium border border-orange-200">
                  {analysisResult.domain_detection.primary_domain}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}