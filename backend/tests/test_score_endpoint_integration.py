from fastapi.testclient import TestClient
import pytest
import sys
import os

# make backend package importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
import routers.portfolios as portfolios_router
import services.scoring as scoring_service


class FakeTable:
    def __init__(self, data):
        self._data = data

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        return type('R', (), {'data': self._data})()


class FakeAuth:
    def __init__(self, user_id):
        self._user = {'id': user_id}

    def get_user(self, token=None):
        return {'user': self._user}


class FakeSupabase:
    def __init__(self, portfolio_id, client_id, client_user_id):
        self._portfolio = {'id': portfolio_id, 'client_id': client_id}
        self._client = {'id': client_id, 'user_id': client_user_id}
        self.auth = FakeAuth(client_user_id)

    def table(self, name):
        if name == 'portfolios':
            return FakeTable([self._portfolio])
        if name == 'clients':
            return FakeTable([self._client])
        return FakeTable([])


@pytest.fixture(autouse=True)
def override_dependency():
    # default fixture - will be replaced inside tests
    yield


def test_score_endpoint_authorized(monkeypatch):
    portfolio_id = 'test-portfolio-1'
    client_id = 'client-1'
    client_user_id = 'user-1'

    fake_supabase = FakeSupabase(portfolio_id, client_id, client_user_id)

    # override dependency in router
    app.dependency_overrides[portfolios_router.get_supabase_dependency] = lambda: fake_supabase

    # stub compute_portfolio_score to return complete payload with all required fields
    async def fake_compute(pid, uid):
        return {
            'global_score': 42,
            'sub_scores': [],
            'alerts': [],
            'investor_profile': 'equilibre',
            'actual_equity_pct': 50.0,
            'concentration_top5': 30.0
        }

    # monkeypatch the real compute function used by the router (routers imported the function)
    monkeypatch.setattr(portfolios_router, 'compute_portfolio_score', fake_compute)

    client = TestClient(app)
    resp = client.get(f"/api/portfolios/{portfolio_id}/score", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 200
    body = resp.json()
    assert body['global_score'] == 42
    assert body['investor_profile'] == 'equilibre'


def test_score_endpoint_forbidden(monkeypatch):
    portfolio_id = 'test-portfolio-2'
    client_id = 'client-2'
    # portfolio owner is user-A
    fake_supabase = FakeSupabase(portfolio_id, client_id, 'user-A')
    # but token belongs to user-B
    fake_supabase.auth = FakeAuth('user-B')

    app.dependency_overrides[portfolios_router.get_supabase_dependency] = lambda: fake_supabase

    async def fake_compute(pid, uid):
        return {'portfolio_id': pid, 'global_score': 55, 'sub_scores': [], 'alerts': []}

    monkeypatch.setattr(portfolios_router, 'compute_portfolio_score', fake_compute)

    client = TestClient(app)
    resp = client.get(f"/api/portfolios/{portfolio_id}/score", headers={"Authorization": "Bearer token"})
    assert resp.status_code == 403
