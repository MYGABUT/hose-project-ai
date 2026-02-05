"""
HoseMaster WMS - Salesman & Commission Model
Sales performance tracking with commission calculation
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date, Boolean
from sqlalchemy.sql import func
from decimal import Decimal

from app.core.database import Base


class Salesman(Base):
    """
    Salesman - Data Sales
    
    Tracks:
    - Target penjualan
    - Komisi rate
    - Customer assignment
    """
    __tablename__ = "salesmen"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    code = Column(String(20), unique=True, nullable=False, index=True)  # SLS-001
    name = Column(String(200), nullable=False)
    phone = Column(String(30))
    email = Column(String(100))
    
    # Commission settings
    commission_rate = Column(Numeric(5, 2), default=5)  # 5% default
    commission_type = Column(String(20), default='ON_PAID')  # ON_DELIVERY or ON_PAID
    
    # Target
    monthly_target = Column(Numeric(15, 2), default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    join_date = Column(Date)
    resign_date = Column(Date)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "commission_rate": float(self.commission_rate or 0),
            "commission_type": self.commission_type,
            "monthly_target": float(self.monthly_target or 0),
            "is_active": self.is_active,
        }


class SalesCommission(Base):
    """
    Sales Commission - Catatan Komisi
    
    Generated when:
    - ON_DELIVERY: Invoice terkirim
    - ON_PAID: Invoice lunas
    """
    __tablename__ = "sales_commissions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Salesman
    salesman_id = Column(Integer, nullable=False, index=True)
    salesman_name = Column(String(200))
    
    # Source
    invoice_id = Column(Integer)
    invoice_number = Column(String(50))
    customer_name = Column(String(200))
    
    # Period
    period_year = Column(Integer)
    period_month = Column(Integer)
    
    # Amounts
    sales_amount = Column(Numeric(15, 2), default=0)  # Total penjualan
    commission_rate = Column(Numeric(5, 2), default=0)
    commission_amount = Column(Numeric(15, 2), default=0)
    
    # Status
    status = Column(String(20), default='PENDING')  # PENDING, PAID
    paid_date = Column(Date)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "salesman_name": self.salesman_name,
            "invoice_number": self.invoice_number,
            "customer_name": self.customer_name,
            "period": f"{self.period_year}-{self.period_month:02d}" if self.period_year else None,
            "sales_amount": float(self.sales_amount or 0),
            "commission_rate": float(self.commission_rate or 0),
            "commission_amount": float(self.commission_amount or 0),
            "status": self.status,
        }
