import uuid
from datetime import datetime, time
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, Integer, Time, DateTime, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class CampaignStatus(str, PyEnum):
    draft = "draft"
    syncing = "syncing"
    active = "active"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"

class CampaignContactStatus(str, PyEnum):
    pending = "pending"
    calling = "calling"
    called_answered = "called_answered"
    called_no_answer = "called_no_answer"
    called_busy = "called_busy"
    failed = "failed"

class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    dialog_campaign_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus, native_enum=False), default=CampaignStatus.draft, nullable=False)
    
    total_contacts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_called: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_answered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_interested: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_not_interested: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_transferred: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stat_no_answer: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    timezone: Mapped[str] = mapped_column(String(100), default="Asia/Kolkata", nullable=False)
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    created_by = relationship("User", foreign_keys=[created_by_id])
    contacts = relationship("CampaignContact", back_populates="campaign", cascade="all, delete-orphan")


class CampaignContact(Base):
    __tablename__ = "campaign_contacts"
    __table_args__ = (
        UniqueConstraint("campaign_id", "contact_id", name="uq_campaign_contact"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("calls.id", ondelete="SET NULL"), nullable=True)
    
    status: Mapped[CampaignContactStatus] = mapped_column(Enum(CampaignContactStatus, native_enum=False), default=CampaignContactStatus.pending, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    campaign = relationship("Campaign", back_populates="contacts")
    contact = relationship("Contact", foreign_keys=[contact_id])
    call = relationship("Call", foreign_keys=[call_id])
