import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field
from app.models.deal import DealStatus

class DealCreate(BaseModel):
    contact_id: uuid.UUID
    pipeline_id: uuid.UUID
    stage_id: uuid.UUID
    title: str = Field(..., min_length=1, max_length=255)
    value: float = Field(default=0.0, ge=0.0)
    currency: str = Field(default="INR", max_length=10)
    probability: int = Field(default=50, ge=0, le=100)
    expected_close_date: Optional[date] = None
    assigned_to_id: Optional[uuid.UUID] = None

class DealUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    value: Optional[float] = Field(None, ge=0.0)
    currency: Optional[str] = Field(None, max_length=10)
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[date] = None
    assigned_to_id: Optional[uuid.UUID] = None
    stage_id: Optional[uuid.UUID] = None
    status: Optional[DealStatus] = None
    lost_reason: Optional[str] = Field(None, max_length=1024)

class DealResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    contact_id: uuid.UUID
    pipeline_id: uuid.UUID
    stage_id: uuid.UUID
    title: str
    value: float
    currency: str
    probability: int
    expected_close_date: Optional[date] = None
    assigned_to_id: Optional[uuid.UUID] = None
    status: DealStatus
    lost_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DealLostRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1024)
