"""
WMS Enterprise - Landed Cost Model
Allocates additional costs (shipping, tax) to purchase orders
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Text, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class LandedCost(Base):
    __tablename__ = "landed_costs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to PO
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    
    amount = Column(Numeric(15, 2), nullable=False)
    allocation_method = Column(String(20), default="VALUE") # VALUE, QTY
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(50))
    
    # Relationship
    purchase_order = relationship("PurchaseOrder", back_populates="landed_costs")

    def to_dict(self):
        return {
            "id": self.id,
            "po_id": self.po_id,
            "amount": float(self.amount),
            "allocation_method": self.allocation_method,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }
