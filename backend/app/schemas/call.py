import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.call import CallDirection, CallStatus, CallTransferType

class CallResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    contact_id: Optional[uuid.UUID] = None
    campaign_id: Optional[uuid.UUID] = None
    dialog_call_id: int
    dialog_call_sid: Optional[str] = None
    initiated_by_id: Optional[uuid.UUID] = None
    phone: str
    direction: CallDirection
    status: CallStatus
    outcome: Optional[str] = None
    duration_seconds: Optional[int] = None
    detected_intent: Optional[str] = None
    intent_confidence: Optional[float] = None
    was_transferred: bool
    transferred_to_agent_id: Optional[uuid.UUID] = None
    transfer_reason: Optional[str] = None
    transcript: Optional[str] = None
    ai_summary: Optional[str] = None
    live_transcript: List[Dict[str, Any]]
    estimated_cost_usd: Optional[float] = None
    billed_cost_usd: Optional[float] = None
    dialog_stream_url: Optional[str] = None
    metadata: Dict[str, Any]
    call_transfer_type: Optional[CallTransferType] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CallTransferRequest(BaseModel):
    crm_agent_id: Optional[uuid.UUID] = None
    transfer_to: Optional[str] = None
    reason: str = Field(..., min_length=1, max_length=1024)
    transfer_type: CallTransferType = CallTransferType.cold
    briefing_message: Optional[str] = Field(None, max_length=1024)

class InitiateCallResponse(BaseModel):
    call_id: uuid.UUID
    dialog_call_id: int
    status: CallStatus
    stream_active: bool
