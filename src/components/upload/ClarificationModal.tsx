'use client';

import { useState } from 'react';

interface ClarificationTerm {
  term: string;
  reason: string;
  examples: string[];
}

interface ClarificationModalProps {
  terms: ClarificationTerm[];
  onComplete: (clarifications: Record<string, string>) => void;
  onCancel: () => void;
}

export function ClarificationModal({ terms, onComplete, onCancel }: ClarificationModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');

  const currentTerm = terms[currentIndex];
  const isLastTerm = currentIndex === terms.length - 1;
  const hasAnswer = currentAnswer.trim().length > 0;

  const handleNext = () => {
    if (hasAnswer) {
      setClarifications(prev => ({
        ...prev,
        [currentTerm.term]: currentAnswer.trim()
      }));

      if (isLastTerm) {
        // Finaliser
        onComplete({
          ...clarifications,
          [currentTerm.term]: currentAnswer.trim()
        });
      } else {
        // Terme suivant
        setCurrentIndex(prev => prev + 1);
        setCurrentAnswer('');
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      const prevTerm = terms[currentIndex - 1];
      setCurrentAnswer(clarifications[prevTerm.term] || '');
    }
  };

  const handleSkip = () => {
    if (isLastTerm) {
      onComplete(clarifications);
    } else {
      setCurrentIndex(prev => prev + 1);
      setCurrentAnswer('');
    }
  };

  const handleSkipAll = () => {
    onComplete(clarifications);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Questions de clarification
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Aidez l'IA à mieux comprendre vos termes métier
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-blue-100 mb-2">
              <span>Question {currentIndex + 1} sur {terms.length}</span>
              <span>{Math.round(((currentIndex + 1) / terms.length) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-700/50 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / terms.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Question */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-yellow-600 font-semibold text-sm">
                  ?
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-slate-900">
                  Que signifie "{currentTerm.term}" ?
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {currentTerm.reason}
                </p>
              </div>
            </div>

            {/* Examples */}
            {currentTerm.examples.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Exemples de valeurs dans votre fichier :
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentTerm.examples.slice(0, 5).map((example, idx) => (
                    <span 
                      key={idx}
                      className="bg-white px-2 py-1 rounded text-xs text-slate-600 border"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Answer Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Votre explication :
              </label>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={`Expliquez ce que signifie "${currentTerm.term}" dans votre contexte...`}
                className="w-full px-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-slate-500">
                Plus votre explication est précise, meilleures seront les réponses de l'IA !
              </p>
            </div>
          </div>

          {/* Suggested answers (if any) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Suggestions rapides :
            </p>
            <div className="flex flex-wrap gap-2">
              {getQuickSuggestions(currentTerm.term).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentAnswer(suggestion)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            <button
              onClick={handleSkip}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Passer
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkipAll}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Passer tout
            </button>
            
            <button
              onClick={handleNext}
              disabled={!hasAnswer}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${hasAnswer 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              {isLastTerm ? 'Terminer' : 'Suivant'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suggestions rapides basées sur le terme
function getQuickSuggestions(term: string): string[] {
  const suggestions: Record<string, string[]> = {
    'IRPD @ CO': [
      'Incremental Revenue Per Day at Check-Out',
      'Revenus supplémentaires par jour au check-out',
      'Métrique de performance de location'
    ],
    'UP IRPD': [
      'Upselling Incremental Revenue Per Day', 
      'Revenus de vente additionnelle par jour',
      'Métrique d\'upselling'
    ],
    'Net Turnover Share': [
      'Part du chiffre d\'affaires net',
      'Pourcentage de revenus de l\'agent',
      'Commission agent'
    ]
  };

  return suggestions[term] || [
    `Définition de ${term}`,
    `Métrique de performance`,
    `Indicateur business`
  ];
}