import asyncio
import json
import logging
import websockets
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

async def relay_dialog_stream(workspace_id: str, call_id: str, stream_url: str, api_key: str):
    logger.info(f"Initiating stream relay for call {call_id} in workspace {workspace_id}")
    
    # Clean stream URL and append API Key parameter
    separator = "&" if "?" in stream_url else "?"
    url = f"{stream_url}{separator}apiKey={api_key}"
    
    redis = get_redis_client()
    try:
        async with websockets.connect(url) as ws:
            logger.info(f"Connected to Dialog WSS stream: {stream_url}")
            async for message in ws:
                try:
                    payload = json.loads(message)
                    # Force assign the CRM call id for front-end mapping
                    payload["callId"] = call_id
                    
                    # Publish event to the Redis pub/sub channel
                    await redis.publish(f"workspace:{workspace_id}", json.dumps(payload))
                except json.JSONDecodeError:
                    logger.error("Received raw non-JSON text from Dialog stream")
                except Exception as e:
                    logger.error(f"Failed to publish streamed turn: {e}")
                    
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Dialog WSS connection closed for call {call_id} (Code: {e.code})")
    except Exception as e:
        logger.error(f"Error in Dialog WSS connection for call {call_id}: {e}")
    finally:
        await redis.close()
        logger.info(f"Terminated stream relay task for call {call_id}")
