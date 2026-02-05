"""
WMS Enterprise - Payment Model
Tracks payments for Purchase Orders
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to PO
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    
    amount = Column(Numeric(15, 2), nullable=False)
    payment_date = Column(Date, default=func.current_date())
    payment_method = Column(String(50)) # Bank Transfer, Cash, Giro
    
    # Multi-Currency
    exchange_rate = Column(Numeric(10, 2), default=1.0) # Rate at moment of payment
    realized_gain_loss = Column(Numeric(15, 2), default=0) # (Payment Rate - PO Rate) * Amount
    
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(50))
    
    # Relationship
    purchase_order = relationship("PurchaseOrder", back_populates="payments")

    def to_dict(self):
        return {
            "id": self.id,
            "po_id": self.po_id,
            "amount": float(self.amount),
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "payment_method": self.payment_method,
            "exchange_rate": float(self.exchange_rate or 1),
            "realized_gain_loss": float(self.realized_gain_loss or 0),
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }
