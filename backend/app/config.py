import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://crm_user:password@localhost:5432/dialog_crm"
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    JWT_SECRET_KEY: str = "supersecretkeychangeit"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    ENCRYPTION_KEY: str = "" # base64 32 bytes key for Fernet, must be set in env
    
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "sslmode" in v or "channel_binding" in v:
                import urllib.parse
                parsed = urllib.parse.urlparse(v)
                query_params = urllib.parse.parse_qs(parsed.query)
                query_params.pop("sslmode", None)
                query_params.pop("channel_binding", None)
                new_query = urllib.parse.urlencode(query_params, doseq=True)
                parsed = parsed._replace(query=new_query)
                v = urllib.parse.urlunparse(parsed)
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
