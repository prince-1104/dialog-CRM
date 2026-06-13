import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Script(Base):
    """Call script template assigned to campaigns."""
    __tablename__ = "scripts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="sales", nullable=False)  # sales/support/ai
    language: Mapped[str] = mapped_column(String(50), default="english", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    steps = relationship("ScriptStep", back_populates="script", cascade="all, delete-orphan", order_by="ScriptStep.step_number")


class ScriptStep(Base):
    """Individual step within a call script."""
    __tablename__ = "script_steps"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    script_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scripts.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)  # "Ask customer location"
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Full instruction text
    question: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Question to ask
    expected_responses: Mapped[List[str]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    script = relationship("Script", back_populates="steps")
