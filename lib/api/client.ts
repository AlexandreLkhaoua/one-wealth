/**
 * OneWealth Backend API Client
 * 
 * This module provides a type-safe client for calling the FastAPI backend.
 * All requests are authenticated using Supabase access tokens.
 * 
 * Usage:
 * ```typescript
 * import { apiClient } from '@/lib/api/client';
 * 
 * const result = await apiClient.importPortfolioCSV(portfolioId, file, accessToken);
 * ```
 */

// =====================================================
// TYPES
// =====================================================

import type { 
  PortfolioScoreResult, 
  InvestorProfileResponse, 
  InvestorProfileUpdate 
} from '../types/portfolio';

export interface CSVImportError {
  row: number;
  field?: string;
  error: string;
}

export interface EnrichmentResult {
  success: number;
  failed: number;
  total: number;
  error?: string;
}

export interface CSVImportResult {
  success: boolean;
  rows_imported: number;
  rows_failed: number;
  errors: CSVImportError[];
  enrichment?: EnrichmentResult;
}

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

export interface PositionEnriched {
  id: string;
  portfolio_id: string;
  date: string;
  provider: string;
  asset_class: string;
  instrument_name: string;
  isin?: string;
  region: string;
  currency: string;
  quantity?: number;
  purchase_price?: number;
  current_value: number;
  notes?: string;
  asset_id?: string;
  created_at: string;
  updated_at: string;
  asset?: AssetSummary;
}

export interface EnrichPortfolioResult {
  portfolio_id: string;
  assets_enriched: number;
  assets_failed: number;
  total_assets: number;
  success: boolean;
}

// =====================================================
// API CLIENT CLASS
// =====================================================

export class APIClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    // Default to localhost:8000 - can be overridden via constructor
    // In production, pass the API URL explicitly or set NEXT_PUBLIC_API_URL
    this.baseURL = baseURL || 'http://localhost:8000';
  }

  /**
   * Import a CSV file into a portfolio
   * 
   * @param portfolioId - UUID of the target portfolio
   * @param file - CSV file to upload
   * @param accessToken - Supabase access token for authentication
   * @returns Import result with statistics and errors
   * @throws Error if request fails
   */
  async importPortfolioCSV(
    portfolioId: string,
    file: File,
    accessToken: string
  ): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${this.baseURL}/api/portfolios/${portfolioId}/import`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Import failed'
      }));
      throw new Error(error.detail || `Import failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get enriched positions for a portfolio
   * 
   * @param portfolioId - UUID of the portfolio
   * @param accessToken - Supabase access token for authentication
   * @returns List of positions with enriched asset data
   * @throws Error if request fails
   */
  async getPortfolioPositions(
    portfolioId: string,
    accessToken: string
  ): Promise<PositionEnriched[]> {
    const response = await fetch(
      `${this.baseURL}/api/portfolios/${portfolioId}/positions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Failed to fetch positions'
      }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Manually trigger enrichment for all assets in a portfolio
   * 
   * @param portfolioId - UUID of the portfolio
   * @param accessToken - Supabase access token for authentication
   * @returns Enrichment result with statistics
   * @throws Error if request fails
   */
  async enrichPortfolio(
    portfolioId: string,
    accessToken: string
  ): Promise<EnrichPortfolioResult> {
    const response = await fetch(
      `${this.baseURL}/api/portfolios/${portfolioId}/enrich`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'Enrichment failed'
      }));
      throw new Error(error.detail || `Enrichment failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if the backend API is healthy
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<{ status: string; environment: string }> {
    const response = await fetch(`${this.baseURL}/health`);

    if (!response.ok) {
      throw new Error('Backend API is not healthy');
    }

    return response.json();
  }

  /**
   * Get portfolio investor profile
   * 
   * @param portfolioId - Portfolio UUID
   * @param accessToken - Supabase access token for authentication
   * @returns Investor profile response with target equity %, horizon, and objective
   * @throws Error if request fails
   */
  async getPortfolioProfile(
    portfolioId: string,
    accessToken: string
  ): Promise<InvestorProfileResponse> {
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch profile' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update portfolio investor profile
   * 
   * @param portfolioId - Portfolio UUID
   * @param payload - Profile fields to update
   * @param accessToken - Supabase access token for authentication
   * @returns Updated profile response
   * @throws Error if request fails
   */
  async updatePortfolioProfile(
    portfolioId: string,
    payload: InvestorProfileUpdate,
    accessToken: string
  ): Promise<InvestorProfileResponse> {
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get portfolio score
   */
  async getPortfolioScore(
    portfolioId: string,
    accessToken: string
  ): Promise<PortfolioScoreResult> {
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/score`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch score' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const apiClient = new APIClient();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Format CSV import errors for display
 * 
 * @param errors - List of import errors
 * @returns Formatted error message
 */
export function formatImportErrors(errors: CSVImportError[]): string {
  if (errors.length === 0) return '';

  const maxErrors = 5;
  const displayErrors = errors.slice(0, maxErrors);

  const errorMessages = displayErrors.map(err => 
    `Ligne ${err.row}${err.field ? ` (${err.field})` : ''}: ${err.error}`
  ).join('\n');

  if (errors.length > maxErrors) {
    return `${errorMessages}\n... et ${errors.length - maxErrors} autres erreurs`;
  }

  return errorMessages;
}

/**
 * Check if backend is available
 * 
 * @returns true if backend is healthy, false otherwise
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    await apiClient.healthCheck();
    return true;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
