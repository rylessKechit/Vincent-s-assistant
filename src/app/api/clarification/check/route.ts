import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simulation de vérification des termes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { headers } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json({
        success: false,
        error: 'Headers manquants'
      }, { status: 400 });
    }

    // Analyser les headers pour détecter les termes complexes
    const complexTerms = [];
    const complexPatterns = [
      /^[A-Z]{2,}/, // Acronymes (IRPD, CO, PP)
      /@/, // Symboles spéciaux (@CO, @PP)
      /\(.*\)/, // Parenthèses (LC), %
      /\w+\s+\w+.*[A-Z]/, // Termes composés avec majuscules
    ];

    for (const header of headers) {
      const normalizedTerm = header.toLowerCase().trim();
      
      // Termes courants qu'on comprend facilement
      const commonWords = [
        'agent', 'calendar', 'month', 'total', 'number', 'date', 
        'name', 'id', 'email', 'phone', 'address', 'city'
      ];

      const isCommon = commonWords.some(word => 
        header.toLowerCase().includes(word.toLowerCase())
      );

      const isComplex = complexPatterns.some(pattern => pattern.test(header));

      if (!isCommon && isComplex) {
        complexTerms.push({
          term: header,
          reason: 'Terme technique/acronyme détecté',
          examples: [] // Dans une vraie implémentation, on passerait des exemples
        });
      }
    }

    return NextResponse.json({
      success: true,
      needsClarification: complexTerms.length > 0,
      termsToAsk: complexTerms
    });

  } catch (error: any) {
    console.error('Erreur check clarification:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur interne'
    }, { status: 500 });
  }
}