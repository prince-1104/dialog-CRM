import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.workspace import UserRole, WorkspacePlan

class UserRegister(BaseModel):
    workspace_name: str = Field(..., min_length=2, max_length=100)
    workspace_slug: str = Field(..., min_length=2, max_length=100, pattern="^[a-z0-9-]+$")
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    workspace_slug: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: WorkspacePlan
    dialog_base_url: Optional[str] = None
    dialog_webhook_registered: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
    workspace: WorkspaceResponse

class AuthMeResponse(BaseModel):
    user: UserResponse
    workspace: WorkspaceResponse
    role: UserRole

class InviteCreate(BaseModel):
    email: EmailStr
    role: UserRole

class InviteResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    email: EmailStr
    role: UserRole
    token: str
    invited_by_id: Optional[uuid.UUID]
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    created_at: datetime
    invite_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class AcceptInvite(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
