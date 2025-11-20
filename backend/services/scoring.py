"""
Portfolio scoring service (Sprint 2).

Computes a global portfolio score (0-100) composed of 4 sub-scores:
1. Diversification: Based on HHI (Herfindahl index) and sector count
2. Risk Profile: Alignment between actual equity % and target equity % 
3. Macro Exposure: Checks USD, Tech, and Bond exposures
4. Asset Quality: Weighted average of performance and volatility

Generates alerts with severity levels (red, orange, green) based on thresholds.

Note: To make unit testing simpler, we avoid importing the Supabase client at
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


def clamp_0_100(v: float) -> float:
    """Clamp a value to the range [0, 100]."""
    return max(0.0, min(100.0, float(v)))


def _safe_float(val, default: float) -> float:
    """Safe float conversion used for values coming from DB/payloads."""
    try:
        if val is None:
            return float(default)
        return float(val)
    except (TypeError, ValueError):
        return float(default)


async def compute_portfolio_score(portfolio_id: str, user_id: str) -> PortfolioScoreResult:
    """Compute the portfolio score and alerts for a given portfolio.
    
    Scoring Logic:
    --------------
    1. Diversification (0-100):
       - Based on Herfindahl Index (HHI): sum of squared weights
       - HHI < 0.15: excellent (100)
       - HHI > 0.3: poor concentration (penalized)
       - Sector count: penalize if < 5 sectors
       
    2. Risk Profile Alignment (0-100):
       - Compares actual equity % vs target equity % from profile
       - Delta < 5%: excellent (100)
       - Delta > 20%: poor (20 or lower)
       
    3. Macro Exposure (0-100):
       - Checks USD, Tech sector, and Bond allocation
       - Penalizes extreme concentrations (e.g., >70% USD, >40% Tech)
       
    4. Asset Quality (0-100):
       - Weighted average of 1Y performance and volatility
       - High performance + low volatility: excellent
       - Negative performance + high volatility: poor
       
    Global Score:
    -------------
    Weighted average of 4 sub-scores (equal weights: 25% each)
    
    Alerts:
    -------
    - RED: Critical issues (high concentration, major profile mismatch)
    - ORANGE: Warnings (moderate issues to monitor)
    - GREEN: All clear (optional, not always generated)

    Args:
        portfolio_id: UUID of the portfolio
        user_id: Requesting user id for ownership checks

    Returns:
        PortfolioScoreResult with global score, 4 sub-scores, and alerts
        
    Raises:
        ValueError: If portfolio not found
        PermissionError: If user doesn't own portfolio (checked in get_portfolio_profile)
    """
    # Resolve supabase client. Prefer an injected callable (useful for tests).
    if callable(get_supabase):
        supabase = get_supabase()
    else:
        # Lazy import to avoid pulling heavy dependencies during test collection
        from utils.supabase_client import get_supabase as _get_supabase
        supabase = _get_supabase()

    # Fetch portfolio profile info (investor_profile, target_equity_pct)
    portfolio = await get_portfolio_profile(supabase, portfolio_id, user_id)
    if not portfolio:
        raise ValueError(f"Portfolio {portfolio_id} not found")

    # Use a safe fallback when the DB field exists but is NULL (portfolio.get(..., default)
    # will return None if the key exists with a None value). The `or` fallback guarantees
    # a string is provided to downstream logic.
    investor_profile = (portfolio.get('investor_profile') or 'equilibre')
    target_equity_pct = _safe_float(portfolio.get('target_equity_pct'), 60.0)

    # Load positions from view
    resp = supabase.table('positions_enriched').select('*').eq('portfolio_id', portfolio_id).execute()
    positions = resp.data or []

    total_value = 0.0
    for p in positions:
        try:
            total_value += float(p.get('current_value') or 0)
        except Exception:
            continue

    # Handle empty portfolio
    if isclose(total_value, 0.0) or len(positions) == 0:
        return PortfolioScoreResult(
            global_score=0.0,
            sub_scores=[
                SubScore(name='diversification', value=0.0, description='Portfolio vide'),
                SubScore(name='risk_profile', value=0.0, description='Portfolio vide'),
                SubScore(name='macro_exposure', value=0.0, description='Portfolio vide'),
                SubScore(name='asset_quality', value=0.0, description='Portfolio vide')
            ],
            alerts=[Alert(
                code='LOW_DIVERSIFICATION',
                severity='orange',
                message='Portfolio vide ou sans positions',
                recommendation='Ajoutez des positions pour obtenir un score'
            )],
            investor_profile=investor_profile,
            actual_equity_pct=0.0,
            concentration_top5=0.0
        )

    # ============================================================
    # CALCULATE WEIGHTS AND AGGREGATIONS
    # ============================================================
    weights = []
    for p in positions:
        try:
            w = float(p.get('current_value') or 0) / total_value
        except Exception:
            w = 0.0
        weights.append((p, w))
    
    # Sort by weight descending to get top positions
    weights_sorted = sorted(weights, key=lambda x: x[1], reverse=True)
    
    # Calculate concentration_top5
    top5_weights = [w for _, w in weights_sorted[:5]]
    concentration_top5 = sum(top5_weights) * 100.0  # as percentage
    
    # Calculate Herfindahl Index (HHI): sum of squared weights
    hhi = sum(w * w for _, w in weights)
    
    # Count unique sectors
    sectors = set((p.get('sector') or '').strip() for p, _ in weights if p.get('sector'))
    sectors = set(s for s in sectors if s)
    num_sectors = len(sectors)
    
    # ============================================================
    # SUB-SCORE 1: DIVERSIFICATION (0-100)
    # ============================================================
    # HHI interpretation:
    # - HHI < 0.10: highly diversified (score ~100)
    # - HHI 0.10-0.15: good diversification (score 80-100)
    # - HHI 0.15-0.25: moderate (score 50-80)
    # - HHI > 0.30: highly concentrated (score 0-50)
    
    if hhi < 0.10:
        diversification_score = 100.0
    elif hhi < 0.15:
        diversification_score = 100.0 - (hhi - 0.10) * 400  # 100 to 80
    elif hhi < 0.25:
        diversification_score = 80.0 - (hhi - 0.15) * 300   # 80 to 50
    elif hhi < 0.30:
        diversification_score = 50.0 - (hhi - 0.25) * 1000  # 50 to 0
    else:
        diversification_score = max(0.0, 50.0 - (hhi - 0.30) * 500)
    
    # Penalize if too few sectors
    if num_sectors < 3:
        diversification_score *= 0.5  # Severe penalty
    elif num_sectors < 5:
        diversification_score *= 0.8  # Moderate penalty
    
    diversification_score = clamp_0_100(diversification_score)
    diversification_desc = f"HHI: {hhi:.3f}, {len(positions)} positions, {num_sectors} secteurs"

    # ============================================================
    # SUB-SCORE 2: RISK PROFILE ALIGNMENT (0-100)
    # ============================================================
    # Compare actual equity allocation vs target from investor profile
    equity_classes = {'action', 'etf'}
    equity_value = 0.0
    for p, _ in weights:
        asset_class_lower = (p.get('asset_class') or '').lower()
        if asset_class_lower in equity_classes:
            equity_value += float(p.get('current_value') or 0)

    actual_equity_pct = (equity_value / total_value) * 100.0
    delta = abs(actual_equity_pct - target_equity_pct)

    # Score based on deviation from target
    if delta <= 5.0:
        risk_score = 100.0
    elif delta <= 10.0:
        risk_score = 100.0 - (delta - 5.0) * 4  # 100 to 80
    elif delta <= 15.0:
        risk_score = 80.0 - (delta - 10.0) * 4  # 80 to 60
    elif delta <= 20.0:
        risk_score = 60.0 - (delta - 15.0) * 4  # 60 to 40
    else:
        risk_score = max(0.0, 40.0 - (delta - 20.0) * 2)  # 40 to 0
    
    risk_score = clamp_0_100(risk_score)
    risk_desc = f"Cible {target_equity_pct:.1f}% vs réel {actual_equity_pct:.1f}% (écart: {delta:.1f}%)"

    # ============================================================
    # SUB-SCORE 3: MACRO EXPOSURE (0-100)
    # ============================================================
    # Analyze USD, Tech sector, and Bond exposure
    usd_value = 0.0
    tech_value = 0.0
    bond_value = 0.0
    
    for p, _ in weights:
        cv = float(p.get('current_value') or 0)
        currency = (p.get('currency') or '').upper()
        region = (p.get('region') or '').lower()
        sector = (p.get('sector') or '').lower()

        if currency == 'USD' or 'usa' in region or 'etats-unis' in region:
            usd_value += cv
        if 'technology' in sector or 'tech' in sector:
            tech_value += cv
        if (p.get('asset_class') or '').lower() in {'obligation', 'bond', 'fond_euro'}:
            bond_value += cv

    usd_pct = (usd_value / total_value) * 100.0
    tech_pct = (tech_value / total_value) * 100.0
    bond_pct = (bond_value / total_value) * 100.0

    # Start at 100 and apply penalties for imbalances
    macro_score = 100.0
    
    # USD exposure: penalize extremes
    if usd_pct > 70.0:
        macro_score -= min(30.0, (usd_pct - 70.0) * 1.0)
    elif usd_pct < 10.0 and usd_pct > 0:
        macro_score -= 15.0  # Some USD exposure is healthy
    
    # Tech exposure: penalize high concentration
    if tech_pct > 40.0:
        macro_score -= min(30.0, (tech_pct - 40.0) * 1.5)
    
    # Bond exposure: depends on profile
    if investor_profile == 'prudent' and bond_pct < 20.0:
        macro_score -= 20.0  # Prudent should have more bonds
    elif investor_profile == 'agressif' and bond_pct > 20.0:
        macro_score -= 10.0  # Aggressive shouldn't have too many bonds

    macro_score = clamp_0_100(macro_score)
    macro_desc = f"USD {usd_pct:.1f}%, Tech {tech_pct:.1f}%, Obligations {bond_pct:.1f}%"

    # ============================================================
    # SUB-SCORE 4: ASSET QUALITY (0-100)
    # ============================================================
    # Weighted average of 1Y performance and volatility
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

    if weight_perf_total > 0:
        avg_perf = (perf_sum / weight_perf_total)
        avg_vol = (vol_sum / weight_vol_total) if weight_vol_total > 0 else 20.0
        
        # Score based on performance and volatility combination
        # Best: positive perf + low vol
        # Worst: negative perf + high vol
        if avg_perf > 10.0 and avg_vol <= 15.0:
            asset_quality_score = 95.0
        elif avg_perf > 5.0 and avg_vol <= 20.0:
            asset_quality_score = 85.0
        elif avg_perf > 0 and avg_vol <= 25.0:
            asset_quality_score = 75.0
        elif avg_perf > -5.0 and avg_vol <= 30.0:
            asset_quality_score = 60.0
        elif avg_perf > -10.0 or avg_vol <= 35.0:
            asset_quality_score = 40.0
        else:
            asset_quality_score = max(0.0, 40.0 - abs(avg_perf) - (avg_vol - 35))
        
        asset_quality_desc = f"Perf 1Y: {avg_perf:.1f}%, Volatilité: {avg_vol:.1f}%"
    else:
        asset_quality_score = 50.0
        asset_quality_desc = "Pas de données de performance disponibles"

    asset_quality_score = clamp_0_100(asset_quality_score)

    # ============================================================
    # COMPOSE SUB-SCORES
    # ============================================================
    sub_scores: List[SubScore] = [
        SubScore(name='diversification', value=diversification_score, description=diversification_desc),
        SubScore(name='risk_profile', value=risk_score, description=risk_desc),
        SubScore(name='macro_exposure', value=macro_score, description=macro_desc),
        SubScore(name='asset_quality', value=asset_quality_score, description=asset_quality_desc)
    ]

    # ============================================================
    # GLOBAL SCORE (weighted average)
    # ============================================================
    # Equal weights for all 4 sub-scores (25% each)
    global_score = sum(s.value for s in sub_scores) / len(sub_scores)
    global_score = clamp_0_100(global_score)

    # ============================================================
    # ALERTS GENERATION
    # ============================================================
    alerts: List[Alert] = []

    # Alert 1: High concentration (Top 5 > 60%)
    if concentration_top5 > 60.0:
        severity = 'red' if concentration_top5 > 70.0 else 'orange'
        alerts.append(Alert(
            code='HIGH_CONCENTRATION',
            severity=severity,
            message=f'Concentration élevée: Top 5 positions = {concentration_top5:.1f}%',
            recommendation='Diversifiez votre portefeuille en réduisant les positions majeures'
        ))
    
    # Alert 2: Low diversification (< 10 positions)
    if len(positions) < 10:
        alerts.append(Alert(
            code='LOW_DIVERSIFICATION',
            severity='orange',
            message=f'Diversification limitée: seulement {len(positions)} positions',
            recommendation='Ajoutez plus de positions pour améliorer la diversification'
        ))
    
    # Alert 3: Low sector diversity
    if num_sectors < 5:
        alerts.append(Alert(
            code='LOW_SECTOR_DIVERSIFICATION',
            severity='orange',
            message=f'Peu de secteurs: seulement {num_sectors} secteurs représentés',
            recommendation='Diversifiez dans plus de secteurs économiques'
        ))

    # Alert 4: Risk profile mismatch
    delta_equity = abs(actual_equity_pct - target_equity_pct)
    if delta_equity > 15.0:
        severity = 'red' if delta_equity > 25.0 else 'orange'
        direction = 'plus' if actual_equity_pct > target_equity_pct else 'moins'
        alerts.append(Alert(
            code='RISK_PROFILE_MISMATCH',
            severity=severity,
            message=f'Allocation incohérente avec profil {investor_profile}',
            recommendation=f'Profil cible: {target_equity_pct:.1f}% actions, réel: {actual_equity_pct:.1f}%. Ajustez en {direction}.'
        ))

    # Alert 5: High USD exposure
    if usd_pct > 70.0:
        severity = 'red' if usd_pct > 85.0 else 'orange'
        alerts.append(Alert(
            code='HIGH_USD_EXPOSURE',
            severity=severity,
            message=f'Forte exposition USD: {usd_pct:.1f}%',
            recommendation='Diversifiez géographiquement pour réduire le risque de change'
        ))

    # Alert 6: High Tech exposure
    if tech_pct > 40.0:
        severity = 'red' if tech_pct > 60.0 else 'orange'
        alerts.append(Alert(
            code='HIGH_TECH_EXPOSURE',
            severity=severity,
            message=f'Forte exposition secteur Tech: {tech_pct:.1f}%',
            recommendation='Réduisez la concentration sectorielle en diversifiant'
        ))

    # Alert 7: High volatility
    if weight_vol_total > 0:
        avg_vol = (vol_sum / weight_vol_total)
        if avg_vol > 35.0:
            severity = 'red' if avg_vol > 50.0 else 'orange'
            alerts.append(Alert(
                code='HIGH_VOLATILITY',
                severity=severity,
                message=f'Volatilité élevée: {avg_vol:.1f}%',
                recommendation='Considérez des actifs moins volatils pour réduire le risque'
            ))

    # Alert 8: Low asset quality
    if asset_quality_score < 50.0:
        severity = 'red' if asset_quality_score < 35.0 else 'orange'
        alerts.append(Alert(
            code='LOW_QUALITY_ASSETS',
            severity=severity,
            message='Qualité des actifs faible (performance et/ou volatilité)',
            recommendation='Réévaluez vos positions sous-performantes'
        ))
    
    # Alert 9: All clear (if global score is high)
    if global_score >= 80.0 and len(alerts) == 0:
        alerts.append(Alert(
            code='OK_PROFILE',
            severity='green',
            message='Portefeuille bien aligné avec votre profil',
            recommendation='Continuez à monitorer régulièrement'
        ))

    # ============================================================
    # BUILD RESULT
    # ============================================================
    result = PortfolioScoreResult(
        global_score=global_score,
        sub_scores=sub_scores,
        alerts=alerts,
        investor_profile=investor_profile,
        actual_equity_pct=actual_equity_pct,
        concentration_top5=concentration_top5
    )

    return result
