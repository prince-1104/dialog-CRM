import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, Dict, Any
from sqlalchemy import String, ForeignKey, Index, JSON, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class ActivityType(str, PyEnum):
    call_made = "call_made"
    call_received = "call_received"
    call_missed = "call_missed"
    note_added = "note_added"
    status_changed = "status_changed"
    stage_moved = "stage_moved"
    deal_created = "deal_created"
    deal_won = "deal_won"
    deal_lost = "deal_lost"
    contact_imported = "contact_imported"
    campaign_enrolled = "campaign_enrolled"
    intent_detected = "intent_detected"
    transfer_made = "transfer_made"

class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    deal_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)
    call_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("calls.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType, native_enum=False), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    activity_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict, server_default='{}', nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    contact = relationship("Contact")
    deal = relationship("Deal")
    call = relationship("Call")
    user = relationship("User")

# Indexes
Index("idx_activities_workspace_contact", Activity.workspace_id, Activity.contact_id)
Index("idx_activities_workspace_created_at", Activity.workspace_id, Activity.created_at)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    deal_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    content: Mapped[str] = mapped_column(String, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contact = relationship("Contact")
    deal = relationship("Deal")
    user = relationship("User")
