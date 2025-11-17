import { ObjectId } from 'mongodb';

// Types de base
export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'error';
export type FileType = 'csv' | 'pdf' | 'docx' | 'txt';
export type QueryType = 'numeric' | 'semantic' | 'hybrid';

// ✅ NOUVEAU: Interface pour les erreurs d'embedding
export interface EmbeddingError {
  code: string;
  message: string;
  details?: any;
}

// ✅ NOUVEAU: Classe EmbeddingError pour les erreurs d'embedding
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

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

// ✅ NOUVEAU: Contexte de document pour multi-agences
export interface DocumentContext {
  agency?: string;        // Agence (Paris, Lyon, etc.)
  period?: string;        // Période (Week 47, Q4 2024, etc.)
  region?: string;        // Région (France Nord, Sud, etc.)
  notes?: string;         // Notes libres
  tags?: string[];        // Tags personnalisés
  createdAt?: Date;       // Date de création du contexte
  updatedAt?: Date;       // Dernière mise à jour
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
  
  // ✅ NOUVEAU: Contexte multi-agences
  context?: DocumentContext;
  
  // Agrégations (uniquement pour CSV)
  aggregations?: CsvAggregations;
  
  // ✅ NOUVEAU: Analyse Python complète
  pythonAnalysis?: {
    extraction: any;
    analysis: any;
    insights: any;
    recommendations: string[];
    performance: {
      extraction_time: number;
      analysis_time: number;
      total_time: number;
    };
  };
  
  // Métadonnées de traitement
  processing: {
    chunksCount: number;
    embeddingModel: string;
    tokensUsed: number;
    processingTimeMs: number;
  };
  
  // ✅ NOUVEAU: Historique des versions (pour mise à jour intelligente)
  versions?: Array<{
    version: string;
    createdAt: Date;
    changes: string[];
    previousData?: any;
  }>;
  
  // Gestion d'erreurs
  error?: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

// ✅ NOUVEAU: Interface pour les actions de similarité
export interface SimilarityAction {
  type: 'update' | 'new_context' | 'separate';
  label: string;
  description: string;
  recommended: boolean;
  targetDocumentId?: string;
  newContext?: DocumentContext;
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
    // ✅ NOUVEAU: Contexte dans les sources
    context?: DocumentContext;
  }>;
  
  // Métadonnées de la requête
  metadata?: {
    queryType: QueryType;
    processingTimeMs: number;
    tokensUsed: number;
    // ✅ NOUVEAU: Filtres de contexte utilisés
    contextFilters?: {
      agencies?: string[];
      periods?: string[];
      regions?: string[];
    };
  };
}

export interface Conversation {
  _id: ObjectId;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ NOUVEAU: Contexte par défaut de la conversation
  defaultContext?: {
    agencies?: string[];
    periods?: string[];
    includeAllAgencies?: boolean;
  };
  
  // Statistiques
  stats: {
    messageCount: number;
    documentsReferenced: ObjectId[];
    // ✅ NOUVEAU: Agences/contextes référencés
    contextsCovered: {
      agencies: string[];
      periods: string[];
      totalDocuments: number;
    };
  };
}

// ✅ NOUVEAU: Interface pour les filtres multi-agences
export interface ContextFilter {
  agencies?: string[];
  periods?: string[];
  regions?: string[];
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// ✅ NOUVEAU: Interface pour les comparaisons inter-agences
export interface AgencyComparison {
  agencies: Array<{
    name: string;
    documentCount: number;
    latestUpdate: Date;
    performance?: {
      totalRevenue?: number;
      agentCount?: number;
      averagePerformance?: number;
    };
  }>;
  crossAgencyInsights: string[];
  recommendations: string[];
  generatedAt: Date;
}