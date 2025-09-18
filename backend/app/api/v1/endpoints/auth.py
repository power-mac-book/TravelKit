from typing import Any
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.models.schemas import UserCreate, User as UserSchema
from app.models.models import Traveler

router = APIRouter()
security = HTTPBearer()


# Dependency to get current user from token
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Traveler:
    """Get current authenticated user"""
    service = AuthService(db)
    user = service.get_current_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return user


# Dependency to get current admin user
def get_current_admin_user(current_user: Traveler = Depends(get_current_user)) -> Traveler:
    """Get current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


@router.post("/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Admin login endpoint"""
    service = AuthService(db)
    user = service.authenticate_user(email, password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    access_token_expires = timedelta(minutes=60 * 24 * 7)  # 7 days
    access_token = service.create_access_token(
        data={"sub": user.email, "admin": True},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_admin": user.is_admin
        }
    }


@router.post("/create-admin", response_model=UserSchema)
def create_admin(
    user_data: UserCreate,
    db: Session = Depends(get_db)
) -> Traveler:
    """Create admin user (for setup only)"""
    service = AuthService(db)
    
    # Check if admin already exists
    existing_user = service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return service.create_admin_user(user_data)


@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: Traveler = Depends(get_current_user)) -> Traveler:
    """Get current user info"""
    return current_user


@router.get("/admin/verify")
def verify_admin(current_admin: Traveler = Depends(get_current_admin_user)) -> dict[str, Any]:
    """Verify admin access"""
    return {
        "message": "Admin access verified",
        "user": {
            "id": current_admin.id,
            "email": current_admin.email,
            "name": current_admin.name,
            "is_admin": current_admin.is_admin
        }
    }