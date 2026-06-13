"""Campaign management — CRUD, agent assignment, stats."""
import uuid
from typing import List, Optional
from datetime import datetime, time as dt_time
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.campaign import Campaign, CampaignAgent
from app.schemas.platform import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignAgentAssign
)
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("/", response_model=List[CampaignResponse])
async def list_campaigns(
    type: Optional[str] = Query(None, pattern="^(inbound|outbound)$"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Campaign).where(Campaign.tenant_id == current_user.tenant_id)
    if type:
        stmt = stmt.where(Campaign.type == type)
    if status_filter:
        stmt = stmt.where(Campaign.status == status_filter)
    stmt = stmt.order_by(Campaign.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    from app.models.tenant import Tenant
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = tenant_res.scalar_one()
    
    campaign_count = await db.execute(
        select(func.count(Campaign.id)).where(Campaign.tenant_id == current_user.tenant_id)
    )
    if (campaign_count.scalar() or 0) >= tenant.max_campaigns:
        raise HTTPException(status_code=400, detail=f"Campaign limit reached ({tenant.max_campaigns}).")

    campaign = Campaign(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        type=payload.type,
        phone_number=payload.phone_number,
        script_id=payload.script_id,
        language=payload.language,
        routing_type=payload.routing_type,
        timezone=payload.timezone,
        max_concurrent_calls=payload.max_concurrent_calls,
        created_by_id=current_user.id,
    )
    
    # Parse time strings
    if payload.start_time:
        h, m = map(int, payload.start_time.split(":"))
        campaign.start_time = dt_time(h, m)
    if payload.end_time:
        h, m = map(int, payload.end_time.split(":"))
        campaign.end_time = dt_time(h, m)
    
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(campaign, k, v)
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    await db.delete(campaign)
    await db.commit()


# ============================================================================
# Agent Assignment
# ============================================================================

@router.get("/{campaign_id}/agents")
async def list_campaign_agents(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(CampaignAgent)
        .options(selectinload(CampaignAgent.agent))
        .where(CampaignAgent.campaign_id == campaign_id)
        .order_by(CampaignAgent.priority)
    )
    agents = result.scalars().all()
    return [
        {
            "id": str(ca.id),
            "agent_id": str(ca.agent_id),
            "agent_name": ca.agent.full_name if ca.agent else None,
            "agent_email": ca.agent.email if ca.agent else None,
            "agent_status": ca.agent.availability_status if ca.agent else None,
            "priority": ca.priority,
            "is_active": ca.is_active,
        }
        for ca in agents
    ]


@router.post("/{campaign_id}/agents", status_code=status.HTTP_201_CREATED)
async def assign_agent(
    campaign_id: uuid.UUID,
    payload: CampaignAgentAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    # Verify campaign belongs to tenant
    campaign = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id)
    )
    if not campaign.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found.")

    # Verify agent belongs to same tenant
    agent = await db.execute(
        select(User).where(User.id == payload.agent_id, User.tenant_id == current_user.tenant_id, User.role == "agent")
    )
    if not agent.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Agent not found or not an agent role.")

    # Check duplicate
    existing = await db.execute(
        select(CampaignAgent).where(
            CampaignAgent.campaign_id == campaign_id,
            CampaignAgent.agent_id == payload.agent_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Agent already assigned to this campaign.")

    ca = CampaignAgent(
        campaign_id=campaign_id,
        agent_id=payload.agent_id,
        priority=payload.priority,
    )
    db.add(ca)
    await db.commit()
    return {"message": "Agent assigned", "id": str(ca.id)}


@router.delete("/{campaign_id}/agents/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_agent(
    campaign_id: uuid.UUID,
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(CampaignAgent).where(
            CampaignAgent.campaign_id == campaign_id,
            CampaignAgent.agent_id == agent_id
        )
    )
    ca = result.scalar_one_or_none()
    if not ca:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    await db.delete(ca)
    await db.commit()
