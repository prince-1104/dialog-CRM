from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class OverviewResponse(BaseModel):
    total_contacts: int
    new_contacts_this_week: int
    total_calls: int
    calls_today: int
    active_campaigns: int
    active_agents: int
    total_deals_value: float
    conversion_rate: float # e.g. percent of won deals

class DateCallStat(BaseModel):
    date: str
    total: int
    answered: int
    no_answer: int
    transferred: int

class IntentStat(BaseModel):
    intent: str
    count: int
    avg_confidence: float

class CallsAnalyticsResponse(BaseModel):
    by_date: List[DateCallStat]
    by_outcome: Dict[str, int]
    by_intent: List[IntentStat]
    avg_duration_seconds: float
    total_cost_usd: float

class StageFunnelStat(BaseModel):
    stage: str
    count: int
    value: float

class LeadsAnalyticsResponse(BaseModel):
    by_status: Dict[str, int]
    pipeline_funnel: List[StageFunnelStat]
    avg_lead_score: float
    score_distribution: Dict[str, int] # e.g. "0-20": count, "21-40": count, etc.
