import uuid
from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from app.database import get_db
from app.models.pipeline import Pipeline, PipelineStage
from app.models.contact import Contact
from app.models.workspace import UserRole
from app.models.user import User
from app.schemas.pipeline import (
    PipelineCreate, PipelineUpdate, PipelineResponse,
    PipelineStageCreate, PipelineStageUpdate, PipelineStageResponse
)
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_pipelines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch all pipelines
    stmt = select(Pipeline).where(Pipeline.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    pipelines = res.scalars().all()
    
    result = []
    for pipe in pipelines:
        # Load stages manually since we want to attach contact counts
        stage_stmt = select(PipelineStage).where(PipelineStage.pipeline_id == pipe.id).order_by(PipelineStage.position)
        stage_res = await db.execute(stage_stmt)
        stages = stage_res.scalars().all()
        
        stages_data = []
        for stage in stages:
            count_stmt = select(func.count(Contact.id)).where(Contact.pipeline_stage_id == stage.id)
            count_res = await db.execute(count_stmt)
            count = count_res.scalar_one_or_none() or 0
            
            stages_data.append({
                "id": stage.id,
                "pipeline_id": stage.pipeline_id,
                "workspace_id": stage.workspace_id,
                "name": stage.name,
                "position": stage.position,
                "color": stage.color,
                "created_at": stage.created_at,
                "updated_at": stage.updated_at,
                "contact_count": count
            })
            
        result.append({
            "id": pipe.id,
            "workspace_id": pipe.workspace_id,
            "name": pipe.name,
            "is_default": pipe.is_default,
            "created_at": pipe.created_at,
            "updated_at": pipe.updated_at,
            "stages": stages_data
        })
        
    return result

@router.post("", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    payload: PipelineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if this is the first pipeline, make it default if so
    count_stmt = select(func.count(Pipeline.id)).where(Pipeline.workspace_id == current_user.workspace_id)
    count_res = await db.execute(count_stmt)
    count = count_res.scalar_one_or_none() or 0
    is_default = (count == 0)

    pipeline = Pipeline(
        workspace_id=current_user.workspace_id,
        name=payload.name,
        is_default=is_default
    )
    db.add(pipeline)
    await db.flush() # Populate ID

    # Create stages
    for stage_data in payload.stages:
        stage = PipelineStage(
            pipeline_id=pipeline.id,
            workspace_id=current_user.workspace_id,
            name=stage_data.name,
            position=stage_data.position,
            color=stage_data.color
        )
        db.add(stage)
        
    await db.commit()
    
    # Reload with stages loaded
    reload_stmt = select(Pipeline).where(Pipeline.id == pipeline.id)
    reload_res = await db.execute(reload_stmt)
    return reload_res.scalar_one()

@router.get("/{id}", response_model=Dict[str, Any])
async def get_pipeline_details(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Pipeline).where(Pipeline.id == id, Pipeline.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    pipeline = res.scalar_one_or_none()
    if not pipeline:
         raise HTTPException(status_code=404, detail="Pipeline not found")

    # Load stages
    stage_stmt = select(PipelineStage).where(PipelineStage.pipeline_id == id).order_by(PipelineStage.position)
    stage_res = await db.execute(stage_stmt)
    stages = stage_res.scalars().all()

    stages_list = []
    for stage in stages:
         # Load contacts for this stage
         contact_stmt = select(Contact).where(Contact.pipeline_stage_id == stage.id)
         contact_res = await db.execute(contact_stmt)
         contacts = contact_res.scalars().all()
         
         stages_list.append({
             "id": stage.id,
             "pipeline_id": stage.pipeline_id,
             "workspace_id": stage.workspace_id,
             "name": stage.name,
             "position": stage.position,
             "color": stage.color,
             "created_at": stage.created_at,
             "updated_at": stage.updated_at,
             "contacts": contacts
         })

    return {
         "id": pipeline.id,
         "workspace_id": pipeline.workspace_id,
         "name": pipeline.name,
         "is_default": pipeline.is_default,
         "created_at": pipeline.created_at,
         "updated_at": pipeline.updated_at,
         "stages": stages_list
    }

@router.patch("/{id}", response_model=PipelineResponse)
async def update_pipeline(
    id: uuid.UUID,
    payload: PipelineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Pipeline).where(Pipeline.id == id, Pipeline.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    pipeline = res.scalar_one_or_none()
    if not pipeline:
         raise HTTPException(status_code=404, detail="Pipeline not found")

    if payload.name is not None:
         pipeline.name = payload.name
         
    pipeline.updated_at = datetime.utcnow()
    await db.commit()
    
    # Reload
    reload_stmt = select(Pipeline).where(Pipeline.id == pipeline.id)
    reload_res = await db.execute(reload_stmt)
    return reload_res.scalar_one()

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_pipeline(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Pipeline).where(Pipeline.id == id, Pipeline.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    pipeline = res.scalar_one_or_none()
    if not pipeline:
         raise HTTPException(status_code=404, detail="Pipeline not found")

    # Only delete if no contacts are linked to this pipeline
    contact_stmt = select(func.count(Contact.id)).where(Contact.pipeline_id == id)
    contact_res = await db.execute(contact_stmt)
    count = contact_res.scalar_one_or_none() or 0
    
    if count > 0:
         raise HTTPException(status_code=400, detail="Cannot delete pipeline while contacts are still associated with it.")

    await db.execute(delete(Pipeline).where(Pipeline.id == id))
    await db.commit()
    return {"detail": "Pipeline deleted successfully"}

# --- STAGES MANAGEMENT ---

@router.post("/{id}/stages", response_model=PipelineStageResponse, status_code=status.HTTP_201_CREATED)
async def create_stage(
    id: uuid.UUID,
    payload: PipelineStageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Pipeline).where(Pipeline.id == id, Pipeline.workspace_id == current_user.workspace_id)
    res = await db.execute(stmt)
    pipeline = res.scalar_one_or_none()
    if not pipeline:
         raise HTTPException(status_code=404, detail="Pipeline not found")

    stage = PipelineStage(
         pipeline_id=id,
         workspace_id=current_user.workspace_id,
         name=payload.name,
         position=payload.position,
         color=payload.color
    )
    db.add(stage)
    await db.commit()
    await db.refresh(stage)
    return stage

@router.patch("/{id}/stages/{stage_id}", response_model=PipelineStageResponse)
async def update_stage(
    id: uuid.UUID,
    stage_id: uuid.UUID,
    payload: PipelineStageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(PipelineStage).where(
        PipelineStage.id == stage_id,
        PipelineStage.pipeline_id == id,
        PipelineStage.workspace_id == current_user.workspace_id
    )
    res = await db.execute(stmt)
    stage = res.scalar_one_or_none()
    if not stage:
         raise HTTPException(status_code=404, detail="Pipeline stage not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
         setattr(stage, k, v)
         
    stage.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(stage)
    return stage

@router.delete("/{id}/stages/{stage_id}", status_code=status.HTTP_200_OK)
async def delete_stage(
    id: uuid.UUID,
    stage_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(PipelineStage).where(
        PipelineStage.id == stage_id,
        PipelineStage.pipeline_id == id,
        PipelineStage.workspace_id == current_user.workspace_id
    )
    res = await db.execute(stmt)
    stage = res.scalar_one_or_none()
    if not stage:
         raise HTTPException(status_code=404, detail="Pipeline stage not found")

    # Move contacts in this stage to null stage first
    await db.execute(
         update(Contact)
         .where(Contact.pipeline_stage_id == stage_id, Contact.workspace_id == current_user.workspace_id)
         .values(pipeline_stage_id=None)
    )
    
    await db.execute(delete(PipelineStage).where(PipelineStage.id == stage_id))
    await db.commit()
    return {"detail": "Pipeline stage deleted and associated contacts unassigned successfully"}
