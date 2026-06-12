import uuid
import csv
import io
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, desc
from app.database import get_db
from app.models.contact import Contact, ContactSource, ContactStatus, CallOutcome
from app.models.workspace import UserRole, Workspace
from app.models.user import User
from app.models.pipeline import PipelineStage
from app.models.activity import Activity, ActivityType, Note
from app.models.call import Call, CallStatus, CallDirection
from app.models.crm_agent import CrmAgent
from app.schemas.contact import (
    ContactCreate, ContactUpdate, ContactResponse, NoteCreate, NoteResponse,
    ContactMoveStage, InitiateCallRequest
)
from app.schemas.call import InitiateCallResponse, CallResponse
from app.schemas.auth import InviteResponse
from app.dependencies.auth import get_current_user, require_role
from app.services.dialog_client import DialogClient
from app.services.ws_relay import relay_dialog_stream
from app.utils.encryption import encryptor

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("", response_model=Dict[str, Any])
async def list_contacts(
    status: Optional[ContactStatus] = None,
    pipeline_stage_id: Optional[uuid.UUID] = None,
    assigned_to: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    tags: Optional[str] = None, # comma-separated
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    stmt = select(Contact).where(Contact.workspace_id == current_user.workspace_id)
    
    if status:
        stmt = stmt.where(Contact.status == status)
    if pipeline_stage_id:
        stmt = stmt.where(Contact.pipeline_stage_id == pipeline_stage_id)
    if assigned_to:
        stmt = stmt.where(Contact.assigned_to_id == assigned_to)
    if search:
        search_term = f"%{search}%"
        stmt = stmt.where(
            (Contact.first_name.ilike(search_term)) |
            (Contact.last_name.ilike(search_term)) |
            (Contact.email.ilike(search_term)) |
            (Contact.phone.ilike(search_term)) |
            (Contact.company.ilike(search_term))
        )
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
        for tag in tag_list:
            stmt = stmt.where(Contact.tags.contains([tag]))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one_or_none() or 0

    # Get items
    stmt = stmt.order_by(desc(Contact.created_at)).offset(offset).limit(limit)
    res = await db.execute(stmt)
    items = res.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 0
    }

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    payload: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ensure phone is set
    if not payload.phone:
        raise HTTPException(status_code=400, detail="Phone number is required")
        
    contact = Contact(
        workspace_id=current_user.workspace_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        designation=payload.designation,
        source=payload.source,
        tags=payload.tags,
        custom_fields=payload.custom_fields,
        status=payload.status,
        assigned_to_id=payload.assigned_to_id,
        pipeline_id=payload.pipeline_id,
        pipeline_stage_id=payload.pipeline_stage_id
    )
    db.add(contact)
    
    # Create Activity Log
    activity = Activity(
        workspace_id=current_user.workspace_id,
        contact_id=contact.id,
        user_id=current_user.id,
        type=ActivityType.status_changed,
        title="Contact Created",
        description=f"Contact created manually by {current_user.full_name}."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(contact)
    return contact

@router.get("/{id}", response_model=Dict[str, Any])
async def get_contact_detail(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch Contact
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Fetch 20 recent activities
    act_stmt = select(Activity).where(Activity.contact_id == id).order_by(desc(Activity.created_at)).limit(20)
    act_res = await db.execute(act_stmt)
    activities = act_res.scalars().all()

    # Fetch open deals
    from app.models.deal import Deal, DealStatus
    deal_stmt = select(Deal).where(Deal.contact_id == id, Deal.status == DealStatus.open)
    deal_res = await db.execute(deal_stmt)
    open_deals = deal_res.scalars().all()

    # Fetch 10 recent calls
    call_stmt = select(Call).where(Call.contact_id == id).order_by(desc(Call.created_at)).limit(10)
    call_res = await db.execute(call_stmt)
    calls = call_res.scalars().all()

    # Fetch all notes
    note_stmt = select(Note).where(Note.contact_id == id).order_by(desc(Note.created_at))
    note_res = await db.execute(note_stmt)
    notes = note_res.scalars().all()

    return {
        "contact": contact,
        "activities": activities,
        "open_deals": open_deals,
        "calls": calls,
        "notes": notes
    }

@router.patch("/{id}", response_model=ContactResponse)
async def update_contact(
    id: uuid.UUID,
    payload: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(contact, k, v)
        
    contact.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_contact(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.execute(delete(Contact).where(Contact.id == id))
    await db.commit()
    return {"detail": "Contact deleted successfully"}

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_contacts_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    contents = await file.read()
    buffer = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(buffer)
    
    created_count = 0
    failed_count = 0
    errors = []
    
    for idx, row in enumerate(reader):
        first_name = row.get("first_name") or row.get("firstName")
        phone = row.get("phone") or row.get("phoneNumber")
        email = row.get("email")
        company = row.get("company")
        designation = row.get("designation")
        
        if not first_name or not phone:
            failed_count += 1
            errors.append(f"Row {idx+1}: Missing required fields ('first_name' and 'phone' are required)")
            continue
            
        contact = Contact(
            workspace_id=current_user.workspace_id,
            first_name=first_name,
            last_name=row.get("last_name") or row.get("lastName"),
            phone=phone,
            email=email,
            company=company,
            designation=designation,
            source=ContactSource.import_csv,
            status=ContactStatus.new
        )
        db.add(contact)
        await db.flush() # Populate ID
        
        # Log activity for imported contact
        activity = Activity(
            workspace_id=current_user.workspace_id,
            contact_id=contact.id,
            user_id=current_user.id,
            type=ActivityType.contact_imported,
            title="Contact Imported",
            description="Contact imported via CSV bulk upload."
        )
        db.add(activity)
        created_count += 1

    await db.commit()
    return {
        "created": created_count,
        "failed": failed_count,
        "errors": errors
    }

@router.post("/{id}/call", response_model=InitiateCallResponse)
async def call_contact(
    id: uuid.UUID,
    payload: InitiateCallRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.agent))
):
    # 1. Fetch contact
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    # 2. Fetch Workspace Dialog Credentials
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if not workspace or not workspace.dialog_api_key or not workspace.dialog_base_url:
        raise HTTPException(status_code=400, detail="Dialog Calling Integration is not configured for this workspace.")

    # 3. Lookup CRM Agent if provided in transfer rules
    dialog_crm_agent_id = None
    transfer_rules_payload = None
    if payload.transfer_rules:
        transfer_rules_payload = payload.transfer_rules.model_dump(exclude_unset=True)
        crm_agent_id = payload.transfer_rules.crm_agent_id
        if crm_agent_id:
            agent_stmt = select(CrmAgent).where(CrmAgent.id == crm_agent_id, CrmAgent.workspace_id == current_user.workspace_id)
            agent_res = await db.execute(agent_stmt)
            agent = agent_res.scalar_one_or_none()
            if agent:
                dialog_crm_agent_id = agent.dialog_crm_agent_id
                transfer_rules_payload["crmAgentId"] = dialog_crm_agent_id
                
    # 4. Prepare metadata
    dialog_metadata = {
        "contactId": str(contact.id),
        "leadName": f"{contact.first_name} {contact.last_name or ''}".strip(),
        "initiatedById": str(current_user.id),
        **payload.extra_metadata
    }

    # 5. Initiate call via Dialog API client
    try:
        async with DialogClient(workspace) as client:
            call_data = await client.initiate_call(
                phone=contact.phone,
                crm_contact_id=str(contact.id),
                metadata=dialog_metadata,
                transfer_rules=transfer_rules_payload
            )
            
        dialog_call_id = call_data["callId"]
        dialog_call_sid = call_data.get("callSid")
        stream_url = call_data.get("streamUrl")
        
        # 6. Save Call record
        call = Call(
            workspace_id=current_user.workspace_id,
            contact_id=contact.id,
            dialog_call_id=dialog_call_id,
            dialog_call_sid=dialog_call_sid,
            initiated_by_id=current_user.id,
            phone=contact.phone,
            direction=CallDirection.outbound,
            status=CallStatus.initiating,
            dialog_stream_url=stream_url,
            call_metadata=dialog_metadata,
            live_transcript=[]
        )
        db.add(call)
        await db.commit()
        await db.refresh(call)

        # 7. Start Async WebSocket stream relay task if stream URL is provided
        if stream_url:
            api_key = encryptor.decrypt(workspace.dialog_api_key)
            asyncio.create_task(
                relay_dialog_stream(
                    workspace_id=str(current_user.workspace_id),
                    call_id=str(call.id),
                    stream_url=stream_url,
                    api_key=api_key
                )
            )

        return {
            "call_id": call.id,
            "dialog_call_id": dialog_call_id,
            "status": CallStatus.initiating,
            "stream_active": bool(stream_url)
        }
        
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Dialog Calling API failed: {str(e)}")

@router.get("/{id}/calls", response_model=List[CallResponse])
async def list_contact_calls(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Call).where(Call.contact_id == id, Call.workspace_id == current_user.workspace_id).order_by(desc(Call.created_at))
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/{id}/notes", response_model=NoteResponse)
async def add_contact_note(
    id: uuid.UUID,
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch contact
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    note = Note(
        workspace_id=current_user.workspace_id,
        contact_id=contact.id,
        user_id=current_user.id,
        content=payload.content
    )
    db.add(note)
    
    # Increment notes count on contact
    contact.notes_count += 1
    
    # Log Activity
    activity = Activity(
        workspace_id=current_user.workspace_id,
        contact_id=contact.id,
        user_id=current_user.id,
        type=ActivityType.note_added,
        title="Note Added",
        description=f"Note added by {current_user.full_name}."
    )
    db.add(activity)
    await db.commit()
    await db.refresh(note)
    return note

@router.get("/{id}/activities")
async def list_contact_activities(
    id: uuid.UUID,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    stmt = select(Activity).where(Activity.contact_id == id, Activity.workspace_id == current_user.workspace_id).order_by(desc(Activity.created_at))
    
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

@router.post("/{id}/move-stage", response_model=ContactResponse)
async def move_contact_stage(
    id: uuid.UUID,
    payload: ContactMoveStage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Contact).where(Contact.id == id, Contact.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
         raise HTTPException(status_code=404, detail="Contact not found")

    old_stage_id = contact.pipeline_stage_id
    new_stage_id = payload.pipeline_stage_id

    # If stage has changed
    if old_stage_id != new_stage_id:
        contact.pipeline_stage_id = new_stage_id
        stage_name = "None"
        
        if new_stage_id:
            stage_stmt = select(PipelineStage).where(PipelineStage.id == new_stage_id)
            stage_res = await db.execute(stage_stmt)
            stage = stage_res.scalar_one_or_none()
            if stage:
                stage_name = stage.name
                
        # Lead score update: Increment score when a deal/contact is moved forward in pipeline (+5 per stage advance)
        contact.lead_score = max(0, min(100, contact.lead_score + 5))
        
        activity = Activity(
            workspace_id=current_user.workspace_id,
            contact_id=contact.id,
            user_id=current_user.id,
            type=ActivityType.stage_moved,
            title="Pipeline Stage Moved",
            description=f"Moved to pipeline stage: {stage_name}."
        )
        db.add(activity)
        await db.commit()
        await db.refresh(contact)
        
    return contact
