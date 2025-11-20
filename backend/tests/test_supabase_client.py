import pytest

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
*** End Patch