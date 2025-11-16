import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { 
  Document, 
  Conversation, 
  DocumentChunk,
  DocumentStatus,
  CsvAggregations,
  PythonAnalysisData
} from '@/types/database';
import { DB_CONFIG, validateEnvVars } from '@/lib/config';

// Client MongoDB singleton - IDENTIQUE à votre version existante
export class MongoDBClient {
  private static instance: MongoDBClient;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {
    validateEnvVars();
  }

  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.client && this.db) {
      return; // Déjà connecté
    }

    try {
      this.client = new MongoClient(process.env.MONGODB_URI!);
      await this.client.connect();
      
      // Extraire le nom de la DB depuis l'URI ou utiliser par défaut
      const dbName = process.env.MONGODB_URI!.split('/').pop()?.split('?')[0] || 'ai-assistant';
      this.db = this.client.db(dbName);

      console.log('✅ MongoDB connecté avec succès');
      
      // Vérifier/créer les indexes
      await this.ensureIndexes();
      
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      throw error;
    }
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database non connectée');

    try {
      const documentsCollection = this.db.collection<Document>(DB_CONFIG.collections.documents);
      
      // Index existants - IDENTIQUES à votre version
      await documentsCollection.createIndex({ filename: 1 });
      await documentsCollection.createIndex({ status: 1 });
      await documentsCollection.createIndex({ uploadedAt: -1 });
      await documentsCollection.createIndex({ type: 1, status: 1 });

      // 🐍 NOUVEL index optionnel pour l'analyse Python
      await documentsCollection.createIndex({ 
        "pythonAnalysis.extraction.metadata.columns": 1 
      }).catch(() => {
        // Ignore l'erreur si l'index existe déjà ou si la propriété n'existe pas
        console.log('Index Python Analysis non créé - ce n\'est pas grave');
      });

      console.log('✅ Index MongoDB créés');
    } catch (error) {
      console.error('⚠️ Erreur création indexes:', error);
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

// Repository pour les documents - ÉTENDU mais 100% rétrocompatible
export class DocumentRepository {
  private collection: Collection<Document>;

  constructor(db: Db) {
    this.collection = db.collection<Document>(DB_CONFIG.collections.documents);
  }

  // ✅ Méthodes EXISTANTES - inchangées
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

  // 🐍 NOUVELLES méthodes compatibles avec votre système existant
  async updatePythonAnalysis(id: string | ObjectId, pythonAnalysis: PythonAnalysisData): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { 
        $set: { 
          pythonAnalysis,
          processedAt: new Date()
        } 
      }
    );
  }

  // ✅ Méthode compatible utilisant les méthodes existantes
  async updateDocumentComplete(
    id: string | ObjectId, 
    updates: {
      summary?: string;
      keyFacts?: string[];
      chunks?: DocumentChunk[];
      aggregations?: CsvAggregations;
      pythonAnalysis?: PythonAnalysisData;
      status?: DocumentStatus;
      processing?: any;
    }
  ): Promise<void> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    // Utiliser les méthodes existantes une par une pour compatibilité
    if (updates.status) {
      await this.updateStatus(objectId, updates.status);
    }
    
    if (updates.chunks) {
      await this.updateChunks(objectId, updates.chunks);
    }
    
    if (updates.aggregations) {
      await this.updateAggregations(objectId, updates.aggregations);
    }
    
    if (updates.pythonAnalysis) {
      await this.updatePythonAnalysis(objectId, updates.pythonAnalysis);
    }
    
    // Mettre à jour les autres champs
    const otherUpdates: any = {};
    if (updates.summary) otherUpdates.summary = updates.summary;
    if (updates.keyFacts) otherUpdates.keyFacts = updates.keyFacts;
    if (updates.processing) otherUpdates.processing = updates.processing;
    
    if (Object.keys(otherUpdates).length > 0) {
      await this.collection.updateOne(
        { _id: objectId },
        { 
          $set: { 
            ...otherUpdates,
            processedAt: new Date()
          } 
        }
      );
    }
  }

  // Recherche vectorielle - compatible avec votre système
  async vectorSearch(
    embedding: number[],
    limit: number = 10,
    documentIds?: ObjectId[]
  ): Promise<Array<{ document: Document; score: number; chunk: DocumentChunk }>> {
    // Recherche basique compatible si pas d'Atlas Vector Search
    try {
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "chunks.embedding",
            queryVector: embedding,
            numCandidates: limit * 10,
            limit: limit,
          }
        }
      ];

      if (documentIds && documentIds.length > 0) {
        pipeline.push({
          $match: {
            _id: { $in: documentIds }
          }
        });
      }

      pipeline.push({
        $project: {
          _id: 1,
          filename: 1,
          originalName: 1,
          type: 1,
          summary: 1,
          chunks: 1,
          aggregations: 1,
          pythonAnalysis: 1,
          score: { $meta: "vectorSearchScore" }
        }
      });

      const results = await this.collection.aggregate(pipeline).toArray();
      
      return results.flatMap(result => 
        result.chunks.map((chunk: DocumentChunk) => ({
          document: result as Document,
          score: result.score || 0.5,
          chunk
        }))
      );
      
    } catch (error) {
      // Fallback vers recherche basique si Vector Search pas disponible
      console.warn('Vector Search non disponible, utilisation fallback');
      
      const filter: any = { status: 'completed' };
      if (documentIds && documentIds.length > 0) {
        filter._id = { $in: documentIds };
      }
      
      const docs = await this.collection.find(filter).limit(limit).toArray();
      
      return docs.flatMap(doc => 
        doc.chunks.map(chunk => ({
          document: doc,
          score: 0.5,
          chunk
        }))
      );
    }
  }

  // 🐍 Recherche de documents avec analyse Python OU agrégations classiques
  async findDocumentsWithAggregations(documentIds?: ObjectId[]): Promise<Document[]> {
    const filter: any = {
      $or: [
        { aggregations: { $exists: true } },
        { pythonAnalysis: { $exists: true } }
      ],
      status: 'completed'
    };

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    }

    return await this.collection.find(filter).toArray();
  }

  async findDocumentsWithPythonAnalysis(documentIds?: ObjectId[]): Promise<Document[]> {
    const filter: any = {
      'pythonAnalysis.extraction': { $exists: true },
      status: 'completed'
    };

    if (documentIds && documentIds.length > 0) {
      filter._id = { $in: documentIds };
    }

    return await this.collection.find(filter).toArray();
  }
}

// Repository pour les conversations - IDENTIQUE à votre version
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

// Factory - IDENTIQUE à votre version
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

// Export du client principal
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