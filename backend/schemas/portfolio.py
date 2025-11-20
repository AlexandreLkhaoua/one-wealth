"""
Portfolio and Position schemas for data validation and serialization

These Pydantic models define the structure of portfolio-related data
for API requests and responses.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date as date_type, datetime
from decimal import Decimal
from schemas.asset import AssetEnriched, AssetSummary


class PositionBase(BaseModel):
    """Base position model"""
    date: date_type = Field(..., description="Position date")
    provider: str = Field(..., description="Financial institution name")
    asset_class: str = Field(..., description="Asset class: action, obligation, etf, etc.")
    instrument_name: str = Field(..., description="Name of the financial instrument")
    isin: Optional[str] = Field(None, description="ISIN code (optional)")
    region: str = Field(..., description="Geographic region")
    currency: str = Field(default="EUR", description="Currency code")
    quantity: Optional[Decimal] = Field(None, description="Quantity held")
    purchase_price: Optional[Decimal] = Field(None, description="Purchase price per unit")
    current_value: Decimal = Field(..., description="Current total value")
    notes: Optional[str] = Field(None, description="Additional notes")


class PositionCreate(PositionBase):
    """Schema for creating a position"""
    portfolio_id: str = Field(..., description="Portfolio UUID")


class PositionCSVRow(BaseModel):
    """
    Schema for a single row from CSV import.
    
    Expected CSV format:
    date,provider,asset_class,instrument_name,isin,region,currency,current_value
    """
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    provider: str
    asset_class: str
    instrument_name: str
    isin: Optional[str] = None
    region: str
    currency: str = "EUR"
    current_value: str = Field(..., description="Numeric value as string")
    quantity: Optional[str] = None
    purchase_price: Optional[str] = None
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        """Validate date format"""
        try:
            date_type.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError(f'Invalid date format: {v}. Expected YYYY-MM-DD')
    
    @field_validator('current_value')
    @classmethod
    def validate_current_value(cls, v: str) -> str:
        """Validate that current_value is numeric"""
        try:
            float(v.replace(',', '.'))
            return v
        except ValueError:
            raise ValueError(f'Invalid numeric value: {v}')


class Position(PositionBase):
    """Full position model with ID and timestamps"""
    id: str
    portfolio_id: str
    asset_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: float  # Convert Decimal to float for JSON serialization
        }


class PositionEnriched(Position):
    """Position with enriched asset data"""
    asset: Optional[AssetSummary] = None


class PortfolioBase(BaseModel):
    """Base portfolio model"""
    name: str = Field(..., description="Portfolio name")
    description: Optional[str] = Field(None, description="Portfolio description")
    is_active: bool = Field(default=True, description="Whether portfolio is active")


class PortfolioCreate(PortfolioBase):
    """Schema for creating a portfolio"""
    client_id: str = Field(..., description="Client UUID")


class Portfolio(PortfolioBase):
    """Full portfolio model"""
    id: str
    client_id: str
    created_at: datetime
    updated_at: datetime
    # Optional investor profile fields (Sprint 2)
    investor_profile: Optional[str] = Field(
        None,
        description="Investor profile enum: defensif, equilibre, dynamique, ..."
    )
    target_equity_pct: Optional[int] = Field(
        None,
        description="Target equity % for the portfolio based on investor profile"
    )
    investment_horizon_years: Optional[int] = Field(
        None,
        description="Investment horizon in years"
    )
    objective: Optional[str] = Field(
        None,
        description="Investment objective (text)"
    )
    
    class Config:
        from_attributes = True


class PortfolioWithPositions(Portfolio):
    """Portfolio with its positions"""
    positions: List[PositionEnriched] = []
    total_value: Decimal = Field(default=Decimal('0'), description="Sum of all position values")
    positions_count: int = Field(default=0, description="Number of positions")


class CSVImportRequest(BaseModel):
    """Request schema for CSV import (multipart/form-data handled separately)"""
    portfolio_id: str = Field(..., description="Target portfolio UUID")


class CSVImportError(BaseModel):
    """Error during CSV import"""
    row: int = Field(..., description="Row number (1-indexed, includes header)")
    field: Optional[str] = Field(None, description="Field name that caused the error")
    error: str = Field(..., description="Error message")


class CSVImportResult(BaseModel):
    """Result of CSV import operation"""
    success: bool
    rows_imported: int
    rows_failed: int
    errors: List[CSVImportError] = []
    enrichment: Optional[dict] = None  # Result from enrichment service


class EnrichPortfolioResult(BaseModel):
    """Result of portfolio enrichment"""
    portfolio_id: str
    assets_enriched: int
    assets_failed: int
    total_assets: int
    success: bool
