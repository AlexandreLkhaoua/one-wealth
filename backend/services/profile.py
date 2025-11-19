"""
Profile service: helpers to read/update portfolio investor profile.

Keeps DB interaction out of the router logic.
"""

from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def map_label_to_profile(label: str) -> Tuple[str, int]:
    """Map UI label to DB enum and target equity percent.

    Returns (investor_profile_enum, target_equity_pct)
    """
    label_l = (label or '').strip().lower()
    if label_l == 'prudent' or label_l == 'prudent':
        return 'defensif', 20
    if label_l == 'equilibre' or label_l == 'équilibré' or label_l == 'equilibre':
        return 'equilibre', 50
    if label_l == 'dynamique':
        return 'dynamique', 80

    # Default mapping
    return 'equilibre', 50


async def get_portfolio_profile(supabase, portfolio_id: str) -> Optional[dict]:
    """Fetch portfolio fields relevant to profile.

    Returns a dict or None if not found.
    """
    try:
        resp = supabase.table('portfolios') \
            .select('id, investor_profile, target_equity_pct, investment_horizon_years, objective, client_id') \
            .eq('id', portfolio_id) \
            .execute()

        if not resp.data:
            return None

        return resp.data[0]

    except Exception as e:
        logger.error(f"Error fetching portfolio profile: {e}")
        raise


async def update_portfolio_profile(supabase, portfolio_id: str, label: str, investment_horizon_years: Optional[int], objective: Optional[str]) -> dict:
    """Update portfolio with mapped investor_profile and target_equity_pct plus optional fields.

    Returns the updated portfolio row (first element).
    """
    investor_profile_enum, target_pct = map_label_to_profile(label)

    update_payload = {
        'investor_profile': investor_profile_enum,
        'target_equity_pct': target_pct,
        'objective': objective,
        'investment_horizon_years': investment_horizon_years
    }

    # Remove None values to avoid overwriting with nulls unintentionally
    update_payload = {k: v for k, v in update_payload.items() if v is not None}

    try:
        resp = supabase.table('portfolios').update(update_payload).eq('id', portfolio_id).select('*').execute()
        if not resp.data:
            raise Exception('Portfolio not found or update failed')
        return resp.data[0]
    except Exception as e:
        logger.error(f"Error updating portfolio profile: {e}")
        raise
