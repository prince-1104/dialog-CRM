import redis.asyncio as aioredis
from app.config import settings

# Global redis pool and connection reference
redis_pool: aioredis.ConnectionPool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True
)

def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=redis_pool)

async def check_redis_connection() -> bool:
    client = get_redis_client()
    try:
        await client.ping()
        return True
    except Exception:
        return False
    finally:
        await client.close()
