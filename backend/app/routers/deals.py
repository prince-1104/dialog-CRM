import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc
from app.database import get_db
from app.models.deal import Deal, DealStatus
from app.models.contact import Contact
from app.models.user import User
from app.models.activity import Activity, ActivityType
from app.schemas.deal import DealCreate, DealUpdate, DealResponse, DealLostRequest
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/api/deals", tags=["deals"])

@router.get("", response_model=List[DealResponse])
async def list_deals(
    status: Optional[DealStatus] = None,
    pipeline_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    contact_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.workspace_id == current_user.workspace_id)
    if status:
        stmt = stmt.where(Deal.status == status)
    if pipeline_id:
        stmt = stmt.where(Deal.pipeline_id == pipeline_id)
    if assigned_to:
        stmt = stmt.where(Deal.assigned_to_id == assigned_to)
    if contact_id:
        stmt = stmt.where(Deal.contact_id == contact_id)
        
    stmt = stmt.order_by(desc(Deal.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
async def create_deal(
    payload: DealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure contact exists in same workspace
    contact_stmt = select(Contact).where(Contact.id == payload.contact_id, Contact.workspace_id == current_user.workspace_id)
    contact_res = await db.execute(contact_stmt)
    contact = contact_res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=400, detail="Contact not found")

    deal = Deal(
        workspace_id=current_user.workspace_id,
        contact_id=payload.contact_id,
        pipeline_id=payload.pipeline_id,
        stage_id=payload.stage_id,
        title=payload.title,
        value=payload.value,
        currency=payload.currency,
        probability=payload.probability,
        expected_close_date=payload.expected_close_date,
        assigned_to_id=payload.assigned_to_id,
        status=DealStatus.open
    )
    db.add(deal)
    await db.flush() # Populate ID

    # Create Activity Log
    activity = Activity(
        workspace_id=current_user.workspace_id,
        contact_id=payload.contact_id,
        deal_id=deal.id,
        user_id=current_user.id,
        type=ActivityType.deal_created,
        title="Deal Created",
        description=f"Deal '{deal.title}' was created with value {deal.value} {deal.currency}."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.get("/{id}")
async def get_deal_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.id == id, Deal.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # Fetch contact details
    contact_stmt = select(Contact).where(Contact.id == deal.contact_id)
    contact_res = await db.execute(contact_stmt)
    contact = contact_res.scalar_one_or_none()

    # Fetch activities
    act_stmt = select(Activity).where(Activity.deal_id == id).order_by(desc(Activity.created_at))
    act_res = await db.execute(act_stmt)
    activities = act_res.scalars().all()

    return {
        "deal": deal,
        "contact": contact,
        "activities": activities
    }

@router.patch("/{id}", response_model=DealResponse)
async def update_deal(
    id: uuid.UUID,
    payload: DealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.id == id, Deal.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(deal, k, v)
        
    deal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(deal)
    return deal

@router.post("/{id}/won", response_model=DealResponse)
async def mark_deal_won(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.id == id, Deal.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.status = DealStatus.won
    deal.updated_at = datetime.utcnow()

    # Log activity
    activity = Activity(
        workspace_id=current_user.workspace_id,
        contact_id=deal.contact_id,
        deal_id=deal.id,
        user_id=current_user.id,
        type=ActivityType.deal_won,
        title="Deal Won",
        description=f"Deal '{deal.title}' was marked WON!"
    )
    db.add(activity)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.post("/{id}/lost", response_model=DealResponse)
async def mark_deal_lost(
    id: uuid.UUID,
    payload: DealLostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.id == id, Deal.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal.status = DealStatus.lost
    deal.lost_reason = payload.reason
    deal.updated_at = datetime.utcnow()

    # Update contact lead score: Decrement when deal is marked lost (-15).
    contact_stmt = select(Contact).where(Contact.id == deal.contact_id)
    contact_res = await db.execute(contact_stmt)
    contact = contact_res.scalar_one_or_none()
    if contact:
        contact.lead_score = max(0, min(100, contact.lead_score - 15))

    # Log activity
    activity = Activity(
        workspace_id=current_user.workspace_id,
        contact_id=deal.contact_id,
        deal_id=deal.id,
        user_id=current_user.id,
        type=ActivityType.deal_lost,
        title="Deal Lost",
        description=f"Deal '{deal.title}' was marked LOST. Reason: {payload.reason}"
    )
    db.add(activity)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_deal(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Deal).where(Deal.id == id, Deal.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    await db.execute(delete(Deal).where(Deal.id == id))
    await db.commit()
    return {"detail": "Deal deleted successfully"}
