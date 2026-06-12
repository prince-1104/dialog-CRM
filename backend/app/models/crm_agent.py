import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey, JSON, UniqueConstraint, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class AgentType(str, PyEnum):
    ai = "ai"
    human = "human"

class AvailabilityStatus(str, PyEnum):
    online = "online"
    away = "away"
    offline = "offline"

class CrmAgent(Base):
    __tablename__ = "crm_agents"
    __table_args__ = (
        UniqueConstraint("workspace_id", "dialog_crm_agent_id", name="uq_crm_agent_workspace_dialog_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    dialog_crm_agent_id: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Agent Type: AI voice agent or Human sales executive
    agent_type: Mapped[AgentType] = mapped_column(Enum(AgentType, native_enum=False), default=AgentType.ai, nullable=False, server_default="ai")
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    intents: Mapped[List[str]] = mapped_column(JSON, default=list, server_default='[]', nullable=False)
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        Enum(AvailabilityStatus, native_enum=False), 
        default=AvailabilityStatus.offline, 
        nullable=False, 
        server_default="offline"
    )
    dialog_synced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Human agent metrics
    total_calls_handled: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    total_talk_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    successful_transfers: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    failed_transfers: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
