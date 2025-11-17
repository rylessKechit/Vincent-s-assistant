/**
 * Service de Détection de Similarité entre Fichiers
 * Algorithmes avancés pour détecter fichiers identiques/similaires
 */

export interface SimilarityScore {
  overall: number; // 0-100%
  structure: number; // Similarité des colonnes
  content: number; // Similarité du contenu
  business: number; // Patterns métier similaires
  temporal: number; // Logique temporelle
}

export interface SimilarityResult {
  isSimilar: boolean;
  confidence: number; // 0-100%
  score: SimilarityScore;
  suggestions: SimilarityAction[];
  matchedDocument?: {
    id: string;
    filename: string;
    context?: DocumentContext;
    uploadedAt: Date;
  };
}

export interface SimilarityAction {
  type: 'update' | 'new_context' | 'separate';
  label: string;
  description: string;
  recommended: boolean;
}

export interface DocumentContext {
  agency?: string;
  period?: string;
  region?: string;
  notes?: string;
  tags?: string[];
}

export interface FileSignature {
  columns: string[];
  columnTypes: Record<string, string>;
  rowCount: number;
  businessPatterns: {
    hasAgents: boolean;
    hasRevenue: boolean;
    hasPerformance: boolean;
    hasExitEmployees: boolean;
    sixtPatterns: string[];
  };
  contentHash: string;
  structureHash: string;
}

export class SimilarityDetector {
  
  /**
   * Compare deux fichiers et retourne un score de similarité
   */
  static compareFiles(
    newFile: FileSignature, 
    existingFile: FileSignature,
    newFilename: string,
    existingFilename: string,
    existingContext?: DocumentContext
  ): SimilarityResult {
    
    // Calcul des scores individuels
    const structureScore = this.calculateStructureSimilarity(newFile, existingFile);
    const contentScore = this.calculateContentSimilarity(newFile, existingFile);
    const businessScore = this.calculateBusinessSimilarity(newFile, existingFile);
    const temporalScore = this.calculateTemporalSimilarity(newFilename, existingFilename);
    
    // Score global pondéré
    const overallScore = (
      structureScore * 0.4 +  // Structure = 40%
      contentScore * 0.3 +    // Contenu = 30%
      businessScore * 0.2 +   // Business = 20%
      temporalScore * 0.1     // Temporel = 10%
    );
    
    const score: SimilarityScore = {
      overall: Math.round(overallScore),
      structure: Math.round(structureScore),
      content: Math.round(contentScore),
      business: Math.round(businessScore),
      temporal: Math.round(temporalScore)
    };
    
    // Déterminer si fichiers similaires
    const isSimilar = overallScore >= 75; // Seuil 75%
    const confidence = this.calculateConfidence(score);
    
    // Générer suggestions d'actions
    const suggestions = this.generateSuggestions(score, existingContext);
    
    return {
      isSimilar,
      confidence: Math.round(confidence),
      score,
      suggestions,
      matchedDocument: isSimilar ? {
        id: 'existing_doc_id', // Sera remplacé par l'ID réel
        filename: existingFilename,
        context: existingContext,
        uploadedAt: new Date()
      } : undefined
    };
  }
  
  /**
   * Calcule la similarité de structure (colonnes, types)
   */
  private static calculateStructureSimilarity(
    newFile: FileSignature, 
    existingFile: FileSignature
  ): number {
    // Similarité des noms de colonnes - calcul manuel pour éviter Set issues
    const newColumns = newFile.columns;
    const existingColumns = existingFile.columns;
    
    const allColumns = [...newColumns, ...existingColumns];
    const uniqueColumns = allColumns.filter((item, index) => allColumns.indexOf(item) === index);
    const commonColumns = newColumns.filter(col => existingColumns.includes(col));
    
    const columnSimilarity = uniqueColumns.length === 0 ? 0 : (commonColumns.length / uniqueColumns.length) * 100;
    
    // Similarité des types de colonnes
    let typeSimilarity = 0;
    if (commonColumns.length > 0) {
      const matchingTypes = commonColumns.filter(col =>
        newFile.columnTypes[col] === existingFile.columnTypes[col]
      );
      typeSimilarity = (matchingTypes.length / commonColumns.length) * 100;
    }
    
    // Score structure = moyenne pondérée
    return (columnSimilarity * 0.7 + typeSimilarity * 0.3);
  }
  
  /**
   * Calcule la similarité de contenu (volume, hash)
   */
  private static calculateContentSimilarity(
    newFile: FileSignature, 
    existingFile: FileSignature
  ): number {
    // Similarité du nombre de lignes (logique YTD = nouvelles données > anciennes)
    const rowRatio = newFile.rowCount / Math.max(existingFile.rowCount, 1);
    let rowSimilarity = 0;
    
    if (rowRatio >= 1 && rowRatio <= 1.5) {
      // Croissance logique 0-50%
      rowSimilarity = 100 - Math.abs(rowRatio - 1) * 100;
    } else if (rowRatio > 0.8 && rowRatio < 1) {
      // Légère diminution acceptable
      rowSimilarity = rowRatio * 100;
    } else {
      // Changement trop important
      rowSimilarity = Math.max(0, 100 - Math.abs(rowRatio - 1) * 50);
    }
    
    // Hash de structure (différent du contenu exact)
    const structureMatch = newFile.structureHash === existingFile.structureHash ? 100 : 0;
    
    return (rowSimilarity * 0.6 + structureMatch * 0.4);
  }
  
  /**
   * Calcule la similarité des patterns métier
   */
  private static calculateBusinessSimilarity(
    newFile: FileSignature, 
    existingFile: FileSignature
  ): number {
    let score = 0;
    
    // Vérifications des patterns métier SIXT
    const patterns = [
      'hasAgents', 'hasRevenue', 'hasPerformance', 'hasExitEmployees'
    ] as const;
    
    patterns.forEach(pattern => {
      if (newFile.businessPatterns[pattern] === existingFile.businessPatterns[pattern]) {
        score += 25; // 25 points par pattern qui match
      }
    });
    
    // Patterns SIXT spécifiques
    const newSixtPatterns = newFile.businessPatterns.sixtPatterns;
    const existingSixtPatterns = existingFile.businessPatterns.sixtPatterns;
    
    // Calcul manuel de la similarité Jaccard pour éviter les problèmes de Set
    const allPatterns = [...newSixtPatterns, ...existingSixtPatterns];
    const uniquePatterns = allPatterns.filter((item, index) => allPatterns.indexOf(item) === index);
    const intersection = newSixtPatterns.filter(pattern => existingSixtPatterns.includes(pattern));
    
    const sixtSimilarity = uniquePatterns.length === 0 ? 0 : (intersection.length / uniquePatterns.length) * 100;
    
    return Math.min(100, (score + sixtSimilarity * 0.5));
  }
  
  /**
   * Calcule la similarité temporelle (noms de fichiers, périodes)
   */
  private static calculateTemporalSimilarity(
    newFilename: string, 
    existingFilename: string
  ): number {
    // Extraction des patterns temporels
    const newPatterns = this.extractTemporalPatterns(newFilename);
    const existingPatterns = this.extractTemporalPatterns(existingFilename);
    
    // Base filename similarity (sans les dates)
    const newBase = this.removeTemporalPatterns(newFilename);
    const existingBase = this.removeTemporalPatterns(existingFilename);
    
    const basenameSimilarity = this.calculateStringSimilarity(newBase, existingBase) * 100;
    
    // Logique temporelle (nouveau fichier = période suivante)
    let temporalLogic = 0;
    if (newPatterns.year && existingPatterns.year) {
      const yearDiff = newPatterns.year - existingPatterns.year;
      if (yearDiff === 0 || yearDiff === 1) {
        temporalLogic += 50; // Même année ou année suivante
      }
    }
    
    if (newPatterns.week && existingPatterns.week) {
      const weekDiff = newPatterns.week - existingPatterns.week;
      if (weekDiff === 1 || (weekDiff < 0 && newPatterns.year! > existingPatterns.year!)) {
        temporalLogic += 30; // Semaine suivante logique
      }
    }
    
    if (newPatterns.quarter && existingPatterns.quarter) {
      const quarterDiff = newPatterns.quarter - existingPatterns.quarter;
      if (quarterDiff === 1 || (quarterDiff < 0 && newPatterns.year! > existingPatterns.year!)) {
        temporalLogic += 30; // Trimestre suivant logique
      }
    }
    
    return (basenameSimilarity * 0.6 + Math.min(100, temporalLogic) * 0.4);
  }
  
  /**
   * Calcule un score de confiance global
   */
  private static calculateConfidence(score: SimilarityScore): number {
    // Plus les scores sont élevés et cohérents, plus la confiance est haute
    const average = (score.structure + score.content + score.business + score.temporal) / 4;
    const variance = [score.structure, score.content, score.business, score.temporal]
      .reduce((sum, s) => sum + Math.pow(s - average, 2), 0) / 4;
    
    const consistency = Math.max(0, 100 - variance); // Moins de variance = plus de confiance
    
    return (average * 0.8 + consistency * 0.2);
  }
  
  /**
   * Génère des suggestions d'actions basées sur les scores
   */
  private static generateSuggestions(
    score: SimilarityScore, 
    existingContext?: DocumentContext
  ): SimilarityAction[] {
    const suggestions: SimilarityAction[] = [];
    
    if (score.overall >= 85) {
      // Très similaire = probablement mise à jour
      suggestions.push({
        type: 'update',
        label: 'Mettre à jour le fichier existant',
        description: 'Structure identique, probablement des données actualisées (YTD)',
        recommended: true
      });
      
      suggestions.push({
        type: 'new_context',
        label: 'Nouveau contexte (autre agence/période)',
        description: 'Même structure mais pour un contexte différent',
        recommended: false
      });
    } else if (score.overall >= 75) {
      // Similaire = probablement nouveau contexte
      suggestions.push({
        type: 'new_context',
        label: 'Nouveau contexte',
        description: 'Structure similaire, probablement une autre agence ou période',
        recommended: true
      });
      
      suggestions.push({
        type: 'update',
        label: 'Mettre à jour',
        description: 'Forcer la mise à jour malgré les différences',
        recommended: false
      });
    } else if (score.structure >= 70) {
      // Structure similaire mais contenu différent
      suggestions.push({
        type: 'new_context',
        label: 'Variante du fichier',
        description: 'Structure similaire mais données différentes',
        recommended: true
      });
    }
    
    // Toujours proposer fichier séparé
    suggestions.push({
      type: 'separate',
      label: 'Traiter comme nouveau fichier',
      description: 'Aucune relation avec les fichiers existants',
      recommended: score.overall < 75
    });
    
    return suggestions;
  }
  
  /**
   * Utilitaires de calcul
   */
  private static calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const array1 = Array.from(set1);
    const array2 = Array.from(set2);
    
    const intersection = array1.filter(x => set2.has(x));
    const union = [...array1, ...array2.filter(x => !set1.has(x))];
    
    return union.length === 0 ? 0 : intersection.length / union.length;
  }
  
  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Algorithme de Levenshtein simplifié
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }
  
  private static extractTemporalPatterns(filename: string): {
    year?: number;
    quarter?: number;
    month?: number;
    week?: number;
  } {
    const result: { year?: number; quarter?: number; month?: number; week?: number } = {};
    
    // Extraction year
    const yearMatch = /20\d{2}/.exec(filename);
    if (yearMatch) {
      result.year = parseInt(yearMatch[0]);
    }
    
    // Extraction quarter  
    const quarterMatch = /Q[1-4]/.exec(filename);
    if (quarterMatch) {
      result.quarter = parseInt(quarterMatch[0].substring(1));
    }
    
    // Extraction week
    const weekMatch1 = /Week?\s*(\d{1,2})/.exec(filename);
    const weekMatch2 = /W(\d{1,2})/.exec(filename);
    if (weekMatch1) {
      result.week = parseInt(weekMatch1[1]);
    } else if (weekMatch2) {
      result.week = parseInt(weekMatch2[1]);
    }
    
    return result;
  }
  
  private static removeTemporalPatterns(filename: string): string {
    return filename
      .replace(/20\d{2}/g, '')
      .replace(/Q[1-4]/g, '')
      .replace(/Week?\s*\d{1,2}/gi, '')
      .replace(/W\d{1,2}/gi, '')
      .replace(/[_\-\s]+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}

/**
 * Génère une signature unique pour un fichier
 */
export function generateFileSignature(pythonAnalysis: any): FileSignature {
  const extraction = pythonAnalysis?.extraction;
  const metadata = extraction?.metadata;
  const dataframeData = extraction?.dataframe_data;
  
  if (!metadata || !dataframeData) {
    throw new Error('Données d\'extraction insuffisantes pour générer une signature');
  }
  
  // Analyse des patterns métier SIXT
  const businessPatterns = analyzeBusinessPatterns(dataframeData, metadata.columns);
  
  // Hash du contenu et de la structure
  const contentHash = generateContentHash(dataframeData.data);
  const structureHash = generateStructureHash(metadata.columns, dataframeData.shape);
  
  return {
    columns: metadata.columns || [],
    columnTypes: dataframeData.dtypes || {},
    rowCount: metadata.shape?.rows || 0,
    businessPatterns,
    contentHash,
    structureHash
  };
}

/**
 * Analyse les patterns métier dans les données
 */
function analyzeBusinessPatterns(dataframeData: any, columns: string[]): FileSignature['businessPatterns'] {
  const patterns = {
    hasAgents: false,
    hasRevenue: false,
    hasPerformance: false,
    hasExitEmployees: false,
    sixtPatterns: [] as string[]
  };
  
  const columnNames = columns.map(col => col.toLowerCase());
  
  // Détection des patterns SIXT
  patterns.hasAgents = columnNames.some(col => 
    col.includes('agent') || col.includes('employee') || /\d{7,10}/.test(col)
  );
  
  patterns.hasRevenue = columnNames.some(col =>
    col.includes('revenue') || col.includes('irpd') || col.includes('revenus') || 
    col.includes('ca') || col.includes('chiffre')
  );
  
  patterns.hasPerformance = columnNames.some(col =>
    col.includes('performance') || col.includes('rate') || col.includes('taux') ||
    col.includes('%') || col.includes('upsell')
  );
  
  // Vérification Exit Employees dans les données
  if (Array.isArray(dataframeData.data)) {
    patterns.hasExitEmployees = dataframeData.data.some((row: any) =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes('exit employee')
      )
    );
  }
  
  // Patterns SIXT spécifiques
  if (patterns.hasAgents) patterns.sixtPatterns.push('agents');
  if (patterns.hasRevenue) patterns.sixtPatterns.push('revenue');
  if (patterns.hasPerformance) patterns.sixtPatterns.push('performance');
  if (patterns.hasExitEmployees) patterns.sixtPatterns.push('exit_employees');
  
  return patterns;
}

/**
 * Génère un hash du contenu (simplifié)
 */
function generateContentHash(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  // Hash simplifié basé sur les premières et dernières lignes
  const sample = [
    ...data.slice(0, 3),
    ...data.slice(-3)
  ];
  
  const str = JSON.stringify(sample);
  return btoa(str).substring(0, 16); // Hash simple pour la démo
}

/**
 * Génère un hash de la structure
 */
function generateStructureHash(columns: string[], shape: any): string {
  const str = JSON.stringify({
    columns: columns.sort(),
    shape
  });
  return btoa(str).substring(0, 16);
}

/**
 * API pour vérifier la similarité avec les documents existants
 */
export async function checkSimilarityWithExisting(
  newFileSignature: FileSignature,
  newFilename: string,
  existingDocuments: any[]
): Promise<SimilarityResult[]> {
  
  const results: SimilarityResult[] = [];
  
  for (const doc of existingDocuments) {
    if (!doc.pythonAnalysis?.extraction) continue;
    
    try {
      const existingSignature = generateFileSignature(doc.pythonAnalysis);
      
      const similarity = SimilarityDetector.compareFiles(
        newFileSignature,
        existingSignature,
        newFilename,
        doc.originalName || doc.filename,
        doc.context
      );
      
      if (similarity.isSimilar && similarity.matchedDocument) {
        similarity.matchedDocument.id = doc._id?.toString() || doc.id;
        similarity.matchedDocument.uploadedAt = doc.uploadedAt;
      }
      
      results.push(similarity);
      
    } catch (error) {
      console.warn(`Erreur comparaison avec document ${doc.filename}:`, error);
    }
  }
  
  // Trier par score de similarité décroissant
  return results
    .filter(result => result.isSimilar)
    .sort((a, b) => b.confidence - a.confidence);
}