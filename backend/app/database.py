import urllib.parse
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Parse the database URL and clean up parameters incompatible with asyncpg
db_url = settings.DATABASE_URL
connect_args = {}

if "postgresql" in db_url:
    parsed = urllib.parse.urlparse(db_url)
    query_params = urllib.parse.parse_qs(parsed.query)
    
    has_ssl = False
    if "sslmode" in query_params:
        has_ssl = True
        query_params.pop("sslmode")
    if "channel_binding" in query_params:
        query_params.pop("channel_binding")
        
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    parsed = parsed._replace(query=new_query)
    db_url = urllib.parse.urlunparse(parsed)
    
    if has_ssl or "neon.tech" in db_url:
        connect_args["ssl"] = True

# Create async engine. Use pool_pre_ping to check connection health.
engine = create_async_engine(
    db_url,
    pool_pre_ping=True,
    echo=False,
    connect_args=connect_args
)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
