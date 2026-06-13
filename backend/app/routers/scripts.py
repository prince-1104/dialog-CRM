"""Script builder — CRUD for call scripts and steps."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.script import Script, ScriptStep
from app.schemas.platform import ScriptCreate, ScriptUpdate, ScriptResponse, ScriptStepCreate, ScriptStepResponse
from app.dependencies.auth import get_current_user, require_role

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


@router.get("/", response_model=List[ScriptResponse])
async def list_scripts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Script)
        .options(selectinload(Script.steps))
        .where(Script.tenant_id == current_user.tenant_id)
        .order_by(Script.created_at.desc())
    )
    return result.scalars().unique().all()


@router.post("/", response_model=ScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_script(
    payload: ScriptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    script = Script(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        type=payload.type,
        language=payload.language,
    )
    db.add(script)
    await db.flush()

    for step_data in payload.steps:
        step = ScriptStep(
            script_id=script.id,
            step_number=step_data.step_number,
            title=step_data.title,
            content=step_data.content,
            question=step_data.question,
            expected_responses=step_data.expected_responses,
        )
        db.add(step)

    await db.commit()
    
    # Reload with steps
    result = await db.execute(
        select(Script).options(selectinload(Script.steps)).where(Script.id == script.id)
    )
    return result.scalar_one()


@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script(
    script_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Script)
        .options(selectinload(Script.steps))
        .where(Script.id == script_id, Script.tenant_id == current_user.tenant_id)
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found.")
    return script


@router.patch("/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: uuid.UUID,
    payload: ScriptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(Script).where(Script.id == script_id, Script.tenant_id == current_user.tenant_id)
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(script, k, v)
    await db.commit()
    
    result2 = await db.execute(
        select(Script).options(selectinload(Script.steps)).where(Script.id == script_id)
    )
    return result2.scalar_one()


@router.delete("/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(Script).where(Script.id == script_id, Script.tenant_id == current_user.tenant_id)
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found.")
    await db.delete(script)
    await db.commit()


# ============================================================================
# Steps management
# ============================================================================

@router.post("/{script_id}/steps", response_model=ScriptStepResponse, status_code=status.HTTP_201_CREATED)
async def add_step(
    script_id: uuid.UUID,
    payload: ScriptStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    # Verify script
    result = await db.execute(
        select(Script).where(Script.id == script_id, Script.tenant_id == current_user.tenant_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Script not found.")
    
    step = ScriptStep(
        script_id=script_id,
        step_number=payload.step_number,
        title=payload.title,
        content=payload.content,
        question=payload.question,
        expected_responses=payload.expected_responses,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


@router.delete("/{script_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_step(
    script_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager))
):
    result = await db.execute(
        select(ScriptStep).where(ScriptStep.id == step_id, ScriptStep.script_id == script_id)
    )
    step = result.scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found.")
    await db.delete(step)
    await db.commit()
