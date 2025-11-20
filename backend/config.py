"""
Configuration management for OneWealth Backend API

This module handles all environment variables and application settings
using Pydantic Settings for type validation.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All values can be overridden by creating a .env file in the backend directory.
    See .env.example for all available options.
    """
    
    # =====================================================
    # SUPABASE CONFIGURATION
    # =====================================================
    SUPABASE_URL: str = "http://localhost:54321"  # Default for testing
    SUPABASE_KEY: str = "test-anon-key"  # anon key
    SUPABASE_SERVICE_ROLE_KEY: str = "test-service-role-key"  # service_role key (sensitive!)
    
    # =====================================================
    # API CONFIGURATION
    # =====================================================
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # CORS settings
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # =====================================================
    # MARKET DATA API
    # =====================================================
    YAHOO_FINANCE_ENABLED: bool = True
    
    # Financial Modeling Prep (optional)
    FMP_API_KEY: Optional[str] = None
    FMP_ENABLED: bool = False
    
    # =====================================================
    # ENRICHMENT SETTINGS
    # =====================================================
    # How long market data remains valid (in hours)
    MARKET_DATA_STALE_HOURS: int = 24
    
    # Rate limiting: delay between API calls (in seconds)
    API_RATE_LIMIT_DELAY: float = 1.0
    
    # =====================================================
    # LOGGING
    # =====================================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # "json" or "text"
    
    # =====================================================
    # SECURITY
    # =====================================================
    SECRET_KEY: Optional[str] = None
    # Skip ownership checks in development (DANGEROUS - dev only!)
    SKIP_OWNERSHIP_CHECK: bool = True
    
    # =====================================================
    # PYDANTIC CONFIG
    # =====================================================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Using lru_cache ensures settings are only loaded once,
    improving performance.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()


# Convenience export
settings = get_settings()
