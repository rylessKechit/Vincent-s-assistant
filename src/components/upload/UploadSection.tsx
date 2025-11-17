'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadState {
  stage: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  file?: File;
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

      setUploadState(prev => ({ ...prev, progress: 70, stage: 'analyzing' }));

      // Simulation analyse
      setTimeout(() => {
        setUploadState({
          stage: 'completed',
          progress: 100,
          result: {
            documentId: uploadResult.document?.id || 'test',
            filename: file.name,
            rowsProcessed: uploadResult.document?.chunksCount || 0,
            chunksCreated: uploadResult.document?.chunksCount || 0,
            tokensUsed: uploadResult.document?.tokensUsed || 0
          }
        });
      }, 2000);

    } catch (error: any) {
      setUploadState({
        stage: 'error',
        progress: 0,
        error: error.message || 'Erreur de traitement'
      });
    }
  }, []);

  const resetUpload = () => {
    setUploadState({ stage: 'idle', progress: 0 });
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
    <div className="space-y-4">
      
      {/* Zone de Drop */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/50'
          }
          ${uploadState.stage !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploadState.stage === 'idle' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Dépose ton fichier ici' : 'Glisse ton fichier CSV'}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                ou clique pour sélectionner
              </p>
              <p className="text-xs text-gray-500">
                Max 50MB • Format CSV uniquement
              </p>
            </div>
            
            <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
              Parcourir
            </button>
          </div>
        )}

        {(uploadState.stage === 'uploading' || uploadState.stage === 'analyzing') && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <div className="animate-spin w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full"></div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {uploadState.stage === 'uploading' ? 'Upload en cours...' : 'Analyse IA...'}
              </h3>
              <p className="text-sm text-gray-600">
                {uploadState.stage === 'uploading' 
                  ? 'Envoi sécurisé de tes données'
                  : 'Extraction des insights par l\'IA'
                }
              </p>
            </div>

            {/* Barre de Progress */}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progression</span>
                <span className="text-gray-900 font-medium">{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>

            {/* Info Fichier */}
            {uploadState.file && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadState.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadState.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadState.stage === 'completed' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-green-600 mb-2">
                Analyse terminée !
              </h3>
              <p className="text-sm text-gray-600">
                Tes données sont prêtes pour l'interrogation IA
              </p>
            </div>

            {/* Stats */}
            {uploadState.result && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Lignes :</span>
                    <span className="text-gray-900 font-medium ml-2">
                      {uploadState.result.rowsProcessed}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Chunks :</span>
                    <span className="text-gray-900 font-medium ml-2">
                      {uploadState.result.chunksCreated}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={resetUpload}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Nouveau fichier
            </button>
          </div>
        )}

        {uploadState.stage === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-2">
                Erreur
              </h3>
              <p className="text-sm text-gray-600">
                {uploadState.error}
              </p>
            </div>

            <button 
              onClick={resetUpload}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}