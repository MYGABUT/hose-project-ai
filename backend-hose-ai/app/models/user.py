"""
HoseMaster WMS - User Model
System users and authentication
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    # Auth
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)  # Storing hash or plain for demo
    
    # Profile
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    phone = Column(String(30))
    address = Column(String(255))
    bio = Column(String(500))
    photo = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    
    # Security: Brute Force Protection
    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(45), nullable=True)  # IPv6 max length
    
    # Metadata
    transaction_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Multi-Entity Link
    from sqlalchemy import ForeignKey
    from sqlalchemy.orm import relationship
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True) # Nullable for SuperAdmin / Induk default
    company = relationship("Company", back_populates="users")

    def to_dict(self):
        return {
            "id": self.id,  # Int ID for backend
            "uid": f"U{self.id:03d}",  # Frontend expects U001 format
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "company_id": self.company_id,
            "company_name": self.company.name if self.company else None,
            "phone": self.phone,
            "address": self.address,
            "bio": self.bio,
            "photo": self.photo,
            "isActive": self.is_active,
            "transactionCount": self.transaction_count,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
