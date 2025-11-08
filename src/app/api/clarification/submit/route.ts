import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clarifications } = body;

    if (!clarifications || typeof clarifications !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Clarifications manquantes'
      }, { status: 400 });
    }

    // Charger le glossaire existant
    const glossaryPath = join(process.cwd(), 'glossary.json');
    let glossary;
    
    try {
      const content = readFileSync(glossaryPath, 'utf-8');
      glossary = JSON.parse(content);
    } catch (error) {
      glossary = {
        terms: {},
        lastUpdated: new Date().toISOString(),
        version: 1
      };
    }

    // Ajouter les nouvelles clarifications
    Object.entries(clarifications).forEach(([term, definition]) => {
      if (typeof definition === 'string' && definition.trim()) {
        glossary.terms[term.toLowerCase()] = definition.trim();
      }
    });

    // Mettre à jour et sauvegarder
    glossary.lastUpdated = new Date().toISOString();
    glossary.version = (glossary.version || 1) + 1;
    
    writeFileSync(glossaryPath, JSON.stringify(glossary, null, 2));

    // Simuler la finalisation de l'analyse
    const documentId = `doc_${Date.now()}_enriched`;
    
    return NextResponse.json({
      success: true,
      documentId,
      clarificationsAdded: Object.keys(clarifications).length,
      totalKnownTerms: Object.keys(glossary.terms).length,
      stats: {
        rowsProcessed: 49, // Simulation basée sur ton fichier IRPD
        chunksCreated: 3,
        tokensUsed: 6500
      }
    });

  } catch (error: any) {
    console.error('Erreur submit clarification:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur sauvegarde clarifications'
    }, { status: 500 });
  }
}