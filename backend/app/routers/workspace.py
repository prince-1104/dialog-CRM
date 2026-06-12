import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.database import get_db
from app.config import settings
from app.models.workspace import Workspace, UserRole
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceUpdate, DialogConfigUpdate, DialogConfigResponse,
    DialogTestResponse, WorkspaceMemberResponse, WorkspaceMemberUpdate
)
from app.schemas.auth import WorkspaceResponse
from app.dependencies.auth import get_current_user, require_role
from app.utils.encryption import encryptor
from app.services.dialog_client import DialogClient

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

@router.get("", response_model=WorkspaceResponse)
async def get_workspace_details(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    res = await db.execute(stmt)
    workspace = res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.patch("", response_model=WorkspaceResponse)
async def update_workspace(
    payload: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    res = await db.execute(stmt)
    workspace = res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if payload.name is not None:
        workspace.name = payload.name
    if payload.slug is not None:
        # Check slug unique
        slug_stmt = select(Workspace).where(Workspace.slug == payload.slug, Workspace.id != workspace.id)
        slug_res = await db.execute(slug_stmt)
        if slug_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Workspace slug already exists")
        workspace.slug = payload.slug
        
    await db.commit()
    return workspace

@router.patch("/dialog", response_model=DialogConfigResponse)
async def configure_dialog(
    payload: DialogConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    res = await db.execute(stmt)
    workspace = res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Encrypt and store keys
    encrypted_url = encryptor.encrypt(payload.dialog_base_url)
    encrypted_key = encryptor.encrypt(payload.dialog_api_key)
    
    workspace.dialog_base_url = encrypted_url
    workspace.dialog_api_key = encrypted_key
    await db.flush() # Sync model attributes in session

    # Test Connection: List agents
    try:
        async with DialogClient(workspace) as client:
            await client.list_agents()
            
            # Register Webhook URL dynamically
            webhook_url = f"{settings.BACKEND_URL}/webhooks/dialog/{workspace.id}"
            webhook_data = await client.register_webhook(webhook_url)
            
            webhook_secret = webhook_data.get("webhookSecret")
            if webhook_secret:
                workspace.dialog_webhook_secret = encryptor.encrypt(webhook_secret)
                workspace.dialog_webhook_registered = True
                
        await db.commit()
        return {
            "connected": True,
            "webhook_url": webhook_url
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=f"Failed to connect to Dialog API or register webhook: {str(e)}"
        )

@router.get("/dialog/test", response_model=DialogTestResponse)
async def test_dialog_connection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    res = await db.execute(stmt)
    workspace = res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if not workspace.dialog_api_key or not workspace.dialog_base_url:
        return {"connected": False, "error": "Dialog integration credentials not configured"}

    try:
        async with DialogClient(workspace) as client:
            await client.list_agents()
        return {"connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)}

@router.get("/members", response_model=List[WorkspaceMemberResponse])
async def list_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(User).where(User.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/members/{user_id}", response_model=WorkspaceMemberResponse)
async def update_member_role(
    user_id: uuid.UUID,
    payload: WorkspaceMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    # Retrieve user
    stmt = select(User).where(User.id == user_id, User.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    
    if not member:
         raise HTTPException(status_code=404, detail="Team member not found")

    # Prevent demoting the owner or modifying oneself
    if member.id == current_user.id:
         raise HTTPException(status_code=400, detail="You cannot update your own role")
    if member.role == UserRole.owner:
         raise HTTPException(status_code=400, detail="Owner role cannot be changed")

    member.role = payload.role
    await db.commit()
    return member

@router.delete("/members/{user_id}", status_code=status.HTTP_200_OK)
async def delete_member(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    # Retrieve user
    stmt = select(User).where(User.id == user_id, User.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    
    if not member:
         raise HTTPException(status_code=404, detail="Team member not found")

    if member.id == current_user.id:
         raise HTTPException(status_code=400, detail="You cannot delete yourself")
    if member.role == UserRole.owner:
         raise HTTPException(status_code=400, detail="Owner cannot be removed from workspace")

    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return {"detail": "Member removed from workspace successfully"}
