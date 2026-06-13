import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# Auth Schemas
# ============================================================================

class TenantUserLogin(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str

class SuperAdminLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token: str


# ============================================================================
# User Schemas
# ============================================================================

class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    skills: List[str] = []
    availability_status: str = "offline"
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(..., pattern="^(tenant_admin|manager|team_lead|agent)$")
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    max_concurrent_calls: int = Field(default=1, ge=1, le=10)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=10)
    role: Optional[str] = Field(None, pattern="^(tenant_admin|manager|team_lead|agent)$")
    is_active: Optional[bool] = None


# ============================================================================
# Tenant Schemas
# ============================================================================

class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    plan: str
    voip_provider: Optional[str] = None
    dialog_base_url: Optional[str] = None
    dialog_webhook_registered: bool = False
    billing_email: Optional[str] = None
    max_agents: int
    max_campaigns: int
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

    @property
    def is_active_computed(self) -> bool:
        return self.status == "active"


class TenantCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=255, pattern="^[a-z0-9-]+$")
    plan: str = Field(default="starter", pattern="^(starter|pro|enterprise)$")
    billing_email: Optional[str] = None
    max_agents: int = Field(default=10, ge=1, le=1000)
    max_campaigns: int = Field(default=5, ge=1, le=500)


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    status: Optional[str] = Field(None, pattern="^(active|suspended|disabled)$")
    plan: Optional[str] = Field(None, pattern="^(starter|pro|enterprise)$")
    max_agents: Optional[int] = Field(None, ge=1, le=1000)
    max_campaigns: Optional[int] = Field(None, ge=1, le=500)
    billing_email: Optional[str] = None


# ============================================================================
# Login Response
# ============================================================================

class TenantLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
    tenant: TenantResponse

class SuperAdminResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SuperAdminLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: SuperAdminResponse


# ============================================================================
# Campaign Schemas
# ============================================================================

class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    type: str = Field(..., pattern="^(inbound|outbound)$")
    phone_number: Optional[str] = None
    script_id: Optional[uuid.UUID] = None
    language: str = Field(default="english")
    routing_type: str = Field(default="round_robin", pattern="^(round_robin|skill_based|language_based|shift_based|priority)$")
    start_time: Optional[str] = None  # HH:MM
    end_time: Optional[str] = None
    timezone: str = Field(default="Asia/Kolkata")
    max_concurrent_calls: int = Field(default=2, ge=1, le=50)


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    status: Optional[str] = Field(None, pattern="^(draft|active|paused|completed)$")
    phone_number: Optional[str] = None
    script_id: Optional[uuid.UUID] = None
    language: Optional[str] = None
    routing_type: Optional[str] = Field(None, pattern="^(round_robin|skill_based|language_based|shift_based|priority)$")
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=50)


class CampaignResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    type: str
    status: str
    phone_number: Optional[str] = None
    script_id: Optional[uuid.UUID] = None
    language: str
    routing_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: str
    max_concurrent_calls: int
    total_contacts: int
    total_calls: int
    total_answered: int
    total_converted: int
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignAgentAssign(BaseModel):
    agent_id: uuid.UUID
    priority: int = Field(default=0, ge=0)


# ============================================================================
# Customer Schemas
# ============================================================================

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=5, max_length=50)
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    source: str = Field(default="manual")
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)
    assigned_to_id: Optional[uuid.UUID] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    assigned_to_id: Optional[uuid.UUID] = None


class CustomerResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    source: str
    source_campaign_id: Optional[uuid.UUID] = None
    status: str
    tags: List[str] = []
    custom_fields: dict = {}
    total_calls: int
    last_called_at: Optional[datetime] = None
    last_disposition: Optional[str] = None
    assigned_to_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


class CustomerNoteResponse(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Script Schemas
# ============================================================================

class ScriptStepCreate(BaseModel):
    step_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    question: Optional[str] = None
    expected_responses: List[str] = Field(default_factory=list)


class ScriptStepResponse(BaseModel):
    id: uuid.UUID
    script_id: uuid.UUID
    step_number: int
    title: str
    content: Optional[str] = None
    question: Optional[str] = None
    expected_responses: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ScriptCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    type: str = Field(default="sales", pattern="^(sales|support|ai)$")
    language: str = Field(default="english")
    steps: List[ScriptStepCreate] = Field(default_factory=list)


class ScriptUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    type: Optional[str] = Field(None, pattern="^(sales|support|ai)$")
    language: Optional[str] = None
    is_active: Optional[bool] = None


class ScriptResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    type: str
    language: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    steps: List[ScriptStepResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# Disposition Schemas
# ============================================================================

class DispositionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = Field(None, pattern="^(positive|negative|neutral|callback)$")
    sort_order: int = Field(default=0)


class DispositionResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    category: Optional[str] = None
    is_system: bool
    sort_order: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Call Log Schemas
# ============================================================================

class CallLogCreate(BaseModel):
    campaign_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    direction: str = Field(..., pattern="^(inbound|outbound)$")
    phone_from: Optional[str] = None
    phone_to: Optional[str] = None


class CallLogUpdate(BaseModel):
    status: Optional[str] = None
    duration_seconds: Optional[int] = None
    disposition_id: Optional[uuid.UUID] = None
    disposition_notes: Optional[str] = None
    recording_url: Optional[str] = None


class CallLogResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    campaign_id: Optional[uuid.UUID] = None
    agent_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    direction: str
    status: str
    phone_from: Optional[str] = None
    phone_to: Optional[str] = None
    duration_seconds: int
    recording_url: Optional[str] = None
    disposition_id: Optional[uuid.UUID] = None
    disposition_notes: Optional[str] = None
    voip_call_sid: Optional[str] = None
    voip_provider: Optional[str] = None
    ai_transcript: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_sentiment: Optional[str] = None
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Callback Schemas
# ============================================================================

class CallbackCreate(BaseModel):
    customer_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    campaign_id: Optional[uuid.UUID] = None
    callback_time: datetime
    notes: Optional[str] = None


class CallbackResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    customer_id: uuid.UUID
    agent_id: Optional[uuid.UUID] = None
    campaign_id: Optional[uuid.UUID] = None
    callback_time: datetime
    status: str
    notes: Optional[str] = None
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
