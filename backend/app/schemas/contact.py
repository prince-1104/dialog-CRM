import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models.contact import ContactSource, ContactStatus, CallOutcome

class ContactCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: str = Field(..., min_length=5, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    source: ContactSource = ContactSource.manual
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    status: ContactStatus = ContactStatus.new
    assigned_to_id: Optional[uuid.UUID] = None
    pipeline_id: Optional[uuid.UUID] = None
    pipeline_stage_id: Optional[uuid.UUID] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    company: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    source: Optional[ContactSource] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: Optional[ContactStatus] = None
    assigned_to_id: Optional[uuid.UUID] = None
    pipeline_id: Optional[uuid.UUID] = None
    pipeline_stage_id: Optional[uuid.UUID] = None

class ContactResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    first_name: str
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: str
    company: Optional[str] = None
    designation: Optional[str] = None
    source: ContactSource
    tags: List[str]
    custom_fields: Dict[str, Any]
    lead_score: int
    status: ContactStatus
    assigned_to_id: Optional[uuid.UUID] = None
    pipeline_id: Optional[uuid.UUID] = None
    pipeline_stage_id: Optional[uuid.UUID] = None
    last_called_at: Optional[datetime] = None
    last_call_outcome: Optional[CallOutcome] = None
    call_count: int
    notes_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ContactImportResponse(BaseModel):
    created: int
    failed: int
    errors: List[str]

class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1)

class NoteResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    contact_id: Optional[uuid.UUID] = None
    deal_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ContactMoveStage(BaseModel):
    pipeline_stage_id: Optional[uuid.UUID] = None

class CallTransferRules(BaseModel):
    intents: List[str] = Field(default_factory=list) # e.g. ["billing", "complaint"]
    max_ai_turns: int = Field(8, ge=1, le=50)
    human_request_threshold: int = Field(1, ge=1, le=10)
    crm_agent_id: Optional[uuid.UUID] = None # UUID representing CrmAgent
    transfer_to: Optional[str] = None # direct phone number override

class InitiateCallRequest(BaseModel):
    transfer_rules: Optional[CallTransferRules] = None
    extra_metadata: Dict[str, Any] = Field(default_factory=dict)
