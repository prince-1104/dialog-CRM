import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, desc, or_
from app.database import get_db
from app.models.call import Call, CallStatus
from app.models.workspace import Workspace, UserRole
from app.models.user import User
from app.models.crm_agent import CrmAgent
from app.schemas.call import CallResponse, CallTransferRequest
from app.dependencies.auth import get_current_user, require_role
from app.services.dialog_client import DialogClient

router = APIRouter(prefix="/api/calls", tags=["calls"])

@router.get("", response_model=Dict[str, Any])
async def list_calls(
    contact_id: Optional[uuid.UUID] = None,
    campaign_id: Optional[uuid.UUID] = None,
    status: Optional[CallStatus] = None,
    outcome: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    stmt = select(Call).where(Call.workspace_id == current_user.workspace_id)
    
    if contact_id:
        stmt = stmt.where(Call.contact_id == contact_id)
    if campaign_id:
        stmt = stmt.where(Call.campaign_id == campaign_id)
    if status:
        stmt = stmt.where(Call.status == status)
    if outcome:
        stmt = stmt.where(Call.outcome == outcome)
    if date_from:
        stmt = stmt.where(Call.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Call.created_at <= date_to)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one_or_none() or 0

    stmt = stmt.order_by(desc(Call.created_at)).offset(offset).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 0
    }

@router.get("/active", response_model=List[CallResponse])
async def list_active_calls(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_statuses = [CallStatus.ringing, CallStatus.in_progress, CallStatus.transferred]
    stmt = select(Call).where(
        Call.workspace_id == current_user.workspace_id,
        Call.status.in_(active_statuses)
    ).order_by(desc(Call.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{id}", response_model=CallResponse)
async def get_call_detail(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Call).where(Call.id == id, Call.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
    return call

@router.post("/{id}/transfer", response_model=CallResponse)
async def transfer_call_to_agent(
    id: uuid.UUID,
    payload: CallTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.agent))
):
    # Retrieve call
    stmt = select(Call).where(Call.id == id, Call.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    # Validate active
    if call.status not in [CallStatus.ringing, CallStatus.in_progress, CallStatus.transferred]:
        raise HTTPException(status_code=400, detail="Cannot transfer an inactive call")

    # Load workspace creds
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    
    # Lookup dialog agent ID
    dialog_agent_id = None
    if payload.crm_agent_id:
        agent_stmt = select(CrmAgent).where(CrmAgent.id == payload.crm_agent_id, CrmAgent.workspace_id == current_user.workspace_id)
        agent_res = await db.execute(agent_stmt)
        agent = agent_res.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=400, detail="CRM Agent not found")
        dialog_agent_id = agent.dialog_crm_agent_id

    # Call Dialog Client transfer API
    try:
        async with DialogClient(workspace) as client:
            await client.transfer_call(
                call_id=call.dialog_call_id,
                crm_agent_id=dialog_agent_id,
                transfer_to=payload.transfer_to,
                reason=payload.reason,
                transfer_type=payload.transfer_type.value if hasattr(payload.transfer_type, 'value') else str(payload.transfer_type),
                briefing_message=payload.briefing_message
            )
            
        call.status = CallStatus.transferred
        call.was_transferred = True
        call.transfer_reason = payload.reason
        if payload.crm_agent_id:
            call.transferred_to_agent_id = payload.crm_agent_id
        call.call_transfer_type = payload.transfer_type
        
        await db.commit()
        await db.refresh(call)
        return call
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Dialog Transfer call failed: {str(e)}")

@router.post("/{id}/end", response_model=CallResponse)
async def end_active_call(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.agent))
):
    stmt = select(Call).where(Call.id == id, Call.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    call = res.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    try:
        async with DialogClient(workspace) as client:
            await client.end_call(call.dialog_call_id)
            
        call.status = CallStatus.ended
        call.ended_at = datetime.utcnow()
        await db.commit()
        await db.refresh(call)
        return call
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Dialog End call failed: {str(e)}")
