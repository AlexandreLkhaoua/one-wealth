"""
Schemas related to investor profile management
"""

from pydantic import BaseModel, Field
from typing import Optional


class InvestorProfileUpdate(BaseModel):
    """Payload for updating a portfolio's investor profile (MVP)."""
    investor_profile: Optional[str] = Field(None, description='"prudent" | "equilibre" | "dynamique" | "agressif"')
    target_equity_pct: Optional[float] = Field(None, description="Custom target equity percentage (overrides profile default)", ge=0, le=100)
    investment_horizon_years: Optional[int] = Field(None, description="Investment horizon in years", ge=1)
    objective: Optional[str] = Field(None, description="Investment objective (e.g., 'croissance', 'revenu')")


class InvestorProfileResponse(BaseModel):
    """Response containing portfolio's investor profile fields."""
    investor_profile: str
    target_equity_pct: float
    investment_horizon_years: int
    objective: str
