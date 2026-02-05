"""
HoseMaster WMS - Stock Booking Model
Reserve stock for sales or internal use
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func as sqlfunc
from app.core.database import Base


class StockBooking(Base):
    """
    Stock Booking - Booking Stok
    
    Prevents other sales from selling this stock.
    Available Stock = Physical Stock - Booked Stock
    """
    __tablename__ = "stock_bookings"

    id = Column(Integer, primary_key=True, index=True)
    
    booking_type = Column(String(20), default='SALES') # SALES, TECHNICAL
    
    # Booker
    booked_by_id = Column(Integer) # Salesman ID or User ID
    booked_by_name = Column(String(200)) # "Sales A"
    
    customer_name = Column(String(200)) # Reserved for whom
    
    # Item
    product_id = Column(Integer, nullable=False)
    batch_id = Column(Integer, nullable=False)
    
    qty = Column(Numeric(10, 2), nullable=False)
    
    expiry_date = Column(DateTime) # Auto-release if not processed
    
    notes = Column(Text)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())

    def to_dict(self):
        return {
            "id": self.id,
            "booking_type": self.booking_type,
            "booked_by_name": self.booked_by_name,
            "customer_name": self.customer_name,
            "qty": float(self.qty),
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "notes": self.notes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
        }
