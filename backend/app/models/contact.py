import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class ContactSource(str, PyEnum):
    manual = "manual"
    import_csv = "import"  # Note: mapping 'import' from prompt to import_csv since 'import' is a python keyword
    api = "api"
    campaign = "campaign"

class ContactStatus(str, PyEnum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    unqualified = "unqualified"
    customer = "customer"
    churned = "churned"

class CallOutcome(str, PyEnum):
    answered = "answered"
    no_answer = "no_answer"
    busy = "busy"
    failed = "failed"

class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    source: Mapped[ContactSource] = mapped_column(String(50), default=ContactSource.manual, nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)
    custom_fields: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, server_default='{}', nullable=False)
    lead_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[ContactStatus] = mapped_column(String(50), default=ContactStatus.new, nullable=False)
    
    assigned_to_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    pipeline_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("pipelines.id", ondelete="SET NULL"), nullable=True)
    pipeline_stage_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("pipeline_stages.id", ondelete="SET NULL"), nullable=True)
    
    last_called_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_call_outcome: Mapped[Optional[CallOutcome]] = mapped_column(String(50), nullable=True)
    call_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    pipeline = relationship("Pipeline", foreign_keys=[pipeline_id])
    pipeline_stage = relationship("PipelineStage", foreign_keys=[pipeline_stage_id])

# Indexes
Index("idx_contacts_workspace_status", Contact.workspace_id, Contact.status)
Index("idx_contacts_workspace_stage", Contact.workspace_id, Contact.pipeline_stage_id)
