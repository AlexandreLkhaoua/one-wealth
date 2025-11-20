"""
Supabase Client Utility

This module provides a configured Supabase client using the service_role key
to bypass Row Level Security policies. This should ONLY be used on the backend.

SECURITY WARNING:
- Never expose the service_role key to the frontend
- Only use this client for server-side operations
- The service_role key bypasses ALL RLS policies
"""

from supabase import create_client, Client
from functools import lru_cache
import logging

from config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get a cached Supabase client with service_role privileges.
    
    This client bypasses Row Level Security and should only be used
    for backend operations that require elevated privileges.
    
    Returns:
        Client: Configured Supabase client
    
    Raises:
        ValueError: If Supabase credentials are not configured
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "Supabase configuration missing. "
            "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file"
        )
    
    logger.debug(f"Creating Supabase client for URL: {settings.SUPABASE_URL}")
    
    try:
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
        )
        
        logger.info("✅ Supabase client initialized successfully")
        return client
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        raise


def get_supabase() -> Client:
    """
    Convenience function to get Supabase client.
    
    This is the recommended way to get a Supabase client in your code:
    
    ```python
    from utils.supabase_client import get_supabase
    
    supabase = get_supabase()
    result = supabase.table('portfolios').select('*').execute()
    ```
    
    Returns:
        Client: Supabase client instance
    """
    return get_supabase_client()


# Convenience export
supabase = get_supabase()


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def check_supabase_connection() -> bool:
    """
    Test Supabase connection by querying a table.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        client = get_supabase()
        # Try to query the users table (should always exist)
        result = client.table('users').select('id').limit(1).execute()
        logger.info("✅ Supabase connection test successful")
        return True
    except Exception as e:
        logger.error(f"❌ Supabase connection test failed: {e}")
        return False


def safe_query(table_name: str, query_func):
    """
    Execute a Supabase query with error handling.
    
    Args:
        table_name: Name of the table being queried
        query_func: Function that performs the query
    
    Returns:
        Result data or None on error
    
    Example:
        ```python
        result = safe_query('portfolios', 
            lambda: supabase.table('portfolios').select('*').execute()
        )
        ```
    """
    try:
        response = query_func()
        if hasattr(response, 'data'):
            return response.data
        return response
    except Exception as e:
        logger.error(f"Query error on table '{table_name}': {e}")
        return None
