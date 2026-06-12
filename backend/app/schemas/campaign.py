import uuid
from datetime import datetime, time
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from app.models.campaign import CampaignStatus, CampaignContactStatus

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1024)
    contact_ids: List[uuid.UUID] = Field(..., min_items=1)
    start_time: str = Field("09:00", description="Format HH:MM")
    end_time: str = Field("17:00", description="Format HH:MM")
    timezone: str = Field("Asia/Kolkata")
    max_concurrent_calls: int = Field(2, ge=1, le=50)

class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1024)
    start_time: Optional[str] = Field(None, description="Format HH:MM")
    end_time: Optional[str] = Field(None, description="Format HH:MM")
    timezone: Optional[str] = None
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=50)

class CampaignResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    dialog_campaign_id: Optional[int] = None
    status: CampaignStatus
    total_contacts: int
    stat_called: int
    stat_answered: int
    stat_interested: int
    stat_not_interested: int
    stat_transferred: int
    stat_no_answer: int
    start_time: str # string representation e.g. "09:00:00"
    end_time: str
    timezone: str
    max_concurrent_calls: int
    created_by_id: uuid.UUID
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CampaignContactResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    contact_id: uuid.UUID
    workspace_id: uuid.UUID
    call_id: Optional[uuid.UUID] = None
    status: CampaignContactStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CampaignStats(BaseModel):
    total: int
    called: int
    answered: int
    interested: int
    not_interested: int
    transferred: int
    no_answer: int

class CampaignStatsResponse(BaseModel):
    stats: CampaignStats
