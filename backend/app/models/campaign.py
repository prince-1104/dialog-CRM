import uuid
from datetime import datetime, time
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, Integer, Time, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CampaignType(str, PyEnum):
    inbound = "inbound"
    outbound = "outbound"


class CampaignStatus(str, PyEnum):
    draft = "draft"
    active = "active"
    paused = "paused"
    completed = "completed"


class RoutingType(str, PyEnum):
    round_robin = "round_robin"
    skill_based = "skill_based"
    language_based = "language_based"
    shift_based = "shift_based"
    priority = "priority"


class Campaign(Base):
    """
    Inbound or Outbound campaign.
    Inbound: Customer calls campaign number → routing engine → agent
    Outbound: Campaign dials customers → connects to agent / AI agent
    """
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[CampaignType] = mapped_column(String(20), nullable=False)
    status: Mapped[CampaignStatus] = mapped_column(String(20), default=CampaignStatus.draft, nullable=False)

    phone_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # campaign DID
    script_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True)
    language: Mapped[str] = mapped_column(String(50), default="english", nullable=False)

    # Routing
    routing_type: Mapped[RoutingType] = mapped_column(String(50), default=RoutingType.round_robin, nullable=False)

    # Schedule
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Kolkata", nullable=False)
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=2, nullable=False)

    # Denormalized stats
    total_contacts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_answered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_converted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    agents = relationship("CampaignAgent", back_populates="campaign", cascade="all, delete-orphan")
    script = relationship("Script", foreign_keys=[script_id])


class CampaignAgent(Base):
    """Links agents to campaigns with priority for routing."""
    __tablename__ = "campaign_agents"
    __table_args__ = (
        UniqueConstraint("campaign_id", "agent_id", name="uq_campaign_agent"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    campaign = relationship("Campaign", back_populates="agents")
    agent = relationship("User", foreign_keys=[agent_id])
