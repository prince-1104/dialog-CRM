import asyncio
import logging
import uuid
import json
from datetime import datetime
from sqlalchemy import select
from app.celery_app import celery_app
from app.database import async_session
from app.models.campaign import Campaign, CampaignStatus
from app.models.workspace import Workspace
from app.services.dialog_client import DialogClient
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

def run_async(coro):
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return asyncio.ensure_future(coro)
    else:
        return loop.run_until_complete(coro)

@celery_app.task(name="app.tasks.campaign_tasks.sync_campaign_status")
def sync_campaign_status(campaign_id_str: str):
    run_async(async_sync_campaign_status(campaign_id_str))

async def async_sync_campaign_status(campaign_id_str: str):
    campaign_id = uuid.UUID(campaign_id_str)
    async with async_session() as db:
        try:
            # 1. Fetch Campaign
            campaign_stmt = select(Campaign).where(Campaign.id == campaign_id)
            campaign_res = await db.execute(campaign_stmt)
            campaign = campaign_res.scalar_one_or_none()
            
            if not campaign or not campaign.dialog_campaign_id:
                logger.warning(f"Campaign {campaign_id_str} not found or has no dialog_campaign_id")
                return
                
            # 2. Fetch Workspace for credentials
            workspace_stmt = select(Workspace).where(Workspace.id == campaign.workspace_id)
            workspace_res = await db.execute(workspace_stmt)
            workspace = workspace_res.scalar_one_or_none()
            
            if not workspace:
                logger.warning(f"Workspace {campaign.workspace_id} not found for campaign {campaign_id_str}")
                return
                
            # 3. Call Dialog API
            async with DialogClient(workspace) as client:
                data = await client.get_campaign_status(campaign.dialog_campaign_id)
                
            # 4. Sync stats
            stats = data.get("stats", {})
            campaign.total_contacts = stats.get("total", campaign.total_contacts)
            campaign.stat_called = stats.get("called", campaign.stat_called)
            campaign.stat_answered = stats.get("answered", campaign.stat_answered)
            campaign.stat_interested = stats.get("interested", campaign.stat_interested)
            campaign.stat_not_interested = stats.get("notInterested", campaign.stat_not_interested)
            campaign.stat_transferred = stats.get("transferred", campaign.stat_transferred)
            campaign.stat_no_answer = stats.get("noAnswer", campaign.stat_no_answer)
            
            # Sync status if completed in Dialog
            dialog_status = data.get("status")
            if dialog_status == "completed":
                campaign.status = CampaignStatus.completed
                campaign.completed_at = datetime.utcnow()
            elif dialog_status == "active":
                campaign.status = CampaignStatus.active
            
            await db.commit()
            
            # 5. Broadcast WS updates
            redis = get_redis_client()
            try:
                msg = {
                    "type": "campaign.progress",
                    "campaignId": campaign_id_str,
                    "data": {
                        "called": campaign.stat_called,
                        "answered": campaign.stat_answered,
                        "interested": campaign.stat_interested,
                        "total": campaign.total_contacts
                    }
                }
                await redis.publish(f"workspace:{workspace.id}", json.dumps(msg))
            finally:
                await redis.close()
                
        except Exception as e:
            logger.exception(f"Failed to sync campaign status for campaign {campaign_id_str}: {e}")
