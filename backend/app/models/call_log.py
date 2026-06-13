import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CallLog(Base):
    """
    Call Detail Record (CDR). Every call — inbound or outbound — creates one record.
    VoIP-agnostic: stores provider-specific SID for cross-reference.
    """
    __tablename__ = "call_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)

    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # inbound/outbound
    status: Mapped[str] = mapped_column(String(20), default="initiated", nullable=False)  # initiated/ringing/connected/completed/failed/missed

    phone_from: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    phone_to: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recording_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Disposition
    disposition_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("disposition_templates.id", ondelete="SET NULL"), nullable=True)
    disposition_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # VoIP tracking
    voip_call_sid: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Twilio SID / Kaleyra ID
    voip_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # AI fields (Phase 3)
    ai_transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    campaign = relationship("Campaign", foreign_keys=[campaign_id])
    agent = relationship("User", foreign_keys=[agent_id])
    customer = relationship("Customer", foreign_keys=[customer_id])
    disposition = relationship("DispositionTemplate", foreign_keys=[disposition_id])


# Indexes for reporting queries
Index("idx_call_logs_tenant_campaign", CallLog.tenant_id, CallLog.campaign_id)
Index("idx_call_logs_tenant_agent", CallLog.tenant_id, CallLog.agent_id)
Index("idx_call_logs_tenant_date", CallLog.tenant_id, CallLog.created_at)
