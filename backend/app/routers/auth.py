import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.workspace import Workspace, WorkspaceInvitation, UserRole
from app.models.user import User, RefreshToken
from app.schemas.auth import (
    UserRegister, UserLogin, LoginResponse, TokenRefreshRequest,
    UserResponse, WorkspaceResponse, AuthMeResponse, InviteCreate,
    InviteResponse, AcceptInvite
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, hash_token_sha256
)
from app.dependencies.auth import get_current_user, require_role

from app.utils.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_workspace(request: Request, payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # Verify slug uniqueness
    slug_stmt = select(Workspace).where(Workspace.slug == payload.workspace_slug)
    slug_res = await db.execute(slug_stmt)
    if slug_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Workspace slug already exists")

    # Create workspace
    workspace = Workspace(
        name=payload.workspace_name,
        slug=payload.workspace_slug,
        is_active=True
    )
    db.add(workspace)
    await db.flush() # Populate workspace.id

    # Create user (Role = owner)
    user = User(
        workspace_id=workspace.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.owner,
        is_active=True,
        last_login_at=datetime.utcnow()
    )
    db.add(user)
    await db.flush() # Populate user.id

    # Create token signatures
    access_token = create_access_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    
    # Save refresh token hash in DB
    ref_token_hash = hash_token_sha256(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=ref_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False
    )
    db.add(db_refresh_token)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "workspace": workspace
    }

@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    # Fetch Workspace
    ws_stmt = select(Workspace).where(Workspace.slug == payload.workspace_slug)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if not workspace or not workspace.is_active:
        raise HTTPException(status_code=400, detail="Workspace not found or inactive")

    # Fetch User
    user_stmt = select(User).where(User.workspace_id == workspace.id, User.email == payload.email)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    user.last_login_at = datetime.utcnow()

    # Create tokens
    access_token = create_access_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    
    # Save refresh token
    ref_token_hash = hash_token_sha256(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=ref_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False
    )
    db.add(db_refresh_token)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "workspace": workspace
    }

@router.post("/refresh", response_model=LoginResponse)
async def refresh(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    token_payload = decode_token(payload.refresh_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id_str = token_payload.get("sub")
    workspace_id_str = token_payload.get("workspace_id")
    
    # Check rotation hash
    token_hash = hash_token_sha256(payload.refresh_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    res = await db.execute(stmt)
    db_ref_token = res.scalar_one_or_none()
    
    if not db_ref_token or db_ref_token.revoked or db_ref_token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    # Revoke old token
    db_ref_token.revoked = True

    # Load User & Workspace
    user_id = uuid.UUID(user_id_str)
    workspace_id = uuid.UUID(workspace_id_str)
    
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    
    ws_stmt = select(Workspace).where(Workspace.id == workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    if not user or not workspace or not user.is_active or not workspace.is_active:
         raise HTTPException(status_code=401, detail="User or Workspace inactive")

    # Generate new tokens
    new_access_token = create_access_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    new_refresh_token = create_refresh_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})

    # Save new refresh token
    new_hash = hash_token_sha256(new_refresh_token)
    new_db_token = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False
    )
    db.add(new_db_token)
    await db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "user": user,
        "workspace": workspace
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    token_hash = hash_token_sha256(payload.refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash, RefreshToken.user_id == current_user.id)
        .values(revoked=True)
    )
    await db.commit()
    return {"detail": "Logged out successfully"}

@router.get("/me", response_model=AuthMeResponse)
async def get_me(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    return {
        "user": current_user,
        "workspace": workspace,
        "role": current_user.role
    }

@router.post("/invite", response_model=InviteResponse)
async def invite_member(
    payload: InviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    # Check if user already exists
    user_stmt = select(User).where(User.workspace_id == current_user.workspace_id, User.email == payload.email)
    user_res = await db.execute(user_stmt)
    if user_res.scalar_one_or_none():
         raise HTTPException(status_code=400, detail="User already registered in this workspace")

    # Check for active invitation
    inv_stmt = select(WorkspaceInvitation).where(
         WorkspaceInvitation.workspace_id == current_user.workspace_id,
         WorkspaceInvitation.email == payload.email,
         WorkspaceInvitation.accepted_at == None,
         WorkspaceInvitation.expires_at > datetime.utcnow()
    )
    inv_res = await db.execute(inv_stmt)
    if inv_res.scalar_one_or_none():
         raise HTTPException(status_code=400, detail="Active invitation already exists for this email")

    token = str(uuid.uuid4())
    invitation = WorkspaceInvitation(
        workspace_id=current_user.workspace_id,
        email=payload.email,
        role=payload.role,
        token=token,
        invited_by_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    await db.commit()

    invite_url = f"/accept-invite/{token}"
    return {
        "id": invitation.id,
        "workspace_id": invitation.workspace_id,
        "email": invitation.email,
        "role": invitation.role,
        "token": invitation.token,
        "invited_by_id": invitation.invited_by_id,
        "expires_at": invitation.expires_at,
        "accepted_at": invitation.accepted_at,
        "created_at": invitation.created_at,
        "invite_url": invite_url
    }

@router.post("/accept-invite/{token}", response_model=LoginResponse)
async def accept_invite(token: str, payload: AcceptInvite, db: AsyncSession = Depends(get_db)):
    stmt = select(WorkspaceInvitation).where(WorkspaceInvitation.token == token)
    res = await db.execute(stmt)
    invitation = res.scalar_one_or_none()
    
    if not invitation or invitation.accepted_at or invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation invalid, expired, or already accepted")

    ws_stmt = select(Workspace).where(Workspace.id == invitation.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if not workspace or not workspace.is_active:
        raise HTTPException(status_code=400, detail="Workspace is inactive")

    # Create new User
    user = User(
        workspace_id=invitation.workspace_id,
        email=invitation.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=invitation.role,
        is_active=True,
        last_login_at=datetime.utcnow()
    )
    db.add(user)
    
    # Mark invitation accepted
    invitation.accepted_at = datetime.utcnow()
    await db.flush()

    # Generate JWT tokens
    access_token = create_access_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id), "workspace_id": str(workspace.id), "role": user.role})

    # Save refresh token hash
    ref_token_hash = hash_token_sha256(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=ref_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False
    )
    db.add(db_refresh_token)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "workspace": workspace
    }
