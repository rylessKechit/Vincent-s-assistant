/**
 * Configuration et repositories MongoDB - VERSION CORRIGÉE
 * Compatible avec les nouvelles routes d'upload
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { Document, DocumentChunk, CsvAggregations, DocumentStatus, Conversation } from '@/types/database';

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'ai-assistant';

const DB_CONFIG = {
  database: DB_NAME,
  collections: {
    documents: 'documents',
    conversations: 'conversations'
  },
  indexes: {
    vectorSearch: 'vector_index'
  }
} as const;

// Singleton client MongoDB
export class MongoDBClient {
  private static instance: MongoDBClient;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (this.client && this.db) {
        return; // Déjà connecté
      }

      console.log('🔌 Connexion à MongoDB...');
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      
      // Créer les index nécessaires
      await this.createIndexes();
      
      console.log('✅ MongoDB connecté');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      const documentsCollection = this.db.collection(DB_CONFIG.collections.documents);
      
      // Index pour la recherche par statut
      await documentsCollection.createIndex({ status: 1 });
      
      // Index pour la recherche par nom de fichier
      await documentsCollection.createIndex({ filename: 1 });
      
      // Index pour la date d'upload
      await documentsCollection.createIndex({ uploadedAt: -1 });
      
      console.log('✅ Index MongoDB créés');
    } catch (error) {
      console.warn('⚠️ Erreur création index:', error);
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Base de données non connectée. Appelez connect() d\'abord.');
    }
    return this.db;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('✅ MongoDB déconnecté');
    }
  }
}

// Repository pour les documents
export class DocumentRepository {
  private collection: Collection<Document>;

  constructor(db: Db) {
    this.collection = db.collection<Document>(DB_CONFIG.collections.documents);
  }

  async create(document: Omit<Document, '_id'>): Promise<ObjectId> {
    const result = await this.collection.insertOne({
      ...document,
      _id: new ObjectId(),
    } as Document);
    
    return result.insertedId;
  }

  async findById(id: string | ObjectId): Promise<Document | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  async findByFilename(filename: string): Promise<Document | null> {
    return await this.collection.findOne({ filename });
  }

  async findByStatus(status: DocumentStatus): Promise<Document[]> {
    return await this.collection.find({ status }).toArray();
  }

  async findAll(limit: number = 50): Promise<Document[]> {
    return await this.collection
      .find()
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .toArray();
  }

  // ✅ MÉTHODE updateDocument AJOUTÉE + SUPPORT CONTEXTE
  async updateDocument(id: string | ObjectId, updateData: Partial<Document>): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: {
          ...updateData,
          processedAt: new Date()
        } 
      }
    );
    
    return result.modifiedCount > 0;
  }

  // ✅ NOUVEAU: Mise à jour avec contexte
  async updateDocumentWithContext(
    id: string | ObjectId, 
    updateData: Partial<Document>,
    context?: {
      agency?: string;
      period?: string;
      region?: string;
      notes?: string;
      tags?: string[];
    }
  ): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const finalUpdateData = {
      ...updateData,
      processedAt: new Date()
    };

    if (context) {
      finalUpdateData.context = context;
    }
    
    const result = await this.collection.updateOne(
      { _id: objectId },
      { $set: finalUpdateData }
    );
    
    return result.modifiedCount > 0;
  }

  // ✅ NOUVEAU: Recherche par contexte
  async findByContext(contextFilter: {
    agency?: string;
    period?: string;
    region?: string;
  }): Promise<Document[]> {
    const filter: any = {};
    
    if (contextFilter.agency) {
      filter['context.agency'] = contextFilter.agency;
    }
    if (contextFilter.period) {
      filter['context.period'] = contextFilter.period;
    }
    if (contextFilter.region) {
      filter['context.region'] = contextFilter.region;
    }
    
    return await this.collection.find(filter).toArray();
  }

  // ✅ NOUVEAU: Lister toutes les agences
  async getAllAgencies(): Promise<string[]> {
    const agencies = await this.collection.distinct('context.agency', {
      'context.agency': { $exists: true, $ne: null }
    });
    return agencies.filter(Boolean);
  }

  // ✅ NOUVEAU: Lister toutes les périodes  
  async getAllPeriods(): Promise<string[]> {
    const periods = await this.collection.distinct('context.period', {
      'context.period': { $exists: true, $ne: null }
    });
    return periods.filter(Boolean);
  }

  async updateStatus(id: string | ObjectId, status: DocumentStatus): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { $set: { status, processedAt: new Date() } }
    );
  }

  async updateChunks(id: string | ObjectId, chunks: DocumentChunk[]): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          chunks,
          'processing.chunksCount': chunks.length,
          processedAt: new Date()
        } 
      }
    );
  }

  async updateAggregations(id: string | ObjectId, aggregations: CsvAggregations): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { $set: { aggregations } }
    );
  }

  async setError(id: string | ObjectId, error: string, stack?: string): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          status: 'error' as DocumentStatus,
          error: {
            message: error,
            stack,
            timestamp: new Date()
          }
        } 
      }
    );
  }

  async delete(id: string | ObjectId): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.deleteOne({ _id: objectId });
  }

  // Recherche vectorielle (Atlas Vector Search)
  async vectorSearch(
    embedding: number[], 
    limit: number = 10,
    documentIds?: ObjectId[]
  ): Promise<Array<{
    document: Document;
    chunk: DocumentChunk;
    score: number;
  }>> {
    try {
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: DB_CONFIG.indexes.vectorSearch,
            path: 'chunks.embedding',
            queryVector: embedding,
            numCandidates: limit * 10,
            limit: limit,
          }
        }
      ];

      // Filtrer par documents spécifiques si demandé
      if (documentIds && documentIds.length > 0) {
        pipeline.push({
          $match: {
            _id: { $in: documentIds }
          }
        });
      }

      // Ajouter le score de similarité
      pipeline.push({
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      });

      const results = await this.collection.aggregate(pipeline).toArray() as any[];

      // Reformater les résultats pour extraire les chunks correspondants
      const formattedResults: Array<{
        document: Document;
        chunk: DocumentChunk;
        score: number;
      }> = [];

      for (const doc of results) {
        // Trouver le chunk le plus similaire dans ce document
        for (const chunk of doc.chunks) {
          formattedResults.push({
            document: doc as Document,
            chunk: chunk,
            score: doc.score || 0
          });
        }
      }

      return formattedResults.slice(0, limit);
    } catch (error) {
      console.error('Erreur recherche vectorielle:', error);
      return [];
    }
  }

  // ✅ NOUVEAU: Recherche d'agrégations pour les questions numériques
  async searchAggregations(
    query: string,
    documentIds?: ObjectId[]
  ): Promise<Document[]> {
    const filter: any = {
      aggregations: { $exists: true },
      status: 'completed'
    };

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    }

    return await this.collection.find(filter).toArray();
  }

  // ✅ NOUVEAU: Trouve les documents avec analyse Python
  async findDocumentsWithPythonAnalysis(documentIds?: ObjectId[]): Promise<Document[]> {
    const filter: any = {
      pythonAnalysis: { $exists: true },
      status: 'completed'
    };

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    }

    return await this.collection.find(filter).toArray();
  }

  // ✅ NOUVEAU: Trouve les documents avec agrégations MongoDB
  async findDocumentsWithAggregations(documentIds?: ObjectId[]): Promise<Document[]> {
    const filter: any = {
      aggregations: { $exists: true },
      status: 'completed'
    };

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    }

    return await this.collection.find(filter).toArray();
  }
}

// Repository pour les conversations
export class ConversationRepository {
  private collection: Collection<Conversation>;

  constructor(db: Db) {
    this.collection = db.collection<Conversation>(DB_CONFIG.collections.conversations);
  }

  async create(conversation: Omit<Conversation, '_id'>): Promise<ObjectId> {
    const result = await this.collection.insertOne({
      ...conversation,
      _id: new ObjectId(),
    } as Conversation);
    
    return result.insertedId;
  }

  async findById(id: string | ObjectId): Promise<Conversation | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  async findAll(limit: number = 20): Promise<Conversation[]> {
    return await this.collection
      .find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async addMessage(id: string | ObjectId, message: any): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { 
        $push: { messages: { ...message, _id: new ObjectId() } },
        $set: { updatedAt: new Date() },
        $inc: { 'stats.messageCount': 1 }
      }
    );
  }

  async delete(id: string | ObjectId): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.deleteOne({ _id: objectId });
  }
}

// Factory pour obtenir les repositories
export class DatabaseFactory {
  private static mongoClient: MongoDBClient;

  public static async getRepositories(): Promise<{
    documents: DocumentRepository;
    conversations: ConversationRepository;
  }> {
    if (!this.mongoClient) {
      this.mongoClient = MongoDBClient.getInstance();
      await this.mongoClient.connect();
    }

    const db = this.mongoClient.getDb();

    return {
      documents: new DocumentRepository(db),
      conversations: new ConversationRepository(db),
    };
  }

  public static async disconnect(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.disconnect();
    }
  }
}

// Export du client principal pour usage direct si nécessaire
export const mongodb = MongoDBClient.getInstance();

// Hook de fermeture propre
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await DatabaseFactory.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await DatabaseFactory.disconnect();
    process.exit(0);
  });
}