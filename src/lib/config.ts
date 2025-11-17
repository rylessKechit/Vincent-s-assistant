/**
 * Configuration globale pour AI-Assistant - VERSION VERCEL
 * AUCUN stockage local
 */

// Configuration des chunks
export const CHUNK_CONFIG = {
  maxTokens: 1000,
  overlap: 100,
  preserveStructure: true, // Garde les lignes CSV ensemble
  minChunkSize: 200, // Taille minimale d'un chunk
} as const;

// Configuration des fichiers
export const FILE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  supportedTypes: {
    'text/csv': 'csv',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  },
  // ✅ SUPPRIMÉ: uploadPath (plus de stockage local pour Vercel)
} as const;

// Configuration OpenAI
export const OPENAI_CONFIG = {
  embeddingModel: 'text-embedding-ada-002',
  chatModel: 'gpt-4-turbo-preview',
  maxTokens: 4000,
  temperature: 0.1,
  embeddingDimensions: 1536,
} as const;

// Configuration MongoDB
export const DB_CONFIG = {
  collections: {
    documents: 'documents',
    conversations: 'conversations',
  },
  indexes: {
    vectorSearch: 'vector_index',
  },
} as const;

// Configuration des requêtes
export const QUERY_CONFIG = {
  maxResults: 10,
  similarityThreshold: 0.7,
  numericPatterns: [
    /total|somme|moyenne|maximum|minimum|top\s+\d+/i,
    /combien|évolution|tendance|comparaison/i,
    /\d{4}-\d{2}|\d+\s+(agents?|mois|années?)/i,
    /pourcentage|%|ratio|taux/i,
  ],
  timeouts: {
    embedding: 30000, // 30s
    vectorSearch: 10000, // 10s
    aggregation: 5000, // 5s
  },
} as const;

// Configuration API Python
export const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

// Types d'export
export type FileType = keyof typeof FILE_CONFIG.supportedTypes;
export type SupportedFileExtension = typeof FILE_CONFIG.supportedTypes[FileType];

// Validation des variables d'environnement
export function validateEnvVars() {
  const required = [
    'MONGODB_URI',
    'OPENAI_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }
}

// Configuration par environnement
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  
  // ✅ Vercel-specific configuration
  isVercel: !!process.env.VERCEL,
  deploymentUrl: process.env.VERCEL_URL,
} as const;

// ✅ NOUVEAU: Configuration pour le stockage sans fichiers locaux
export const STORAGE_CONFIG = {
  // Tout en mémoire et MongoDB - pas de fichiers temporaires
  useMemoryOnly: true,
  maxFileBufferSize: FILE_CONFIG.maxSize, // 50MB en mémoire max
  
  // Fallback pour développement local (si vraiment nécessaire)
  tempDir: process.env.NODE_ENV === 'development' ? '/tmp/uploads' : null,
} as const;

// ✅ Configuration spécifique Vercel
export const VERCEL_CONFIG = {
  // Limites Vercel
  maxExecutionTime: 10000, // 10s pour Hobby plan
  maxPayloadSize: FILE_CONFIG.maxSize, // 50MB
  
  // Optimisations pour Vercel
  enableEdgeOptimization: false, // Pas compatible avec file processing
  useServerlessMode: true,
} as const;