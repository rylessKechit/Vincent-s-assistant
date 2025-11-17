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
      content: '👋 Salut ! Je suis ton assistant IA pour analyser tes données SIXT. Upload un fichier CSV et pose-moi tes questions !',
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
              content: `📊 J'ai trouvé ${data.documents.length} fichier(s) : ${data.documents.map((d: any) => d.filename).join(', ')}. Tu peux maintenant me poser tes questions !`,
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
        assistantContent = `❌ Désolé, je n'ai pas pu répondre : ${data.error}`;
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
        content: '❌ Erreur de connexion. Vérifie que le serveur est démarré.',
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
    "Montre-moi les top performers",
    "Qui sont les Exit Employees ?",
    "Analyse les tendances",
    "Compare les agences"
  ];

  return (
    <div className="flex flex-col h-full">
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[80%] rounded-xl px-4 py-3
              ${message.type === 'user' 
                ? 'bg-orange-500 text-white' 
                : message.type === 'system'
                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                : 'bg-gray-100 text-gray-900'
              }
            `}>
              <div className="text-sm leading-relaxed">
                {message.content}
              </div>
              
              {/* Metadata */}
              {message.metadata && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <span className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        message.metadata.queryType === 'numeric' ? 'bg-orange-500' :
                        message.metadata.queryType === 'semantic' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></div>
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
                  </div>

                  {/* Sources */}
                  {message.metadata.sources && message.metadata.sources.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Sources :</p>
                      {message.metadata.sources.slice(0, 2).map((source, idx) => (
                        <div key={idx} className="text-xs bg-white rounded p-2 border">
                          <div className="font-medium text-gray-800">{source.filename}</div>
                          <div className="text-gray-600 mt-1">{source.snippet.substring(0, 100)}...</div>
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
        
        {/* Loading */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3 border">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600">L'IA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Questions Rapides */}
      {messages.length <= 2 && documents.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Questions rapides :</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-lg border border-orange-200 transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={documents.length > 0 
                ? "Pose ta question sur tes données..." 
                : "Upload d'abord un fichier CSV..."
              }
              disabled={isLoading || documents.length === 0}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || documents.length === 0}
            className={`
              px-6 py-3 rounded-xl font-medium transition-all
              ${inputValue.trim() && !isLoading && documents.length > 0
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          {documents.length > 0 
            ? `${documents.length} fichier(s) analysé(s) • Appuie sur Entrée pour envoyer`
            : "Upload un CSV pour commencer"
          }
        </p>
      </div>
    </div>
  );
}