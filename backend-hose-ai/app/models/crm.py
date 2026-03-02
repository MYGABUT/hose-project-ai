"""
WMS Enterprise - CRM Model
Customer Relationship Management for Lead Tracking
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class LeadStatus(str, enum.Enum):
    """Kanban Status Columns for CRM"""
    PROSPECT = "PROSPECT"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"


class CRMLead(Base):
    """
    CRM Lead Tracking Model
    Tracks potential sales opportunities
    """
    __tablename__ = "crm_leads"

    id = Column(Integer, primary_key=True, index=True)
    
    # Lead Core Info
    title = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=False)
    contact_person = Column(String(100))
    contact_email = Column(String(100))
    contact_phone = Column(String(50))
    
    # Financials
    estimated_value = Column(Float, default=0.0)
    
    # Kanban Flow
    status = Column(Enum(LeadStatus, native_enum=False), default=LeadStatus.PROSPECT, index=True)
    
    # Sales Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Audit
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    assigned_to = relationship("User")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "company_name": self.company_name,
            "contact_person": self.contact_person,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "estimated_value": self.estimated_value,
            "status": self.status.value if self.status else "PROSPECT",
            "assigned_to": self.assigned_to.email if self.assigned_to else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
