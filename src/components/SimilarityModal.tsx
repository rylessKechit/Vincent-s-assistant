/**
 * API Endpoint - Vérification Similarité avant Upload
 * Compatible avec l'existant, ajoute la détection de fichiers similaires
 */

import { NextRequest, NextResponse } from 'next/server';
import { DatabaseFactory } from '@/lib/mongodb';
import pythonClient from '@/lib/python-client';
import { 
  generateFileSignature, 
  checkSimilarityWithExisting,
  SimilarityResult 
} from '@/lib/similarity';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validation de la requête
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type multipart/form-data requis' },
        { status: 400 }
      );
    }

    // Parser le fichier
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validation du fichier
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Seuls les fichiers CSV sont supportés' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop volumineux (max 50MB)' },
        { status: 400 }
      );
    }

    console.log(`🔍 Vérification similarité pour: ${file.name}`);

    // ÉTAPE 1: Analyse rapide du fichier avec Python (extraction seulement)
    const pythonResult = await pythonClient.extractAndAnalyzeFile(file);
    
    if (!pythonResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Erreur analyse fichier: ${pythonResult.error}` 
        },
        { status: 400 }
      );
    }

    // ÉTAPE 2: Générer signature du nouveau fichier
    const newFileSignature = generateFileSignature(pythonResult.data);

    // ÉTAPE 3: Récupérer tous les documents existants
    const { documents } = await DatabaseFactory.getRepositories();
    const existingDocuments = await documents.findAll(100); // Max 100 derniers documents

    console.log(`📊 Comparaison avec ${existingDocuments.length} documents existants...`);

    // ÉTAPE 4: Vérifier similarité avec documents existants
    const similarities = await checkSimilarityWithExisting(
      newFileSignature,
      file.name,
      existingDocuments
    );

    // ÉTAPE 5: Préparer la réponse
    const hasSimilarFiles = similarities.length > 0;
    const bestMatch = similarities[0]; // Le plus similaire

    console.log(`✅ Vérification terminée. Similaires trouvés: ${hasSimilarFiles}`);

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        signature: newFileSignature
      },
      similarity: {
        hasSimilarFiles,
        count: similarities.length,
        bestMatch: bestMatch ? {
          documentId: bestMatch.matchedDocument?.id,
          filename: bestMatch.matchedDocument?.filename,
          confidence: bestMatch.confidence,
          score: bestMatch.score,
          suggestions: bestMatch.suggestions,
          context: bestMatch.matchedDocument?.context,
          uploadedAt: bestMatch.matchedDocument?.uploadedAt
        } : null,
        allMatches: similarities.slice(0, 3).map(sim => ({
          documentId: sim.matchedDocument?.id,
          filename: sim.matchedDocument?.filename,
          confidence: sim.confidence,
          overallScore: sim.score.overall,
          context: sim.matchedDocument?.context
        }))
      },
      pythonPreview: {
        rowCount: pythonResult.data.extraction?.metadata?.shape?.rows || 0,
        columns: pythonResult.data.extraction?.metadata?.columns || [],
        businessPatterns: newFileSignature.businessPatterns,
        sampleData: pythonResult.data.extraction?.sample_data?.head?.slice(0, 2) || []
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification similarité:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Informations sur l'état du système de détection
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { documents } = await DatabaseFactory.getRepositories();
    const totalDocuments = await documents.findAll(1000);
    
    const withContext = totalDocuments.filter(doc => doc.context).length;
    const agencies = new Set(
      totalDocuments
        .filter(doc => doc.context?.agency)
        .map(doc => doc.context!.agency)
    ).size;

    return NextResponse.json({
      success: true,
      system: {
        totalDocuments: totalDocuments.length,
        documentsWithContext: withContext,
        uniqueAgencies: agencies,
        isReady: true,
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Erreur status système:', error);
    
    return NextResponse.json(
      { success: false, error: 'Erreur récupération status' },
      { status: 500 }
    );
  }
}