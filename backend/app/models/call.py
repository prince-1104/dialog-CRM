import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey, Index, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class CallDirection(str, PyEnum):
    outbound = "outbound"
    inbound = "inbound"

class CallStatus(str, PyEnum):
    initiating = "initiating"
    ringing = "ringing"
    in_progress = "in_progress"
    transferred = "transferred"
    ended = "ended"
    failed = "failed"

class CallTransferType(str, PyEnum):
    cold = "cold"
    warm = "warm"

class Call(Base):
    __tablename__ = "calls"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    
    dialog_call_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    dialog_call_sid: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    initiated_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    direction: Mapped[CallDirection] = mapped_column(Enum(CallDirection, native_enum=False), default=CallDirection.outbound, nullable=False)
    status: Mapped[CallStatus] = mapped_column(Enum(CallStatus, native_enum=False), default=CallStatus.initiating, nullable=False)
    outcome: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # answered, no_answer, busy, failed
    
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    detected_intent: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    intent_confidence: Mapped[Optional[float]] = mapped_column(Numeric(3, 2), nullable=True)
    
    was_transferred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transferred_to_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("crm_agents.id", ondelete="SET NULL"), nullable=True)
    transfer_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    
    transcript: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Text
    ai_summary: Mapped[Optional[str]] = mapped_column(String, nullable=True) # Text
    live_transcript: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)
    
    estimated_cost_usd: Mapped[Optional[float]] = mapped_column(Numeric(10, 6), nullable=True)
    billed_cost_usd: Mapped[Optional[float]] = mapped_column(Numeric(10, 6), nullable=True)
    dialog_stream_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    call_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict, server_default='{}', nullable=False)
    call_transfer_type: Mapped[Optional[CallTransferType]] = mapped_column(Enum(CallTransferType, native_enum=False), nullable=True)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    campaign = relationship("Campaign", foreign_keys=[campaign_id])
    initiated_by = relationship("User", foreign_keys=[initiated_by_id])
    transferred_to_agent = relationship("CrmAgent", foreign_keys=[transferred_to_agent_id])


class CallEvent(Base):
    __tablename__ = "call_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    call_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("calls.id", ondelete="CASCADE"), nullable=False, index=True)
    dialog_delivery_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    call = relationship("Call")

# Indexes on Call
Index("idx_calls_workspace_contact", Call.workspace_id, Call.contact_id)
Index("idx_calls_workspace_campaign", Call.workspace_id, Call.campaign_id)
Index("idx_calls_workspace_status", Call.workspace_id, Call.status)
