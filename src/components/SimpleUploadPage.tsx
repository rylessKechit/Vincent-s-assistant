'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadData {
  success: boolean;
  document?: {
    originalName: string;
    chunksCount: number;
  };
  pythonAnalysis?: {
    success: boolean;
    extraction?: {
      success: boolean;
      dataframe_data?: {
        data: any[][];
        columns: string[];
      };
    };
    analysis?: {
      success: boolean;
      domain_detection?: {
        primary_domain: string;
        confidence: number;
      };
      insights?: string[];
      performance_ranking?: any;
      business_metrics?: {
        identified_metrics: string[];
      };
      analysis_summary?: {
        data_quality_overview?: {
          completeness: number;
        };
      };
    };
    recommendations?: string[];
  };
  keyFacts?: string[];
}

export function CleanUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisData, setAnalysisData] = useState<UploadData | null>(null);

  const generateInsights = (data: UploadData): string[] => {
    const insights: string[] = [];
    
    console.log('🔍 === DEBUG COMPLET ===');
    console.log('📥 Data reçu:', data);
    console.log('✅ Success:', data.success);
    console.log('📄 Document:', data.document);
    console.log('🐍 PythonAnalysis:', data.pythonAnalysis);
    
    if (data.pythonAnalysis?.extraction?.dataframe_data) {
      console.log('📊 Colonnes:', data.pythonAnalysis.extraction.dataframe_data.columns);
      console.log('📈 Nombre de lignes:', data.pythonAnalysis.extraction.dataframe_data.data?.length);
      console.log('🔢 Première ligne:', data.pythonAnalysis.extraction.dataframe_data.data?.[0]);
      console.log('🔢 Deuxième ligne:', data.pythonAnalysis.extraction.dataframe_data.data?.[1]);
    }
    
    // FORCER l'affichage des données brutes qu'on reçoit
    if (data.success && data.document?.originalName) {
      insights.push(`📁 Fichier "${data.document.originalName}" traité par l'IA`);
    }

    // ESSAYER d'analyser même si la structure est bizarre
    const extraction = data.pythonAnalysis?.extraction;
    if (extraction?.dataframe_data) {
      const columns = extraction.dataframe_data.columns;
      const dataRows = extraction.dataframe_data.data;
      
      console.log('🎯 Analyse forcée - Colonnes:', columns);
      console.log('🎯 Analyse forcée - Lignes:', dataRows?.length);
      
      if (columns && dataRows && dataRows.length > 0) {
        insights.push(`📊 ${dataRows.length} lignes × ${columns.length} colonnes analysées`);
        
        // FORCER l'affichage des colonnes
        insights.push(`📋 Colonnes détectées: ${columns.slice(0, 4).join(', ')}${columns.length > 4 ? '...' : ''}`);
        
        // ANALYSER ligne par ligne en mode BRUTE FORCE
        console.log('🔥 ANALYSE BRUTE FORCE des données:');
        
        // Chercher n'importe quelle colonne avec des chiffres
        columns.forEach((col: string, colIndex: number) => {
          console.log(`🔍 Analysing colonne "${col}" (index ${colIndex})`);
          
          // Prendre toutes les valeurs de cette colonne
          const columnValues = dataRows.map((row: any[]) => row[colIndex]);
          console.log(`📈 Valeurs colonne "${col}":`, columnValues.slice(0, 5));
          
          // Si ça ressemble à des pourcentages
          if (col.toLowerCase().includes('upsell') || col.toLowerCase().includes('%') || col.toLowerCase().includes('percentage')) {
            const numericValues: number[] = [];
            
            columnValues.forEach((val: any) => {
              if (val !== null && val !== undefined) {
                const strVal = String(val).replace('%', '').replace(',', '').trim();
                const numVal = parseFloat(strVal);
                if (!isNaN(numVal)) {
                  numericValues.push(numVal);
                }
              }
            });
            
            console.log(`💰 Valeurs numériques extraites pour "${col}":`, numericValues);
            
            if (numericValues.length > 0) {
              const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
              const max = Math.max(...numericValues);
              const min = Math.min(...numericValues);
              
              insights.push(`💰 ${col}: Moyenne ${avg.toFixed(1)}%, Max ${max.toFixed(1)}%, Min ${min.toFixed(1)}%`);
              
              if (max - min > 30) {
                insights.push(`📊 Écart important: ${(max - min).toFixed(1)} points entre meilleur et moins bon`);
              }
            }
          }
          
          // Si ça ressemble à des branches/locations
          if (col.toLowerCase().includes('branch') || col.toLowerCase().includes('location') || col.toLowerCase().includes('station')) {
            const uniqueLocations = Array.from(new Set(columnValues.filter(v => v !== null && v !== undefined && String(v).trim())));
            console.log(`🏢 Locations uniques pour "${col}":`, uniqueLocations);
            
            if (uniqueLocations.length > 0) {
              insights.push(`🏢 ${uniqueLocations.length} points analysés: ${uniqueLocations.slice(0, 3).join(', ')}`);
              
              // Essayer de croiser avec les performances
              const upsellColIndex = columns.findIndex((c: string) => c.toLowerCase().includes('upsell') || c.toLowerCase().includes('%'));
              
              if (upsellColIndex !== -1) {
                console.log('🔗 Croisement performance × location');
                
                const locationPerf: { [key: string]: number[] } = {};
                
                dataRows.forEach((row: any[]) => {
                  const location = String(row[colIndex] || '').trim();
                  const perfValue = String(row[upsellColIndex] || '').replace('%', '').replace(',', '').trim();
                  const perfNum = parseFloat(perfValue);
                  
                  if (location && !isNaN(perfNum)) {
                    if (!locationPerf[location]) locationPerf[location] = [];
                    locationPerf[location].push(perfNum);
                  }
                });
                
                console.log('📊 Performance par location:', locationPerf);
                
                const locationAvgs = Object.entries(locationPerf).map(([loc, values]) => ({
                  location: loc,
                  avg: values.reduce((a, b) => a + b, 0) / values.length
                })).sort((a, b) => b.avg - a.avg);
                
                if (locationAvgs.length > 0) {
                  insights.push(`🏆 Top: ${locationAvgs[0].location} (${locationAvgs[0].avg.toFixed(1)}%)`);
                  if (locationAvgs.length > 1) {
                    insights.push(`📉 Bottom: ${locationAvgs[locationAvgs.length - 1].location} (${locationAvgs[locationAvgs.length - 1].avg.toFixed(1)}%)`);
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Si toujours rien, afficher au moins les données de base
    if (insights.length < 3) {
      insights.push("🤖 Extraction des données réussie");
      insights.push("📊 Données prêtes pour l'analyse approfondie");
      
      // Essayer de récupérer les keyFacts
      if (data.keyFacts && data.keyFacts.length > 0) {
        data.keyFacts.slice(0, 3).forEach(fact => {
          insights.push(`💡 ${fact}`);
        });
      }
    }
    
    console.log('🎯 Insights finaux générés:', insights);
    return insights.slice(0, 8);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisData(null);

    try {
      setUploadProgress(25);
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(50);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(75);
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const result = await response.json();
      setUploadProgress(100);

      setAnalysisData(result);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 800);

    } catch (error) {
      console.error('Erreur upload:', error);
      setIsUploading(false);
      setUploadProgress(0);
      setAnalysisData({
        success: false,
        keyFacts: [`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]
      });
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

  const insights = analysisData ? generateInsights(analysisData) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-orange-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Assistant IA - Analyse de Données</h1>
              <p className="text-sm text-orange-600 font-medium">Powered by Ryless 💪🏼</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Upload Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200/50 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
            <span className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
              📁
            </span>
            Upload de Fichier
          </h2>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer
              ${isDragActive 
                ? 'border-orange-400 bg-orange-50 scale-[1.02]' 
                : 'border-orange-300 bg-orange-50/30 hover:bg-orange-50/50 hover:border-orange-400'
              }
              ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {isUploading ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl animate-pulse">
                  🚀
                </div>
                <div>
                  <p className="text-xl font-semibold text-orange-800 mb-3">Analyse en cours...</p>
                  <div className="bg-orange-200 rounded-full h-4 max-w-md mx-auto mb-3">
                    <div 
                      className="bg-orange-500 h-4 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-orange-600">
                    {uploadProgress < 30 ? 'Envoi du fichier...' :
                     uploadProgress < 60 ? 'Extraction des données...' :
                     uploadProgress < 90 ? 'Analyse IA en cours...' :
                     'Finalisation...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl">
                  {isDragActive ? '📥' : '📊'}
                </div>
                
                <div>
                  <p className="text-2xl font-bold text-slate-800 mb-2">
                    {isDragActive ? 'Déposez votre fichier ici' : 'Analysez vos données instantanément'}
                  </p>
                  <p className="text-slate-600 text-lg mb-6">
                    Glissez-déposez ou cliquez pour uploader vos fichiers
                  </p>
                  <p className="text-slate-500 mb-6">
                    Formats supportés: CSV, Excel, PDF, TXT • Maximum 50MB
                  </p>
                  
                  <div className="flex justify-center space-x-6">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-orange-100 rounded-lg border border-orange-200">
                      <span className="text-xl">🤖</span>
                      <span className="text-sm font-medium text-orange-800">IA Intégrée</span>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 rounded-lg border border-emerald-200">
                      <span className="text-xl">⚡</span>
                      <span className="text-sm font-medium text-emerald-800">Ultra-rapide</span>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-lg border border-blue-200">
                      <span className="text-xl">📊</span>
                      <span className="text-sm font-medium text-blue-800">Analyse Auto</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <div data-insights className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 p-8 mb-8">
            <h3 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
              <span className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                💡
              </span>
              Insights de l'Analyse
            </h3>
            
            <div className="grid gap-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-emerald-900 font-medium leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Preview Section */}
        {analysisData?.pythonAnalysis?.extraction?.dataframe_data && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 p-8 mb-8">
            <h3 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center">
              <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                📋
              </span>
              Aperçu des Données
            </h3>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {analysisData.pythonAnalysis.extraction.dataframe_data.data?.length.toLocaleString() || 0}
                </div>
                <div className="text-blue-600 font-medium">Lignes</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-6 text-center border border-purple-200">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {analysisData.pythonAnalysis.extraction.dataframe_data.columns?.length || 0}
                </div>
                <div className="text-purple-600 font-medium">Colonnes</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {analysisData.pythonAnalysis?.analysis?.analysis_summary?.data_quality_overview?.completeness || 'N/A'}
                  {analysisData.pythonAnalysis?.analysis?.analysis_summary?.data_quality_overview?.completeness ? '%' : ''}
                </div>
                <div className="text-green-600 font-medium">Qualité</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-6 text-center border border-orange-200">
                <div className="text-3xl font-bold text-orange-700 mb-2">✅</div>
                <div className="text-orange-600 font-medium">Analysé</div>
              </div>
            </div>
            
            {/* Table Preview */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      {analysisData.pythonAnalysis.extraction.dataframe_data.columns?.map((col, idx) => (
                        <th key={idx} className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analysisData.pythonAnalysis.extraction.dataframe_data.data?.slice(0, 5).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-6 py-4 text-sm text-slate-600">
                            {cell?.toString() || 'N/A'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(analysisData.pythonAnalysis.extraction.dataframe_data.data?.length || 0) > 5 && (
                <div className="px-6 py-3 bg-slate-100 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    ... et {(analysisData.pythonAnalysis.extraction.dataframe_data.data?.length || 0) - 5} autres lignes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Call to Action */}
        {analysisData?.success && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">🚀 Vos données sont prêtes !</h3>
            <p className="text-orange-100 text-lg mb-6">
              L'IA a terminé l'analyse. Vous pouvez maintenant poser des questions sur vos données.
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => {
                  // Ouvrir une interface de chat ou rediriger
                  const message = encodeURIComponent("Quels sont les top performers dans mes données ?");
                  window.open(`/chat?message=${message}`, '_blank');
                }}
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center space-x-2"
              >
                <span>💬</span>
                <span>Poser une question</span>
              </button>
              <button 
                onClick={() => {
                  // Scroll vers les insights ou afficher plus de détails
                  const insightsSection = document.querySelector('[data-insights]');
                  if (insightsSection) {
                    insightsSection.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    // Afficher une modal avec plus d'insights
                    alert('Plus d\'insights détaillés bientôt disponibles !');
                  }
                }}
                className="bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-800 transition-colors flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Voir plus d'insights</span>
              </button>
            </div>
            
            {/* Actions rapides additionnelles */}
            <div className="mt-6 pt-6 border-t border-orange-400/30">
              <p className="text-orange-100 text-sm mb-4">Actions rapides :</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2))}
                  className="bg-orange-600/50 hover:bg-orange-600/70 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  📋 Copier les données
                </button>
                <button 
                  onClick={() => {
                    const dataStr = JSON.stringify(insights, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'insights-analysis.json';
                    link.click();
                  }}
                  className="bg-orange-600/50 hover:bg-orange-600/70 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  💾 Télécharger rapport
                </button>
                <button 
                  onClick={() => {
                    setAnalysisData(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-orange-600/50 hover:bg-orange-600/70 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  🔄 Nouveau fichier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}