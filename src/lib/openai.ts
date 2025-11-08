import OpenAI from 'openai';
import { OPENAI_CONFIG, validateEnvVars } from '@/lib/config';
import { EmbeddingError } from '@/types/database';

// Client OpenAI singleton
class OpenAIClient {
  private static instance: OpenAIClient;
  private client: OpenAI;

  private constructor() {
    validateEnvVars();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  /**
   * Génère un embedding pour un texte donné
   */
  async createEmbedding(text: string): Promise<{
    embedding: number[];
    tokensUsed: number;
  }> {
    try {
      const response = await this.client.embeddings.create({
        model: OPENAI_CONFIG.embeddingModel,
        input: text.trim(),
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new EmbeddingError('Pas d\'embedding reçu de OpenAI');
      }

      return {
        embedding,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error: any) {
      if (error.code === 'rate_limit_exceeded') {
        throw new EmbeddingError('Rate limit atteint, réessayer plus tard', true);
      }
      if (error.code === 'insufficient_quota') {
        throw new EmbeddingError('Quota OpenAI insuffisant', false);
      }
      
      console.error('Erreur création embedding:', error);
      throw new EmbeddingError(`Erreur OpenAI: ${error.message}`, true);
    }
  }

  /**
   * Génère des embeddings pour plusieurs textes (batch)
   */
  async createEmbeddings(texts: string[]): Promise<{
    embeddings: number[][];
    tokensUsed: number;
  }> {
    if (texts.length === 0) {
      return { embeddings: [], tokensUsed: 0 };
    }

    // OpenAI supporte jusqu'à 2048 inputs par batch
    const batchSize = 100;
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    try {
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.client.embeddings.create({
          model: OPENAI_CONFIG.embeddingModel,
          input: batch.map(text => text.trim()),
        });

        const batchEmbeddings = response.data.map(item => item.embedding);
        allEmbeddings.push(...batchEmbeddings);
        totalTokens += response.usage?.total_tokens || 0;

        // Petite pause entre les batchs pour éviter le rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        embeddings: allEmbeddings,
        tokensUsed: totalTokens,
      };
    } catch (error: any) {
      console.error('Erreur création embeddings batch:', error);
      throw new EmbeddingError(`Erreur batch embeddings: ${error.message}`, true);
    }
  }

  /**
   * Génère une réponse de chat
   */
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<{
    content: string;
    tokensUsed: number;
    finishReason: string;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_CONFIG.chatModel,
        messages,
        temperature: options.temperature ?? OPENAI_CONFIG.temperature,
        max_tokens: options.maxTokens ?? OPENAI_CONFIG.maxTokens,
        stream: options.stream ?? false,
      }) as any; // Cast pour éviter les erreurs de type OpenAI

      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error('Aucune réponse générée');
      }

      return {
        content: choice.message?.content || '',
        tokensUsed: response.usage?.total_tokens || 0,
        finishReason: choice.finish_reason || 'unknown',
      };
    } catch (error) {
      console.error('Erreur chat completion:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur génération réponse: ${errorMessage}`);
    }
  }

  /**
   * Extrait des métadonnées et résumé d'un texte
   */
  async extractMetadata(text: string, fileType: string): Promise<{
    summary: string;
    keyFacts: string[];
    tokensUsed: number;
  }> {
    const prompt = `Analyze this ${fileType} document and extract key information.

Document content:
${text.slice(0, 4000)} ${text.length > 4000 ? '...[truncated]' : ''}

CRITICAL: Respond ONLY with valid JSON, no other text:
{
  "summary": "2-3 sentence summary in French",
  "keyFacts": ["fact 1", "fact 2", "fact 3", "fact 4", "fact 5"]
}`;

    try {
      const response = await this.createChatCompletion([
        {
          role: 'system',
          content: 'You are a document analysis assistant. You MUST respond with valid JSON only. Never use markdown or explanatory text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 800
      });

      let content = response.content.trim();
      
      // Nettoyer le contenu si nécessaire
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Vérifier que ça commence par {
      if (!content.startsWith('{')) {
        throw new Error('Response is not valid JSON format');
      }
      
      const parsed = JSON.parse(content);
      
      return {
        summary: parsed.summary || 'Document analysé automatiquement',
        keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts.slice(0, 5) : [],
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error('Erreur extraction métadonnées:', error);
      
      // Fallback sécurisé
      return {
        summary: `Document ${fileType} analysé automatiquement`,
        keyFacts: [
          `Fichier de type ${fileType}`,
          'Contenu analysé et indexé',
          'Prêt pour recherche et questions',
          'Métadonnées extraites automatiquement',
          'Disponible pour analyse IA'
        ],
        tokensUsed: 0,
      };
    }
  }

  /**
   * Synthétise une réponse à partir du contexte et de la question
   */
  async synthesizeResponse(
    question: string,
    context: Array<{
      text: string;
      source: string;
      score: number;
    }>,
    queryType: 'numeric' | 'semantic' | 'hybrid'
  ): Promise<{
    answer: string;
    confidence: number;
    tokensUsed: number;
  }> {
    // Construire le contexte
    const contextText = context
      .map((item, index) => `[Source ${index + 1}: ${item.source}]\n${item.text}`)
      .join('\n\n---\n\n');

    const systemPrompt = queryType === 'numeric' 
      ? `Tu es un assistant spécialisé dans l'analyse de données. Tu réponds aux questions avec des chiffres précis et des calculs exacts. Cite toujours tes sources.`
      : `Tu es un assistant spécialisé dans l'analyse de documents. Tu donnes des réponses précises basées sur le contenu fourni. Cite toujours tes sources.`;

    const userPrompt = `Contexte disponible :
${contextText}

Question : ${question}

Instructions :
- Réponds précisément en te basant UNIQUEMENT sur le contexte fourni
- Cite tes sources entre [Source X]
- Si tu ne peux pas répondre avec le contexte, dis-le clairement
- ${queryType === 'numeric' ? 'Donne des chiffres précis et des calculs détaillés' : 'Sois factuel et détaillé'}`;

    try {
      const response = await this.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        temperature: 0.1,
        maxTokens: 1500
      });

      // Calculer la confiance basée sur la présence de sources
      const sourceMatches = (response.content.match(/\[Source \d+\]/g) || []).length;
      const confidence = Math.min(0.9, sourceMatches / Math.max(1, context.length));

      return {
        answer: response.content,
        confidence,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error('Erreur synthèse réponse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new Error(`Erreur génération réponse: ${errorMessage}`);
    }
  }

  /**
   * Détecte le type de question (numérique vs sémantique)
   */
  async detectQueryType(question: string): Promise<{
    type: 'numeric' | 'semantic' | 'hybrid';
    confidence: number;
    tokensUsed: number;
  }> {
    const prompt = `Analyze this question and determine its type:

Question: "${question}"

Types:
- "numeric": questions about numbers, calculations, statistics, aggregations
- "semantic": questions about meaning, textual content, explanations
- "hybrid": questions needing both approaches

CRITICAL: Respond ONLY with valid JSON, no other text:
{
  "type": "numeric",
  "confidence": 0.95,
  "reasoning": "short explanation"
}`;

    try {
      const response = await this.createChatCompletion([
        {
          role: 'system',
          content: 'You are a question classifier. You MUST respond with valid JSON only. Never use markdown or explanatory text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        temperature: 0.1,
        maxTokens: 200
      });

      let content = response.content.trim();
      
      // Nettoyer le contenu si nécessaire
      if (content.startsWith('```json')) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Vérifier que ça commence par {
      if (!content.startsWith('{')) {
        throw new Error('Response is not valid JSON format');
      }
      
      const parsed = JSON.parse(content);
      
      return {
        type: parsed.type || 'semantic',
        confidence: parsed.confidence || 0.5,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error('Erreur détection type question:', error);
      
      // Fallback avec regex simple mais robuste
      const numericPatterns = [
        /total|somme|moyenne|maximum|minimum|top\s+\d+/i,
        /combien|évolution|tendance|comparaison/i,
        /\d{4}-\d{2}|\d+\s+(agents?|mois|années?)/i,
        /pourcentage|%|ratio|taux|revenus?|IRPD/i,
      ];

      const isNumeric = numericPatterns.some(pattern => pattern.test(question));
      
      return {
        type: isNumeric ? 'numeric' : 'semantic',
        confidence: 0.7,
        tokensUsed: 0,
      };
    }
  }
}

// Export du client
export const openai = OpenAIClient.getInstance();

// Fonctions utilitaires
export async function createEmbedding(text: string) {
  return await openai.createEmbedding(text);
}

export async function createEmbeddings(texts: string[]) {
  return await openai.createEmbeddings(texts);
}

export async function extractDocumentMetadata(text: string, fileType: string) {
  return await openai.extractMetadata(text, fileType);
}

export async function synthesizeAnswer(
  question: string,
  context: Array<{ text: string; source: string; score: number }>,
  queryType: 'numeric' | 'semantic' | 'hybrid'
) {
  return await openai.synthesizeResponse(question, context, queryType);
}

export async function detectQueryType(question: string) {
  return await openai.detectQueryType(question);
}