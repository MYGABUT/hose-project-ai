"""
HoseMaster WMS - User Management API
CRUD for Users and Authentication (Simple)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.user import User


from app.core.security import get_current_user

router = APIRouter(
    prefix="/users", 
    tags=["Users & Auth"]
    # We don't add dependencies here because /login must be public
)


# ============ Schemas ============

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    uid: str
    name: str
    email: str
    role: str
    isActive: bool
    transactionCount: int
    
    class Config:
        from_attributes = True


# ============ Endpoints ============

from app.core.security import verify_password

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    🔑 Secured Login (Hash Verification)
    """
    user = db.query(User).filter(
        User.email == data.email, 
        User.is_active == True,
        User.is_deleted == False
    ).first()
    
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    # Update login time (simulated)
    # user.last_login = datetime.now()
    # db.commit()
    
    # Log Activity
    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=user,
            action="LOGIN",
            entity_type="User",
            entity_id=user.id,
            details=f"User {user.name} logged in",
            module="Auth"
        )
    except Exception as e:
        print(f"Log Error: {e}")

    # Generate Token
    from app.core.security import create_access_token
    from datetime import timedelta
    from app.core.config import settings
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    additional_claims = {
        "cid": user.company_id,
        "role": user.role,
        "uid": user.id
    }
    
    access_token = create_access_token(
        subject=user.email,
        expires_delta=access_token_expires,
        additional_claims=additional_claims
    )

    return {
        "status": "success",
        "message": "Login berhasil",
        "access_token": access_token,
        "data": user.to_dict()
    }

@router.get("")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    search: Optional[str] = None,
    role: Optional[str] = None,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    📋 List users
    """
    query = db.query(User).filter(
        User.is_deleted == False,
        User.role != "developer" # Hide developer accounts from Management
    )
    
    if active_only:
        query = query.filter(User.is_active == True)
        
    if role:
        query = query.filter(User.role == role)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
        
    total = query.count()
    users = query.order_by(User.name).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [u.to_dict() for u in users]
    }

@router.post("")
def create_user(data: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    ➕ Create new user
    """
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        
    user = User(
        name=data.name,
        email=data.email,
        password=data.password,
        role=data.role,
        phone=data.phone,
        address=data.address,
        bio=data.bio,
        is_active=True,
        is_deleted=False
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=None, # System / Admin
            action="CREATE",
            entity_type="User",
            entity_id=user.id,
            details=f"Created user {user.name} ({user.email})",
            new_values=user.to_dict(),
            module="User Management"
        )
    except:
        pass

    return {
        "status": "success",
        "message": f"User {user.name} berhasil dibuat",
        "data": user.to_dict()
    }

@router.get("/{user_id}")
def get_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    🔍 Get user details
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    return {
        "status": "success",
        "data": user.to_dict()
    }

@router.put("/{user_id}")
def update_user(user_id: int, data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    ✏️ Update user
    """
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.commit()
    db.refresh(user)
    
    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=None, # System / Admin
            action="UPDATE",
            entity_type="User",
            entity_id=user.id,
            details=f"Updated user {user.name}",
            new_values=update_data,
            module="User Management"
        )
    except:
        pass

    return {
        "status": "success",
        "message": "User berhasil diupdate",
        "data": user.to_dict()
    }

@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    🗑️ Soft delete user
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    user.is_deleted = True
    user.is_active = False
    db.commit()

    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=None,
            action="DELETE",
            entity_type="User",
            entity_id=user_id,
            details=f"Deleted user ID {user_id}",
            module="User Management"
        )
    except:
        pass
    
    return {
        "status": "success",
        "message": "User berhasil dihapus"
    }
