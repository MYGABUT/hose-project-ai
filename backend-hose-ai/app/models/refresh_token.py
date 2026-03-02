"""
RefreshToken Model — Fortress Mode 3.0
Stores refresh tokens for JWT rotation & revocation.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    
    # Token identity
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    
    # Owner
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", backref="refresh_tokens")
    
    # Security metadata
    client_ip = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Lifecycle
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Family tracking (for rotation theft detection)
    family_id = Column(String(36), nullable=False, index=True)
