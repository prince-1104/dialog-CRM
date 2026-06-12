import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, desc
from app.database import get_db
from app.models.campaign import Campaign, CampaignContact, CampaignStatus, CampaignContactStatus
from app.models.contact import Contact
from app.models.workspace import Workspace, UserRole
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignResponse,
    CampaignContactResponse, CampaignStatsResponse
)
from app.dependencies.auth import get_current_user, require_role
from app.services.dialog_client import DialogClient

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Campaign).where(Campaign.workspace_id == current_user.workspace_id).order_by(desc(Campaign.created_at))
    res = await db.execute(stmt)
    campaigns = res.scalars().all()
    
    # We will format start_time and end_time as strings in the schema
    result = []
    for camp in campaigns:
        # Pydantic will auto format time object to HH:MM:SS or custom
        result.append(camp)
    return result

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    # Retrieve details of selected contacts
    contact_stmt = select(Contact).where(
        Contact.id.in_(payload.contact_ids),
        Contact.workspace_id == current_user.workspace_id
    )
    contact_res = await db.execute(contact_stmt)
    contacts = contact_res.scalars().all()
    
    if not contacts:
        raise HTTPException(status_code=400, detail="No valid contacts selected")

    # Load workspace creds
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    
    # Format time fields "HH:MM" -> python time object
    try:
        sh, sm = map(int, payload.start_time.split(":"))
        eh, em = map(int, payload.end_time.split(":"))
        start_time_obj = time(sh, sm)
        end_time_obj = time(eh, em)
    except Exception:
         raise HTTPException(status_code=400, detail="Invalid start_time or end_time format. Must be HH:MM")

    # Save campaign to DB first
    campaign = Campaign(
        workspace_id=current_user.workspace_id,
        name=payload.name,
        description=payload.description,
        status=CampaignStatus.draft,
        total_contacts=len(contacts),
        start_time=start_time_obj,
        end_time=end_time_obj,
        timezone=payload.timezone,
        max_concurrent_calls=payload.max_concurrent_calls,
        created_by_id=current_user.id
    )
    db.add(campaign)
    await db.flush()

    # Link contacts
    for contact in contacts:
        cc = CampaignContact(
            campaign_id=campaign.id,
            contact_id=contact.id,
            workspace_id=current_user.workspace_id,
            status=CampaignContactStatus.pending
        )
        db.add(cc)

    # Call Dialog client to register campaign
    dialog_contacts = []
    for c in contacts:
         dialog_contacts.append({
              "phone": c.phone,
              "firstName": c.first_name,
              "lastName": c.last_name or "",
              "company": c.company or ""
         })

    try:
        async with DialogClient(workspace) as client:
            dialog_res = await client.create_campaign(
                 name=payload.name,
                 contacts=dialog_contacts,
                 start_time=payload.start_time,
                 end_time=payload.end_time,
                 timezone=payload.timezone,
                 max_concurrent_calls=payload.max_concurrent_calls
            )
        campaign.dialog_campaign_id = dialog_res.get("campaignId")
        campaign.status = CampaignStatus.syncing
        await db.commit()
        await db.refresh(campaign)
        return campaign
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=502, detail=f"Failed to create campaign in Dialog calling system: {str(e)}")

@router.get("/{id}")
async def get_campaign_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Campaign).where(Campaign.id == id, Campaign.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")
         
    return campaign

@router.post("/{id}/start", response_model=CampaignResponse)
async def start_campaign(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    stmt = select(Campaign).where(Campaign.id == id, Campaign.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.dialog_campaign_id:
         raise HTTPException(status_code=400, detail="Campaign has not been registered in Dialog system")

    # Load workspace
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    try:
        async with DialogClient(workspace) as client:
            await client.start_campaign(campaign.dialog_campaign_id)
            
        campaign.status = CampaignStatus.active
        campaign.started_at = datetime.utcnow()
        await db.commit()
        await db.refresh(campaign)
        return campaign
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Dialog start campaign failed: {str(e)}")

@router.post("/{id}/pause", response_model=CampaignResponse)
async def pause_campaign(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    stmt = select(Campaign).where(Campaign.id == id, Campaign.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.paused
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.post("/{id}/cancel", response_model=CampaignResponse)
async def cancel_campaign(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    stmt = select(Campaign).where(Campaign.id == id, Campaign.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = CampaignStatus.cancelled
    campaign.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.get("/{id}/contacts", response_model=Dict[str, Any])
async def list_campaign_contacts(
    id: uuid.UUID,
    status: Optional[CampaignContactStatus] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    stmt = select(CampaignContact).where(
         CampaignContact.campaign_id == id,
         CampaignContact.workspace_id == current_user.workspace_id
    )
    if status:
         stmt = stmt.where(CampaignContact.status == status)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one_or_none() or 0

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{id}/sync-status", response_model=CampaignStatsResponse)
async def sync_campaign_status_direct(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    stmt = select(Campaign).where(Campaign.id == id, Campaign.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
         raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.dialog_campaign_id:
         raise HTTPException(status_code=400, detail="Campaign has not been registered in Dialog system")

    # Load workspace
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    try:
        async with DialogClient(workspace) as client:
            data = await client.get_campaign_status(campaign.dialog_campaign_id)
            
        stats = data.get("stats", {})
        campaign.total_contacts = stats.get("total", campaign.total_contacts)
        campaign.stat_called = stats.get("called", campaign.stat_called)
        campaign.stat_answered = stats.get("answered", campaign.stat_answered)
        campaign.stat_interested = stats.get("interested", campaign.stat_interested)
        campaign.stat_not_interested = stats.get("notInterested", campaign.stat_not_interested)
        campaign.stat_transferred = stats.get("transferred", campaign.stat_transferred)
        campaign.stat_no_answer = stats.get("noAnswer", campaign.stat_no_answer)
        
        dialog_status = data.get("status")
        if dialog_status == "completed":
             campaign.status = CampaignStatus.completed
             campaign.completed_at = datetime.utcnow()
        elif dialog_status == "active":
             campaign.status = CampaignStatus.active
             
        await db.commit()
        return {
             "stats": {
                  "total": campaign.total_contacts,
                  "called": campaign.stat_called,
                  "answered": campaign.stat_answered,
                  "interested": campaign.stat_interested,
                  "not_interested": campaign.stat_not_interested,
                  "transferred": campaign.stat_transferred,
                  "no_answer": campaign.stat_no_answer
             }
        }
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Failed to sync campaign status: {str(e)}")
