import asyncio
import json
import logging
from datetime import datetime
import uuid
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy import select, update
from app.celery_app import celery_app
from app.database import async_session
from app.models.call import Call, CallEvent, CallStatus, CallTransferType, CallDirection
from app.models.contact import Contact, ContactStatus, CallOutcome
from app.models.crm_agent import CrmAgent
from app.models.campaign import Campaign, CampaignContact, CampaignContactStatus
from app.models.activity import Activity, ActivityType
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# Lead Score weights
INTENT_SCORE_DELTAS = {
    "interested": 20,
    "appointment": 15,
    "pricing_query": 10,
    "product_inquiry": 5,
    "follow_up": 5,
    "callback_request": 5,
    "general_question": 0,
    "greeting": 0,
    "billing": -5,
    "technical_support": -5,
    "objection_handling": -8,
    "not_interested": -20,
    "complaint": -15,
    "escalation": -10
}

def run_async(coro):
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return asyncio.ensure_future(coro)
    else:
        return loop.run_until_complete(coro)

@celery_app.task(name="app.tasks.webhook_tasks.process_dialog_webhook")
def process_dialog_webhook(workspace_id_str: str, payload: dict, delivery_id: str):
    run_async(async_process_dialog_webhook(workspace_id_str, payload, delivery_id))

async def publish_ws_event(workspace_id: str, event_type: str, call_id: str, data: dict):
    redis = get_redis_client()
    try:
        message = {
            "type": event_type,
            "callId": call_id,
            "data": data
        }
        await redis.publish(f"workspace:{workspace_id}", json.dumps(message))
    except Exception as e:
        logger.error(f"Failed to publish WS event: {e}")
    finally:
        await redis.close()

async def async_process_dialog_webhook(workspace_id_str: str, payload: dict, delivery_id: str):
    workspace_id = uuid.UUID(workspace_id_str)
    dialog_call_id = payload.get("callId")
    event_type = payload.get("event")
    event_data = payload.get("data", {})
    
    if dialog_call_id is None or event_type is None:
        logger.error("Missing callId or event in webhook payload")
        return
        
    async with async_session() as db:
        try:
            # 1. Upsert Call Event log
            call_event = CallEvent(
                workspace_id=workspace_id,
                dialog_delivery_id=delivery_id,
                event_type=event_type,
                event_data=payload,
                processed=False
            )
            # Find the call in DB
            stmt = select(Call).where(Call.workspace_id == workspace_id, Call.dialog_call_id == dialog_call_id)
            result = await db.execute(stmt)
            call = result.scalar_one_or_none()
            
            # Extract metadata from payload
            metadata = payload.get("metadata", {})
            contact_id_str = metadata.get("contactId") or metadata.get("leadId")
            campaign_id_str = metadata.get("campaignId")
            initiated_by_str = metadata.get("initiatedById")
            
            contact_id = uuid.UUID(contact_id_str) if contact_id_str else None
            campaign_id = uuid.UUID(campaign_id_str) if campaign_id_str else None
            initiated_by_id = uuid.UUID(initiated_by_str) if initiated_by_str else None
            
            # If call doesn't exist, create it
            if not call:
                phone = event_data.get("phone") or payload.get("phone") or "unknown"
                call = Call(
                    workspace_id=workspace_id,
                    contact_id=contact_id,
                    campaign_id=campaign_id,
                    dialog_call_id=dialog_call_id,
                    initiated_by_id=initiated_by_id,
                    phone=phone,
                    direction=CallDirection.outbound,
                    status=CallStatus.initiating,
                    live_transcript=[],
                    call_metadata=metadata
                )
                db.add(call)
                await db.flush() # populate call.id
                
            call_event.call_id = call.id
            db.add(call_event)
            
            # 2. Process by Event Type
            if event_type == "call.ringing":
                call.status = CallStatus.ringing
                if event_data.get("phone"):
                    call.phone = event_data["phone"]
                if contact_id:
                    # Update contact
                    await db.execute(
                        update(Contact)
                        .where(Contact.id == contact_id)
                        .values(last_called_at=datetime.utcnow())
                    )
                await db.commit()
                await publish_ws_event(workspace_id_str, "call.ringing", str(call.id), {"phone": call.phone})
                
            elif event_type == "call.turn":
                role = event_data.get("role")
                content = event_data.get("content")
                timestamp = event_data.get("timestamp", datetime.utcnow().isoformat())
                language = event_data.get("language", "en")
                turn_index = event_data.get("turnIndex", 0)
                
                # Append to live transcript list
                new_turn = {"role": role, "content": content, "timestamp": timestamp, "language": language}
                current_transcript = list(call.live_transcript or [])
                current_transcript.append(new_turn)
                call.live_transcript = current_transcript
                await db.commit()
                
                await publish_ws_event(workspace_id_str, "call.turn", str(call.id), {
                    "role": role,
                    "content": content,
                    "turnIndex": turn_index,
                    "language": language
                })
                
            elif event_type == "call.intent":
                intent = event_data.get("intent")
                confidence = event_data.get("confidence", 1.0)
                needs_human = event_data.get("needsHuman", False)
                
                call.detected_intent = intent
                call.intent_confidence = confidence
                
                # Score update
                if contact_id and intent in INTENT_SCORE_DELTAS:
                    delta = INTENT_SCORE_DELTAS[intent]
                    if delta != 0:
                        contact_stmt = select(Contact).where(Contact.id == contact_id)
                        contact_res = await db.execute(contact_stmt)
                        contact = contact_res.scalar_one_or_none()
                        if contact:
                            new_score = max(0, min(100, contact.lead_score + delta))
                            contact.lead_score = new_score
                            
                # Create activity log
                activity = Activity(
                    workspace_id=workspace_id,
                    contact_id=contact_id,
                    call_id=call.id,
                    type=ActivityType.intent_detected,
                    title=f"Intent Detected: {intent}",
                    description=f"AI detected intent '{intent}' with {int(confidence * 100)}% confidence.",
                    activity_metadata={"intent": intent, "confidence": confidence, "needsHuman": needs_human}
                )
                db.add(activity)
                await db.commit()
                
                await publish_ws_event(workspace_id_str, "call.intent", str(call.id), {
                    "intent": intent,
                    "confidence": confidence,
                    "needsHuman": needs_human
                })
                
            elif event_type == "call.transferring":
                call.status = CallStatus.transferred
                call.was_transferred = True
                call.transfer_reason = event_data.get("reason")
                
                crm_agent_id_str = event_data.get("crmAgentId")
                if crm_agent_id_str:
                    # Lookup crm agent in DB
                    agent_stmt = select(CrmAgent).where(
                        CrmAgent.workspace_id == workspace_id,
                        CrmAgent.dialog_crm_agent_id == crm_agent_id_str
                    )
                    agent_res = await db.execute(agent_stmt)
                    agent = agent_res.scalar_one_or_none()
                    if agent:
                        call.transferred_to_agent_id = agent.id
                        
                # Create activity
                activity = Activity(
                    workspace_id=workspace_id,
                    contact_id=contact_id,
                    call_id=call.id,
                    type=ActivityType.transfer_made,
                    title="Call Transfer Initiated",
                    description=f"Transferring to human agent. Reason: {call.transfer_reason}",
                    activity_metadata={"reason": call.transfer_reason, "crmAgentId": crm_agent_id_str}
                )
                db.add(activity)
                await db.commit()
                
                await publish_ws_event(workspace_id_str, "call.transferring", str(call.id), {
                    "transferTo": event_data.get("transferTo"),
                    "reason": call.transfer_reason,
                    "intent": call.detected_intent
                })
                
            elif event_type == "call.transferred":
                await publish_ws_event(workspace_id_str, "call.transferred", str(call.id), event_data)
                
            elif event_type == "call.ended":
                call.status = CallStatus.ended
                outcome = event_data.get("outcome", "answered")
                duration = event_data.get("duration", 0)
                transcript_text = event_data.get("transcript")
                ai_summary = event_data.get("aiSummary")
                
                call.outcome = outcome
                call.duration_seconds = duration
                call.transcript = transcript_text
                call.ai_summary = ai_summary
                
                cost_est = event_data.get("estimatedCostUsd")
                cost_billed = event_data.get("billedCostUsd")
                call.estimated_cost_usd = Decimal(str(cost_est)) if cost_est else None
                call.billed_cost_usd = Decimal(str(cost_billed)) if cost_billed else None
                
                if "liveTranscript" in event_data:
                    call.live_transcript = event_data["liveTranscript"]
                    
                call.ended_at = datetime.utcnow()
                
                # Update contact metrics
                if contact_id:
                    contact_stmt = select(Contact).where(Contact.id == contact_id)
                    contact_res = await db.execute(contact_stmt)
                    contact = contact_res.scalar_one_or_none()
                    if contact:
                        contact.last_called_at = datetime.utcnow()
                        contact.last_call_outcome = CallOutcome(outcome) if outcome in CallOutcome.__members__ else CallOutcome.answered
                        contact.call_count += 1
                        
                # Create call activity log
                activity = Activity(
                    workspace_id=workspace_id,
                    contact_id=contact_id,
                    call_id=call.id,
                    type=ActivityType.call_made,
                    title=f"AI Call Ended - {outcome.upper()}",
                    description=ai_summary or f"Call duration: {duration}s. Outcome: {outcome}."
                )
                db.add(activity)
                
                # Update Campaign Contact if linked
                if campaign_id and contact_id:
                    cc_stmt = select(CampaignContact).where(
                        CampaignContact.campaign_id == campaign_id,
                        CampaignContact.contact_id == contact_id
                    )
                    cc_res = await db.execute(cc_stmt)
                    campaign_contact = cc_res.scalar_one_or_none()
                    if campaign_contact:
                        campaign_contact.call_id = call.id
                        # Map call outcome to CampaignContactStatus
                        if outcome == "answered":
                            campaign_contact.status = CampaignContactStatus.called_answered
                        elif outcome == "no_answer":
                            campaign_contact.status = CampaignContactStatus.called_no_answer
                        elif outcome == "busy":
                            campaign_contact.status = CampaignContactStatus.called_busy
                        else:
                            campaign_contact.status = CampaignContactStatus.failed
                            
                    # Update Campaign running stats
                    campaign_stmt = select(Campaign).where(Campaign.id == campaign_id)
                    campaign_res = await db.execute(campaign_stmt)
                    campaign = campaign_res.scalar_one_or_none()
                    if campaign:
                        campaign.stat_called += 1
                        if outcome == "answered":
                            campaign.stat_answered += 1
                        elif outcome == "no_answer":
                            campaign.stat_no_answer += 1
                        
                        if call.detected_intent == "interested":
                            campaign.stat_interested += 1
                        elif call.detected_intent == "not_interested":
                            campaign.stat_not_interested += 1
                            
                        if call.was_transferred:
                            campaign.stat_transferred += 1
                            
                        # Send campaign progress update to WS
                        progress_redis = get_redis_client()
                        try:
                            prog_message = {
                                "type": "campaign.progress",
                                "campaignId": str(campaign_id),
                                "data": {
                                    "called": campaign.stat_called,
                                    "answered": campaign.stat_answered,
                                    "interested": campaign.stat_interested,
                                    "total": campaign.total_contacts
                                }
                            }
                            await progress_redis.publish(f"workspace:{workspace_id_str}", json.dumps(prog_message))
                        finally:
                            await progress_redis.close()
                            
                await db.commit()
                
                await publish_ws_event(workspace_id_str, "call.ended", str(call.id), {
                    "outcome": outcome,
                    "duration": duration,
                    "aiSummary": ai_summary
                })
                
            elif event_type == "call.error":
                call.status = CallStatus.failed
                call.outcome = "failed"
                call.ended_at = datetime.utcnow()
                await db.commit()
                
                await publish_ws_event(workspace_id_str, "call.error", str(call.id), {
                    "error": event_data.get("message") or "Unknown calling error"
                })
                
            # Mark Call Event as processed
            call_event.processed = True
            await db.commit()
            
        except Exception as e:
            await db.rollback()
            logger.exception(f"Error processing Dialog webhook callback: {e}")
            raise
