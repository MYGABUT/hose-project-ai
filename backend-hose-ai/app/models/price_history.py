"""
HoseMaster WMS - Price History Model
Track HPP and Selling Price changes
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class PriceChangeType(str, enum.Enum):
    MANUAL = "manual"
    BULK = "bulk"
    IMPORT = "import"

class PriceHistory(Base):
    """
    Price Change Log
    Tracks who changed what product price and why
    """
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    
    # Financials
    old_base_price = Column(Float)
    new_base_price = Column(Float)
    old_sell_price = Column(Float)
    new_sell_price = Column(Float)
    
    # Audit
    change_type = Column(Enum(PriceChangeType), default=PriceChangeType.MANUAL)
    reason = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(100)) # User ID or Name
    
    # Relationships
    product = relationship("Product", backref="price_history")
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "date": self.created_at.date().isoformat() if self.created_at else None,
            "old_price": self.new_base_price, # Simplify for UI for now
            "price": self.new_base_price,
            "reason": self.reason,
            "type": self.change_type.value,
            "by": self.created_by
        }
