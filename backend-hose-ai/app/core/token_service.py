"""
Token Service — Fortress Mode 3.0 🔐
JWT Refresh Token Rotation & Revocation Engine.

Security Features:
- Dual-token system (short access + long refresh)
- Automatic rotation on refresh
- Token family tracking (theft detection)
- Instant revocation (logout / logout-all)
"""
import uuid
import hashlib
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.config import settings
from app.models.refresh_token import RefreshToken

logger = logging.getLogger("auth.tokens")


# ============ In-Memory Access Token Blacklist ============
# For instant logout. Access tokens are short-lived (15 min),
# so keeping them in memory is efficient.
# Future: Replace with Redis for distributed deployments.
_access_token_blacklist: set = set()


def blacklist_access_token(token: str):
    """Add an access token to the blacklist (instant revocation)."""
    _access_token_blacklist.add(token)


def is_access_token_blacklisted(token: str) -> bool:
    """Check if an access token has been revoked."""
    return token in _access_token_blacklist


def cleanup_blacklist():
    """Remove expired tokens from blacklist to prevent memory leak."""
    now = datetime.now(timezone.utc)
    to_remove = set()
    for token in _access_token_blacklist:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            if exp < now:
                to_remove.add(token)
        except JWTError:
            to_remove.add(token)
    _access_token_blacklist -= to_remove


# ============ Refresh Token Logic ============

def _hash_token(raw_token: str) -> str:
    """Hash refresh token for storage (never store raw tokens)."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def create_refresh_token(
    user_id: int,
    db: Session,
    client_ip: str = "unknown",
    user_agent: str = "unknown",
    family_id: Optional[str] = None,
) -> Tuple[str, RefreshToken]:
    """
    Generate a new refresh token and store it in the database.
    
    Returns:
        Tuple of (raw_token_string, RefreshToken_db_object)
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = _hash_token(raw_token)
    
    if not family_id:
        family_id = str(uuid.uuid4())
    
    refresh_token = RefreshToken(
        token_hash=token_hash,
        user_id=user_id,
        client_ip=client_ip,
        user_agent=user_agent[:500] if user_agent else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        family_id=family_id,
    )
    
    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)
    
    logger.info(f"🔑 REFRESH TOKEN CREATED | User={user_id} | Family={family_id} | IP={client_ip}")
    
    return raw_token, refresh_token


def rotate_refresh_token(
    raw_token: str,
    db: Session,
    client_ip: str = "unknown",
    user_agent: str = "unknown",
) -> Tuple[str, RefreshToken, int]:
    """
    Rotate a refresh token: invalidate old one, issue new one.
    
    Returns:
        Tuple of (new_raw_token, new_RefreshToken, user_id)
    
    Raises:
        ValueError: If token is invalid, expired, revoked, or reused (theft).
    """
    token_hash = _hash_token(raw_token)
    
    # Find the token
    existing = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash
    ).first()
    
    if not existing:
        raise ValueError("Invalid refresh token")
    
    # Check if already revoked (THEFT DETECTION!)
    if existing.is_revoked:
        # Someone is reusing a rotated token = token was stolen!
        # Revoke ALL tokens in this family
        logger.warning(
            f"🚨 TOKEN REUSE DETECTED! Family={existing.family_id} | "
            f"User={existing.user_id} | IP={client_ip} — Revoking ALL family tokens!"
        )
        _revoke_token_family(existing.family_id, db)
        raise ValueError("Token reuse detected. All sessions revoked for security.")
    
    # Check expiry
    if existing.expires_at < datetime.now(timezone.utc):
        existing.is_revoked = True
        existing.revoked_at = datetime.now(timezone.utc)
        db.commit()
        raise ValueError("Refresh token expired")
    
    # Revoke old token
    existing.is_revoked = True
    existing.revoked_at = datetime.now(timezone.utc)
    
    # Issue new token in same family
    new_raw, new_token = create_refresh_token(
        user_id=existing.user_id,
        db=db,
        client_ip=client_ip,
        user_agent=user_agent,
        family_id=existing.family_id,
    )
    
    logger.info(
        f"🔄 TOKEN ROTATED | User={existing.user_id} | "
        f"Family={existing.family_id} | IP={client_ip}"
    )
    
    return new_raw, new_token, existing.user_id


def revoke_refresh_token(raw_token: str, db: Session) -> bool:
    """Revoke a single refresh token (logout)."""
    token_hash = _hash_token(raw_token)
    token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.is_revoked == False,
    ).first()
    
    if token:
        token.is_revoked = True
        token.revoked_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"🚪 TOKEN REVOKED | User={token.user_id}")
        return True
    return False


def revoke_all_user_tokens(user_id: int, db: Session) -> int:
    """Revoke ALL refresh tokens for a user (logout-all / panic button)."""
    count = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked == False,
    ).update({
        "is_revoked": True,
        "revoked_at": datetime.now(timezone.utc),
    })
    db.commit()
    logger.warning(f"🔒 ALL TOKENS REVOKED | User={user_id} | Count={count}")
    return count


def _revoke_token_family(family_id: str, db: Session):
    """Revoke all tokens in a family (theft response)."""
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id,
    ).update({
        "is_revoked": True,
        "revoked_at": datetime.now(timezone.utc),
    })
    db.commit()
