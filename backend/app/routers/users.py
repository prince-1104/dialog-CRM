"""User management within a tenant — CRUD for managers, team leads, agents."""
import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.platform import UserCreate, UserUpdate, UserResponse
from app.dependencies.auth import get_current_user, require_role
from app.services.auth_service import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: str = Query(None, description="Filter by role"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    """List all users in the current tenant. Managers+ only."""
    stmt = select(User).where(User.tenant_id == current_user.tenant_id)
    if role:
        stmt = stmt.where(User.role == role)
    stmt = stmt.order_by(User.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tenant_admin))
):
    """Create a new user. Tenant admin only."""
    # Check email uniqueness within tenant
    existing = await db.execute(
        select(User).where(User.tenant_id == current_user.tenant_id, User.email == payload.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists in this workspace.")

    # Check agent limits
    if payload.role == "agent":
        from app.models.tenant import Tenant
        tenant_res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = tenant_res.scalar_one()
        agent_count = await db.execute(
            select(func.count(User.id)).where(User.tenant_id == current_user.tenant_id, User.role == "agent")
        )
        if (agent_count.scalar() or 0) >= tenant.max_agents:
            raise HTTPException(status_code=400, detail=f"Agent limit reached ({tenant.max_agents}). Upgrade your plan.")

    user = User(
        tenant_id=current_user.tenant_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        phone=payload.phone,
        skills=payload.skills,
        max_concurrent_calls=payload.max_concurrent_calls,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tenant_admin))
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tenant_admin))
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself.")
    
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    await db.delete(user)
    await db.commit()


@router.patch("/{user_id}/availability")
async def update_availability(
    user_id: uuid.UUID,
    status_value: str = Query(..., alias="status", pattern="^(online|away|offline)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Agents can toggle their own availability. Admins can toggle anyone's."""
    if current_user.id != user_id and current_user.role not in ("tenant_admin", "manager"):
        raise HTTPException(status_code=403, detail="Cannot change another user's availability.")
    
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.availability_status = status_value
    await db.commit()
    return {"id": str(user.id), "availability_status": user.availability_status}
