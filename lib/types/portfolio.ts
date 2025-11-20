// Types pour le portefeuille

// Asset enriched data from backend
export interface AssetSummary {
  id: string;
  isin: string;
  ticker?: string;
  name: string;
  sector?: string;
  region?: string;
  last_price?: number;
  perf_1y?: number;
  volatility_1y?: number;
  last_updated?: string;
}

// Position with enriched asset data
export interface PortfolioPosition {
  id: string;
  portfolio_id: string;
  date: string; // Format: YYYY-MM-DD
  provider: string; // ex: "Boursorama", "BNP", "Trade Republic"
  asset_class: string; // ex: "Action", "Obligation", "ETF", "Fond euro", "Cash"
  instrument_name: string; // Nom de l'actif
  isin?: string; // Identifiant ISIN (optionnel)
  region: string; // ex: "Europe", "USA", "Chine", "Pays émergents", "Autres"
  currency: string; // ex: "EUR", "USD" (pour la V0.5, tout est traité comme EUR)
  quantity?: number;
  purchase_price?: number;
  current_value: number; // Valeur actuelle en EUR
  notes?: string;
  asset_id?: string;
  created_at: string;
  updated_at: string;
  asset?: AssetSummary; // Enriched data from assets table
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

// Sprint 2: Scoring types
export interface SubScore {
  name: string;
  value: number; // 0-100
  description: string;
}

export type AlertSeverity = 'red' | 'orange' | 'green';

export interface Alert {
  code: string;
  severity: AlertSeverity;
  message: string;
  recommendation?: string;
}

export interface PortfolioScoreResult {
  global_score: number;
  sub_scores: SubScore[];
  alerts: Alert[];
  investor_profile: string;
  actual_equity_pct: number;
  concentration_top5: number;
}

// Sprint 2: Profile types
export interface InvestorProfileResponse {
  investor_profile: string;
  target_equity_pct: number;
  investment_horizon_years: number;
  objective: string;
}

export interface InvestorProfileUpdate {
  investor_profile?: string;
  target_equity_pct?: number;
  investment_horizon_years?: number;
  objective?: string;
}
