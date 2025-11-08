'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalDocuments: number;
  totalRows: number;
  totalTokensUsed: number;
  totalCost: number;
  recentActivity: Array<{
    type: 'upload' | 'question' | 'analysis';
    timestamp: string;
    description: string;
  }>;
}

export function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
        <div className="w-16 h-4 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-3 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>{stats.totalDocuments} doc{stats.totalDocuments > 1 ? 's' : ''}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">•</span>
          <span>{stats.totalRows} lignes</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">•</span>
          <span>${stats.totalCost.toFixed(4)}</span>
        </div>

        <svg 
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
          <div className="space-y-4">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalDocuments}
                </div>
                <div className="text-xs text-slate-500">
                  Documents analysés
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalRows.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  Lignes traitées
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalTokensUsed.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  Tokens OpenAI
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  ${stats.totalCost.toFixed(4)}
                </div>
                <div className="text-xs text-slate-500">
                  Coût total
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {stats.recentActivity.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">
                  Activité récente
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {stats.recentActivity.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="flex items-center space-x-3 text-xs">
                      <div className={`
                        w-2 h-2 rounded-full flex-shrink-0
                        ${activity.type === 'upload' ? 'bg-blue-500' : 
                          activity.type === 'question' ? 'bg-purple-500' : 'bg-emerald-500'
                        }
                      `} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 truncate">
                          {activity.description}
                        </p>
                        <p className="text-slate-500">
                          {new Date(activity.timestamp).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={fetchStats}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                🔄 Actualiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}