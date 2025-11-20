"""
OneWealth API - Main entry point

This FastAPI application provides backend services for portfolio management,
including CSV import, market data enrichment, and position tracking.

Author: OneWealth Team
Version: 1.0.0 (Sprint 1)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import AsyncIterator

from config import settings
from routers import portfolios

# =====================================================
# LOGGING CONFIGURATION
# =====================================================

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# =====================================================
# LIFESPAN EVENTS
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Startup: Initialize connections, load resources
    - Shutdown: Cleanup resources, close connections
    """
    # Startup
    logger.info("🚀 Starting OneWealth API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Supabase URL: {settings.SUPABASE_URL}")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down OneWealth API...")

# =====================================================
# APPLICATION SETUP
# =====================================================

app = FastAPI(
    title="OneWealth API",
    description="""
    API backend pour OneWealth - Plateforme d'intelligence patrimoniale.
    
    ## Fonctionnalités (Sprint 1)
    
    * **Import CSV** : Upload et parsing de portefeuilles au format CSV
    * **Enrichissement** : Récupération automatique des données marché (secteur, prix, performances)
    * **Gestion positions** : Consultation des positions enrichies
    * **Assets centralisés** : Table unique pour stocker les données marché
    
    ## Authentification
    
    Tous les endpoints (sauf `/` et `/health`) requièrent un token d'authentification Supabase.
    """,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# =====================================================
# CORS MIDDLEWARE
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# ROUTERS
# =====================================================

app.include_router(
    portfolios.router,
    prefix="/api",
    tags=["portfolios"]
)

# =====================================================
# ROOT ENDPOINTS
# =====================================================

@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "name": "OneWealth API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else "disabled",
        "endpoints": {
            "health": "/health",
            "portfolios": "/api/portfolios",
            "import": "/api/portfolios/{portfolio_id}/import",
            "positions": "/api/portfolios/{portfolio_id}/positions",
            "enrich": "/api/portfolios/{portfolio_id}/enrich"
        }
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns:
        dict: Health status
    """
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG
    }

# =====================================================
# ERROR HANDLERS (OPTIONAL)
# =====================================================

# You can add custom exception handlers here
# Example:
# @app.exception_handler(Exception)
# async def global_exception_handler(request, exc):
#     logger.error(f"Global error: {exc}")
#     return JSONResponse(
#         status_code=500,
#         content={"detail": "Internal server error"}
#     )

# =====================================================
# ENTRY POINT
# =====================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
