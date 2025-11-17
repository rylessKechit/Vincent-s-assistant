'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadState {
  stage: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  file?: File;
  error?: string;
}

interface AnalysisData {
  success: boolean;
  documentId: string;
  filename: string;
  type: string;
  summary: string;
  keyFacts: string[];
  chunksCount: number;
  tokensUsed: number;
  processingTimeMs: number;
  pythonAnalysis?: {
    extraction: {
      metadata: {
        shape: { rows: number; columns: number };
        columns: string[];
        encoding: string;
        filename: string;
      };
      dataframe_data: {
        columns: string[];
        data: Record<string, any>[];  // ✅ Chaque row est un OBJET, pas un tableau
        shape: { rows: number; columns: number };
      };
    };
    analysis: any;
    insights: {
      business_highlights: string[];
    };
    recommendations: string[];
  };
}

export default function SimpleUploadPage() {
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0
  });
  
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadState({
        stage: 'error',
        progress: 0,
        error: 'Seuls les fichiers CSV sont supportés'
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      setUploadState({
        stage: 'error',
        progress: 0,
        error: 'Fichier trop volumineux (max 50MB)'
      });
      return;
    }

    setUploadState({
      stage: 'uploading',
      progress: 10,
      file
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulation progress
      setUploadState(prev => ({ ...prev, progress: 30 }));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      setUploadState(prev => ({ ...prev, progress: 70 }));

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur upload');
      }

      setUploadState(prev => ({ ...prev, progress: 90, stage: 'analyzing' }));

      // Attendre un peu pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 500));

      setUploadState({
        stage: 'completed',
        progress: 100
      });

      setAnalysisData(result);

    } catch (error: any) {
      console.error('Erreur upload:', error);
      setUploadState({
        stage: 'error',
        progress: 0,
        error: error.message || 'Erreur lors de l\'upload'
      });
    }
  }, []);

  const resetUpload = () => {
    setUploadState({ stage: 'idle', progress: 0 });
    setAnalysisData(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: uploadState.stage === 'uploading' || uploadState.stage === 'analyzing'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 AI Data Analyzer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Uploadez votre fichier CSV et obtenez une analyse automatique avec des insights métier en quelques secondes
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Upload Zone */}
          {uploadState.stage === 'idle' && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
                ${isDragActive
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }
              `}
            >
              <input {...getInputProps()} />
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-xl font-semibold text-gray-900">
                    {isDragActive ? 'Déposez votre fichier ici' : 'Glissez votre CSV ou cliquez pour sélectionner'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Maximum 50MB • Format CSV uniquement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {(uploadState.stage === 'uploading' || uploadState.stage === 'analyzing') && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="space-y-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full"></div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {uploadState.stage === 'uploading' ? '📤 Upload en cours...' : '🧠 Analyse IA en cours...'}
                  </h3>
                  <p className="text-gray-600">
                    {uploadState.stage === 'uploading' 
                      ? 'Envoi du fichier vers le serveur'
                      : 'Extraction des données et génération des insights'
                    }
                  </p>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                
                <p className="text-sm text-gray-500">{uploadState.progress}% terminé</p>
              </div>
            </div>
          )}

          {/* Error */}
          {uploadState.stage === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-red-900 mb-2">❌ Erreur</h3>
                  <p className="text-red-700 mb-4">{uploadState.error}</p>
                  
                  <button
                    onClick={resetUpload}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {uploadState.stage === 'completed' && analysisData && (
            <div className="space-y-6">
              {/* Success Header */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-emerald-900 mb-2">✅ Analyse terminée !</h3>
                    <p className="text-emerald-700">
                      Fichier traité en {analysisData.processingTimeMs}ms • {analysisData.tokensUsed} tokens OpenAI utilisés
                    </p>
                    
                    <button
                      onClick={resetUpload}
                      className="mt-4 bg-white text-emerald-600 border border-emerald-300 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                    >
                      Analyser un autre fichier
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Résumé automatique
                </h4>
                <p className="text-gray-700 leading-relaxed">{analysisData.summary}</p>
              </div>

              {/* Key Facts */}
              {analysisData.keyFacts?.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                    Points clés détectés
                  </h4>
                  <ul className="space-y-2">
                    {analysisData.keyFacts.map((fact, idx) => (
                      <li key={idx} className="text-gray-700 flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Python Analysis */}
              {analysisData.pythonAnalysis && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Analyse approfondie (Python)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysisData.pythonAnalysis.extraction?.metadata?.shape?.rows?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Lignes analysées</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {analysisData.pythonAnalysis.extraction?.metadata?.shape?.columns || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Colonnes détectées</div>
                    </div>
                  </div>

                  {/* Insights métier */}
                  {analysisData.pythonAnalysis.insights?.business_highlights && (
                    <div className="mb-6">
                      <h5 className="font-medium text-gray-900 mb-3">🎯 Insights métier générés :</h5>
                      <div className="space-y-2">
                        {analysisData.pythonAnalysis.insights.business_highlights.map((insight, idx) => (
                          <div key={idx} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                            <p className="text-blue-800">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Échantillon de données - CORRIGÉ */}
                  {analysisData.pythonAnalysis.extraction?.dataframe_data?.data && (
                    <div className="mt-6">
                      <h5 className="font-medium text-gray-900 mb-3">📊 Échantillon de données :</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              {/* ✅ Utiliser les colonnes du metadata */}
                              {analysisData.pythonAnalysis.extraction.dataframe_data.columns.map((column, colIdx) => (
                                <th key={colIdx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* ✅ CORRECTION: Traiter chaque row comme un OBJET */}
                            {analysisData.pythonAnalysis.extraction.dataframe_data.data?.slice(0, 5).map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-slate-50">
                                {/* ✅ CORRECTION: Utiliser les colonnes pour extraire les valeurs */}
                                {analysisData.pythonAnalysis!.extraction.dataframe_data.columns.map((column, colIdx) => (
                                  <td key={colIdx} className="px-6 py-4 text-sm text-slate-600 border-r border-gray-100">
                                    {row[column]?.toString() || 'N/A'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {/* Info supplémentaire */}
                        <p className="text-xs text-gray-500 mt-2">
                          Affichage des 5 premières lignes sur {analysisData.pythonAnalysis.extraction.metadata?.shape?.rows?.toLocaleString()} total
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommandations */}
                  {analysisData.pythonAnalysis.recommendations?.length > 0 && (
                    <div className="mt-6">
                      <h5 className="font-medium text-gray-900 mb-3">💡 Recommandations :</h5>
                      <div className="space-y-2">
                        {analysisData.pythonAnalysis.recommendations.slice(0, 5).map((rec, idx) => (
                          <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <p className="text-yellow-800">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 Métadonnées de traitement</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Document ID:</span>
                    <div className="font-mono text-xs text-gray-800 break-all">{analysisData.documentId}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <div className="font-medium text-gray-900">{analysisData.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Chunks créés:</span>
                    <div className="font-medium text-gray-900">{analysisData.chunksCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Encodage:</span>
                    <div className="font-medium text-gray-900">
                      {analysisData.pythonAnalysis?.extraction?.metadata?.encoding || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}