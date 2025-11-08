'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ClarificationModal } from './ClarificationModal';

interface UploadState {
  stage: 'idle' | 'uploading' | 'clarifying' | 'analyzing' | 'completed' | 'error';
  progress: number;
  file?: File;
  clarifications?: Array<{
    term: string;
    reason: string;
    examples: string[];
  }>;
  result?: {
    documentId: string;
    filename: string;
    rowsProcessed: number;
    chunksCreated: number;
    tokensUsed: number;
  };
  error?: string;
}

export function UploadSection() {
  const [uploadState, setUploadState] = useState<UploadState>({ 
    stage: 'idle', 
    progress: 0 
  });

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
      // 1. Upload du fichier
      const formData = new FormData();
      formData.append('file', file);

      setUploadState(prev => ({ ...prev, progress: 30 }));

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Erreur upload');
      }

      // 2. Vérifier s'il faut des clarifications
      setUploadState(prev => ({ ...prev, progress: 50, stage: 'clarifying' }));
      
      const clarificationResponse = await fetch('/api/clarification/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          documentId: uploadResult.document.id,
          headers: uploadResult.document.headers 
        })
      });

      const clarificationResult = await clarificationResponse.json();

      if (clarificationResult.needsClarification && clarificationResult.termsToAsk?.length > 0) {
        // Il faut des clarifications
        setUploadState(prev => ({ 
          ...prev, 
          clarifications: clarificationResult.termsToAsk,
          progress: 60 
        }));
      } else {
        // Pas de clarifications nécessaires, continuer l'analyse
        setUploadState(prev => ({ ...prev, progress: 80, stage: 'analyzing' }));
        
        // Finaliser l'analyse
        const finalResponse = await fetch('/api/upload/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: uploadResult.document.id 
          })
        });

        const finalResult = await finalResponse.json();

        if (finalResult.success) {
          setUploadState({
            stage: 'completed',
            progress: 100,
            result: {
              documentId: finalResult.documentId,
              filename: file.name,
              rowsProcessed: finalResult.stats?.rowsProcessed || 0,
              chunksCreated: finalResult.stats?.chunksCreated || 0,
              tokensUsed: finalResult.stats?.tokensUsed || 0
            }
          });
        } else {
          throw new Error(finalResult.error);
        }
      }

    } catch (error: any) {
      setUploadState({
        stage: 'error',
        progress: 0,
        error: error.message || 'Erreur lors du traitement'
      });
    }
  }, []);

  const handleClarificationComplete = async (clarifications: Record<string, string>) => {
    setUploadState(prev => ({ ...prev, progress: 80, stage: 'analyzing' }));

    try {
      // Envoyer les clarifications et finaliser l'analyse
      const response = await fetch('/api/clarification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clarifications 
        })
      });

      const result = await response.json();

      if (result.success) {
        setUploadState({
          stage: 'completed',
          progress: 100,
          result: {
            documentId: result.documentId,
            filename: uploadState.file?.name || 'Document',
            rowsProcessed: result.stats?.rowsProcessed || 0,
            chunksCreated: result.stats?.chunksCreated || 0,
            tokensUsed: result.stats?.tokensUsed || 0
          }
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      setUploadState({
        stage: 'error',
        progress: 0,
        error: error.message || 'Erreur lors du traitement des clarifications'
      });
    }
  };

  const resetUpload = () => {
    setUploadState({ stage: 'idle', progress: 0 });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: uploadState.stage !== 'idle'
  });

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-orange-400 bg-orange-50/50' 
            : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/30'
          }
          ${uploadState.stage !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-3">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-900">
              {isDragActive 
                ? 'Déposez votre fichier CSV ici' 
                : 'Glissez votre fichier CSV ou cliquez pour sélectionner'
              }
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Maximum 50MB • Format CSV uniquement
            </p>
          </div>
        </div>
      </div>

      {/* Progress & Status */}
      {uploadState.stage !== 'idle' && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {uploadState.stage === 'uploading' && (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="text-sm text-slate-700">Upload en cours...</span>
                </>
              )}
              {uploadState.stage === 'clarifying' && (
                <>
                  <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-700">Analyse des termes...</span>
                </>
              )}
              {uploadState.stage === 'analyzing' && (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                  <span className="text-sm text-slate-700">Analyse IA en cours...</span>
                </>
              )}
              {uploadState.stage === 'completed' && (
                <>
                  <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-emerald-700 font-medium">Analyse terminée !</span>
                </>
              )}
              {uploadState.stage === 'error' && (
                <>
                  <div className="w-4 h-4 bg-red-500 rounded-full" />
                  <span className="text-sm text-red-700 font-medium">Erreur</span>
                </>
              )}
            </div>

            <span className="text-xs text-slate-500">
              {uploadState.progress}%
            </span>
          </div>

          {/* Error Message */}
          {uploadState.stage === 'error' && uploadState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{uploadState.error}</p>
              <button
                onClick={resetUpload}
                className="text-xs text-red-600 underline mt-2 hover:text-red-800"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Success Result */}
          {uploadState.stage === 'completed' && uploadState.result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <h3 className="text-sm font-medium text-emerald-800">
                {uploadState.result.filename}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                <div>📊 {uploadState.result.rowsProcessed} lignes</div>
                <div>📦 {uploadState.result.chunksCreated} chunks</div>
                <div>🔮 {uploadState.result.tokensUsed} tokens</div>
                <div>💰 ~${((uploadState.result.tokensUsed * 0.0001) / 1000).toFixed(4)}</div>
              </div>
              <button
                onClick={resetUpload}
                className="text-xs text-emerald-600 underline hover:text-emerald-800"
              >
                Analyser un autre fichier
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clarification Modal */}
      {uploadState.stage === 'clarifying' && uploadState.clarifications && (
        <ClarificationModal
          terms={uploadState.clarifications}
          onComplete={handleClarificationComplete}
          onCancel={resetUpload}
        />
      )}
    </div>
  );
}