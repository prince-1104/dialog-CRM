"""
Authentication router — handles login for both tenant users and super admins.
Separate endpoints, separate token payloads, separate auth paths.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.super_admin import SuperAdmin
from app.models.tenant import Tenant
from app.schemas.platform import (
    TenantUserLogin, SuperAdminLogin,
    TenantLoginResponse, SuperAdminLoginResponse,
    UserResponse, TenantResponse, SuperAdminResponse,
    TokenRefreshRequest
)
from app.services.auth_service import (
    verify_password, create_access_token, create_refresh_token, decode_token
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ============================================================================
# TENANT USER LOGIN
# ============================================================================

@router.post("/login", response_model=TenantLoginResponse)
async def tenant_login(
    payload: TenantUserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login for tenant users (admin, manager, team_lead, agent)."""
    # 1. Find tenant by slug
    tenant_stmt = select(Tenant).where(Tenant.slug == payload.tenant_slug)
    tenant_res = await db.execute(tenant_stmt)
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid workspace or credentials.")
    
    if tenant.status != "active":
        raise HTTPException(status_code=403, detail="This workspace has been suspended. Contact your provider.")

    # 2. Find user in tenant
    user_stmt = select(User).where(
        User.tenant_id == tenant.id,
        User.email == payload.email
    )
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid workspace or credentials.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated.")

    # 3. Generate tokens
    token_data = {
        "sub": str(user.id),
        "tenant_id": str(tenant.id),
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # 4. Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()

    return TenantLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
        tenant=TenantResponse(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            status=tenant.status,
            plan=tenant.plan,
            voip_provider=tenant.voip_provider,
            dialog_base_url=tenant.dialog_base_url,
            dialog_webhook_registered=tenant.dialog_webhook_registered,
            billing_email=tenant.billing_email,
            max_agents=tenant.max_agents,
            max_campaigns=tenant.max_campaigns,
            created_at=tenant.created_at,
        )
    )


# ============================================================================
# SUPER ADMIN LOGIN
# ============================================================================

@router.post("/admin/login", response_model=SuperAdminLoginResponse)
async def super_admin_login(
    payload: SuperAdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login for NMC super admins."""
    stmt = select(SuperAdmin).where(SuperAdmin.email == payload.email)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()
    
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")

    token_data = {
        "sub": str(admin.id),
        "is_super_admin": True,
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    admin.last_login_at = datetime.utcnow()
    await db.commit()

    return SuperAdminLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=SuperAdminResponse.model_validate(admin)
    )


# ============================================================================
# ME (whoami)
# ============================================================================

@router.get("/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(
        __import__('fastapi.security', fromlist=['OAuth2PasswordBearer']).OAuth2PasswordBearer(
            tokenUrl="api/auth/login", auto_error=False
        )
    )
):
    """Return current user info based on token type."""
    from app.dependencies.auth import oauth2_scheme
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if payload.get("is_super_admin"):
        admin_id = uuid.UUID(payload["sub"])
        result = await db.execute(select(SuperAdmin).where(SuperAdmin.id == admin_id))
        admin = result.scalar_one_or_none()
        if not admin:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "type": "super_admin",
            "user": SuperAdminResponse.model_validate(admin).model_dump(),
        }
    else:
        user_id = uuid.UUID(payload["sub"])
        tenant_id = uuid.UUID(payload["tenant_id"])
        result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_res.scalar_one_or_none()
        
        return {
            "type": "tenant_user",
            "user": UserResponse.model_validate(user).model_dump(),
            "tenant": TenantResponse(
                id=tenant.id, name=tenant.name, slug=tenant.slug,
                status=tenant.status, plan=tenant.plan,
                voip_provider=tenant.voip_provider,
                dialog_base_url=tenant.dialog_base_url,
                dialog_webhook_registered=tenant.dialog_webhook_registered,
                billing_email=tenant.billing_email,
                max_agents=tenant.max_agents, max_campaigns=tenant.max_campaigns,
                created_at=tenant.created_at,
            ).model_dump() if tenant else None,
            "role": user.role,
        }
