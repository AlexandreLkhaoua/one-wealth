// Types pour le portefeuille
export interface PortfolioPosition {
  date: string; // Format: YYYY-MM-DD
  provider: string; // ex: "Boursorama", "BNP", "Trade Republic"
  asset_class: string; // ex: "Action", "Obligation", "ETF", "Fond euro", "Cash"
  instrument_name: string; // Nom de l'actif
  isin?: string; // Identifiant ISIN (optionnel)
  region: string; // ex: "Europe", "USA", "Chine", "Pays émergents", "Autres"
  currency: string; // ex: "EUR", "USD" (pour la V0.5, tout est traité comme EUR)
  current_value: number; // Valeur actuelle en EUR
}

// Données agrégées pour les graphiques
export interface PortfolioSummary {
  totalValue: number;
  byProvider: Record<string, number>;
  byAssetClass: Record<string, number>;
  byRegion: Record<string, number>;
  timeSeriesData: { date: string; value: number }[];
}

// Type pour les erreurs de parsing
export interface ParseError {
  row: number;
  field: string;
  message: string;
}
