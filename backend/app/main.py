import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.redis_client import check_redis_connection, redis_pool

# V2 Router imports
from app.routers.auth import router as auth_router
from app.routers.super_admin import router as super_admin_router
from app.routers.users import router as users_router
from app.routers.campaigns import router as campaigns_router
from app.routers.customers import router as customers_router
from app.routers.scripts import router as scripts_router
from app.routers.call_operations import disp_router, cdr_router, cb_router
from app.routers.reports import router as reports_router

# Logger setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Multi-Tenant Contact Center Platform...")
    
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection: OK")
    except Exception as e:
        logger.critical(f"Database connection FAILED: {e}")
        
    redis_ok = await check_redis_connection()
    logger.info(f"Redis connection: {'OK' if redis_ok else 'FAILED'}")
        
    yield
    
    logger.info("Shutting down, disposing connection pools...")
    await redis_pool.disconnect()
    await engine.dispose()
    logger.info("Shutdown completed.")

app = FastAPI(
    title="NMC Contact Center Platform API",
    description="Multi-tenant contact center SaaS with campaigns, CRM, dialer, and reporting.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
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

# ============================================================================
# Register Routers
# ============================================================================

# Auth
app.include_router(auth_router)

# Super Admin Portal
app.include_router(super_admin_router)

# Tenant-scoped endpoints
app.include_router(users_router)
app.include_router(campaigns_router)
app.include_router(customers_router)
app.include_router(scripts_router)
app.include_router(disp_router)
app.include_router(cdr_router)
app.include_router(cb_router)
app.include_router(reports_router)


@app.get("/api/health", tags=["system"])
async def health_status():
    return {
        "status": "healthy",
        "platform": "NMC Contact Center",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
    }
