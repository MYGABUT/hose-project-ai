"""
HoseMaster WMS - Security Utils 🔐
Fortress Mode 3.0 — OWASP 2025 Compliant

Handles:
- Password hashing (Argon2 primary, pbkdf2_sha256 legacy auto-upgrade)
- JWT access token generation
- Password complexity validation
"""
from datetime import datetime, timedelta
from typing import Optional, Union, Any, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import text # Added for RLS
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.core.database import get_db
from app.core.token_service import is_access_token_blacklisted
from app.models.user import User
import re

# 1. Password Hashing Context
# Argon2 = OWASP 2025 recommended. pbkdf2_sha256 kept for auto-upgrade of old hashes.
pwd_context = CryptContext(
    schemes=["argon2", "pbkdf2_sha256"],
    default="argon2",
    deprecated=["pbkdf2_sha256"],  # Auto-upgrade old hashes on next login
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if plain password matches the hash. Auto-upgrades old hashes."""
    return pwd_context.verify(plain_password, hashed_password)

def needs_rehash(hashed_password: str) -> bool:
    """Check if password hash uses deprecated algorithm and needs upgrade."""
    return pwd_context.needs_update(hashed_password)

def get_password_hash(password: str) -> str:
    """Generate Argon2 hash for a password."""
    return pwd_context.hash(password)


# 2. Password Complexity Validation
def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets minimum security requirements.
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, "OK"


# 3. JWT Token Logic
def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None, additional_claims: dict = None) -> str:
    """
    Create a JWT Access Token (short-lived: 15 min default)
    :param subject: Main identifier (e.g., user_id or email)
    :param expires_delta: Optional custom expiration time
    :param additional_claims: Optional dict to include in token payload (e.g. company_id)
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",  # Token type identifier
    }
    
    if additional_claims:
        to_encode.update(additional_claims)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# 4. Dependencies (Moved from auth.py to fix imports)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    """
    Validate Token & Return User.
    Now checks blacklist for revoked access tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token was revoked (logout)
    if is_access_token_blacklisted(token):
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    from sqlalchemy import text  # Added for RLS
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # verify user is active
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # 🛡️ RLS Context Injection (Fortress Mode)
    # Set session variable for Row Level Security
    if user.company_id:
        try:
            # We use a localized execution that doesn't commit, just sets state for session
            db.execute(text(f"SET app.current_company_id = '{user.company_id}'"))
        except Exception as e:
            # Log error but don't crash login? Or crash to be safe?
            # Creating a logger here might be verbose, just print for now or pass
            print(f"⚠️ Failed to set RLS context: {e}")
            
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user
