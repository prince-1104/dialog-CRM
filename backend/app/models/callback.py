import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Callback(Base):
    """Scheduled callback when customer requests 'call me later'."""
    __tablename__ = "callbacks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)

    callback_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)  # scheduled/completed/missed/cancelled
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", foreign_keys=[customer_id])
    agent = relationship("User", foreign_keys=[agent_id])
    campaign = relationship("Campaign", foreign_keys=[campaign_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
