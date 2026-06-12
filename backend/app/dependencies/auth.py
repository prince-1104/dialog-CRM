import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.services.auth_service import decode_token
from app.models.user import User
from app.models.workspace import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

ROLE_LEVELS = {
    UserRole.viewer: 1,
    UserRole.agent: 2,
    UserRole.manager: 3,
    UserRole.admin: 4,
    UserRole.owner: 5
}

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
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
        
    user_id_str = payload.get("sub")
    workspace_id_str = payload.get("workspace_id")
    if not user_id_str or not workspace_id_str:
        raise credentials_exception
        
    try:
        user_id = uuid.UUID(user_id_str)
        workspace_id = uuid.UUID(workspace_id_str)
    except ValueError:
        raise credentials_exception
        
    result = await db.execute(
        select(User).where(User.id == user_id, User.workspace_id == workspace_id)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise credentials_exception
        
    return user

def require_role(min_role: UserRole):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role_str = UserRole(user.role) if isinstance(user.role, str) else user.role
        user_level = ROLE_LEVELS.get(user_role_str, 0)
        min_level = ROLE_LEVELS.get(min_role, 0)
        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this user role"
            )
        return user
    return role_checker
