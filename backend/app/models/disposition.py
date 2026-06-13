import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DispositionTemplate(Base):
    """
    Reusable disposition types per tenant.
    Pre-seeded with defaults: Interested, Not Interested, Purchased,
    Callback Requested, No Answer, Busy, Voicemail, Wrong Number.
    """
    __tablename__ = "disposition_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # positive/negative/neutral/callback
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # pre-seeded, cannot delete
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# Default dispositions to seed per tenant
DEFAULT_DISPOSITIONS = [
    {"name": "Interested", "category": "positive", "sort_order": 1},
    {"name": "Not Interested", "category": "negative", "sort_order": 2},
    {"name": "Purchased", "category": "positive", "sort_order": 3},
    {"name": "Callback Requested", "category": "callback", "sort_order": 4},
    {"name": "No Answer", "category": "neutral", "sort_order": 5},
    {"name": "Busy", "category": "neutral", "sort_order": 6},
    {"name": "Voicemail", "category": "neutral", "sort_order": 7},
    {"name": "Wrong Number", "category": "negative", "sort_order": 8},
]
