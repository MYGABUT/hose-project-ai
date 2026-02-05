"""
HoseMaster WMS - Petty Cash (Kas Kecil) Model
Track small operational expenses
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date
from sqlalchemy.sql import func
from decimal import Decimal

from app.core.database import Base


class PettyCashTransaction(Base):
    """
    Petty Cash Transaction - Kas Kecil
    
    For recording small operational expenses:
    - Bensin
    - Parkir
    - Uang kuli bongkar muat
    - Keamanan lingkungan
    - Snack meeting
    """
    __tablename__ = "petty_cash_transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Transaction info
    transaction_number = Column(String(50), unique=True, nullable=False, index=True)  # PC-YYYYMM-XXX
    transaction_date = Column(Date, default=func.current_date())
    
    # Type
    transaction_type = Column(String(20), default='OUT')  # IN (Top-up), OUT (Expense)
    
    # Category
    category = Column(String(50))  # TRANSPORT, SUPPLIES, LABOR, SECURITY, MEALS, OTHER
    
    # Amount
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Description
    description = Column(Text, nullable=False)
    recipient = Column(String(200))  # Siapa yang terima/bayar
    
    # Balance tracking
    balance_before = Column(Numeric(15, 2))
    balance_after = Column(Numeric(15, 2))
    
    # Approval
    approved_by = Column(String(100))
    
    # Receipt
    receipt_number = Column(String(100))
    has_receipt = Column(String(10), default='NO')  # YES, NO
    
    # Audit
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_number": self.transaction_number,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "transaction_type": self.transaction_type,
            "category": self.category,
            "amount": float(self.amount or 0),
            "description": self.description,
            "recipient": self.recipient,
            "balance_after": float(self.balance_after or 0),
            "has_receipt": self.has_receipt,
            "created_by": self.created_by,
        }


class PettyCashBalance(Base):
    """Track current petty cash balance"""
    __tablename__ = "petty_cash_balance"

    id = Column(Integer, primary_key=True, index=True)
    current_balance = Column(Numeric(15, 2), default=0)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(String(100))
