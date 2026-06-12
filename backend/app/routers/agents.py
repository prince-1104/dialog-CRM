import uuid
import re
import json
import random
import string
from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.database import get_db
from app.models.crm_agent import CrmAgent, AgentType, AvailabilityStatus
from app.models.workspace import Workspace, UserRole
from app.models.user import User
from app.schemas.crm_agent import (
    CrmAgentCreate, CrmAgentUpdate, CrmAgentResponse, AgentAvailabilityUpdate,
    HumanAgentCreate, HumanAgentUpdate, HumanAgentResponse, HumanAgentStatusUpdate, HumanAgentMetrics
)
from app.dependencies.auth import get_current_user, require_role
from app.services.dialog_client import DialogClient
from app.services.auth_service import hash_password
from app.redis_client import get_redis_client

router = APIRouter(prefix="/api/agents", tags=["agents"])

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

# ============================================================================
# AI AGENT ENDPOINTS (existing)
# ============================================================================

@router.get("", response_model=List[CrmAgentResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(CrmAgent).where(CrmAgent.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=CrmAgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: CrmAgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    # Load workspace
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if not workspace:
         raise HTTPException(status_code=404, detail="Workspace not found")

    # Generate slug ID
    name_slug = slugify(payload.name)
    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    dialog_crm_agent_id = f"agent-{name_slug}-{rand_suffix}"

    # Save local agent record
    agent = CrmAgent(
        workspace_id=current_user.workspace_id,
        user_id=payload.user_id,
        dialog_crm_agent_id=dialog_crm_agent_id,
        agent_type=AgentType.ai,
        name=payload.name,
        phone=payload.phone,
        specialization=payload.specialization,
        intents=payload.intents,
        max_concurrent_calls=payload.max_concurrent_calls,
        is_available=False,
        dialog_synced=False
    )
    db.add(agent)
    await db.flush()

    # Register in Dialog System
    try:
        async with DialogClient(workspace) as client:
            await client.register_or_update_agent(
                crm_agent_id=dialog_crm_agent_id,
                name=payload.name,
                phone=payload.phone,
                specialization=payload.specialization,
                intents=payload.intents,
                max_concurrent_calls=payload.max_concurrent_calls
            )
        agent.dialog_synced = True
        await db.commit()
        await db.refresh(agent)
        return agent
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=502, detail=f"Failed to register agent in Dialog system: {str(e)}")

@router.patch("/{id}", response_model=CrmAgentResponse)
async def update_agent(
    id: uuid.UUID,
    payload: CrmAgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    # Retrieve agent
    stmt = select(CrmAgent).where(CrmAgent.id == id, CrmAgent.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
         raise HTTPException(status_code=404, detail="Agent not found")

    # Update attributes
    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
         setattr(agent, k, v)

    agent.updated_at = datetime.utcnow()
    
    # Reload workspace
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    # Re-sync to Dialog
    try:
        async with DialogClient(workspace) as client:
             await client.register_or_update_agent(
                 crm_agent_id=agent.dialog_crm_agent_id,
                 name=agent.name,
                 phone=agent.phone,
                 specialization=agent.specialization,
                 intents=agent.intents,
                 max_concurrent_calls=agent.max_concurrent_calls
             )
        agent.dialog_synced = True
        await db.commit()
        await db.refresh(agent)
        return agent
    except Exception as e:
         await db.rollback()
         raise HTTPException(status_code=502, detail=f"Failed to update agent in Dialog system: {str(e)}")

@router.patch("/{id}/availability", response_model=CrmAgentResponse)
async def update_agent_availability(
    id: uuid.UUID,
    payload: AgentAvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(CrmAgent).where(CrmAgent.id == id, CrmAgent.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
         raise HTTPException(status_code=404, detail="Agent not found")

    # Enforce RBAC: managers/admins can update any agent, agents can only update themselves
    if current_user.role == UserRole.agent and agent.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="You can only change your own availability settings.")

    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    # Set Dialog system status
    try:
        async with DialogClient(workspace) as client:
             await client.set_agent_availability(
                 agent_id=agent.dialog_crm_agent_id,
                 is_available=payload.is_available
             )
             
        agent.is_available = payload.is_available
        agent.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(agent)

        # Broadcast update to workspace clients via Redis pub/sub
        redis = get_redis_client()
        try:
             msg = {
                  "type": "agent.availability",
                  "agentId": str(agent.id),
                  "data": {
                       "isAvailable": agent.is_available,
                       "name": agent.name
                  }
             }
             await redis.publish(f"workspace:{current_user.workspace_id}", json.dumps(msg))
        finally:
             await redis.close()

        return agent
    except Exception as e:
         raise HTTPException(status_code=502, detail=f"Failed to update availability in Dialog system: {str(e)}")

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_agent(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    stmt = select(CrmAgent).where(CrmAgent.id == id, CrmAgent.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
         raise HTTPException(status_code=404, detail="Agent not found")

    # Delete local agent record
    await db.execute(delete(CrmAgent).where(CrmAgent.id == id))
    await db.commit()
    
    return {"detail": "Agent deleted successfully from local database"}


# ============================================================================
# HUMAN AGENT (SALES EXECUTIVE) ENDPOINTS
# ============================================================================

def _compute_human_agent_response(agent: CrmAgent, user: User = None) -> dict:
    """Build HumanAgentResponse with computed metrics."""
    total = agent.successful_transfers + agent.failed_transfers
    success_rate = (agent.successful_transfers / total * 100) if total > 0 else 0.0
    avg_handle = (agent.total_talk_time_seconds / agent.total_calls_handled) if agent.total_calls_handled > 0 else 0.0
    
    data = {
        "id": agent.id,
        "workspace_id": agent.workspace_id,
        "user_id": agent.user_id,
        "agent_type": agent.agent_type,
        "name": agent.name,
        "email": agent.email,
        "phone": agent.phone,
        "specialization": agent.specialization,
        "intents": agent.intents,
        "max_concurrent_calls": agent.max_concurrent_calls,
        "is_available": agent.is_available,
        "availability_status": agent.availability_status,
        "dialog_synced": agent.dialog_synced,
        "total_calls_handled": agent.total_calls_handled,
        "total_talk_time_seconds": agent.total_talk_time_seconds,
        "successful_transfers": agent.successful_transfers,
        "failed_transfers": agent.failed_transfers,
        "last_active_at": agent.last_active_at,
        "avg_handle_time_seconds": round(avg_handle, 1),
        "transfer_success_rate": round(success_rate, 1),
        "created_at": agent.created_at,
        "updated_at": agent.updated_at,
    }
    
    if user:
        data["user_email"] = user.email
        data["user_is_active"] = user.is_active
        data["user_last_login"] = user.last_login_at
    
    return data


@router.get("/human", response_model=List[HumanAgentResponse])
async def list_human_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all human sales executives in the workspace."""
    stmt = select(CrmAgent).where(
        CrmAgent.workspace_id == current_user.workspace_id,
        CrmAgent.agent_type == AgentType.human
    )
    res = await db.execute(stmt)
    agents = res.scalars().all()
    
    results = []
    for agent in agents:
        # Load linked user if exists
        user = None
        if agent.user_id:
            user_stmt = select(User).where(User.id == agent.user_id)
            user_res = await db.execute(user_stmt)
            user = user_res.scalar_one_or_none()
        results.append(_compute_human_agent_response(agent, user))
    
    return results


@router.post("/human", response_model=HumanAgentResponse, status_code=status.HTTP_201_CREATED)
async def create_human_agent(
    payload: HumanAgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    """
    Create a human sales executive. This:
    1. Creates a User with role=agent
    2. Creates a CrmAgent with type=human linked to the user
    3. Registers the agent in Dialog for call transfers
    """
    # Check if email already exists in workspace
    existing_user_stmt = select(User).where(
        User.workspace_id == current_user.workspace_id,
        User.email == payload.email
    )
    existing_res = await db.execute(existing_user_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email already exists in this workspace.")

    # 1. Create User account
    user = User(
        workspace_id=current_user.workspace_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.name,
        role=UserRole.agent,
        is_active=True
    )
    db.add(user)
    await db.flush()  # Get user.id

    # 2. Generate Dialog CRM agent ID
    name_slug = slugify(payload.name)
    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    dialog_crm_agent_id = f"human-{name_slug}-{rand_suffix}"

    # 3. Create CrmAgent record
    agent = CrmAgent(
        workspace_id=current_user.workspace_id,
        user_id=user.id,
        dialog_crm_agent_id=dialog_crm_agent_id,
        agent_type=AgentType.human,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        specialization=payload.specialization,
        intents=payload.intents,
        max_concurrent_calls=payload.max_concurrent_calls,
        is_available=False,
        availability_status=AvailabilityStatus.offline,
        dialog_synced=False
    )
    db.add(agent)
    await db.flush()

    # 4. Register in Dialog system for call transfers
    ws_stmt = select(Workspace).where(Workspace.id == current_user.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()

    try:
        if workspace and workspace.dialog_api_key and workspace.dialog_base_url:
            async with DialogClient(workspace) as client:
                await client.register_or_update_agent(
                    crm_agent_id=dialog_crm_agent_id,
                    name=payload.name,
                    phone=payload.phone,
                    specialization=payload.specialization,
                    intents=payload.intents,
                    max_concurrent_calls=payload.max_concurrent_calls
                )
            agent.dialog_synced = True
    except Exception:
        # Don't fail the creation if Dialog sync fails — can be retried later
        agent.dialog_synced = False

    await db.commit()
    await db.refresh(agent)
    return _compute_human_agent_response(agent, user)


@router.patch("/human/{id}", response_model=HumanAgentResponse)
async def update_human_agent(
    id: uuid.UUID,
    payload: HumanAgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    """Update a human sales executive's details."""
    stmt = select(CrmAgent).where(
        CrmAgent.id == id,
        CrmAgent.workspace_id == current_user.workspace_id,
        CrmAgent.agent_type == AgentType.human
    )
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Human agent not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(agent, k, v)
    
    # Also update linked user's name if provided
    if payload.name and agent.user_id:
        user_stmt = select(User).where(User.id == agent.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if user:
            user.full_name = payload.name

    agent.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(agent)
    
    # Reload user
    user = None
    if agent.user_id:
        user_stmt = select(User).where(User.id == agent.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
    
    return _compute_human_agent_response(agent, user)


@router.patch("/human/{id}/status", response_model=HumanAgentResponse)
async def update_human_agent_status(
    id: uuid.UUID,
    payload: HumanAgentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a human agent's availability status. Agents can update their own status."""
    stmt = select(CrmAgent).where(
        CrmAgent.id == id,
        CrmAgent.workspace_id == current_user.workspace_id,
        CrmAgent.agent_type == AgentType.human
    )
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Human agent not found")

    # RBAC: agents can only update their own status
    if current_user.role == UserRole.agent and agent.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own availability status.")

    agent.availability_status = payload.availability_status
    agent.is_available = payload.availability_status == AvailabilityStatus.online
    agent.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(agent)

    # Broadcast via Redis
    redis = get_redis_client()
    try:
        msg = {
            "type": "agent.status",
            "agentId": str(agent.id),
            "data": {
                "availabilityStatus": agent.availability_status.value,
                "isAvailable": agent.is_available,
                "name": agent.name
            }
        }
        await redis.publish(f"workspace:{current_user.workspace_id}", json.dumps(msg))
    finally:
        await redis.close()

    user = None
    if agent.user_id:
        user_stmt = select(User).where(User.id == agent.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

    return _compute_human_agent_response(agent, user)


@router.get("/human/{id}/metrics", response_model=HumanAgentMetrics)
async def get_human_agent_metrics(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed metrics for a human agent."""
    stmt = select(CrmAgent).where(
        CrmAgent.id == id,
        CrmAgent.workspace_id == current_user.workspace_id,
        CrmAgent.agent_type == AgentType.human
    )
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Human agent not found")

    total = agent.successful_transfers + agent.failed_transfers
    success_rate = (agent.successful_transfers / total * 100) if total > 0 else 0.0
    avg_handle = (agent.total_talk_time_seconds / agent.total_calls_handled) if agent.total_calls_handled > 0 else 0.0

    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "total_calls_handled": agent.total_calls_handled,
        "total_talk_time_seconds": agent.total_talk_time_seconds,
        "avg_handle_time_seconds": round(avg_handle, 1),
        "successful_transfers": agent.successful_transfers,
        "failed_transfers": agent.failed_transfers,
        "transfer_success_rate": round(success_rate, 1),
        "last_active_at": agent.last_active_at,
    }


@router.delete("/human/{id}", status_code=status.HTTP_200_OK)
async def delete_human_agent(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    """Deactivate a human agent and their user account."""
    stmt = select(CrmAgent).where(
        CrmAgent.id == id,
        CrmAgent.workspace_id == current_user.workspace_id,
        CrmAgent.agent_type == AgentType.human
    )
    res = await db.execute(stmt)
    agent = res.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Human agent not found")

    # Deactivate the linked user account
    if agent.user_id:
        user_stmt = select(User).where(User.id == agent.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if user:
            user.is_active = False

    # Delete the agent record
    await db.execute(delete(CrmAgent).where(CrmAgent.id == id))
    await db.commit()

    return {"detail": "Human agent removed and user account deactivated."}
