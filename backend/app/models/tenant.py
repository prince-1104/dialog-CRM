import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TenantStatus(str, PyEnum):
    active = "active"
    suspended = "suspended"
    disabled = "disabled"


class TenantPlan(str, PyEnum):
    starter = "starter"
    pro = "pro"
    enterprise = "enterprise"


class Tenant(Base):
    """
    Client company (e.g. ABC Insurance, XYZ Healthcare).
    Each tenant is fully isolated — their data never crosses boundaries.
    """
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    # Status & Plan
    status: Mapped[TenantStatus] = mapped_column(String(20), default=TenantStatus.active, nullable=False)
    plan: Mapped[TenantPlan] = mapped_column(String(50), default=TenantPlan.starter, nullable=False)

    # VoIP Config (Phase 2 — populated when VoIP is integrated)
    voip_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # twilio/kaleyra/exotel
    voip_config: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}', nullable=False)  # encrypted keys

    # Dialog AI Config (carried over)
    dialog_base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    dialog_api_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # encrypted
    dialog_webhook_registered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Billing
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    billing_cycle_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Limits
    max_agents: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_campaigns: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # Who created this tenant
    created_by_super_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("super_admins.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")


class TenantSettings(Base):
    """Key-value settings per tenant for flexible configuration."""
    __tablename__ = "tenant_settings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
