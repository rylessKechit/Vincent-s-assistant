'use client';

import { useState, useEffect } from 'react';

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'error';
  chunksCount?: number;
  summary?: string;
  processing?: {
    tokensUsed?: number;
  };
}

export function DocumentsSection() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-orange-600 bg-orange-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Analysé';
      case 'processing': return 'En cours';
      case 'error': return 'Erreur';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun fichier
        </h3>
        <p className="text-sm text-gray-600">
          Upload ton premier fichier CSV pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {documents.map((doc) => (
        <div key={doc._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {doc.originalName}
              </h4>
              <p className="text-xs text-gray-600">
                {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
              </p>
            </div>
            
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${getStatusColor(doc.status)}
            `}>
              {getStatusText(doc.status)}
            </span>
          </div>

          {/* Summary */}
          {doc.summary && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {doc.summary}
            </p>
          )}

          {/* Stats */}
          {doc.status === 'completed' && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {doc.chunksCount && (
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                  </svg>
                  <span>{doc.chunksCount} chunks</span>
                </div>
              )}
              
              {doc.processing?.tokensUsed && (
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span>{doc.processing.tokensUsed} tokens</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Prêt pour l'IA</span>
              </div>
            </div>
          )}

          {/* Actions */}
          {doc.status === 'completed' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                Poser une question sur ce fichier →
              </button>
            </div>
          )}
        </div>
      ))}
      
      {/* Refresh Button */}
      <button 
        onClick={fetchDocuments}
        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
      >
        🔄 Actualiser
      </button>
    </div>
  );
}