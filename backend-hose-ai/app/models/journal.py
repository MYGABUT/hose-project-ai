"""
HoseMaster WMS - Journal Entry Model
Auto-generated accounting journal entries
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date
from sqlalchemy.sql import func
from decimal import Decimal

from app.core.database import Base


class JournalEntry(Base):
    """
    Journal Entry - Jurnal Akuntansi
    
    Auto-generated when:
    - Invoice created (Debit Piutang, Credit Pendapatan)
    - Payment received (Debit Kas, Credit Piutang)
    - PO received (Debit Persediaan, Credit Hutang)
    - Payment made (Debit Hutang, Credit Kas)
    """
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Entry number: JE-YYYYMM-XXX
    entry_number = Column(String(50), unique=True, nullable=False, index=True)
    entry_date = Column(Date, default=func.current_date())
    
    # Source transaction
    source_type = Column(String(50))  # INVOICE, PAYMENT_AR, PO_RECEIVE, PAYMENT_AP
    source_id = Column(Integer)
    source_number = Column(String(100))
    
    # Description
    description = Column(Text)
    
    # Amount (total debit should equal total credit)
    total_debit = Column(Numeric(15, 2), default=0)
    total_credit = Column(Numeric(15, 2), default=0)
    
    # Status
    status = Column(String(20), default='POSTED')  # DRAFT, POSTED, VOID
    
    # Audit
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    voided_at = Column(DateTime(timezone=True))
    void_reason = Column(Text)

    def __repr__(self):
        return f"<JournalEntry {self.entry_number}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "entry_number": self.entry_number,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "source_number": self.source_number,
            "description": self.description,
            "total_debit": float(self.total_debit or 0),
            "total_credit": float(self.total_credit or 0),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class JournalLine(Base):
    """Journal Entry Line - Debit/Credit entries"""
    __tablename__ = "journal_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, nullable=False, index=True)
    
    # Account
    account_code = Column(String(20))  # COA code
    account_name = Column(String(200))
    
    # Debit or Credit (one will be 0)
    debit = Column(Numeric(15, 2), default=0)
    credit = Column(Numeric(15, 2), default=0)
    
    # Description
    description = Column(Text)

    def to_dict(self):
        return {
            "id": self.id,
            "account_code": self.account_code,
            "account_name": self.account_name,
            "debit": float(self.debit or 0),
            "credit": float(self.credit or 0),
            "description": self.description,
        }


# Chart of Accounts (COA) - Simple inline definition
COA = {
    # Assets
    "1100": "Kas & Bank",
    "1200": "Piutang Usaha",
    "1300": "Persediaan",
    
    # Liabilities
    "2100": "Hutang Usaha",
    
    # Equity
    "3100": "Modal",
    
    # Revenue
    "4100": "Pendapatan Penjualan",
    
    # Expenses
    "5100": "Harga Pokok Penjualan (HPP)",
    "5200": "Biaya Operasional",
}
