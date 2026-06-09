from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        # adminRole: "super_admin" or "instructor" (only for admin users)
        admin_role: str = payload.get("adminRole", "")
        return {"id": user_id, "role": role, "adminRole": admin_role}
    except JWTError:
        raise credentials_exception


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_super_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Only super_admin can access this endpoint."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )
        
    if current_user.get("adminRole") == "super_admin":
        return current_user
        
    # Check DB as fallback for the hardcoded email
    from app.database import admins_collection
    from bson import ObjectId
    admin_doc = await admins_collection.find_one({"_id": ObjectId(current_user["id"])})
    if admin_doc and admin_doc.get("email") == "admin@geetauniversity.edu.in":
        return current_user
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Super Admin access required",
    )


async def require_student(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return current_user


async def get_scoped_program_ids(admin: dict) -> Optional[List[str]]:
    """
    Returns the list of program IDs this admin is allowed to access.
    - super_admin: returns None (meaning ALL programs, no filter)
    - instructor: returns list of program IDs they created
    """
    if admin.get("adminRole") == "super_admin":
        return None  # No filter — super admin sees everything

    from app.database import programs_collection
    program_ids = []
    async for p in programs_collection.find({"createdBy": admin["id"]}, {"_id": 1}):
        program_ids.append(str(p["_id"]))
    return program_ids


def build_program_filter(scoped_ids: Optional[List[str]], field: str = "programId") -> dict:
    """
    Build a MongoDB filter dict for program-scoped queries.
    - If scoped_ids is None (super admin): returns {} (no filter)
    - If scoped_ids is a list: returns {field: {"$in": scoped_ids}}
    """
    if scoped_ids is None:
        return {}
    return {field: {"$in": scoped_ids}}

