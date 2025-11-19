"""
Portfolio Router

This module defines all API endpoints related to portfolio management:
- CSV import
- Retrieving positions (with enriched data)
- Triggering enrichment
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from typing import List
import csv
import io
from datetime import datetime
import logging

from utils.supabase_client import get_supabase
from services.enrichment import get_market_data_service
from schemas.portfolio import (
    CSVImportResult,
    CSVImportError,
    PositionCSVRow,
    PositionEnriched,
    EnrichPortfolioResult
)
from schemas.profile import InvestorProfileUpdate, InvestorProfileResponse
from schemas.score import PortfolioScoreResult
from services.profile import get_portfolio_profile, update_portfolio_profile
from services.scoring import compute_portfolio_score

logger = logging.getLogger(__name__)
router = APIRouter()


def get_supabase_dependency():
    """Dependency for Supabase client"""
    return get_supabase()


def get_enrichment_service():
    """Dependency for enrichment service"""
    return get_market_data_service()


# =====================================================
# ENDPOINT: Import CSV
# =====================================================

@router.post("/portfolios/{portfolio_id}/import", response_model=CSVImportResult)
async def import_portfolio_csv(
    portfolio_id: str,
    file: UploadFile = File(...),
    supabase = Depends(get_supabase_dependency),
    enrichment_service = Depends(get_enrichment_service)
):
    """
    Import positions from a CSV file into a portfolio.
    
    **CSV Format Expected:**
    ```
    date,provider,asset_class,instrument_name,isin,region,currency,current_value
    2024-11-19,Boursorama,etf,Amundi CAC 40,FR0013380607,europe,EUR,9230.00
    ```
    
    **Process:**
    1. Validate portfolio exists
    2. Parse CSV file
    3. For each row with ISIN: get or create asset
    4. Insert positions with asset_id
    5. Trigger enrichment of assets
    6. Log import in csv_imports table
    
    Args:
        portfolio_id: UUID of the target portfolio
        file: CSV file upload
    
    Returns:
        CSVImportResult with import statistics and errors
    
    Raises:
        HTTPException: If portfolio not found or import fails
    """
    
    # 1. Check if portfolio exists
    try:
        portfolio_response = supabase.table('portfolios').select('*').eq('id', portfolio_id).execute()
        
        if not portfolio_response.data:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")
        
        portfolio = portfolio_response.data[0]
        
    except Exception as e:
        logger.error(f"Error fetching portfolio: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # 2. Read and parse CSV
    try:
        contents = await file.read()
        content_str = contents.decode('utf-8')
        csv_file = io.StringIO(content_str)
        
        reader = csv.DictReader(csv_file)
        
        positions_to_insert = []
        errors: List[CSVImportError] = []
        row_number = 1  # Start at 1 (header is row 0)
        
        # Validate required columns
        if reader.fieldnames:
            required_columns = ['date', 'provider', 'asset_class', 'instrument_name', 'region', 'currency', 'current_value']
            missing_columns = [col for col in required_columns if col not in reader.fieldnames]
            
            if missing_columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required columns: {', '.join(missing_columns)}"
                )
        
        # Parse each row
        for row_dict in reader:
            row_number += 1
            
            try:
                # Validate row data
                csv_row = PositionCSVRow(**row_dict)
                
                # Build position object
                position_data = {
                    'portfolio_id': portfolio_id,
                    'date': csv_row.date,
                    'provider': csv_row.provider,
                    'asset_class': csv_row.asset_class,
                    'instrument_name': csv_row.instrument_name,
                    'isin': csv_row.isin if csv_row.isin else None,
                    'region': csv_row.region,
                    'currency': csv_row.currency,
                    'current_value': float(csv_row.current_value.replace(',', '.')),
                }
                
                # Add optional fields if present
                if csv_row.quantity:
                    position_data['quantity'] = float(csv_row.quantity.replace(',', '.'))
                if csv_row.purchase_price:
                    position_data['purchase_price'] = float(csv_row.purchase_price.replace(',', '.'))
                
                # If ISIN is present, get or create asset
                if csv_row.isin:
                    asset_id = await get_or_create_asset(supabase, csv_row.isin, csv_row.instrument_name)
                    position_data['asset_id'] = asset_id
                
                positions_to_insert.append(position_data)
                
            except Exception as e:
                errors.append(CSVImportError(
                    row=row_number,
                    field='unknown',
                    error=str(e)
                ))
                logger.warning(f"Error parsing row {row_number}: {e}")
        
        if not positions_to_insert:
            raise HTTPException(
                status_code=400,
                detail="No valid positions found in CSV"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing CSV: {e}")
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    
    # 3. Insert positions into database
    try:
        insert_response = supabase.table('positions').insert(positions_to_insert).execute()
        
        rows_imported = len(insert_response.data) if insert_response.data else len(positions_to_insert)
        
        logger.info(f"✅ Inserted {rows_imported} positions for portfolio {portfolio_id}")
        
    except Exception as e:
        logger.error(f"Error inserting positions: {e}")
        raise HTTPException(status_code=500, detail=f"Database insert error: {str(e)}")
    
    # 4. Trigger enrichment
    enrichment_result = None
    try:
        enrichment_result = enrichment_service.enrich_portfolio_assets(portfolio_id)
        logger.info(f"Enrichment result: {enrichment_result}")
    except Exception as e:
        logger.error(f"Error during enrichment: {e}")
        # Don't fail the import if enrichment fails
        enrichment_result = {'success': 0, 'failed': 0, 'total': 0, 'error': str(e)}
    
    # 5. Log import in csv_imports table
    try:
        # Get client_id from portfolio
        client_id = portfolio['client_id']
        
        # Get user_id from client
        client_response = supabase.table('clients').select('user_id').eq('id', client_id).execute()
        user_id = client_response.data[0]['user_id'] if client_response.data else None
        
        import_log = {
            'portfolio_id': portfolio_id,
            'user_id': user_id,
            'filename': file.filename,
            'rows_imported': rows_imported,
            'rows_failed': len(errors),
            'import_status': 'success' if not errors else 'partial',
            'error_details': [err.dict() for err in errors] if errors else None
        }
        
        supabase.table('csv_imports').insert(import_log).execute()
        
    except Exception as e:
        logger.error(f"Error logging CSV import: {e}")
        # Don't fail the import if logging fails
    
    # 6. Return result
    return CSVImportResult(
        success=True,
        rows_imported=rows_imported,
        rows_failed=len(errors),
        errors=errors,
        enrichment=enrichment_result
    )


async def get_or_create_asset(supabase, isin: str, name: str) -> str:
    """
    Get existing asset by ISIN or create a minimal one.
    
    Args:
        supabase: Supabase client
        isin: ISIN code
        name: Asset name
    
    Returns:
        Asset UUID
    """
    # Try to find existing asset
    response = supabase.table('assets').select('id').eq('isin', isin).execute()
    
    if response.data:
        return response.data[0]['id']
    
    # Create new asset with minimal data
    new_asset = {
        'isin': isin,
        'name': name,
        'last_updated': None  # Will be enriched later
    }
    
    insert_response = supabase.table('assets').insert(new_asset).execute()
    
    if not insert_response.data:
        raise Exception(f"Failed to create asset for ISIN {isin}")
    
    asset_id = insert_response.data[0]['id']
    logger.info(f"Created new asset {asset_id} for ISIN {isin}")
    
    return asset_id


# =====================================================
# ENDPOINT: Get Portfolio Positions (Enriched)
# =====================================================

@router.get("/portfolios/{portfolio_id}/positions", response_model=List[PositionEnriched])
async def get_portfolio_positions(
    portfolio_id: str,
    supabase = Depends(get_supabase_dependency)
):
    """
    Get all positions for a portfolio, with enriched asset data.
    
    Uses the `positions_enriched` view which joins positions with assets.
    
    Args:
        portfolio_id: UUID of the portfolio
    
    Returns:
        List of positions with enriched asset data
    
    Raises:
        HTTPException: If portfolio not found
    """
    try:
        # Check if portfolio exists
        portfolio_response = supabase.table('portfolios').select('id').eq('id', portfolio_id).execute()
        
        if not portfolio_response.data:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")
        
        # Get positions with enriched data using the view
        # Note: Supabase views are queried like regular tables
        response = supabase.table('positions_enriched') \
            .select('*') \
            .eq('portfolio_id', portfolio_id) \
            .execute()
        
        if not response.data:
            return []
        
        # Transform data to match schema
        positions_enriched = []
        for pos in response.data:
            # Build asset summary if asset data is present
            asset_summary = None
            if pos.get('asset_id'):
                asset_summary = {
                    'id': pos['asset_id'],
                    'isin': pos.get('isin'),  # ISIN comes directly from position
                    'ticker': pos.get('ticker'),  # ticker is a direct field in the view
                    'name': pos.get('asset_name'),
                    'sector': pos.get('sector'),  # sector is a direct field in the view
                    'region': pos.get('asset_region'),
                    'last_price': pos.get('last_price'),  # last_price is a direct field in the view
                    'perf_1y': pos.get('perf_1y'),  # perf_1y is a direct field in the view
                    'last_updated': pos.get('market_data_updated_at')  # Correct field name from view
                }
            
            position_enriched = {
                'id': pos['id'],
                'portfolio_id': pos['portfolio_id'],
                'date': pos['date'],
                'provider': pos['provider'],
                'asset_class': pos['asset_class'],
                'instrument_name': pos['instrument_name'],
                'isin': pos['isin'],
                'region': pos['region'],
                'currency': pos['currency'],
                'quantity': pos.get('quantity'),
                'purchase_price': pos.get('purchase_price'),
                'current_value': pos['current_value'],
                'notes': pos.get('notes'),
                'asset_id': pos.get('asset_id'),
                'created_at': pos['created_at'],
                'updated_at': pos['updated_at'],
                'asset': asset_summary
            }
            
            positions_enriched.append(position_enriched)
        
        return positions_enriched
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching positions for portfolio {portfolio_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# =====================================================
# ENDPOINT: Enrich Portfolio Assets
# =====================================================

@router.post("/portfolios/{portfolio_id}/enrich", response_model=EnrichPortfolioResult)
async def enrich_portfolio(
    portfolio_id: str,
    supabase = Depends(get_supabase_dependency),
    enrichment_service = Depends(get_enrichment_service)
):
    """
    Manually trigger enrichment of all assets in a portfolio.
    
    This endpoint fetches fresh market data for all assets
    associated with positions in the portfolio.
    
    Args:
        portfolio_id: UUID of the portfolio
    
    Returns:
        EnrichPortfolioResult with enrichment statistics
    
    Raises:
        HTTPException: If portfolio not found or enrichment fails
    """
    try:
        # Check if portfolio exists
        portfolio_response = supabase.table('portfolios').select('id').eq('id', portfolio_id).execute()
        
        if not portfolio_response.data:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")
        
        # Trigger enrichment
        result = enrichment_service.enrich_portfolio_assets(portfolio_id)
        
        return EnrichPortfolioResult(
            portfolio_id=portfolio_id,
            assets_enriched=result['success'],
            assets_failed=result['failed'],
            total_assets=result['total'],
            success=result['success'] > 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enriching portfolio {portfolio_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Enrichment error: {str(e)}")


# =====================================================
# ENDPOINT: Portfolio Profile (GET / PATCH)
# =====================================================


@router.get("/portfolios/{portfolio_id}/profile", response_model=InvestorProfileResponse)
async def get_portfolio_profile_endpoint(
    portfolio_id: str,
    supabase = Depends(get_supabase_dependency)
):
    """Return portfolio profile fields for the frontend."""
    try:
        portfolio = await get_portfolio_profile(supabase, portfolio_id)
        if not portfolio:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")

        # Map DB enum to UI label
        enum = portfolio.get('investor_profile')
        label_map = {
            'defensif': 'prudent',
            'equilibre': 'equilibre',
            'dynamique': 'dynamique'
        }
        label = label_map.get(enum, 'equilibre')

        return InvestorProfileResponse(
            portfolio_id=portfolio_id,
            investor_profile=enum,
            label=label,
            target_equity_pct=portfolio.get('target_equity_pct'),
            investment_horizon_years=portfolio.get('investment_horizon_years'),
            objective=portfolio.get('objective')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile for {portfolio_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/portfolios/{portfolio_id}/profile", response_model=InvestorProfileResponse)
async def patch_portfolio_profile_endpoint(
    portfolio_id: str,
    payload: InvestorProfileUpdate,
    supabase = Depends(get_supabase_dependency)
):
    """Update portfolio profile (label -> enum + target pct)"""
    try:
        updated = await update_portfolio_profile(
            supabase,
            portfolio_id,
            payload.label,
            payload.investment_horizon_years,
            payload.objective
        )

        enum = updated.get('investor_profile')
        label_map = {
            'defensif': 'prudent',
            'equilibre': 'equilibre',
            'dynamique': 'dynamique'
        }
        label = label_map.get(enum, payload.label)

        return InvestorProfileResponse(
            portfolio_id=portfolio_id,
            investor_profile=enum,
            label=label,
            target_equity_pct=updated.get('target_equity_pct'),
            investment_horizon_years=updated.get('investment_horizon_years'),
            objective=updated.get('objective')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile for {portfolio_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ENDPOINT: Portfolio Score
# =====================================================


@router.get("/portfolios/{portfolio_id}/score", response_model=PortfolioScoreResult)
async def get_portfolio_score_endpoint(
    portfolio_id: str,
    request: Request,
    supabase = Depends(get_supabase_dependency)
):
    """Compute and return the portfolio score and alerts."""
    try:
        # Ownership/auth check: if the caller provided a Bearer token, validate
        # that the token belongs to the user owning the portfolio.
        auth_header = request.headers.get('authorization')
        user_id = None
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1]
            try:
                # supabase.auth.get_user may return a dict-like or object with 'user'
                user_resp = supabase.auth.get_user(token)
                # handle sync/async client shapes
                if isinstance(user_resp, dict) and 'user' in user_resp:
                    user_id = user_resp['user'].get('id')
                else:
                    # Some clients return an object with .user
                    user_id = getattr(user_resp, 'user', None)
                    if user_id and isinstance(user_id, dict):
                        user_id = user_id.get('id')
            except Exception:
                # If user resolution fails, treat as anonymous (no user_id)
                user_id = None

        # Fetch portfolio to check ownership
        presp = supabase.table('portfolios').select('id, client_id').eq('id', portfolio_id).execute()
        if not presp.data:
            raise HTTPException(status_code=404, detail=f"Portfolio {portfolio_id} not found")

        portfolio = presp.data[0]

        if user_id:
            # resolve client owner
            client_resp = supabase.table('clients').select('user_id').eq('id', portfolio.get('client_id')).execute()
            client_user_id = client_resp.data[0].get('user_id') if client_resp and client_resp.data else None
            if client_user_id and client_user_id != user_id:
                raise HTTPException(status_code=403, detail='Forbidden')

        result = await compute_portfolio_score(portfolio_id, user_id or "")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing score for {portfolio_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
