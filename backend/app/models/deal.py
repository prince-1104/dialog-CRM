import uuid
from datetime import datetime, date
from enum import Enum as PyEnum
from typing import Optional
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, Index, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class DealStatus(str, PyEnum):
    open = "open"
    won = "won"
    lost = "lost"

class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    pipeline_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pipeline_stages.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    probability: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    expected_close_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    status: Mapped[DealStatus] = mapped_column(Enum(DealStatus, native_enum=False), default=DealStatus.open, nullable=False)
    lost_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    contact = relationship("Contact", foreign_keys=[contact_id])
    pipeline = relationship("Pipeline", foreign_keys=[pipeline_id])
    stage = relationship("PipelineStage", foreign_keys=[stage_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

# Indexes
Index("idx_deals_workspace_status", Deal.workspace_id, Deal.status)
