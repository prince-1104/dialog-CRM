import uuid
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.services.ws_manager import manager
from app.services.auth_service import decode_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websockets"])

@router.websocket("/ws/{workspace_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    workspace_id: uuid.UUID,
    token: str = Query(...)
):
    # Step 1: Validate token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid access token")
        return
        
    # Step 2: Verify workspace access
    token_workspace_id_str = payload.get("workspace_id")
    if not token_workspace_id_str:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token workspace payload")
        return
        
    try:
        token_workspace_id = uuid.UUID(token_workspace_id_str)
    except ValueError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid workspace UUID format in token")
        return
        
    if token_workspace_id != workspace_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Workspace access mismatch")
        return
        
    # Step 3 & 4: Register connection and start Redis listening
    ws_id_str = str(workspace_id)
    await manager.connect(ws_id_str, websocket)
    
    try:
        # Keep session alive and capture user actions or browser close events
        while True:
            # Keep-alive wait, standard client pings will be received here
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws_id_str, websocket)
    except Exception as e:
        logger.error(f"WebSocket session error for workspace {workspace_id}: {e}")
        await manager.disconnect(ws_id_str, websocket)
