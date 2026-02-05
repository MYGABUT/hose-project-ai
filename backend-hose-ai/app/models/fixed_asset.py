"""
HoseMaster WMS - Fixed Assets Model
Asset management with depreciation calculation
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from decimal import Decimal
from datetime import date

from app.core.database import Base


class FixedAsset(Base):
    """
    Fixed Asset - Aktiva Tetap
    
    Tracks company assets like:
    - Mesin Crimping
    - Mesin Potong
    - Kendaraan Operasional
    - Komputer
    """
    __tablename__ = "fixed_assets"

    id = Column(Integer, primary_key=True, index=True)
    
    # Asset identification
    asset_number = Column(String(50), unique=True, nullable=False, index=True)  # AST-001
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Category
    category = Column(String(50))  # MACHINE, VEHICLE, COMPUTER, FURNITURE, BUILDING
    location = Column(String(100))
    
    # Purchase info
    purchase_date = Column(Date, nullable=False)
    purchase_value = Column(Numeric(15, 2), nullable=False)
    supplier = Column(String(200))
    invoice_number = Column(String(100))
    
    # Depreciation settings
    useful_life_months = Column(Integer, default=60)  # Default 5 years
    salvage_value = Column(Numeric(15, 2), default=0)  # Nilai residu
    depreciation_method = Column(String(20), default='STRAIGHT_LINE')
    
    # Current values (updated monthly)
    accumulated_depreciation = Column(Numeric(15, 2), default=0)
    current_book_value = Column(Numeric(15, 2))  # = purchase_value - accumulated
    
    # Status
    status = Column(String(20), default='ACTIVE')  # ACTIVE, DISPOSED, SOLD
    disposed_date = Column(Date)
    disposed_value = Column(Numeric(15, 2))
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<FixedAsset {self.asset_number}: {self.name}>"
    
    @property
    def monthly_depreciation(self):
        """Calculate monthly depreciation (straight-line method)"""
        if self.useful_life_months <= 0:
            return 0
        depreciable_amount = float(self.purchase_value or 0) - float(self.salvage_value or 0)
        return depreciable_amount / self.useful_life_months
    
    @property
    def age_months(self):
        """Calculate asset age in months"""
        if not self.purchase_date:
            return 0
        today = date.today()
        return (today.year - self.purchase_date.year) * 12 + (today.month - self.purchase_date.month)
    
    def to_dict(self):
        return {
            "id": self.id,
            "asset_number": self.asset_number,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "location": self.location,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "purchase_value": float(self.purchase_value or 0),
            "useful_life_months": self.useful_life_months,
            "salvage_value": float(self.salvage_value or 0),
            "accumulated_depreciation": float(self.accumulated_depreciation or 0),
            "current_book_value": float(self.current_book_value or 0),
            "monthly_depreciation": self.monthly_depreciation,
            "age_months": self.age_months,
            "status": self.status,
            "depreciation_method": self.depreciation_method
        }


class DepreciationEntry(Base):
    """Monthly depreciation journal entry"""
    __tablename__ = "depreciation_entries"

    id = Column(Integer, primary_key=True, index=True)
    
    asset_id = Column(Integer, nullable=False, index=True)
    
    # Period
    period_year = Column(Integer, nullable=False)
    period_month = Column(Integer, nullable=False)
    
    # Amount
    depreciation_amount = Column(Numeric(15, 2), nullable=False)
    book_value_before = Column(Numeric(15, 2))
    book_value_after = Column(Numeric(15, 2))
    
    # Status
    is_posted = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True))
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "period": f"{self.period_year}-{self.period_month:02d}",
            "depreciation_amount": float(self.depreciation_amount or 0),
            "book_value_before": float(self.book_value_before or 0),
            "book_value_after": float(self.book_value_after or 0),
            "is_posted": self.is_posted
        }
