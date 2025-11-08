import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ObjectId } from 'mongodb';
import { DatabaseFactory } from '@/lib/mongodb';
import { parseCsvFile, createCsvChunks } from '@/lib/parsers/csv-parser';
import { createEmbeddings, extractDocumentMetadata } from '@/lib/openai';
import { FILE_CONFIG, CHUNK_CONFIG } from '@/lib/config';
import type { Document, DocumentChunk } from '@/types/database';

// Configuration pour Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Vérifier le Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type multipart/form-data requis' },
        { status: 400 }
      );
    }

    // Parser les données du formulaire
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validation du fichier
    const validationError = validateFile(file);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Traitement du fichier
    const startTime = Date.now();
    const processingResult = await processFile(file);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      document: {
        id: processingResult.documentId.toString(),
        filename: processingResult.filename,
        originalName: file.name,
        type: processingResult.type,
        size: file.size,
        status: 'completed',
        chunksCount: processingResult.chunksCount,
        summary: processingResult.summary,
        keyFacts: processingResult.keyFacts,
        processingTimeMs: processingTime,
        tokensUsed: processingResult.tokensUsed,
      }
    });

  } catch (error: any) {
    console.error('Erreur upload:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Erreur interne du serveur',
        code: error.code || 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Valide un fichier uploadé
 */
function validateFile(file: File): string | null {
  // Vérifier la taille
  if (file.size > FILE_CONFIG.maxSize) {
    return `Fichier trop volumineux. Maximum: ${FILE_CONFIG.maxSize / (1024 * 1024)}MB`;
  }

  // Vérifier le type MIME
  if (!Object.keys(FILE_CONFIG.supportedTypes).includes(file.type)) {
    const supportedTypes = Object.values(FILE_CONFIG.supportedTypes).join(', ');
    return `Type de fichier non supporté. Types acceptés: ${supportedTypes}`;
  }

  // Vérifier le nom de fichier
  if (!file.name || file.name.length > 255) {
    return 'Nom de fichier invalide';
  }

  return null;
}

/**
 * Traite un fichier uploadé
 */
async function processFile(file: File): Promise<{
  documentId: ObjectId;
  filename: string;
  type: string;
  chunksCount: number;
  summary: string;
  keyFacts: string[];
  tokensUsed: number;
}> {
  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop() || '';
  const filename = `${timestamp}_${randomSuffix}.${fileExtension}`;

  // Convertir le fichier en buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Sauvegarder temporairement le fichier
  await saveFileTemporarily(filename, buffer);

  try {
    // Obtenir les repositories
    const { documents } = await DatabaseFactory.getRepositories();

    // Créer l'entrée document initiale
    const documentId = await documents.create({
      filename,
      originalName: file.name,
      type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
      size: file.size,
      uploadedAt: new Date(),
      status: 'processing',
      summary: '',
      keyFacts: [],
      chunks: [],
      processing: {
        chunksCount: 0,
        embeddingModel: 'text-embedding-ada-002',
        tokensUsed: 0,
        processingTimeMs: 0,
      },
    });

    let totalTokensUsed = 0;

    try {
      // Parser le fichier selon son type
      const parseResult = await parseFileByType(buffer, file.type);
      
      // Extraire métadonnées avec OpenAI
      const metadata = await extractDocumentMetadata(
        parseResult.text, 
        FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes]
      );
      totalTokensUsed += metadata.tokensUsed;

      // Créer les chunks
      const textChunks = createChunksFromParseResult(parseResult);
      
      // Générer les embeddings
      const embeddingResult = await createEmbeddings(
        textChunks.map(chunk => chunk.text)
      );
      totalTokensUsed += embeddingResult.tokensUsed;

      // Construire les chunks finaux
      const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
        text: chunk.text,
        embedding: embeddingResult.embeddings[index],
        chunkIndex: index,
        metadata: chunk.metadata,
      }));

      // Mettre à jour le document avec les chunks
      await documents.updateChunks(documentId, documentChunks);

      // Ajouter les agrégations si c'est un CSV
      if (file.type === 'text/csv' && 'aggregations' in parseResult) {
        await documents.updateAggregations(documentId, parseResult.aggregations);
      }

      // Marquer comme terminé
      await documents.updateStatus(documentId, 'completed');

      // Mettre à jour les métadonnées
      const { documents: documentsRepo } = await DatabaseFactory.getRepositories();
      const collection = (documentsRepo as any).collection;
      
      await collection.updateOne(
        { _id: documentId },
        {
          $set: {
            summary: metadata.summary,
            keyFacts: metadata.keyFacts,
            'processing.tokensUsed': totalTokensUsed,
            'processing.chunksCount': documentChunks.length,
          }
        }
      );

      return {
        documentId,
        filename,
        type: FILE_CONFIG.supportedTypes[file.type as keyof typeof FILE_CONFIG.supportedTypes],
        chunksCount: documentChunks.length,
        summary: metadata.summary,
        keyFacts: metadata.keyFacts,
        tokensUsed: totalTokensUsed,
      };

    } catch (processingError: any) {
      // Marquer le document comme en erreur
      await documents.setError(
        documentId, 
        processingError.message,
        processingError.stack
      );
      
      throw processingError;
    }

  } finally {
    // Nettoyer le fichier temporaire
    // Note: En production, on pourrait garder les fichiers ou les stocker dans un cloud storage
  }
}

/**
 * Sauvegarde temporairement un fichier
 */
async function saveFileTemporarily(filename: string, buffer: Buffer): Promise<void> {
  const uploadDir = join(process.cwd(), 'temp', 'uploads');
  
  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
  } catch (error) {
    console.error('Erreur sauvegarde temporaire:', error);
    // En mode dev, on peut ignorer cette erreur
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Erreur sauvegarde fichier');
    }
  }
}

/**
 * Parse un fichier selon son type
 */
async function parseFileByType(buffer: Buffer, mimeType: string): Promise<any> {
  switch (mimeType) {
    case 'text/csv':
      return await parseCsvFile(buffer);
    
    case 'text/plain':
      return {
        text: buffer.toString('utf-8'),
        type: 'txt'
      };
    
    case 'application/pdf':
      // TODO: Implémenter le parser PDF
      throw new Error('Parser PDF pas encore implémenté');
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // TODO: Implémenter le parser DOCX
      throw new Error('Parser DOCX pas encore implémenté');
    
    default:
      throw new Error(`Type de fichier non supporté: ${mimeType}`);
  }
}

/**
 * Crée des chunks à partir du résultat de parsing
 */
function createChunksFromParseResult(parseResult: any): Array<{
  text: string;
  metadata?: any;
}> {
  if (parseResult.aggregations) {
    // Fichier CSV
    return createCsvChunks(parseResult, 50);
  } else {
    // Fichier texte simple
    return createTextChunks(parseResult.text);
  }
}

/**
 * Crée des chunks pour un texte simple
 */
function createTextChunks(text: string): Array<{
  text: string;
  metadata?: any;
}> {
  const chunks: Array<{ text: string; metadata?: any }> = [];
  const maxLength = CHUNK_CONFIG.maxTokens * 4; // Approximation: 4 chars = 1 token
  const overlap = CHUNK_CONFIG.overlap * 4;

  for (let i = 0; i < text.length; i += maxLength - overlap) {
    const chunk = text.substring(i, i + maxLength);
    if (chunk.trim().length > 0) {
      chunks.push({
        text: chunk.trim(),
        metadata: {
          charStart: i,
          charEnd: Math.min(i + maxLength, text.length)
        }
      });
    }
  }

  return chunks;
}

// Export pour les tests
export { validateFile, parseFileByType };