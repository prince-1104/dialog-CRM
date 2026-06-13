import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserRole(str, PyEnum):
    tenant_admin = "tenant_admin"
    manager = "manager"
    team_lead = "team_lead"
    agent = "agent"


class AvailabilityStatus(str, PyEnum):
    online = "online"
    away = "away"
    offline = "offline"


class User(Base):
    """
    All tenant users: admin, manager, team_lead, agent.
    Agent-specific fields (skills, availability, phone) are on this table directly.
    An agent IS a user with role='agent' — no separate agents table.
    """
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[UserRole] = mapped_column(String(50), nullable=False)

    # Agent-specific fields (nullable for non-agent roles)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    skills: Mapped[List[str]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        String(20), default=AvailabilityStatus.offline, nullable=False, server_default="offline"
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    super_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("super_admins.id", ondelete="CASCADE"), nullable=True)
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
