"""
Schemas related to investor profile management
"""

from pydantic import BaseModel, Field
from typing import Optional


class InvestorProfileUpdate(BaseModel):
    """Payload for updating a portfolio's investor profile (MVP)."""
    label: str = Field(..., description='"prudent" | "equilibre" | "dynamique"')
    investment_horizon_years: Optional[int] = Field(None, description="Horizon in years")
    objective: Optional[str] = Field(None, description="Free text objective")


class InvestorProfileResponse(BaseModel):
    portfolio_id: str
    investor_profile: Optional[str]
    label: Optional[str]
    target_equity_pct: Optional[int]
    investment_horizon_years: Optional[int]
    objective: Optional[str]
