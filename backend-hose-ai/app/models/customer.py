"""
HoseMaster WMS - Customer Model
Customer master with credit limit tracking
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Customer(Base):
    """
    Customer Master - Data pelanggan dengan limit kredit
    
    Digunakan untuk:
    - Tracking piutang per customer
    - Credit limit check saat buat SO
    - Customer history
    """
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    
    # Customer info
    name = Column(String(200), nullable=False, unique=True, index=True)
    phone = Column(String(50))
    address = Column(Text)
    email = Column(String(100))
    
    # Classification
    customer_type = Column(String(50), default='RETAIL')  # RETAIL, WHOLESALE, PROJECT, VIP
    price_level = Column(String(20), default='REGULAR')   # REGULAR, DISCOUNT, SPECIAL
    
    # Credit Control
    credit_limit = Column(Numeric(15, 2), default=0)  # Limit kredit maksimal
    credit_term = Column(Integer, default=30)  # Jatuh tempo dalam hari
    
    # Sales assignment
    salesman_id = Column(Integer)  # Link to Salesman for commission & mass reassign
    salesman_name = Column(String(200))
    
    # Auto-calculated (updated by trigger/service)
    total_outstanding = Column(Numeric(15, 2), default=0)  # Total piutang saat ini
    total_orders = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_blacklisted = Column(Boolean, default=False)
    blacklist_reason = Column(Text)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    projects = relationship("Project", back_populates="customer")

    def __repr__(self):
        return f"<Customer {self.name}>"
    
    @property
    def available_credit(self):
        """Sisa kredit yang tersedia"""
        limit = float(self.credit_limit or 0)
        outstanding = float(self.total_outstanding or 0)
        return max(0, limit - outstanding)
    
    @property
    def credit_usage_percent(self):
        """Persentase penggunaan kredit"""
        limit = float(self.credit_limit or 0)
        if limit == 0:
            return 0
        outstanding = float(self.total_outstanding or 0)
        return min(100, round((outstanding / limit) * 100))
    
    @property
    def is_over_limit(self):
        """Apakah sudah melebihi limit"""
        limit = float(self.credit_limit or 0)
        outstanding = float(self.total_outstanding or 0)
        return outstanding > limit if limit > 0 else False
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "address": self.address,
            "email": self.email,
            "customer_type": self.customer_type,
            "price_level": self.price_level,
            "credit_limit": float(self.credit_limit or 0),
            "credit_term": self.credit_term,
            "total_outstanding": float(self.total_outstanding or 0),
            "available_credit": self.available_credit,
            "credit_usage_percent": self.credit_usage_percent,
            "is_over_limit": self.is_over_limit,
            "total_orders": self.total_orders,
            "is_active": self.is_active,
            "is_blacklisted": self.is_blacklisted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_dict_simple(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "credit_limit": float(self.credit_limit or 0),
            "total_outstanding": float(self.total_outstanding or 0),
            "available_credit": self.available_credit,
            "is_over_limit": self.is_over_limit,
        }
