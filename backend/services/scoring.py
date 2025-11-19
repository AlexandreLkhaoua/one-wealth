"""
Portfolio scoring service (Sprint 2 MVP).

Contains compute_portfolio_score which queries the positions_enriched view and
computes four subscores, alerts and a global score.

This implementation is intentionally simple and well-commented so it can be
adjusted later.
"""

from typing import List
import logging
from math import isclose

"""
Portfolio scoring service (Sprint 2 MVP).

Note: To make unit testing simpler we avoid importing the Supabase client at
module import time. Tests can inject a fake `get_supabase` callable by
assigning to this module-level name. If not provided, the function will
import the real client at runtime.
"""

from typing import List
import logging
from math import isclose

# Module-level get_supabase placeholder; tests can override this with a
# callable that returns a fake supabase client.
get_supabase = None

from schemas.score import PortfolioScoreResult, SubScore, Alert
from services.profile import get_portfolio_profile

logger = logging.getLogger(__name__)


def clamp_0_100(v: int) -> int:
    return max(0, min(100, int(v)))


async def compute_portfolio_score(portfolio_id: str, user_id: str) -> PortfolioScoreResult:
    """Compute the portfolio score and alerts for a given portfolio.

    Args:
        portfolio_id: UUID of the portfolio
        user_id: Requesting user id (placeholder for ownership checks)

    Returns:
        PortfolioScoreResult
    """
    # Resolve supabase client. Prefer an injected callable (useful for tests).
    if callable(get_supabase):
        supabase = get_supabase()
    else:
        # Lazy import to avoid pulling heavy dependencies during test collection
        from utils.supabase_client import get_supabase as _get_supabase
        supabase = _get_supabase()

    # Fetch portfolio profile info (investor_profile, target_equity_pct)
    portfolio = await get_portfolio_profile(supabase, portfolio_id)
    if not portfolio:
        raise Exception(f"Portfolio {portfolio_id} not found")

    investor_profile = portfolio.get('investor_profile')
    target_equity_pct = portfolio.get('target_equity_pct')

    # Load positions from view
    resp = supabase.table('positions_enriched').select('*').eq('portfolio_id', portfolio_id).execute()
    positions = resp.data or []

    total_value = 0.0
    for p in positions:
        try:
            total_value += float(p.get('current_value') or 0)
        except Exception:
            continue

    # Avoid division by zero
    if isclose(total_value, 0.0):
        # Return neutral score if empty portfolio
        neutral = PortfolioScoreResult(
            portfolio_id=portfolio_id,
            global_score=50,
            sub_scores=[
                SubScore(name='diversification', value=50, comment='No positions'),
                SubScore(name='risk_profile', value=50, comment='No positions'),
                SubScore(name='macro_exposure', value=50, comment='No positions'),
                SubScore(name='asset_quality', value=50, comment='No positions')
            ],
            alerts=[],
            investor_profile=investor_profile,
            target_equity_pct=target_equity_pct,
            actual_equity_pct=0.0
        )
        return neutral

    # Helper aggregations
    # 1) Diversification
    weights = []
    for p in positions:
        try:
            w = float(p.get('current_value') or 0) / total_value
        except Exception:
            w = 0.0
        weights.append((p, w))

    high_concentration_count = sum(1 for _, w in weights if w > 0.15)
    sectors = set([ (p.get('sector') or '').strip() for p, _ in weights if p.get('sector') ])
    sectors = set([s for s in sectors if s])

    diversification_score = 100
    concentration_penalty = min(30, 5 * high_concentration_count)
    diversification_score -= concentration_penalty
    if len(sectors) < 5:
        diversification_score -= 20

    diversification_score = clamp_0_100(diversification_score)
    diversification_comment = f"{high_concentration_count} positions > 15% and {len(sectors)} sectors"

    # 2) Risk profile / equity share
    equity_classes = {'action', 'etf'}
    equity_value = 0.0
    for p, _ in weights:
        if (p.get('asset_class') or '').lower() in equity_classes:
            equity_value += float(p.get('current_value') or 0)

    actual_equity_pct = round((equity_value / total_value) * 100, 2)
    tgt = target_equity_pct if target_equity_pct is not None else 50
    delta = abs(actual_equity_pct - tgt)

    if delta <= 5:
        risk_score = 100
    elif delta <= 10:
        risk_score = 80
    elif delta <= 20:
        risk_score = 60
    elif delta <= 30:
        risk_score = 40
    else:
        risk_score = 20

    risk_comment = f"Profil cible {tgt}% actions vs portefeuille {actual_equity_pct}%"

    # 3) Macro exposure (USD, Tech, Bonds)
    usd_value = 0.0
    tech_value = 0.0
    bond_value = 0.0
    for p, _ in weights:
        cv = float(p.get('current_value') or 0)
        currency = (p.get('currency') or '').upper()
        region = (p.get('region') or '').lower()
        sector = (p.get('sector') or '').lower()

        if currency == 'USD' or region == 'usa':
            usd_value += cv
        if 'technology' in sector:
            tech_value += cv
        if (p.get('asset_class') or '').lower() in {'obligation', 'fond_euro'}:
            bond_value += cv

    usd_pct = (usd_value / total_value) * 100
    tech_pct = (tech_value / total_value) * 100
    bond_pct = (bond_value / total_value) * 100

    # Subscores start at 100 and receive penalties
    usd_sub = 100
    if usd_pct > 70 or usd_pct < 10:
        usd_sub -= 30
    tech_sub = 100
    if tech_pct > 40:
        tech_sub -= 30
    bond_sub = 100
    # For conservative profiles, low bond allocation is penalized
    if investor_profile == 'defensif' and bond_pct < 5:
        bond_sub -= 30

    macro_score = clamp_0_100(int((usd_sub + tech_sub + bond_sub) / 3))
    macro_comment = f"USD {round(usd_pct,1)}%, Tech {round(tech_pct,1)}%, Bonds {round(bond_pct,1)}%"

    # 4) Asset quality: weighted perf_1y and volatility_1y
    perf_sum = 0.0
    vol_sum = 0.0
    weight_perf_total = 0.0
    weight_vol_total = 0.0
    for p, _ in weights:
        try:
            perf = p.get('perf_1y')
            vol = p.get('volatility_1y')
            cv = float(p.get('current_value') or 0)
            if perf is not None:
                perf_sum += float(perf) * cv
                weight_perf_total += cv
            if vol is not None:
                vol_sum += float(vol) * cv
                weight_vol_total += cv
        except Exception:
            continue

    asset_quality_score = 50
    aq_comment = ''
    if weight_perf_total > 0:
        avg_perf = (perf_sum / weight_perf_total)
        avg_vol = (vol_sum / weight_vol_total) if weight_vol_total > 0 else None

        # Simple mapping rules
        if avg_perf > 0 and (avg_vol is not None and avg_vol <= 15):
            asset_quality_score = 90
        elif avg_perf > 0:
            asset_quality_score = 75
        elif avg_perf < 0 and (avg_vol is not None and avg_vol > 25):
            asset_quality_score = 20
        else:
            # normalize performance roughly into 0-100 band
            asset_quality_score = clamp_0_100(int(50 + avg_perf * 2))

        aq_comment = f"Perf moyenne {round(avg_perf,2)}%, vol {round(avg_vol,2) if avg_vol is not None else 'n/a'}%"
    else:
        asset_quality_score = 50
        aq_comment = "Pas de données de performance sur 1 an"

    # Compose sub_scores
    sub_scores: List[SubScore] = [
        SubScore(name='diversification', value=diversification_score, comment=diversification_comment),
        SubScore(name='risk_profile', value=risk_score, comment=risk_comment),
        SubScore(name='macro_exposure', value=macro_score, comment=macro_comment),
        SubScore(name='asset_quality', value=asset_quality_score, comment=aq_comment)
    ]

    # Global score: weighted average (equal weights for now)
    global_score = int(sum(s.value for s in sub_scores) / len(sub_scores))

    # Alerts generation
    alerts: List[Alert] = []

    def level_for_score(v: int) -> str:
        if v < 40:
            return 'red'
        if v < 70:
            return 'orange'
        return 'green'

    # Specific alerts
    if high_concentration_count > 0:
        alerts.append(Alert(
            level= 'red' if diversification_score < 40 else 'orange',
            code='HIGH_CONCENTRATION',
            message=f'{high_concentration_count} positions > 15% (concentration élevée)',
            detail=f'{high_concentration_count} lignes représentent plus de 15% chacune'
        ))

    if len(sectors) < 5:
        alerts.append(Alert(
            level= 'orange' if diversification_score < 70 else 'green',
            code='LOW_SECTOR_DIVERSIFICATION',
            message='Moins de 5 secteurs différents',
            detail=f'{len(sectors)} secteurs identifiés'
        ))

    # Risk profile mismatch
    if abs(actual_equity_pct - tgt) > 10:
        alerts.append(Alert(
            level='red' if abs(actual_equity_pct - tgt) > 20 else 'orange',
            code='RISK_PROFILE_MISMATCH',
            message='Portefeuille incohérent avec le profil déclaré',
            detail=f'{actual_equity_pct}% actions pour un profil ciblant {tgt}%'
        ))

    if usd_pct > 70:
        alerts.append(Alert(
            level='orange' if usd_pct < 85 else 'red',
            code='HIGH_USD_EXPOSURE',
            message=f'Exposition USD élevée ({round(usd_pct,1)}%)'
        ))

    if tech_pct > 40:
        alerts.append(Alert(
            level='orange' if tech_pct < 60 else 'red',
            code='HIGH_TECH_EXPOSURE',
            message=f'Exposition secteur Technology élevée ({round(tech_pct,1)}%)'
        ))

    if asset_quality_score < 50:
        alerts.append(Alert(
            level='red' if asset_quality_score < 40 else 'orange',
            code='LOW_QUALITY_ASSETS',
            message='Qualité des supports faible',
            detail=aq_comment
        ))

    result = PortfolioScoreResult(
        portfolio_id=portfolio_id,
        global_score=clamp_0_100(global_score),
        sub_scores=sub_scores,
        alerts=alerts,
        investor_profile=investor_profile,
        target_equity_pct=target_equity_pct,
        actual_equity_pct=actual_equity_pct
    )

    return result
