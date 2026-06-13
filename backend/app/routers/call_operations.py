"""Disposition templates + Call Logs (CDR) routers."""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.disposition import DispositionTemplate
from app.models.call_log import CallLog
from app.schemas.platform import (
    DispositionCreate, DispositionResponse,
    CallLogCreate, CallLogUpdate, CallLogResponse,
    CallbackCreate, CallbackResponse
)
from app.models.callback import Callback
from app.dependencies.auth import get_current_user, require_role


# ============================================================================
# Dispositions
# ============================================================================

disp_router = APIRouter(prefix="/api/dispositions", tags=["dispositions"])


@disp_router.get("/", response_model=List[DispositionResponse])
async def list_dispositions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(DispositionTemplate)
        .where(DispositionTemplate.tenant_id == current_user.tenant_id, DispositionTemplate.is_active == True)
        .order_by(DispositionTemplate.sort_order)
    )
    return result.scalars().all()


@disp_router.post("/", response_model=DispositionResponse, status_code=status.HTTP_201_CREATED)
async def create_disposition(
    payload: DispositionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tenant_admin))
):
    dt = DispositionTemplate(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        category=payload.category,
        sort_order=payload.sort_order,
    )
    db.add(dt)
    await db.commit()
    await db.refresh(dt)
    return dt


@disp_router.delete("/{disp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disposition(
    disp_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tenant_admin))
):
    result = await db.execute(
        select(DispositionTemplate).where(
            DispositionTemplate.id == disp_id,
            DispositionTemplate.tenant_id == current_user.tenant_id
        )
    )
    dt = result.scalar_one_or_none()
    if not dt:
        raise HTTPException(status_code=404, detail="Disposition not found.")
    if dt.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system dispositions.")
    await db.delete(dt)
    await db.commit()


# ============================================================================
# Call Logs (CDR)
# ============================================================================

cdr_router = APIRouter(prefix="/api/call-logs", tags=["call-logs"])


@cdr_router.get("/", response_model=List[CallLogResponse])
async def list_call_logs(
    campaign_id: Optional[uuid.UUID] = Query(None),
    agent_id: Optional[uuid.UUID] = Query(None),
    direction: Optional[str] = Query(None, pattern="^(inbound|outbound)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(CallLog).where(CallLog.tenant_id == current_user.tenant_id)
    if campaign_id:
        stmt = stmt.where(CallLog.campaign_id == campaign_id)
    if agent_id:
        stmt = stmt.where(CallLog.agent_id == agent_id)
    if direction:
        stmt = stmt.where(CallLog.direction == direction)
    stmt = stmt.order_by(CallLog.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return result.scalars().all()


@cdr_router.post("/", response_model=CallLogResponse, status_code=status.HTTP_201_CREATED)
async def create_call_log(
    payload: CallLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cl = CallLog(
        tenant_id=current_user.tenant_id,
        campaign_id=payload.campaign_id,
        agent_id=current_user.id,
        customer_id=payload.customer_id,
        direction=payload.direction,
        phone_from=payload.phone_from,
        phone_to=payload.phone_to,
        started_at=datetime.utcnow(),
    )
    db.add(cl)
    await db.commit()
    await db.refresh(cl)
    return cl


@cdr_router.patch("/{log_id}", response_model=CallLogResponse)
async def update_call_log(
    log_id: uuid.UUID,
    payload: CallLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(CallLog).where(CallLog.id == log_id, CallLog.tenant_id == current_user.tenant_id)
    )
    cl = result.scalar_one_or_none()
    if not cl:
        raise HTTPException(status_code=404, detail="Call log not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cl, k, v)
    
    if payload.status == "completed" and not cl.ended_at:
        cl.ended_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(cl)
    return cl


@cdr_router.get("/stats")
async def call_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate call stats for the tenant."""
    tenant_id = current_user.tenant_id
    total = await db.execute(select(func.count(CallLog.id)).where(CallLog.tenant_id == tenant_id))
    completed = await db.execute(
        select(func.count(CallLog.id)).where(CallLog.tenant_id == tenant_id, CallLog.status == "completed")
    )
    total_duration = await db.execute(
        select(func.sum(CallLog.duration_seconds)).where(CallLog.tenant_id == tenant_id)
    )
    inbound = await db.execute(
        select(func.count(CallLog.id)).where(CallLog.tenant_id == tenant_id, CallLog.direction == "inbound")
    )
    outbound = await db.execute(
        select(func.count(CallLog.id)).where(CallLog.tenant_id == tenant_id, CallLog.direction == "outbound")
    )
    
    return {
        "total_calls": total.scalar() or 0,
        "completed_calls": completed.scalar() or 0,
        "total_duration_seconds": total_duration.scalar() or 0,
        "inbound_calls": inbound.scalar() or 0,
        "outbound_calls": outbound.scalar() or 0,
    }


# ============================================================================
# Callbacks
# ============================================================================

cb_router = APIRouter(prefix="/api/callbacks", tags=["callbacks"])


@cb_router.get("/", response_model=List[CallbackResponse])
async def list_callbacks(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Callback).where(Callback.tenant_id == current_user.tenant_id)
    if status_filter:
        stmt = stmt.where(Callback.status == status_filter)
    stmt = stmt.order_by(Callback.callback_time)
    result = await db.execute(stmt)
    return result.scalars().all()


@cb_router.post("/", response_model=CallbackResponse, status_code=status.HTTP_201_CREATED)
async def create_callback(
    payload: CallbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cb = Callback(
        tenant_id=current_user.tenant_id,
        customer_id=payload.customer_id,
        agent_id=payload.agent_id,
        campaign_id=payload.campaign_id,
        callback_time=payload.callback_time,
        notes=payload.notes,
        created_by_id=current_user.id,
    )
    db.add(cb)
    await db.commit()
    await db.refresh(cb)
    return cb
