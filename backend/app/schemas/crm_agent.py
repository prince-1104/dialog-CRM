import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr
from app.models.crm_agent import AgentType, AvailabilityStatus

class CrmAgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=5, max_length=50)
    specialization: Optional[str] = Field(None, max_length=255)
    intents: List[str] = Field(default_factory=list)
    max_concurrent_calls: int = Field(default=3, ge=1, le=20)
    user_id: Optional[uuid.UUID] = None

class CrmAgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    specialization: Optional[str] = Field(None, max_length=255)
    intents: Optional[List[str]] = None
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=20)

class CrmAgentResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    dialog_crm_agent_id: str
    agent_type: AgentType
    name: str
    phone: str
    email: Optional[str] = None
    specialization: Optional[str] = None
    intents: List[str]
    max_concurrent_calls: int
    is_available: bool
    availability_status: AvailabilityStatus
    dialog_synced: bool
    total_calls_handled: int
    total_talk_time_seconds: int
    successful_transfers: int
    failed_transfers: int
    last_active_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AgentAvailabilityUpdate(BaseModel):
    is_available: bool

# --- Human Agent Schemas ---

class HumanAgentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    specialization: Optional[str] = Field(None, max_length=255)
    intents: List[str] = Field(default_factory=lambda: ["billing", "complaint", "general"])
    max_concurrent_calls: int = Field(default=3, ge=1, le=10)

class HumanAgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    specialization: Optional[str] = Field(None, max_length=255)
    intents: Optional[List[str]] = None
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=10)

class HumanAgentStatusUpdate(BaseModel):
    availability_status: AvailabilityStatus

class HumanAgentResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    agent_type: AgentType
    name: str
    email: Optional[str] = None
    phone: str
    specialization: Optional[str] = None
    intents: List[str]
    max_concurrent_calls: int
    is_available: bool
    availability_status: AvailabilityStatus
    dialog_synced: bool
    
    # Metrics
    total_calls_handled: int
    total_talk_time_seconds: int
    successful_transfers: int
    failed_transfers: int
    last_active_at: Optional[datetime] = None
    
    # Computed
    avg_handle_time_seconds: float = 0.0
    transfer_success_rate: float = 0.0
    
    # User info
    user_email: Optional[str] = None
    user_is_active: Optional[bool] = None
    user_last_login: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class HumanAgentMetrics(BaseModel):
    agent_id: uuid.UUID
    agent_name: str
    total_calls_handled: int
    total_talk_time_seconds: int
    avg_handle_time_seconds: float
    successful_transfers: int
    failed_transfers: int
    transfer_success_rate: float
    last_active_at: Optional[datetime] = None
