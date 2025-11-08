'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  filename: string;
  type: string;
  uploadedAt: string;
  summary: string;
  rowCount: number;
  chunksCount: number;
}

export function DocumentsSection() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/chat');
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

  const deleteDocument = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 rounded-lg h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Aucun document</p>
          <p className="text-xs text-slate-500">
            Uploadez un fichier CSV pour commencer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`
            border rounded-lg p-4 cursor-pointer transition-all
            ${selectedDoc === doc.id 
              ? 'border-blue-500 bg-blue-50/50' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
            }
          `}
          onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-600">
                    CSV
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-900 truncate">
                  {doc.filename}
                </h3>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>📊 {doc.rowCount} lignes</div>
                <div>📦 {doc.chunksCount} chunks</div>
              </div>
              
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                {doc.summary}
              </p>
              
              <p className="text-xs text-slate-400 mt-2">
                {new Date(doc.uploadedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="flex items-center space-x-1 ml-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDocument(doc.id);
                }}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                title="Supprimer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              <div className="w-4 h-4 flex items-center justify-center">
                <svg 
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    selectedDoc === doc.id ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Details expandables */}
          {selectedDoc === doc.id && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  ID du document :
                </p>
                <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                  {doc.id}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Résumé complet :
                </p>
                <p className="text-xs text-slate-600">
                  {doc.summary}
                </p>
              </div>

              <div className="flex space-x-2">
                <button 
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Réanalyser le document
                  }}
                >
                  Réanalyser
                </button>
                <button 
                  className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Exporter les résultats
                  }}
                >
                  Exporter
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      
      <button
        onClick={fetchDocuments}
        className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        🔄 Actualiser la liste
      </button>
    </div>
  );
}