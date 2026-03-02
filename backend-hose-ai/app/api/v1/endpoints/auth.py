"""
HoseMaster WMS - Authentication API 🛡️
Fortress Mode 3.0 - OWASP API Security 2025 Compliant

Security Features:
- Account Lockout (5 failed attempts = 15 min lock)
- Rate Limiting (5 login attempts/min per IP via slowapi)
- JWT Refresh Token Rotation (with theft detection)
- Argon2 Password Hashing (auto-upgrade from legacy)
- IP Tracking & Audit Logging
- Instant Logout / Logout-All
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token, needs_rehash, get_password_hash, get_current_user, oauth2_scheme
from app.core.rate_limiter import limiter, RATE_AUTH
from app.core.token_service import (
    create_refresh_token,
    rotate_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    blacklist_access_token,
    is_access_token_blacklisted,
)
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("auth.security")

# Constants
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

# Defined here so it can be imported by other modules (Dependency)
# oauth2_scheme moved to app.core.security


# ============ Schemas ============

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str


# ============ Dependencies ============

# get_current_user moved to app.core.security


# ============ Internal Helpers ============

def _check_account_locked(user: User) -> bool:
    """Check if account is currently locked due to brute-force attempts."""
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        return True
    return False


def _record_failed_login(user: User, db: Session, client_ip: str):
    """Increment failed login counter and optionally lock account."""
    user.failed_login_count = (user.failed_login_count or 0) + 1
    user.last_login_ip = client_ip
    
    if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        logger.warning(
            f"🔒 ACCOUNT LOCKED | User={user.email} | IP={client_ip} | "
            f"Attempts={user.failed_login_count} | Locked for {LOCKOUT_DURATION_MINUTES}min"
        )
    else:
        logger.warning(
            f"⚠️ FAILED LOGIN | User={user.email} | IP={client_ip} | "
            f"Attempt {user.failed_login_count}/{MAX_FAILED_ATTEMPTS}"
        )
    
    db.commit()


def _record_successful_login(user: User, db: Session, client_ip: str):
    """Reset failed counter and update last login info."""
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = client_ip
    db.commit()


def _build_token_claims(user: User) -> dict:
    """Build additional JWT claims for a user."""
    return {
        "cid": user.company_id,
        "role": user.role,
        "uid": user.id,
    }


# ============================================================
# 1. LOGIN — Dual Token Response
# ============================================================

@router.post("/login", response_model=dict)
@limiter.limit(RATE_AUTH)
def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    🔐 Login endpoint with Brute-Force Protection.
    Returns JWT Access Token + Refresh Token.
    Locks account after 5 failed attempts for 15 minutes.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Step 1: Find User
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        logger.warning(f"🚫 LOGIN ATTEMPT | Unknown User={form_data.username} | IP={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Step 2: Check if account is locked
    if _check_account_locked(user):
        remaining = (user.locked_until - datetime.now(timezone.utc)).seconds // 60
        logger.warning(f"🔒 LOCKED LOGIN ATTEMPT | User={user.email} | IP={client_ip}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining + 1} minutes.",
        )
    
    # Step 3: Verify password
    if not verify_password(form_data.password, user.password):
        _record_failed_login(user, db, client_ip)
        
        attempts_left = MAX_FAILED_ATTEMPTS - (user.failed_login_count or 0)
        detail = "Incorrect email or password"
        if attempts_left <= 2 and attempts_left > 0:
            detail += f". Warning: {attempts_left} attempts remaining before lockout."
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Step 4: Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your administrator.",
        )
    
    # Step 5: Auto-upgrade legacy password hash (pbkdf2 → Argon2)
    if needs_rehash(user.password):
        user.password = get_password_hash(form_data.password)
        logger.info(f"🔄 PASSWORD HASH UPGRADED | User={user.email} (pbkdf2 → argon2)")
    
    # Step 6: Successful Login!
    _record_successful_login(user, db, client_ip)
    
    # Generate Access Token (short-lived: 15 min)
    access_token = create_access_token(
        subject=user.email,
        additional_claims=_build_token_claims(user),
    )
    
    # Generate Refresh Token (long-lived: 7 days)
    raw_refresh, _ = create_refresh_token(
        user_id=user.id,
        db=db,
        client_ip=client_ip,
        user_agent=user_agent,
    )
    
    logger.info(f"✅ LOGIN SUCCESS | User={user.email} | IP={client_ip}")
    
    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": user.company.name if user.company else None
        }
    }


# ============================================================
# 2. REFRESH — Token Rotation
# ============================================================

@router.post("/refresh", response_model=dict)
def refresh_access_token(
    data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    🔄 Refresh Token Rotation
    
    - Invalidates old refresh token
    - Issues new access token + new refresh token
    - Detects token reuse (theft) and revokes entire session family
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    try:
        new_raw_refresh, _, user_id = rotate_refresh_token(
            raw_token=data.refresh_token,
            db=db,
            client_ip=client_ip,
            user_agent=user_agent,
        )
    except ValueError as e:
        logger.warning(f"🚫 REFRESH FAILED | IP={client_ip} | Reason={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    
    # Get user for claims
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )
    
    # Issue new access token
    access_token = create_access_token(
        subject=user.email,
        additional_claims=_build_token_claims(user),
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_raw_refresh,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ============================================================
# 3. LOGOUT — Revoke Current Session
# ============================================================

@router.post("/logout")
def logout(
    data: LogoutRequest,
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    🚪 Logout — Revoke current session.
    
    - Blacklists the current access token
    - Revokes the refresh token
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # Blacklist access token (instant effect)
    blacklist_access_token(token)
    
    # Revoke refresh token
    revoke_refresh_token(data.refresh_token, db)
    
    logger.info(f"🚪 LOGOUT | IP={client_ip}")
    
    return {"status": "success", "message": "Logged out successfully"}


# ============================================================
# 4. LOGOUT ALL — Panic Button
# ============================================================

@router.post("/logout-all")
def logout_all_sessions(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    🔒 Logout All Sessions — Revoke ALL refresh tokens for this user.
    
    Use when:
    - User suspects account compromise
    - Admin forces re-authentication
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # Blacklist current access token
    blacklist_access_token(token)
    
    # Revoke ALL refresh tokens
    count = revoke_all_user_tokens(current_user.id, db)
    
    logger.warning(f"🔒 LOGOUT ALL | User={current_user.email} | IP={client_ip} | Revoked={count}")
    
    return {
        "status": "success",
        "message": f"All {count} active sessions have been revoked.",
    }
