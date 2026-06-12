import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from app.database import get_db
from app.models.contact import Contact, ContactStatus
from app.models.call import Call, CallStatus
from app.models.deal import Deal, DealStatus
from app.models.campaign import Campaign, CampaignStatus
from app.models.crm_agent import CrmAgent
from app.models.user import User
from app.models.pipeline import PipelineStage
from app.schemas.analytics import (
    OverviewResponse, CallsAnalyticsResponse, LeadsAnalyticsResponse,
    DateCallStat, IntentStat, StageFunnelStat
)
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview", response_model=OverviewResponse)
async def get_overview_analytics(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace_id = current_user.workspace_id
    
    # 1. Total Contacts
    cont_count_stmt = select(func.count(Contact.id)).where(Contact.workspace_id == workspace_id)
    cont_res = await db.execute(cont_count_stmt)
    total_contacts = cont_res.scalar_one_or_none() or 0

    # 2. New Contacts this week
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    new_cont_stmt = select(func.count(Contact.id)).where(
         Contact.workspace_id == workspace_id,
         Contact.created_at >= one_week_ago
    )
    new_cont_res = await db.execute(new_cont_stmt)
    new_contacts_this_week = new_cont_res.scalar_one_or_none() or 0

    # 3. Total Calls
    call_stmt = select(func.count(Call.id)).where(Call.workspace_id == workspace_id)
    call_res = await db.execute(call_stmt)
    total_calls = call_res.scalar_one_or_none() or 0

    # 4. Calls Today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    calls_today_stmt = select(func.count(Call.id)).where(
         Call.workspace_id == workspace_id,
         Call.created_at >= today_start
    )
    calls_today_res = await db.execute(calls_today_stmt)
    calls_today = calls_today_res.scalar_one_or_none() or 0

    # 5. Active campaigns
    camp_stmt = select(func.count(Campaign.id)).where(
         Campaign.workspace_id == workspace_id,
         Campaign.status == CampaignStatus.active
    )
    camp_res = await db.execute(camp_stmt)
    active_campaigns = camp_res.scalar_one_or_none() or 0

    # 6. Active Agents
    agent_stmt = select(func.count(CrmAgent.id)).where(
         CrmAgent.workspace_id == workspace_id,
         CrmAgent.is_available == True
    )
    agent_res = await db.execute(agent_stmt)
    active_agents = agent_res.scalar_one_or_none() or 0

    # 7. Total Deals Value
    deals_val_stmt = select(func.sum(Deal.value)).where(
         Deal.workspace_id == workspace_id,
         or_(Deal.status == DealStatus.open, Deal.status == DealStatus.won)
    )
    deals_val_res = await db.execute(deals_val_stmt)
    total_deals_value = float(deals_val_res.scalar_one_or_none() or 0.0)

    # 8. Conversion Rate (percentage of won deals / total closed deals)
    won_stmt = select(func.count(Deal.id)).where(Deal.workspace_id == workspace_id, Deal.status == DealStatus.won)
    won_res = await db.execute(won_stmt)
    won_count = won_res.scalar_one_or_none() or 0

    closed_stmt = select(func.count(Deal.id)).where(
         Deal.workspace_id == workspace_id,
         Deal.status.in_([DealStatus.won, DealStatus.lost])
    )
    closed_res = await db.execute(closed_stmt)
    closed_count = closed_res.scalar_one_or_none() or 0

    conversion_rate = (won_count / closed_count * 100.0) if closed_count > 0 else 0.0

    return {
        "total_contacts": total_contacts,
        "new_contacts_this_week": new_contacts_this_week,
        "total_calls": total_calls,
        "calls_today": calls_today,
        "active_campaigns": active_campaigns,
        "active_agents": active_agents,
        "total_deals_value": total_deals_value,
        "conversion_rate": conversion_rate
    }

@router.get("/calls", response_model=CallsAnalyticsResponse)
async def get_calls_analytics(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    group_by: str = Query("day", pattern="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace_id = current_user.workspace_id
    
    # Setup date limits (default last 30 days)
    if not date_from:
        date_from = datetime.utcnow() - timedelta(days=30)
    if not date_to:
        date_to = datetime.utcnow()

    # 1. Calls by Date
    date_group = func.to_char(Call.created_at, 'YYYY-MM-DD')
    calls_by_date_stmt = (
        select(
            date_group.label("date_label"),
            func.count(Call.id).label("total"),
            func.count().filter(Call.outcome == "answered").label("answered"),
            func.count().filter(Call.outcome == "no_answer").label("no_answer"),
            func.count().filter(Call.was_transferred == True).label("transferred")
        )
        .where(
            Call.workspace_id == workspace_id,
            Call.created_at >= date_from,
            Call.created_at <= date_to
        )
        .group_by("date_label")
        .order_by("date_label")
    )
    by_date_res = await db.execute(calls_by_date_stmt)
    by_date = []
    for r in by_date_res.all():
        by_date.append(DateCallStat(
            date=r.date_label,
            total=r.total,
            answered=r.answered,
            no_answer=r.no_answer,
            transferred=r.transferred
        ))

    # 2. Calls by Outcome
    outcome_stmt = (
        select(Call.outcome, func.count(Call.id))
        .where(Call.workspace_id == workspace_id, Call.created_at >= date_from, Call.created_at <= date_to)
        .group_by(Call.outcome)
    )
    outcome_res = await db.execute(outcome_stmt)
    by_outcome = {}
    for r in outcome_res.all():
        key = r[0] or "failed"
        by_outcome[key] = r[1]

    # 3. Calls by Intent
    intent_stmt = (
        select(Call.detected_intent, func.count(Call.id), func.avg(Call.intent_confidence))
        .where(
            Call.workspace_id == workspace_id,
            Call.detected_intent != None,
            Call.created_at >= date_from,
            Call.created_at <= date_to
        )
        .group_by(Call.detected_intent)
        .order_by(desc(func.count(Call.id)))
    )
    intent_res = await db.execute(intent_stmt)
    by_intent = []
    for r in intent_res.all():
        by_intent.append(IntentStat(
            intent=r[0],
            count=r[1],
            avg_confidence=float(r[2] or 0.0)
        ))

    # 4. Avg duration & cost
    dur_stmt = select(func.avg(Call.duration_seconds), func.sum(Call.billed_cost_usd)).where(
        Call.workspace_id == workspace_id,
        Call.created_at >= date_from,
        Call.created_at <= date_to
    )
    dur_res = await db.execute(dur_stmt)
    avg_dur, sum_cost = dur_res.first()
    
    avg_duration_seconds = float(avg_dur or 0.0)
    total_cost_usd = float(sum_cost or 0.0)

    return {
        "by_date": by_date,
        "by_outcome": by_outcome,
        "by_intent": by_intent,
        "avg_duration_seconds": avg_duration_seconds,
        "total_cost_usd": total_cost_usd
    }

@router.get("/leads", response_model=LeadsAnalyticsResponse)
async def get_leads_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace_id = current_user.workspace_id

    # 1. Contacts by status
    status_stmt = select(Contact.status, func.count(Contact.id)).where(Contact.workspace_id == workspace_id).group_by(Contact.status)
    status_res = await db.execute(status_stmt)
    by_status = {}
    for r in status_res.all():
         by_status[r[0].value if hasattr(r[0], 'value') else str(r[0])] = r[1]

    # 2. Pipeline Stage Funnel metrics (Stages in workspace with total deal count and deals value)
    stage_stmt = select(PipelineStage).where(PipelineStage.workspace_id == workspace_id).order_by(PipelineStage.position)
    stage_res = await db.execute(stage_stmt)
    stages = stage_res.scalars().all()
    
    pipeline_funnel = []
    for stage in stages:
         deals_val_stmt = select(func.count(Deal.id), func.sum(Deal.value)).where(
             Deal.stage_id == stage.id,
             Deal.workspace_id == workspace_id
         )
         deals_val_res = await db.execute(deals_val_stmt)
         deal_count, deal_value = deals_val_res.first()
         pipeline_funnel.append(StageFunnelStat(
              stage=stage.name,
              count=deal_count or 0,
              value=float(deal_value or 0.0)
         ))

    # 3. Average lead score
    score_stmt = select(func.avg(Contact.lead_score)).where(Contact.workspace_id == workspace_id)
    score_res = await db.execute(score_stmt)
    avg_lead_score = float(score_res.scalar_one_or_none() or 0.0)

    # 4. Lead Score distribution bucketed in groups of 20
    distribution = {
         "0-20": 0,
         "21-40": 0,
         "41-60": 0,
         "61-80": 0,
         "81-100": 0
    }
    dist_stmt = select(
         func.count().filter(Contact.lead_score <= 20).label("bucket_1"),
         func.count().filter(and_(Contact.lead_score > 20, Contact.lead_score <= 40)).label("bucket_2"),
         func.count().filter(and_(Contact.lead_score > 40, Contact.lead_score <= 60)).label("bucket_3"),
         func.count().filter(and_(Contact.lead_score > 60, Contact.lead_score <= 80)).label("bucket_4"),
         func.count().filter(Contact.lead_score > 80).label("bucket_5")
    ).where(Contact.workspace_id == workspace_id)
    dist_res = await db.execute(dist_stmt)
    b1, b2, b3, b4, b5 = dist_res.first()
    
    distribution["0-20"] = b1 or 0
    distribution["21-40"] = b2 or 0
    distribution["41-60"] = b3 or 0
    distribution["61-80"] = b4 or 0
    distribution["81-100"] = b5 or 0

    return {
         "by_status": by_status,
         "pipeline_funnel": pipeline_funnel,
         "avg_lead_score": avg_lead_score,
         "score_distribution": distribution
    }
