import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.database import engine
from app.redis_client import check_redis_connection, redis_pool
from app.utils.rate_limit import limiter

# Direct router imports
from app.routers.auth import router as auth_router
from app.routers.workspace import router as workspace_router
from app.routers.contacts import router as contacts_router
from app.routers.pipelines import router as pipelines_router
from app.routers.deals import router as deals_router
from app.routers.calls import router as calls_router
from app.routers.campaigns import router as campaigns_router
from app.routers.agents import router as agents_router
from app.routers.analytics import router as analytics_router
from app.routers.webhooks import router as webhooks_router
from app.routers.ws import router as ws_router

# Logger setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Dialog CRM SaaS Backend Services...")
    
    # 1. Test database connection
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Lifespan check: Database connection test SUCCESSFUL.")
    except Exception as e:
        logger.critical(f"Lifespan check: Database connection test FAILED! Details: {e}")
        
    # 2. Test Redis connection
    redis_ok = await check_redis_connection()
    if redis_ok:
        logger.info("Lifespan check: Redis connection test SUCCESSFUL.")
    else:
        logger.critical("Lifespan check: Redis connection test FAILED!")
        
    yield
    
    # 4 & 5. Cleanup connections
    logger.info("Shutting down backend, disposing connection pools...")
    await redis_pool.disconnect()
    await engine.dispose()
    logger.info("Shutdown completed.")

app = FastAPI(
    title="Dialog CRM REST & Real-time API",
    description="Multi-tenant SaaS CRM with Dialog voice calls orchestration layer.",
    version="1.0.0",
    lifespan=lifespan
)

# SlowAPI Rate Limiting exception mapping
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route prefixes
app.include_router(auth_router)
app.include_router(workspace_router)
app.include_router(contacts_router)
app.include_router(pipelines_router)
app.include_router(deals_router)
app.include_router(calls_router)
app.include_router(campaigns_router)
app.include_router(agents_router)
app.include_router(analytics_router)
app.include_router(webhooks_router)
app.include_router(ws_router)

@app.get("/api/health", tags=["system"])
async def health_status():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "api_version": "1.0.0"
    }
