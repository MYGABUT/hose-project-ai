"""
HoseMaster WMS - RMA Model
Return Merchandise Authorization (Customer Returns)
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.sql import func

from app.core.database import Base
import enum

class RMAStatus(str, enum.Enum):
    NEW = "new"
    RECEIVED = "received"
    INSPECTION = "inspection"
    DECIDED = "decided"
    CLOSED = "closed"

class RMARootCause(str, enum.Enum):
    ASSEMBLY_ERROR = "assembly_error"
    MATERIAL_DEFECT = "material_defect"
    CUSTOMER_MISUSE = "customer_misuse"
    OTHER = "other"

class RMASolution(str, enum.Enum):
    REPLACE = "replace"
    REFUND = "refund"
    REJECTED = "rejected"
    REPAIR = "repair"

class RMATicket(Base):
    """
    RMA Ticket - Tiket komplain/retur dari customer
    """
    __tablename__ = "rma_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, index=True) # RMA-YYYY-XXX
    
    # Customer Info
    customer_name = Column(String(200), index=True)
    invoice_number = Column(String(50))
    
    # Item Info
    product_name = Column(String(200))
    qty = Column(Integer, default=1)
    
    # Issue Details
    status = Column(Enum(RMAStatus), default=RMAStatus.NEW)
    root_cause = Column(Enum(RMARootCause), nullable=True)
    description = Column(Text, nullable=True)
    
    # For Material Defect (Vendor Impact)
    supplier_name = Column(String(200), nullable=True)
    
    # Resolution
    solution = Column(Enum(RMASolution), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.ticket_number, # Use ticket number as ID for frontend
            "db_id": self.id,
            "client": self.customer_name,
            "invoice": self.invoice_number,
            "item": self.product_name,
            "qty": self.qty,
            "status": self.status.value,
            "rootCause": self.root_cause.value if self.root_cause else None,
            "supplier": self.supplier_name,
            "solution": self.solution.value if self.solution else None,
            "createdAt": self.created_at.date().isoformat() if self.created_at else None,
            "photos": [] # Todo: Add photo table
        }
