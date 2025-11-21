import os
import sys
import pytest

# Ensure backend package is importable when running tests from repo root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Minimal env vars so config.Settings can initialize
os.environ.setdefault('SUPABASE_URL', 'http://localhost')
os.environ.setdefault('SUPABASE_KEY', 'testkey')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'servicerole')

import utils.supabase_client as sbc


def teardown_function(function):
    # clear lru_cache between tests
    try:
        sbc.get_supabase_client.cache_clear()
    except Exception:
        pass


def test_missing_config_raises(monkeypatch):
    # Temporarily set settings to missing values
    orig_url = sbc.settings.SUPABASE_URL
    orig_key = sbc.settings.SUPABASE_SERVICE_ROLE_KEY
    try:
        sbc.settings.SUPABASE_URL = ""
        sbc.settings.SUPABASE_SERVICE_ROLE_KEY = ""
        with pytest.raises(ValueError):
            sbc.get_supabase_client()
    finally:
        sbc.settings.SUPABASE_URL = orig_url
        sbc.settings.SUPABASE_SERVICE_ROLE_KEY = orig_key


def test_create_client_called(monkeypatch):
    # Ensure create_client is called and its return value is returned
    called = {}

    def fake_create_client(supabase_url=None, supabase_key=None):
        called['url'] = supabase_url
        called['key'] = supabase_key
        return 'FAKE_CLIENT'

    monkeypatch.setattr(sbc, 'create_client', fake_create_client)
    # ensure settings have valid values
    orig_url = sbc.settings.SUPABASE_URL
    orig_key = sbc.settings.SUPABASE_SERVICE_ROLE_KEY
    try:
        sbc.settings.SUPABASE_URL = "http://localhost"
        sbc.settings.SUPABASE_SERVICE_ROLE_KEY = "test"
        sbc.get_supabase_client.cache_clear()
        client = sbc.get_supabase_client()
        assert client == 'FAKE_CLIENT'
        assert called['url'] == "http://localhost"
        assert called['key'] == "test"
    finally:
        sbc.settings.SUPABASE_URL = orig_url
        sbc.settings.SUPABASE_SERVICE_ROLE_KEY = orig_key
