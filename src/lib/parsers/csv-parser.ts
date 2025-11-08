import { parse } from 'csv-parse';
import { Readable } from 'stream';
import type { CsvAggregations } from '@/types/database';

export interface CsvParseResult {
  text: string;
  rows: any[];
  headers: string[];
  aggregations: CsvAggregations;
  rowCount: number;
}

export interface CsvColumn {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  values: any[];
  hasNulls: boolean;
}

export class CsvParser {
  /**
   * Parse un fichier CSV depuis un buffer
   */
  static async parseFromBuffer(buffer: Buffer): Promise<CsvParseResult> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let headers: string[] = [];

      const stream = Readable.from(buffer)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          auto_parse: true, // Convertit automatiquement les types
          auto_parse_date: true,
        }));

      stream.on('headers', (headerList: string[]) => {
        headers = headerList;
      });

      stream.on('data', (row: any) => {
        results.push(row);
      });

      stream.on('error', (error: Error) => {
        reject(new Error(`Erreur parsing CSV: ${error.message}`));
      });

      stream.on('end', () => {
        try {
          const parseResult = this.processResults(results, headers);
          resolve(parseResult);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Parse un fichier CSV depuis une string
   */
  static async parseFromString(csvString: string): Promise<CsvParseResult> {
    const buffer = Buffer.from(csvString, 'utf-8');
    return this.parseFromBuffer(buffer);
  }

  /**
   * Traite les résultats du parsing et génère les agrégations
   */
  private static processResults(rows: any[], headers: string[]): CsvParseResult {
    if (rows.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    // Analyser les colonnes
    const columns = this.analyzeColumns(rows, headers);
    
    // Générer le texte pour les embeddings
    const text = this.generateTextRepresentation(rows, columns);
    
    // Calculer les agrégations
    const aggregations = this.calculateAggregations(rows, columns);

    return {
      text,
      rows,
      headers,
      aggregations,
      rowCount: rows.length,
    };
  }

  /**
   * Analyse les types et propriétés des colonnes
   */
  private static analyzeColumns(rows: any[], headers: string[]): CsvColumn[] {
    return headers.map(header => {
      const values = rows.map(row => row[header]).filter(val => val != null && val !== '');
      
      // Détecter le type de données
      const type = this.detectColumnType(values);
      
      return {
        name: header,
        type,
        values,
        hasNulls: values.length < rows.length,
      };
    });
  }

  /**
   * Détecte le type d'une colonne basé sur ses valeurs
   */
  private static detectColumnType(values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (values.length === 0) return 'string';

    // Compter les types
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const value of values.slice(0, 100)) { // Échantillon des 100 premières valeurs
      if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
        numberCount++;
      } else if (value instanceof Date || this.isDateString(String(value))) {
        dateCount++;
      } else if (typeof value === 'boolean' || this.isBooleanString(String(value))) {
        booleanCount++;
      }
    }

    const total = Math.min(values.length, 100);
    const threshold = 0.8; // 80% des valeurs doivent correspondre au type

    if (numberCount / total >= threshold) return 'number';
    if (dateCount / total >= threshold) return 'date';
    if (booleanCount / total >= threshold) return 'boolean';
    
    return 'string';
  }

  /**
   * Vérifie si une string représente une date
   */
  private static isDateString(value: string): boolean {
    // Patterns de dates courants
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}-\d{2}$/, // YYYY-MM
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}\/\d{2}\/\d{2}$/, // DD/MM/YY
    ];

    return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
  }

  /**
   * Vérifie si une string représente un booléen
   */
  private static isBooleanString(value: string): boolean {
    const lower = value.toLowerCase().trim();
    return ['true', 'false', 'oui', 'non', 'yes', 'no', '1', '0'].includes(lower);
  }

  /**
   * Génère une représentation textuelle du CSV pour les embeddings
   */
  private static generateTextRepresentation(rows: any[], columns: CsvColumn[]): string {
    const parts: string[] = [];

    // Headers et types
    const headerInfo = columns.map(col => `${col.name} (${col.type})`).join(', ');
    parts.push(`Colonnes: ${headerInfo}`);

    // Statistiques générales
    parts.push(`Nombre de lignes: ${rows.length}`);

    // Quelques exemples de lignes (max 5)
    const sampleRows = rows.slice(0, 5);
    parts.push('Exemples de données:');
    
    for (let i = 0; i < sampleRows.length; i++) {
      const row = sampleRows[i];
      const rowText = columns
        .map(col => `${col.name}: ${row[col.name]}`)
        .join(', ');
      parts.push(`Ligne ${i + 1}: ${rowText}`);
    }

    // Résumés par colonne numérique
    const numericColumns = columns.filter(col => col.type === 'number');
    if (numericColumns.length > 0) {
      parts.push('Résumés numériques:');
      for (const col of numericColumns) {
        const numbers = col.values.map(v => Number(v)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          const sum = numbers.reduce((a, b) => a + b, 0);
          const avg = sum / numbers.length;
          const min = Math.min(...numbers);
          const max = Math.max(...numbers);
          
          parts.push(`${col.name}: total=${sum.toFixed(2)}, moyenne=${avg.toFixed(2)}, min=${min}, max=${max}`);
        }
      }
    }

    return parts.join('\n');
  }

  /**
   * Calcule toutes les agrégations pour le CSV
   */
  private static calculateAggregations(rows: any[], columns: CsvColumn[]): CsvAggregations {
    const aggregations: CsvAggregations = {
      totalRows: rows.length,
      columns: columns.map(col => col.name),
      sums: {},
      averages: {},
      mins: {},
      maxs: {},
      counts: {},
      byColumn: {},
      topValues: {},
    };

    // Traiter chaque colonne
    for (const column of columns) {
      // Compter les valeurs uniques
      const valueCounts: Record<string, number> = {};
      for (const value of column.values) {
        const key = String(value);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }

      // Top valeurs (max 10)
      aggregations.topValues[column.name] = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));

      // Agrégations numériques
      if (column.type === 'number') {
        const numbers = column.values.map(v => Number(v)).filter(n => !isNaN(n));
        
        if (numbers.length > 0) {
          aggregations.sums[column.name] = numbers.reduce((a, b) => a + b, 0);
          aggregations.averages[column.name] = aggregations.sums[column.name] / numbers.length;
          aggregations.mins[column.name] = Math.min(...numbers);
          aggregations.maxs[column.name] = Math.max(...numbers);
          aggregations.counts[column.name] = numbers.length;
        }
      }

      // Groupements par valeurs uniques (pour colonnes avec peu de valeurs distinctes)
      const uniqueValues = Object.keys(valueCounts);
      if (uniqueValues.length <= 50) { // Limite pour éviter l'explosion mémoire
        aggregations.byColumn[column.name] = valueCounts;
      }
    }

    // Détecter et traiter les colonnes temporelles
    const dateColumns = columns.filter(col => col.type === 'date').map(col => col.name);
    if (dateColumns.length > 0) {
      aggregations.temporal = {
        dateColumns,
        byPeriod: this.calculateTemporalAggregations(rows, dateColumns, columns),
      };
    }

    return aggregations;
  }

  /**
   * Calcule les agrégations temporelles
   */
  private static calculateTemporalAggregations(
    rows: any[], 
    dateColumns: string[], 
    allColumns: CsvColumn[]
  ): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    for (const dateCol of dateColumns) {
      const byPeriod: Record<string, number> = {};
      
      for (const row of rows) {
        const dateValue = row[dateCol];
        if (!dateValue) continue;

        // Extraire la période (YYYY-MM)
        let period: string;
        if (dateValue instanceof Date) {
          period = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
        } else {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            period = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
          } else {
            continue;
          }
        }

        byPeriod[period] = (byPeriod[period] || 0) + 1;
      }

      result[dateCol] = byPeriod;
    }

    return result;
  }

  /**
   * Convertit les données en chunks pour les embeddings
   */
  static createChunks(
    parseResult: CsvParseResult,
    maxRowsPerChunk: number = 50
  ): Array<{ text: string; metadata: { rowStart: number; rowEnd: number } }> {
    const chunks: Array<{ text: string; metadata: { rowStart: number; rowEnd: number } }> = [];
    
    // Chunk 0: Headers et résumé
    chunks.push({
      text: `En-têtes: ${parseResult.headers.join(', ')}\n\n${parseResult.text}`,
      metadata: { rowStart: 0, rowEnd: 0 }
    });

    // Chunks de données
    for (let i = 0; i < parseResult.rows.length; i += maxRowsPerChunk) {
      const endIndex = Math.min(i + maxRowsPerChunk, parseResult.rows.length);
      const chunkRows = parseResult.rows.slice(i, endIndex);
      
      const chunkText = chunkRows
        .map((row, index) => {
          const rowNumber = i + index + 1;
          const rowData = parseResult.headers
            .map(header => `${header}: ${row[header]}`)
            .join(', ');
          return `Ligne ${rowNumber}: ${rowData}`;
        })
        .join('\n');

      chunks.push({
        text: chunkText,
        metadata: { rowStart: i + 1, rowEnd: endIndex }
      });
    }

    return chunks;
  }
}

// Export des fonctions utilitaires
export async function parseCsvFile(buffer: Buffer): Promise<CsvParseResult> {
  return CsvParser.parseFromBuffer(buffer);
}

export async function parseCsvString(csvString: string): Promise<CsvParseResult> {
  return CsvParser.parseFromString(csvString);
}

export function createCsvChunks(parseResult: CsvParseResult, maxRowsPerChunk: number = 50) {
  return CsvParser.createChunks(parseResult, maxRowsPerChunk);
}