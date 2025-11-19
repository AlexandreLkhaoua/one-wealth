"""
Schemas for portfolio scoring results
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class SubScore(BaseModel):
    name: str
    value: int
    comment: Optional[str] = None


class Alert(BaseModel):
    level: str  # 'red' | 'orange' | 'green'
    code: str
    message: str
    detail: Optional[str] = None


class PortfolioScoreResult(BaseModel):
    portfolio_id: str
    global_score: int
    sub_scores: List[SubScore]
    alerts: List[Alert] = []

    # Context for UI
    investor_profile: Optional[str] = None
    target_equity_pct: Optional[int] = None
    actual_equity_pct: Optional[float] = None
