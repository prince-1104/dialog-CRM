import uuid
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class PipelineStageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    position: int = Field(..., ge=0)
    color: str = Field("#6366f1", max_length=50)

class PipelineStageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    position: Optional[int] = Field(None, ge=0)
    color: Optional[str] = Field(None, max_length=50)

class PipelineStageResponse(BaseModel):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    position: int
    color: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PipelineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    stages: List[PipelineStageCreate] = Field(default_factory=list)

class PipelineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class PipelineResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    is_default: bool
    stages: List[PipelineStageResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PipelineWithCountsResponse(PipelineResponse):
    contact_counts: Dict[str, int] = {} # stage_id -> count of contacts
    class Config:
        from_attributes = True
