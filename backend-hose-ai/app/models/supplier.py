"""
HoseMaster WMS - Supplier Model
Supplier master for purchasing and AP tracking
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric
from sqlalchemy.sql import func

from app.core.database import Base


class Supplier(Base):
    """
    Supplier Master - Data pemasok untuk pembelian
    
    Digunakan untuk:
    - Tracking hutang per supplier
    - Purchase Order management
    - Riwayat harga beli
    """
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    
    # Supplier info
    code = Column(String(20), unique=True, index=True)  # SUP-001
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(100))
    phone = Column(String(50))
    email = Column(String(100))
    address = Column(Text)
    
    # Bank info (for payment)
    bank_name = Column(String(100))
    bank_account = Column(String(50))
    bank_holder = Column(String(100))
    
    # Credit terms
    payment_term = Column(Integer, default=30)  # Jatuh tempo dalam hari
    credit_limit = Column(Numeric(15, 2), default=0)  # Max hutang ke supplier
    
    # Auto-calculated
    total_outstanding = Column(Numeric(15, 2), default=0)  # Total hutang saat ini
    total_orders = Column(Integer, default=0)
    
    # Classification
    supplier_type = Column(String(50), default='REGULAR')  # REGULAR, DISTRIBUTOR, MANUFACTURER
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Supplier {self.code}: {self.name}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "bank_name": self.bank_name,
            "bank_account": self.bank_account,
            "payment_term": self.payment_term,
            "credit_limit": float(self.credit_limit or 0),
            "total_outstanding": float(self.total_outstanding or 0),
            "total_orders": self.total_orders,
            "supplier_type": self.supplier_type,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_dict_simple(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "phone": self.phone,
            "total_outstanding": float(self.total_outstanding or 0),
        }
