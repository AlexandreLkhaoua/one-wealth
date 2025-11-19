import Papa from 'papaparse';
import type { PortfolioSummary, ParseError } from '@/lib/types/portfolio';

// Type for parsed positions coming from the CSV (client-side). The full
// PortfolioPosition type includes DB fields (id, timestamps, portfolio_id)
// which are not available at CSV import time, so we use a lighter shape here.
type ParsedPosition = {
  date: string;
  provider: string;
  asset_class: string;
  instrument_name: string;
  isin?: string;
  region: string;
  currency: string;
  current_value: number;
};

interface ParseResult {
  success: boolean;
  data?: ParsedPosition[];
  summary?: PortfolioSummary;
  errors: ParseError[];
}

/**
 * Parse un fichier CSV de portefeuille et retourne les positions + le résumé
 * Colonnes attendues: date, provider, asset_class, instrument_name, isin (opt), region, currency, current_value
 */
export async function parsePortfolioCSV(file: File): Promise<ParseResult> {
  const errors: ParseError[] = [];

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // On parse nous-mêmes pour mieux gérer les erreurs
      complete: (results) => {
  const positions: ParsedPosition[] = [];

        // Colonnes requises
        const requiredColumns = ['date', 'provider', 'asset_class', 'instrument_name', 'region', 'currency', 'current_value'];
        
        // Vérifier que les colonnes requises sont présentes
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          errors.push({
            row: 0,
            field: missingColumns.join(', '),
            message: `Colonnes manquantes: ${missingColumns.join(', ')}`
          });
          resolve({ success: false, errors });
          return;
        }

        // Parser chaque ligne
        results.data.forEach((row, index) => {
          try {
            const value = parseFloat(row.current_value);
            
            if (isNaN(value)) {
              errors.push({
                row: index + 2, // +2 car index 0 + ligne header
                field: 'current_value',
                message: `Valeur invalide: "${row.current_value}"`
              });
              return;
            }

            positions.push({
              date: row.date.trim(),
              provider: row.provider.trim(),
              asset_class: row.asset_class.trim(),
              instrument_name: row.instrument_name.trim(),
              isin: row.isin?.trim() || undefined,
              region: row.region.trim(),
              currency: row.currency.trim(),
              current_value: value
            });
          } catch (error) {
            errors.push({
              row: index + 2,
              field: 'unknown',
              message: error instanceof Error ? error.message : 'Erreur de parsing'
            });
          }
        });

        if (positions.length === 0) {
          errors.push({
            row: 0,
            field: 'file',
            message: 'Aucune position valide trouvée dans le fichier'
          });
          resolve({ success: false, errors });
          return;
        }

        // Générer le résumé
        const summary = generateSummary(positions);

        resolve({
          success: true,
          data: positions,
          summary,
          errors
        });
      },
      error: (error) => {
        errors.push({
          row: 0,
          field: 'file',
          message: `Erreur de lecture du CSV: ${error.message}`
        });
        resolve({ success: false, errors });
      }
    });
  });
}

/**
 * Génère un résumé agrégé à partir des positions
 */
function generateSummary(positions: ParsedPosition[]): PortfolioSummary {
  const byProvider: Record<string, number> = {};
  const byAssetClass: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  let totalValue = 0;

  positions.forEach(position => {
    totalValue += position.current_value;

    // Agrégation par provider
    byProvider[position.provider] = (byProvider[position.provider] || 0) + position.current_value;

    // Agrégation par asset_class
    byAssetClass[position.asset_class] = (byAssetClass[position.asset_class] || 0) + position.current_value;

    // Agrégation par région
    byRegion[position.region] = (byRegion[position.region] || 0) + position.current_value;

    // Agrégation par date (pour la série temporelle)
    byDate[position.date] = (byDate[position.date] || 0) + position.current_value;
  });

  // Créer une série temporelle triée
  const timeSeriesData = Object.entries(byDate)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalValue,
    byProvider,
    byAssetClass,
    byRegion,
    timeSeriesData
  };
}
