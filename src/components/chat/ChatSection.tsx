'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    queryType?: 'numeric' | 'semantic' | 'hybrid';
    confidence?: number;
    processingTimeMs?: number;
    tokensUsed?: number;
    sources?: Array<{
      filename: string;
      snippet: string;
      relevanceScore: number;
    }>;
  };
}

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Bonjour ! Je suis votre assistant IA pour l\'analyse de données SIXT. Uploadez un fichier CSV puis posez-moi des questions sur vos données !',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Charger les documents disponibles
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/chat');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
        
        if (data.documents?.length > 0) {
          setMessages(prev => [
            ...prev,
            {
              id: `docs-${Date.now()}`,
              type: 'system',
              content: `📊 J'ai trouvé ${data.documents.length} document(s) analysé(s) : ${data.documents.map((d: any) => d.filename).join(', ')}. Vous pouvez maintenant me poser des questions !`,
              timestamp: new Date()
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: content.trim() })
      });

      const data = await response.json();

      let assistantContent = '';
      let metadata: Message['metadata'] = undefined;

      if (data.success) {
        assistantContent = data.answer;
        metadata = {
          queryType: data.queryType,
          confidence: data.confidence,
          processingTimeMs: data.processingTimeMs,
          tokensUsed: data.tokensUsed,
          sources: data.sources
        };
      } else {
        assistantContent = `❌ Désolé, je n'ai pas pu répondre à votre question : ${data.error}`;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Erreur envoi message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: '❌ Erreur de connexion. Vérifiez que le serveur est démarré.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const quickQuestions = [
    "Quel est le total des revenus ?",
    "Quelle est la moyenne IRPD ?", 
    "Qui sont les agents Exit Employee ?",
    "Compare les performances par agent",
    "Analyse les tendances mensuelles"
  ];

  return (
    <div className="flex flex-col h-full">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-xl px-4 py-3 text-sm
              ${message.type === 'user' 
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
                : message.type === 'system'
                ? 'bg-orange-50 border border-orange-200 text-orange-800'
                : 'bg-slate-100 text-slate-900 border border-slate-200'
              }
            `}>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
              
              {/* Metadata pour les réponses */}
              {message.metadata && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        message.metadata.queryType === 'numeric' ? 'bg-orange-500' :
                        message.metadata.queryType === 'semantic' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></span>
                      <span>{message.metadata.queryType}</span>
                    </span>
                    {message.metadata.confidence && (
                      <span>
                        Confiance: {(message.metadata.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {message.metadata.processingTimeMs && (
                      <span>
                        {message.metadata.processingTimeMs}ms
                      </span>
                    )}
                    {message.metadata.tokensUsed && (
                      <span>
                        {message.metadata.tokensUsed} tokens
                      </span>
                    )}
                  </div>

                  {/* Sources */}
                  {message.metadata.sources && message.metadata.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Sources :</p>
                      {message.metadata.sources.slice(0, 3).map((source, idx) => (
                        <div key={idx} className="text-xs text-slate-600 bg-white rounded p-2 border">
                          <div className="font-medium">{source.filename}</div>
                          <div className="mt-1 opacity-75">{source.snippet}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-xs opacity-60 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600 border border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full"></div>
                <span>L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 2 && documents.length > 0 && (
        <div className="px-4 py-3 border-t border-orange-200/50 flex-shrink-0">
          <p className="text-xs font-medium text-slate-700 mb-2">Questions rapides :</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-lg border border-orange-200 transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-orange-200/50 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={documents.length > 0 
                ? "Posez votre question sur vos données SIXT..." 
                : "Uploadez d'abord un fichier CSV pour commencer..."
              }
              disabled={isLoading || documents.length === 0}
              className="w-full px-4 py-3 border border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || documents.length === 0}
            className={`
              px-4 py-3 rounded-xl font-medium text-sm transition-all flex-shrink-0
              ${inputValue.trim() && !isLoading && documents.length > 0
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        <p className="text-xs text-slate-500 mt-2 text-center">
          {documents.length > 0 
            ? `${documents.length} document(s) analysé(s) • Appuyez sur Entrée pour envoyer`
            : "Aucun document analysé • Uploadez un CSV pour commencer"
          }
        </p>
      </div>
    </div>
  );
}