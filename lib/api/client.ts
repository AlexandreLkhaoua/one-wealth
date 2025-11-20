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
   * Centralized helper to extract a readable error message from a non-OK Response
   * and throw a proper Error. Defensive: handles JSON or plain-text bodies.
   */
  private async handleErrorResponse(response: Response, fallbackMessage?: string): Promise<never> {
    // We attempt both JSON and raw text extraction and include both in logs so
    // when the backend returns an empty JSON object or an empty body we still
    // capture something useful for debugging.
    let parsedJson: any = null;
    let rawText: string | null = null;

    try {
      // clone response so we can attempt multiple reads safely
      const cloned = response.clone();
      parsedJson = await cloned.json().catch(() => null);
    } catch (_e) {
      parsedJson = null;
    }

    try {
      rawText = await response.text();
    } catch (_e) {
      rawText = null;
    }

    // Build a server message for logs. Prefer structured JSON detail when available,
    // otherwise fall back to raw text or the provided fallback.
    let serverMessage = fallbackMessage || `Request failed with status ${response.status}`;
    if (parsedJson && typeof parsedJson === 'object' && Object.keys(parsedJson).length > 0) {
      serverMessage = String(parsedJson.detail ?? parsedJson.message ?? JSON.stringify(parsedJson));
    } else if (rawText && rawText.trim().length > 0) {
      serverMessage = rawText;
    }

    // Log a richer debug object — safe for dev environments. This keeps the
    // thrown Error message sanitized while providing more data in console logs
    // for developers (raw response, parsed JSON, status, URL).
    try {
      console.error('API error response', {
        url: (response as any).url ?? undefined,
        status: response.status,
        statusText: response.statusText,
        parsedJson,
        rawText,
        serverMessage,
      });
    } catch (_e) {
      // Best-effort logging — don't crash the app while trying to log an error
      console.error('API error response: status', response.status, 'serverMessage:', serverMessage);
    }

    // User-facing message should be helpful but not leak internal details.
    const userMessage = fallbackMessage ? `${fallbackMessage} (status ${response.status})` : `Request failed (status ${response.status})`;
    const err = new Error(userMessage || `Request failed with status ${response.status}`);
    // Attach original server message for callers who want to inspect it programmatically
    (err as any).serverMessage = serverMessage;
    (err as any).raw = { parsedJson, rawText };
    throw err;
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
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
      await this.handleErrorResponse(response, 'Import failed');
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
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
      // Try to parse a helpful error message from the backend. The backend may
      // return JSON ({detail: ...}) or plain text. Be defensive and stringify
      // unknown shapes so the thrown Error always has a useful message.
      let parsed: any = null;
      try {
        parsed = await response.json();
      } catch (e) {
        // Not JSON — try text
        try {
          const txt = await response.text();
          parsed = txt;
        } catch (_err) {
          parsed = null;
        }
      }

      let message = `Request failed with status ${response.status}`;
      if (parsed) {
        if (typeof parsed === 'string') {
          message = parsed;
        } else if (typeof parsed === 'object') {
          // Prefer common keys
          message = String(parsed.detail ?? parsed.message ?? JSON.stringify(parsed));
        } else {
          message = String(parsed);
        }
      }

      throw new Error(message || `Request failed with status ${response.status}`);
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
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
      await this.handleErrorResponse(response, 'Enrichment failed');
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to fetch profile');
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to update profile');
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
    if (!portfolioId) throw new Error('Invalid portfolioId');
    if (!accessToken) throw new Error('Missing access token');
    const response = await fetch(`${this.baseURL}/api/portfolios/${portfolioId}/score`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'Failed to fetch score');
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
