import { ObjectId } from 'mongodb';

// Types de base
export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'error';
export type FileType = 'csv' | 'pdf' | 'docx' | 'txt';
export type QueryType = 'numeric' | 'semantic' | 'hybrid';

// Structure d'un chunk
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

// Agrégations pré-calculées pour CSV
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

// Document principal dans MongoDB
export interface Document {
  _id: ObjectId;
  filename: string;
  originalName: string;
  type: FileType;
  size: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: DocumentStatus;
  
  // Contenu analysé
  summary: string;
  keyFacts: string[];
  chunks: DocumentChunk[];
  
  // Agrégations (uniquement pour CSV)
  aggregations?: CsvAggregations;
  
  // Métadonnées de traitement
  processing: {
    chunksCount: number;
    embeddingModel: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
  
  // Gestion d'erreurs
  error?: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

// Conversation et messages
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
    confidence: number;
  };
}

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

// Schémas de validation avec Zod
import { z } from 'zod';

export const DocumentChunkSchema = z.object({
  text: z.string().min(1),
  embedding: z.array(z.number()).length(1536),
  chunkIndex: z.number().int().min(0),
  metadata: z.object({
    pageNumber: z.number().int().optional(),
    section: z.string().optional(),
    rowNumber: z.number().int().optional(),
  }).optional(),
});

export const DocumentSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  type: z.enum(['csv', 'pdf', 'docx', 'txt']),
  size: z.number().int().min(0),
  status: z.enum(['uploading', 'processing', 'completed', 'error']),
  summary: z.string(),
  keyFacts: z.array(z.string()),
  chunks: z.array(DocumentChunkSchema),
  aggregations: z.object({
    totalRows: z.number().int().min(0),
    columns: z.array(z.string()),
    sums: z.record(z.string(), z.number()),
    averages: z.record(z.string(), z.number()),
    mins: z.record(z.string(), z.number()),
    maxs: z.record(z.string(), z.number()),
    counts: z.record(z.string(), z.number()),
    byColumn: z.record(z.string(), z.record(z.string(), z.any())),
    temporal: z.object({
      dateColumns: z.array(z.string()),
      byPeriod: z.record(z.string(), z.record(z.string(), z.number())),
    }).optional(),
    topValues: z.record(z.string(), z.array(z.object({
      value: z.any(),
      count: z.number().int().min(0),
    }))),
  }).optional(),
  processing: z.object({
    chunksCount: z.number().int().min(0),
    embeddingModel: z.string(),
    tokensUsed: z.number().int().min(0),
    processingTimeMs: z.number().int().min(0),
  }),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    timestamp: z.date(),
  }).optional(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  sources: z.array(z.object({
    documentId: z.string(), // ObjectId as string
    filename: z.string(),
    chunkIndex: z.number().int().min(0),
    relevanceScore: z.number().min(0).max(1),
    snippet: z.string(),
  })).optional(),
  metadata: z.object({
    queryType: z.enum(['numeric', 'semantic', 'hybrid']),
    processingTimeMs: z.number().int().min(0),
    tokensUsed: z.number().int().min(0),
    confidence: z.number().min(0).max(1),
  }).optional(),
});

// Types d'erreur personnalisés
export class ProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
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