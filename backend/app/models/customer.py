import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Customer(Base):
    """
    Generic CRM customer record. Decoupled from campaigns.
    A customer can be linked to a source campaign but exists independently.
    """
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    source: Mapped[str] = mapped_column(String(50), default="manual", nullable=False)  # manual/import/campaign/api
    source_campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="new", nullable=False)  # new/active/inactive

    custom_fields: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, server_default='{}', nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)

    # Denormalized counters
    total_calls: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_called_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_disposition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    source_campaign = relationship("Campaign", foreign_keys=[source_campaign_id])
    notes = relationship("CustomerNote", back_populates="customer", cascade="all, delete-orphan")


# Indexes
Index("idx_customers_tenant_status", Customer.tenant_id, Customer.status)
Index("idx_customers_tenant_phone", Customer.tenant_id, Customer.phone)


class CustomerNote(Base):
    __tablename__ = "customer_notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="notes")
    user = relationship("User", foreign_keys=[user_id])
