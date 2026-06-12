import uuid
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl
from app.models.workspace import UserRole

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = Field(None, min_length=2, max_length=100, pattern="^[a-z0-9-]+$")

class DialogConfigUpdate(BaseModel):
    dialog_base_url: str = Field(..., max_length=512)
    dialog_api_key: str = Field(..., max_length=512)

class DialogConfigResponse(BaseModel):
    connected: bool
    webhook_url: str

class DialogTestResponse(BaseModel):
    connected: bool
    error: Optional[str] = None

class WorkspaceMemberUpdate(BaseModel):
    role: UserRole

class WorkspaceMemberResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    
    class Config:
        from_attributes = True
