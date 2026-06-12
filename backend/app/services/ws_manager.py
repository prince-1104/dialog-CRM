import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis_listeners: Dict[str, asyncio.Task] = {}

    async def connect(self, workspace_id: str, websocket: WebSocket):
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = set()
        self.active_connections[workspace_id].add(websocket)
        logger.info(f"WebSocket client connected to workspace {workspace_id}")
        
        # Start Redis listener task if not already listening
        if workspace_id not in self.redis_listeners or self.redis_listeners[workspace_id].done():
            self.redis_listeners[workspace_id] = asyncio.create_task(
                self._redis_subscribe_loop(workspace_id)
            )

    async def disconnect(self, workspace_id: str, websocket: WebSocket):
        if workspace_id in self.active_connections:
            self.active_connections[workspace_id].discard(websocket)
            logger.info(f"WebSocket client disconnected from workspace {workspace_id}")
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]
                # Cleanup listener task
                if workspace_id in self.redis_listeners:
                    self.redis_listeners[workspace_id].cancel()
                    del self.redis_listeners[workspace_id]

    async def broadcast(self, workspace_id: str, message: dict):
        if workspace_id in self.active_connections:
            # Create a copy of the set to iterate to avoid modification issues
            for ws in list(self.active_connections[workspace_id]):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.debug(f"Failed to send JSON message: {e}")
                    # Auto disconnect failed channels
                    await self.disconnect(workspace_id, ws)

    async def _redis_subscribe_loop(self, workspace_id: str):
        redis = get_redis_client()
        pubsub = redis.pubsub()
        channel = f"workspace:{workspace_id}"
        await pubsub.subscribe(channel)
        logger.info(f"Subscribed to Redis pub/sub channel: {channel}")
        
        try:
            async for message in pubsub.listen():
                if message and message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        await self.broadcast(workspace_id, data)
                    except Exception as e:
                        logger.error(f"Error handling pubsub message for workspace {workspace_id}: {e}")
        except asyncio.CancelledError:
            logger.info(f"Cancelled Redis subscription for workspace {workspace_id}")
        except Exception as e:
            logger.error(f"Redis subscription error for workspace {workspace_id}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await redis.close()

manager = ConnectionManager()
