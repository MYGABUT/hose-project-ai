"""
HoseMaster WMS - Company Model
Defines Parent (Induk) and Subsidiary (Anak) entities.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class Company(Base):
    """
    Company Entity
    
    Represents a legal entity (PT/CV). 
    Used to distinguish assets (Owner) and physical locations (Custodian).
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., HOSE-HQ, HOSE-SBY
    name = Column(String(100), nullable=False)  # e.g., PT. Induk Sejahtera
    
    # Hierarchy
    is_parent = Column(Boolean, default=False)  # True = Induk, False = Anak
    
    # Optional: For future API separation
    api_key = Column(String(100), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    locations = relationship("StorageLocation", back_populates="company")
    owned_batches = relationship("InventoryBatch", back_populates="owner")
    users = relationship("User", back_populates="company")

    def __repr__(self):
        return f"<Company {self.code}: {self.name}>"
