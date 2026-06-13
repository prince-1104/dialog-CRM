"""Reports & analytics for managers — campaign performance, agent metrics, call stats."""
import uuid
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database import get_db
from app.models.user import User, UserRole
from app.models.campaign import Campaign
from app.models.call_log import CallLog
from app.models.customer import Customer
from app.dependencies.auth import require_role

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    """Manager dashboard — high-level stats."""
    tid = current_user.tenant_id

    # Campaign stats
    campaigns_total = await db.execute(select(func.count(Campaign.id)).where(Campaign.tenant_id == tid))
    campaigns_active = await db.execute(
        select(func.count(Campaign.id)).where(Campaign.tenant_id == tid, Campaign.status == "active")
    )

    # Call stats
    calls_total = await db.execute(select(func.count(CallLog.id)).where(CallLog.tenant_id == tid))
    calls_completed = await db.execute(
        select(func.count(CallLog.id)).where(CallLog.tenant_id == tid, CallLog.status == "completed")
    )
    total_duration = await db.execute(
        select(func.sum(CallLog.duration_seconds)).where(CallLog.tenant_id == tid)
    )

    # Customer stats
    customers_total = await db.execute(select(func.count(Customer.id)).where(Customer.tenant_id == tid))

    # Agent stats
    agents_total = await db.execute(
        select(func.count(User.id)).where(User.tenant_id == tid, User.role == "agent")
    )
    agents_online = await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tid, User.role == "agent", User.availability_status == "online"
        )
    )

    dur = total_duration.scalar() or 0
    return {
        "campaigns": {
            "total": campaigns_total.scalar() or 0,
            "active": campaigns_active.scalar() or 0,
        },
        "calls": {
            "total": calls_total.scalar() or 0,
            "completed": calls_completed.scalar() or 0,
            "total_duration_seconds": dur,
            "avg_handling_time": round(dur / max(calls_completed.scalar() or 1, 1)),
        },
        "customers": {
            "total": customers_total.scalar() or 0,
        },
        "agents": {
            "total": agents_total.scalar() or 0,
            "online": agents_online.scalar() or 0,
        },
    }


@router.get("/campaign/{campaign_id}")
async def campaign_report(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    """Detailed campaign report."""
    tid = current_user.tenant_id

    campaign_res = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == tid)
    )
    campaign = campaign_res.scalar_one_or_none()
    if not campaign:
        return {"error": "Not found"}

    # Call breakdown
    calls = await db.execute(
        select(
            CallLog.status,
            func.count(CallLog.id).label("count")
        ).where(
            CallLog.campaign_id == campaign_id,
            CallLog.tenant_id == tid
        ).group_by(CallLog.status)
    )
    status_breakdown = {row.status: row.count for row in calls.all()}

    # Agent performance
    agent_stats = await db.execute(
        select(
            User.full_name,
            func.count(CallLog.id).label("calls"),
            func.sum(CallLog.duration_seconds).label("duration"),
        ).join(CallLog, CallLog.agent_id == User.id)
        .where(CallLog.campaign_id == campaign_id, CallLog.tenant_id == tid)
        .group_by(User.full_name)
    )

    return {
        "campaign": {
            "id": str(campaign.id),
            "name": campaign.name,
            "type": campaign.type,
            "status": campaign.status,
            "total_contacts": campaign.total_contacts,
            "total_calls": campaign.total_calls,
            "total_answered": campaign.total_answered,
            "total_converted": campaign.total_converted,
        },
        "status_breakdown": status_breakdown,
        "agents": [
            {
                "name": row.full_name,
                "calls": row.calls,
                "total_duration": row.duration or 0,
            }
            for row in agent_stats.all()
        ],
    }


@router.get("/agents")
async def agent_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    """Agent performance summary."""
    tid = current_user.tenant_id

    agents = await db.execute(
        select(
            User.id,
            User.full_name,
            User.availability_status,
            func.count(CallLog.id).label("total_calls"),
            func.sum(CallLog.duration_seconds).label("total_duration"),
            func.sum(case((CallLog.status == "completed", 1), else_=0)).label("completed_calls"),
        )
        .outerjoin(CallLog, CallLog.agent_id == User.id)
        .where(User.tenant_id == tid, User.role == "agent")
        .group_by(User.id, User.full_name, User.availability_status)
    )

    return [
        {
            "id": str(row.id),
            "name": row.full_name,
            "status": row.availability_status,
            "total_calls": row.total_calls or 0,
            "completed_calls": row.completed_calls or 0,
            "total_duration": row.total_duration or 0,
            "avg_call_time": round((row.total_duration or 0) / max(row.total_calls or 1, 1)),
        }
        for row in agents.all()
    ]
