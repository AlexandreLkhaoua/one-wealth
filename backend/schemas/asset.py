"""
Asset schemas for data validation and serialization

These Pydantic models define the structure of asset-related data
for API requests and responses.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


class AssetBase(BaseModel):
    """Base asset model with common fields"""
    isin: str = Field(..., min_length=12, max_length=12, description="ISIN code (12 characters)")
    ticker: Optional[str] = Field(None, description="Stock ticker symbol")
    name: str = Field(..., min_length=1, description="Asset name")
    asset_type: Optional[str] = Field(None, description="Asset type: stock, etf, bond, fund, etc.")
    sector: Optional[str] = Field(None, description="Business sector")
    region: Optional[str] = Field(None, description="Geographic region")
    currency: str = Field(default="EUR", description="Currency code")
    
    @field_validator('isin')
    @classmethod
    def validate_isin(cls, v: str) -> str:
        """Validate ISIN format"""
        if not v or len(v) != 12:
            raise ValueError('ISIN must be exactly 12 characters')
        # Basic ISIN format: 2 letters + 9 alphanumeric + 1 check digit
        if not v[:2].isalpha():
            raise ValueError('ISIN must start with 2 letters (country code)')
        return v.upper()


class AssetCreate(AssetBase):
    """Schema for creating a new asset"""
    pass


class AssetUpdate(BaseModel):
    """Schema for updating an existing asset (all fields optional)"""
    ticker: Optional[str] = None
    name: Optional[str] = None
    asset_type: Optional[str] = None
    sector: Optional[str] = None
    region: Optional[str] = None
    currency: Optional[str] = None
    last_price: Optional[Decimal] = None
    previous_close: Optional[Decimal] = None
    price_change_pct: Optional[Decimal] = None
    perf_1y: Optional[Decimal] = None
    volatility_1y: Optional[Decimal] = None
    market_cap: Optional[int] = None
    data_source: Optional[str] = None


class AssetEnriched(AssetBase):
    """Schema for asset with market data (full enrichment)"""
    id: str = Field(..., description="Asset UUID")
    last_price: Optional[Decimal] = Field(None, description="Current market price")
    previous_close: Optional[Decimal] = Field(None, description="Previous closing price")
    price_change_pct: Optional[Decimal] = Field(None, description="Daily price change %")
    perf_1y: Optional[Decimal] = Field(None, description="1-year performance %")
    volatility_1y: Optional[Decimal] = Field(None, description="1-year volatility %")
    market_cap: Optional[int] = Field(None, description="Market capitalization")
    data_source: str = Field(default="manual", description="Data source: manual, yahoo, fmp")
    last_updated: Optional[datetime] = Field(None, description="Last market data update")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True  # Pydantic v2: allows ORM mode


class AssetSummary(BaseModel):
    """Lightweight asset summary (for lists)"""
    id: str
    isin: str
    ticker: Optional[str]
    name: str
    sector: Optional[str]
    region: Optional[str]
    last_price: Optional[Decimal]
    perf_1y: Optional[Decimal]
    last_updated: Optional[datetime]
    
    class Config:
        json_encoders = {
            Decimal: float  # Convert Decimal to float for JSON serialization
        }


class EnrichmentResult(BaseModel):
    """Result of an enrichment operation"""
    asset_id: str
    success: bool
    error: Optional[str] = None
    updated_fields: Optional[list[str]] = None


class BulkEnrichmentResult(BaseModel):
    """Result of bulk enrichment operation"""
    total: int
    success: int
    failed: int
    results: list[EnrichmentResult]
