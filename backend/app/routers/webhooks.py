import uuid
from typing import Optional
from fastapi import APIRouter, Request, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.workspace import Workspace
from app.utils.hmac_verify import verify_signature
from app.utils.encryption import encryptor
from app.redis_client import get_redis_client
from app.tasks.webhook_tasks import process_dialog_webhook

from app.utils.rate_limit import limiter

router = APIRouter(prefix="/webhooks/dialog", tags=["webhooks"])

@router.post("/{workspace_id}")
@limiter.limit("100/minute")
async def handle_dialog_webhook(
    workspace_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_dialog_signature: Optional[str] = Header(None, alias="X-Dialog-Signature"),
    x_dialog_delivery_id: Optional[str] = Header(None, alias="X-Dialog-Delivery-Id")
):
    # Step 1: Load workspace by ID
    stmt = select(Workspace).where(Workspace.id == workspace_id)
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Step 2: Verify HMAC-SHA256 signature
    webhook_secret = encryptor.decrypt(workspace.dialog_webhook_secret)
    if not webhook_secret:
        raise HTTPException(status_code=401, detail="Webhook secret not configured")
        
    if not x_dialog_signature:
        raise HTTPException(status_code=401, detail="Missing X-Dialog-Signature header")
        
    raw_body = await request.body()
    if not verify_signature(raw_body, webhook_secret, x_dialog_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
    # Step 3: Deduplication
    if not x_dialog_delivery_id:
        raise HTTPException(status_code=400, detail="Missing X-Dialog-Delivery-Id header")
        
    redis_client = get_redis_client()
    dedup_key = f"dedup:{workspace_id}:{x_dialog_delivery_id}"
    
    # SET NX with TTL 86400 (24 hours)
    is_new = await redis_client.set(dedup_key, "1", ex=86400, nx=True)
    await redis_client.close()
    
    if not is_new:
        return {"received": True, "duplicate": True}
        
    # Parse body to JSON
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    # Step 4 & 5: Return 200 and dispatch background Celery task
    # We pass delivery_id to the task to save in call_events table.
    process_dialog_webhook.delay(str(workspace_id), payload, x_dialog_delivery_id)
    
    return {"received": True}
