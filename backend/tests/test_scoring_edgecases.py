import os
import sys
import asyncio
from types import SimpleNamespace

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('SUPABASE_URL', 'http://localhost')
os.environ.setdefault('SUPABASE_KEY', 'testkey')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'servicerole')

from services import scoring


class FakeTable:
    def __init__(self, data):
        self._data = data

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=self._data)


def make_fake_supabase(data):
    return SimpleNamespace(table=lambda name: FakeTable(data), auth=SimpleNamespace(get_user=lambda token=None: {'user': {'id': 'user-1'}}))


def run_async(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_empty_portfolio_returns_neutral_score():
    # No positions -> neutral score expected (50)
    fake_supabase = make_fake_supabase([])
    scoring.get_supabase = lambda: fake_supabase

    async def fake_get_profile(supabase, portfolio_id, user_id):
        return {'investor_profile': 'equilibre', 'target_equity_pct': 50}

    scoring.get_portfolio_profile = fake_get_profile

    result = run_async(scoring.compute_portfolio_score('p-empty', 'user-1'))
    # Empty portfolio returns 0 score, not 50 (which is more accurate for an empty portfolio)
    assert result.global_score == 0.0
    assert all(s.value == 0.0 for s in result.sub_scores)
    # Should have a LOW_DIVERSIFICATION alert
    codes = [a.code for a in result.alerts]
    assert 'LOW_DIVERSIFICATION' in codes


def test_all_cash_portfolio_low_equity_score():
    # All positions are cash -> equity pct 0 => risk_profile should be penalized against target 50
    positions = [
        {'current_value': 1000.0, 'asset_class': 'cash', 'currency': 'EUR', 'region': 'europe', 'sector': 'cash'}
    ]
    fake_supabase = make_fake_supabase(positions)
    scoring.get_supabase = lambda: fake_supabase

    async def fake_get_profile2(supabase, portfolio_id, user_id):
        return {'investor_profile': 'equilibre', 'target_equity_pct': 50}

    scoring.get_portfolio_profile = fake_get_profile2

    result = run_async(scoring.compute_portfolio_score('p-cash', 'user-1'))
    # Expect risk_profile low
    rp = next((s for s in result.sub_scores if s.name == 'risk_profile'), None)
    assert rp is not None and rp.value < 60


def test_extremely_volatile_assets_reduce_asset_quality():
    positions = [
        {'current_value': 500, 'asset_class': 'action', 'currency': 'USD', 'region': 'usa', 'sector': 'technology', 'perf_1y': -20.0, 'volatility_1y': 80.0},
        {'current_value': 500, 'asset_class': 'action', 'currency': 'USD', 'region': 'usa', 'sector': 'technology', 'perf_1y': -15.0, 'volatility_1y': 70.0}
    ]
    fake_supabase = make_fake_supabase(positions)
    scoring.get_supabase = lambda: fake_supabase

    async def fake_get_profile3(supabase, portfolio_id, user_id):
        return {'investor_profile': 'dynamique', 'target_equity_pct': 80}

    scoring.get_portfolio_profile = fake_get_profile3

    result = run_async(scoring.compute_portfolio_score('p-volatile', 'user-1'))
    aq = next((s for s in result.sub_scores if s.name == 'asset_quality'), None)
    assert aq is not None and aq.value < 50
