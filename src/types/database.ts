import { ObjectId } from 'mongodb';

// Types de base - 100% compatibles avec votre projet existant
export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'error';
export type FileType = 'csv' | 'pdf' | 'docx' | 'txt';
export type QueryType = 'numeric' | 'semantic' | 'hybrid';

// Structure d'un chunk - IDENTIQUE à votre version existante
export interface DocumentChunk {
  text: string;
  embedding: number[]; // 1536 dimensions pour text-embedding-ada-002
  chunkIndex: number;
  metadata?: {
    pageNumber?: number;
    section?: string;
    rowNumber?: number;
  };
}

// Agrégations pré-calculées pour CSV - IDENTIQUE à votre version existante
export interface CsvAggregations {
  totalRows: number;
  columns: string[];
  
  // Agrégations numériques par colonne
  sums: Record<string, number>;
  averages: Record<string, number>;
  mins: Record<string, number>;
  maxs: Record<string, number>;
  counts: Record<string, number>;
  
  // Groupements
  byColumn: Record<string, Record<string, any>>;
  
  // Statistiques temporelles (si colonnes date détectées)
  temporal?: {
    dateColumns: string[];
    byPeriod: Record<string, Record<string, number>>;
  };
  
  // Top valeurs par colonne
  topValues: Record<string, Array<{ value: any; count: number }>>;
}

// 🐍 NOUVELLE interface pour l'analyse Python - Extension SANS casser l'existant
export interface PythonAnalysisData {
  extraction?: {
    metadata?: {
      shape?: { rows: number; columns: number };
      columns?: string[];
      file_info?: any;
    };
    sample_data?: {
      head?: any[];
      dtypes?: Record<string, string>;
    };
  };
  analysis?: {
    basic_stats?: Record<string, any>;
    correlations?: Record<string, any>;
    business_patterns?: {
      exit_employees?: { count: number };
      performance_segments?: {
        high_performers?: { count: number };
      };
      financial_metrics?: Record<string, any>;
    };
  };
  quality?: {
    overall_score?: number;
    completeness?: number;
    estimated?: boolean;
  };
  recommendations?: string[];
  insights?: any;
  performance?: {
    extraction_time: number;
    analysis_time: number;
    total_time: number;
  };
}

// ✅ Document interface - EXTENSION RÉTROCOMPATIBLE de votre interface existante
export interface Document {
  _id: ObjectId;
  filename: string;
  originalName: string;
  type: FileType;
  size: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: DocumentStatus;
  
  // Contenu analysé - IDENTIQUE à votre version
  summary: string;
  keyFacts: string[];
  chunks: DocumentChunk[];
  
  // Agrégations (uniquement pour CSV) - IDENTIQUE à votre version
  aggregations?: CsvAggregations;
  
  // 🐍 NOUVELLE propriété - OPTIONNELLE pour ne pas casser l'existant
  pythonAnalysis?: PythonAnalysisData;
  
  // Métadonnées de traitement - IDENTIQUE à votre version
  processing: {
    chunksCount: number;
    embeddingModel: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
  
  // Gestion d'erreurs - IDENTIQUE à votre version
  error?: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

// Conversation et messages - IDENTIQUE à votre version existante
export interface ChatMessage {
  _id: ObjectId;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // Pour les réponses de l'assistant
  sources?: Array<{
    documentId: ObjectId;
    filename: string;
    chunkIndex: number;
    relevanceScore: number;
    snippet: string;
  }>;
  
  // Métadonnées de la requête
  metadata?: {
    queryType: QueryType;
    processingTimeMs: number;
    tokensUsed: number;
    confidence?: number;
    pythonInsights?: any; // 🐍 Optionnel pour compatibilité
  };
}

// Conversation - Conserve votre structure existante
export interface Conversation {
  _id: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  
  // Documents liés à cette conversation
  documentIds: ObjectId[];
  
  // Statistiques
  stats: {
    messageCount: number;
    totalTokensUsed: number;
    avgResponseTime: number;
  };
}

// Classes d'erreur personnalisées - IDENTIQUES à votre version
export class ProcessingError extends Error {
  constructor(
    message: string,
    public stage: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

// Types d'export pour les API - Nouveaux mais compatibles
export type CreateDocumentDTO = Omit<Document, '_id' | 'uploadedAt' | 'processedAt'>;
export type UpdateDocumentDTO = Partial<Pick<Document, 'status' | 'summary' | 'keyFacts' | 'chunks' | 'aggregations' | 'pythonAnalysis'>>;

// Types pour les réponses d'API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: Date;
    processingTimeMs: number;
    tokensUsed?: number;
  };
}

// Types pour les résultats de recherche
export interface SearchResult {
  documentId: ObjectId;
  filename: string;
  relevanceScore: number;
  snippet: string;
  chunkIndex: number;
  metadata?: Record<string, any>;
}