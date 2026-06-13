"""Super Admin portal — tenant management, usage overview."""
import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from app.database import get_db
from app.models.super_admin import SuperAdmin
from app.models.tenant import Tenant
from app.models.user import User
from app.models.disposition import DispositionTemplate, DEFAULT_DISPOSITIONS
from app.schemas.platform import (
    TenantCreate, TenantUpdate, TenantResponse, UserResponse
)
from app.dependencies.auth import get_current_super_admin
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/admin", tags=["super-admin"])


@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    """List all tenants."""
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return tenants


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: TenantCreate,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    """Create a new tenant. Also creates a default tenant_admin user and dispositions."""
    # Check slug uniqueness
    existing = await db.execute(select(Tenant).where(Tenant.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tenant slug already taken.")

    tenant = Tenant(
        name=payload.name,
        slug=payload.slug,
        plan=payload.plan,
        billing_email=payload.billing_email,
        max_agents=payload.max_agents,
        max_campaigns=payload.max_campaigns,
        created_by_super_admin_id=admin.id,
    )
    db.add(tenant)
    await db.flush()

    # Create default admin user for tenant
    admin_user = User(
        tenant_id=tenant.id,
        email=f"admin@{payload.slug}.com",
        password_hash=hash_password("Admin@123"),
        full_name=f"{payload.name} Admin",
        role="tenant_admin",
        is_active=True,
    )
    db.add(admin_user)

    # Seed default dispositions
    for d in DEFAULT_DISPOSITIONS:
        dt = DispositionTemplate(
            tenant_id=tenant.id,
            name=d["name"],
            category=d["category"],
            sort_order=d["sort_order"],
            is_system=True,
        )
        db.add(dt)

    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return tenant


@router.patch("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: uuid.UUID,
    payload: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(tenant, k, v)
    tenant.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/tenants/{tenant_id}/users", response_model=List[UserResponse])
async def list_tenant_users(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    """List users in a tenant (super admin view — no customer data shown)."""
    result = await db.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.created_at)
    )
    return result.scalars().all()


@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: SuperAdmin = Depends(get_current_super_admin)
):
    """High-level platform stats for super admin dashboard."""
    tenant_count = await db.execute(select(func.count(Tenant.id)))
    user_count = await db.execute(select(func.count(User.id)))
    active_tenants = await db.execute(select(func.count(Tenant.id)).where(Tenant.status == "active"))

    return {
        "total_tenants": tenant_count.scalar() or 0,
        "active_tenants": active_tenants.scalar() or 0,
        "total_users": user_count.scalar() or 0,
    }
