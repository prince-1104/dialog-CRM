"""CRM Customers — generic, decoupled from campaigns."""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerNote
from app.schemas.platform import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerNoteCreate, CustomerNoteResponse
)
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Customer).where(Customer.tenant_id == current_user.tenant_id)
    if status_filter:
        stmt = stmt.where(Customer.status == status_filter)
    if search:
        stmt = stmt.where(
            (Customer.name.ilike(f"%{search}%")) |
            (Customer.phone.ilike(f"%{search}%")) |
            (Customer.email.ilike(f"%{search}%"))
        )
    stmt = stmt.order_by(Customer.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/count")
async def customer_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(func.count(Customer.id)).where(Customer.tenant_id == current_user.tenant_id)
    )
    return {"count": result.scalar() or 0}


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = Customer(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        company=payload.company,
        address=payload.address,
        source=payload.source,
        tags=payload.tags,
        custom_fields=payload.custom_fields,
        assigned_to_id=payload.assigned_to_id,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(customer, k, v)
    customer.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    await db.delete(customer)
    await db.commit()


# ============================================================================
# Customer Notes
# ============================================================================

@router.get("/{customer_id}/notes", response_model=List[CustomerNoteResponse])
async def list_notes(
    customer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify customer belongs to tenant
    cust = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    if not cust.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found.")

    result = await db.execute(
        select(CustomerNote).where(CustomerNote.customer_id == customer_id).order_by(CustomerNote.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{customer_id}/notes", response_model=CustomerNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    customer_id: uuid.UUID,
    payload: CustomerNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cust = await db.execute(
        select(Customer).where(Customer.id == customer_id, Customer.tenant_id == current_user.tenant_id)
    )
    if not cust.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found.")

    note = CustomerNote(
        customer_id=customer_id,
        user_id=current_user.id,
        content=payload.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note
