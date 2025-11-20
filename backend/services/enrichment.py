"""
Market Data Enrichment Service

This service handles enrichment of assets with real-time market data
using Yahoo Finance (yfinance) or other market data providers.

Key features:
- Fetch market data by ISIN/ticker
- Calculate 1-year performance and volatility
- Store enriched data in the assets table
- Handle rate limiting and errors gracefully
"""

import yfinance as yf
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import time

from utils.supabase_client import get_supabase
from config import settings

logger = logging.getLogger(__name__)


class MarketDataService:
    """
    Service for fetching and enriching market data from Yahoo Finance.
    """
    
    def __init__(self):
        self.supabase = get_supabase()
        self.rate_limit_delay = settings.API_RATE_LIMIT_DELAY
        
        # ISIN to Yahoo Finance ticker mapping
        # This is a simplified mapping - in production, you'd want a more complete database
        self.isin_to_ticker_map = {
            # French ETFs
            'FR0013380607': 'C40.PA',      # Amundi CAC 40
            'FR0010315770': 'WLD.PA',      # Lyxor MSCI World
            'FR0013412020': 'PMEH.PA',     # Lyxor PEA Immobilier Europe
            'FR0007080973': 'GOVF.PA',     # Amundi Euro Government Bond
            
            # Luxembourg ETFs
            'LU0378434582': 'MSE.PA',      # Lyxor Euro Stoxx 50
            'LU1681043599': 'PUST.PA',     # Amundi ETF PEA Nasdaq-100
            
            # Add more mappings as needed
        }
        
        # Region mapping from country names
        self.country_to_region = {
            'United States': 'USA',
            'France': 'Europe',
            'Germany': 'Europe',
            'United Kingdom': 'Europe',
            'Spain': 'Europe',
            'Italy': 'Europe',
            'Netherlands': 'Europe',
            'Switzerland': 'Europe',
            'China': 'Chine',
            'Japan': 'Asie_Pacifique',
            'Hong Kong': 'Asie_Pacifique',
            'India': 'Pays_Emergents',
            'Brazil': 'Pays_Emergents',
        }
    
    def isin_to_ticker(self, isin: str) -> Optional[str]:
        """
        Convert ISIN to Yahoo Finance ticker.
        
        Args:
            isin: ISIN code (12 characters)
        
        Returns:
            Yahoo Finance ticker or None if not found
        """
        # Check explicit mapping first
        if isin in self.isin_to_ticker_map:
            return self.isin_to_ticker_map[isin]
        
        # Try heuristic rules for common patterns
        if isin.startswith('FR'):
            # French securities - try .PA suffix (Euronext Paris)
            return f"{isin}.PA"
        elif isin.startswith('US'):
            # US securities - try without suffix
            # Note: This is very simplified, real implementation needs proper mapping
            return isin[2:10]  # Extract middle part
        elif isin.startswith('DE'):
            # German securities - try .DE suffix (Xetra)
            return f"{isin}.DE"
        
        logger.warning(f"No ticker mapping found for ISIN: {isin}")
        return None
    
    def map_country_to_region(self, country: Optional[str]) -> str:
        """
        Map a country name to a standardized region.
        
        Args:
            country: Country name from market data
        
        Returns:
            Standardized region name
        """
        if not country:
            return 'Autres'
        
        return self.country_to_region.get(country, 'Autres')
    
    def fetch_market_data(self, isin: str) -> Optional[Dict]:
        """
        Fetch market data for a given ISIN from Yahoo Finance.
        
        Args:
            isin: ISIN code
        
        Returns:
            Dictionary with market data or None on error
        """
        ticker_symbol = self.isin_to_ticker(isin)
        
        if not ticker_symbol:
            logger.warning(f"Cannot fetch data for {isin}: No ticker mapping")
            return None
        
        try:
            logger.info(f"Fetching market data for {isin} (ticker: {ticker_symbol})")
            
            # Fetch ticker info
            ticker = yf.Ticker(ticker_symbol)
            info = ticker.info
            
            if not info or 'symbol' not in info:
                logger.warning(f"No data returned for ticker {ticker_symbol}")
                return None
            
            # Fetch 1-year historical data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)
            
            hist = ticker.history(start=start_date, end=end_date)
            
            if hist.empty:
                logger.warning(f"No historical data for {ticker_symbol}")
                return None
            
            # Calculate performance metrics
            first_close = float(hist['Close'].iloc[0])
            last_close = float(hist['Close'].iloc[-1])
            perf_1y = ((last_close - first_close) / first_close) * 100
            
            # Calculate volatility (annualized standard deviation of returns)
            returns = hist['Close'].pct_change().dropna()
            volatility_1y = float(returns.std() * (252 ** 0.5) * 100)  # 252 trading days
            
            # Extract relevant info
            market_data = {
                'isin': isin,
                'ticker': ticker_symbol,
                'name': info.get('longName') or info.get('shortName') or f"Asset {isin}",
                'asset_type': self._determine_asset_type(info),
                'sector': info.get('sector'),
                'region': self.map_country_to_region(info.get('country')),
                'currency': info.get('currency', 'EUR'),
                'last_price': round(float(last_close), 4),
                'previous_close': round(float(info.get('previousClose', last_close)), 4),
                'price_change_pct': round(((last_close - float(info.get('previousClose', last_close))) / float(info.get('previousClose', last_close))) * 100, 4) if info.get('previousClose') else 0,
                'perf_1y': round(perf_1y, 2),
                'volatility_1y': round(volatility_1y, 2),
                'market_cap': info.get('marketCap'),
                'data_source': 'yahoo',
                'last_updated': datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ Successfully fetched data for {isin}: {market_data['name']}")
            return market_data
            
        except Exception as e:
            logger.error(f"❌ Error fetching market data for {isin}: {e}")
            return None
    
    def _determine_asset_type(self, info: Dict) -> str:
        """
        Determine asset type from Yahoo Finance info.
        
        Args:
            info: Yahoo Finance info dict
        
        Returns:
            Asset type string
        """
        quote_type = info.get('quoteType', '').lower()
        
        if quote_type == 'etf':
            return 'etf'
        elif quote_type == 'equity':
            return 'stock'
        elif 'bond' in quote_type or 'debt' in quote_type:
            return 'bond'
        elif quote_type == 'mutualfund':
            return 'fund'
        
        return 'other'
    
    def enrich_asset(self, asset_id: str) -> bool:
        """
        Enrich a single asset with market data.
        
        Args:
            asset_id: UUID of the asset to enrich
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Fetch asset from database
            response = self.supabase.table('assets').select('*').eq('id', asset_id).execute()
            
            if not response.data:
                logger.error(f"Asset {asset_id} not found")
                return False
            
            asset = response.data[0]
            isin = asset['isin']
            
            # Fetch market data
            market_data = self.fetch_market_data(isin)
            
            if not market_data:
                return False
            
            # Update asset in database
            update_data = {
                'name': market_data['name'],
                'ticker': market_data['ticker'],
                'asset_type': market_data['asset_type'],
                'sector': market_data['sector'],
                'region': market_data['region'],
                'currency': market_data['currency'],
                'last_price': market_data['last_price'],
                'previous_close': market_data['previous_close'],
                'price_change_pct': market_data['price_change_pct'],
                'perf_1y': market_data['perf_1y'],
                'volatility_1y': market_data['volatility_1y'],
                'market_cap': market_data['market_cap'],
                'data_source': market_data['data_source'],
                'last_updated': market_data['last_updated']
            }
            
            self.supabase.table('assets').update(update_data).eq('id', asset_id).execute()
            
            logger.info(f"✅ Asset {asset_id} enriched successfully")
            
            # Rate limiting
            time.sleep(self.rate_limit_delay)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error enriching asset {asset_id}: {e}")
            return False
    
    def enrich_portfolio_assets(self, portfolio_id: str) -> Dict:
        """
        Enrich all assets in a portfolio.
        
        Args:
            portfolio_id: UUID of the portfolio
        
        Returns:
            Dictionary with enrichment results
        """
        try:
            # Get all positions with asset_id for this portfolio
            response = self.supabase.table('positions') \
                .select('asset_id, isin') \
                .eq('portfolio_id', portfolio_id) \
                .not_.is_('asset_id', 'null') \
                .execute()
            
            if not response.data:
                logger.warning(f"No positions with assets found for portfolio {portfolio_id}")
                return {'success': 0, 'failed': 0, 'total': 0}
            
            # Get unique asset IDs
            asset_ids = list(set([pos['asset_id'] for pos in response.data if pos.get('asset_id')]))
            
            success_count = 0
            failed_count = 0
            
            for asset_id in asset_ids:
                if self.enrich_asset(asset_id):
                    success_count += 1
                else:
                    failed_count += 1
            
            result = {
                'success': success_count,
                'failed': failed_count,
                'total': len(asset_ids)
            }
            
            logger.info(f"Portfolio {portfolio_id} enrichment complete: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error enriching portfolio {portfolio_id}: {e}")
            return {'success': 0, 'failed': 0, 'total': 0, 'error': str(e)}


# Singleton instance
_market_data_service = None


def get_market_data_service() -> MarketDataService:
    """
    Get singleton instance of MarketDataService.
    
    Returns:
        MarketDataService instance
    """
    global _market_data_service
    if _market_data_service is None:
        _market_data_service = MarketDataService()
    return _market_data_service
