/**
 * Service de génération d'embeddings OpenAI
 * Compatible avec les routes d'upload renforcées
 */

import { openai } from './openai';

interface EmbeddingResult {
  success: boolean;
  embeddings?: number[][];
  tokensUsed: number;
  error?: string;
}

/**
 * Crée des embeddings pour une liste de textes
 */
export async function createEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  try {
    if (!texts || texts.length === 0) {
      return {
        success: false,
        tokensUsed: 0,
        error: 'Aucun texte fourni'
      };
    }

    // Filtrer les textes vides
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    
    if (validTexts.length === 0) {
      return {
        success: false,
        tokensUsed: 0,
        error: 'Tous les textes sont vides'
      };
    }

    console.log(`🧠 Génération d'embeddings pour ${validTexts.length} textes...`);

    const response = await openai.createEmbeddings(validTexts);

    console.log(`✅ Embeddings générés: ${response.embeddings.length} vecteurs (${response.tokensUsed} tokens)`);

    return {
      success: true,
      embeddings: response.embeddings,
      tokensUsed: response.tokensUsed
    };

  } catch (error) {
    console.error('❌ Erreur génération embeddings:', error);
    
    return {
      success: false,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Les vecteurs doivent avoir la même dimension');
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Trouve les textes les plus similaires à une requête
 */
export function findMostSimilar(
  queryEmbedding: number[],
  textEmbeddings: Array<{ text: string; embedding: number[]; metadata?: any }>,
  limit: number = 5
): Array<{ text: string; similarity: number; metadata?: any }> {
  
  const similarities = textEmbeddings.map(item => ({
    text: item.text,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
    metadata: item.metadata
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}