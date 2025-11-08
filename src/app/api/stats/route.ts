import { NextRequest, NextResponse } from 'next/server';
import { DatabaseFactory, MongoDBClient } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Assurer la connexion MongoDB avant d'utiliser les repositories
    const client = MongoDBClient.getInstance();
    await client.connect();
    
    // Obtenir les repositories
    const { documents } = await DatabaseFactory.getRepositories();
    
    // Récupérer tous les documents
    const allDocs = await documents.findAll(100);
    
    // Calculer les statistiques
    let totalRows = 0;
    let totalTokensUsed = 0;
    
    allDocs.forEach(doc => {
      if (doc.aggregations?.totalRows) {
        totalRows += doc.aggregations.totalRows;
      }
      if (doc.processing?.tokensUsed) {
        totalTokensUsed += doc.processing.tokensUsed;
      }
    });

    // Calculer le coût total (estimation)
    const totalCost = (totalTokensUsed * 0.0001) / 1000;

    // Activité récente
    const recentActivity = allDocs.slice(0, 5).map(doc => ({
      type: 'upload' as const,
      timestamp: doc.uploadedAt.toISOString(),
      description: `Document ${doc.filename} analysé`
    }));

    return NextResponse.json({
      totalDocuments: allDocs.length,
      totalRows,
      totalTokensUsed,
      totalCost,
      recentActivity
    });

  } catch (error: any) {
    console.error('Erreur stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur récupération statistiques'
    }, { status: 500 });
  }
}