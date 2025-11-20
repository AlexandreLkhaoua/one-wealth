"""
Profile service: helpers to read/update portfolio investor profile.

Keeps DB interaction out of the router logic.
"""

from typing import Tuple, Optional
import logging
from config import get_settings

logger = logging.getLogger(__name__)

# Profile to target equity mapping per Sprint 2 requirements
PROFILE_TARGET_EQUITY = {
    "prudent": 20.0,
    "equilibre": 60.0,
    "dynamique": 80.0,
    "agressif": 90.0,
}


def normalize_profile_name(profile: str) -> str:
    """Normalize profile name to standard format.
    
    Args:
        profile: Profile name (may have accents, case variations)
        
    Returns:
        Normalized profile name (prudent, equilibre, dynamique, agressif)
    """
    normalized = (profile or '').strip().lower()
    
    # Handle various spellings
    if normalized in ('prudent', 'defensif'):
        return 'prudent'
    if normalized in ('equilibre', 'équilibré', 'equilibré'):
        return 'equilibre'
    if normalized == 'dynamique':
        return 'dynamique'
    if normalized in ('agressif', 'aggressif'):
        return 'agressif'
    
    # Default to equilibre if unknown
    return 'equilibre'


def get_target_equity_for_profile(profile: str) -> float:
    """Get target equity percentage for a given profile.
    
    Args:
        profile: Profile name
        
    Returns:
        Target equity percentage (20.0, 60.0, 80.0, or 90.0)
    """
    normalized = normalize_profile_name(profile)
    return PROFILE_TARGET_EQUITY.get(normalized, 60.0)


async def get_portfolio_profile(supabase, portfolio_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Fetch portfolio fields relevant to profile.
    
    Args:
        supabase: Supabase client
        portfolio_id: Portfolio UUID
        user_id: Optional user ID for ownership check
    
    Returns:
        Portfolio dict with profile fields, or None if not found
        
    Raises:
        PermissionError: If user_id provided and doesn't own the portfolio
    """
    try:
        resp = supabase.table('portfolios') \
            .select('id, investor_profile, target_equity_pct, investment_horizon_years, objective, client_id') \
            .eq('id', portfolio_id) \
            .execute()

        if not resp.data:
            return None

        portfolio = resp.data[0]
        
        # Ownership check if user_id provided
        settings = get_settings()
        if user_id and not settings.SKIP_OWNERSHIP_CHECK:
            client_resp = supabase.table('clients').select('user_id').eq('id', portfolio['client_id']).execute()
            if client_resp.data:
                client_user_id = client_resp.data[0].get('user_id')
                logger.info(f"🔐 Profile ownership check: token user_id={user_id}, client user_id={client_user_id}")
                if client_user_id and client_user_id != user_id:
                    logger.warning(f"❌ Forbidden: user {user_id} tried to access profile of portfolio owned by {client_user_id}")
                    raise PermissionError(f"User {user_id} does not own portfolio {portfolio_id}")
        elif settings.SKIP_OWNERSHIP_CHECK:
            logger.warning(f"⚠️  SKIP_OWNERSHIP_CHECK=True - Allowing profile access without ownership validation (DEV ONLY!)")
        
        return portfolio

    except PermissionError:
        raise
    except Exception as e:
        logger.error(f"Error fetching portfolio profile: {e}")
        raise


async def update_portfolio_profile(
    supabase, 
    portfolio_id: str, 
    user_id: Optional[str],
    investor_profile: Optional[str] = None,
    target_equity_pct: Optional[float] = None,
    investment_horizon_years: Optional[int] = None,
    objective: Optional[str] = None
) -> dict:
    """Update portfolio investor profile fields.
    
    Args:
        supabase: Supabase client
        portfolio_id: Portfolio UUID
        user_id: User ID for ownership check
        investor_profile: New profile (if None, keep existing)
        target_equity_pct: Custom target equity % (if None, use profile default)
        investment_horizon_years: Investment horizon
        objective: Investment objective
        
    Returns:
        Updated portfolio dict
        
    Raises:
        PermissionError: If user doesn't own the portfolio
    """
    # Check ownership first
    existing = await get_portfolio_profile(supabase, portfolio_id, user_id)
    if not existing:
        raise ValueError(f"Portfolio {portfolio_id} not found")
    
    update_payload = {}
    
    # Update profile if provided
    if investor_profile is not None:
        normalized_profile = normalize_profile_name(investor_profile)
        update_payload['investor_profile'] = normalized_profile
        
        # Set target_equity_pct to profile default if not explicitly provided
        if target_equity_pct is None:
            update_payload['target_equity_pct'] = get_target_equity_for_profile(normalized_profile)
    
    # Override with custom target if provided
    if target_equity_pct is not None:
        update_payload['target_equity_pct'] = target_equity_pct
    
    # Update other fields if provided
    if investment_horizon_years is not None:
        update_payload['investment_horizon_years'] = investment_horizon_years
    if objective is not None:
        update_payload['objective'] = objective
    
    if not update_payload:
        # No changes, return existing
        return existing
    
    try:
        resp = supabase.table('portfolios') \
            .update(update_payload) \
            .eq('id', portfolio_id) \
            .select('*') \
            .execute()
            
        if not resp.data:
            raise Exception('Portfolio not found or update failed')
            
        return resp.data[0]
        
    except Exception as e:
        logger.error(f"Error updating portfolio profile: {e}")
        raise
