import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.services.auth_service import decode_token
from app.models.user import User, UserRole
from app.models.super_admin import SuperAdmin

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Role hierarchy levels (higher = more permissions)
ROLE_LEVELS = {
    UserRole.agent: 1,
    UserRole.team_lead: 2,
    UserRole.manager: 3,
    UserRole.tenant_admin: 4,
}


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Authenticate a tenant user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    # Reject super admin tokens in tenant endpoints
    if payload.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Super admin cannot access tenant endpoints directly.")

    user_id_str = payload.get("sub")
    tenant_id_str = payload.get("tenant_id")
    if not user_id_str or not tenant_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
        tenant_id = uuid.UUID(tenant_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception

    return user


async def get_current_super_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> SuperAdmin:
    """Authenticate a super admin from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Super admin authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    if not payload.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="This endpoint requires super admin access.")

    admin_id_str = payload.get("sub")
    if not admin_id_str:
        raise credentials_exception

    try:
        admin_id = uuid.UUID(admin_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(
        select(SuperAdmin).where(SuperAdmin.id == admin_id)
    )
    admin = result.scalar_one_or_none()

    if not admin or not admin.is_active:
        raise credentials_exception

    return admin


def require_role(min_role: UserRole):
    """Dependency that enforces minimum role level for tenant users."""
    def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role = UserRole(user.role) if isinstance(user.role, str) else user.role
        user_level = ROLE_LEVELS.get(user_role, 0)
        min_level = ROLE_LEVELS.get(min_role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This operation requires at least '{min_role.value}' role."
            )
        return user
    return role_checker
