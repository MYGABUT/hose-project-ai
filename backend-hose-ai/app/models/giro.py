"""
HoseMaster WMS - Giro Mundur (Post-Dated Cheque) Model
Track post-dated cheques with status workflow
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date, Boolean
from sqlalchemy.sql import func
from decimal import Decimal
from datetime import date

from app.core.database import Base


class Giro(Base):
    """
    Giro Mundur - Bilyet Giro (Post-Dated Cheque)
    
    Workflow:
    1. Diterima dari customer → Status: RECEIVED
    2. Disetorkan ke bank → Status: DEPOSITED
    3. Jatuh tempo & cair → Status: CLEARED (Potong piutang)
    4. Tolak (bounced) → Status: BOUNCED (Piutang muncul lagi)
    """
    __tablename__ = "giros"

    id = Column(Integer, primary_key=True, index=True)
    
    # Giro Info
    giro_number = Column(String(50), unique=True, nullable=False, index=True)
    bank_name = Column(String(100))  # Mandiri, BCA, BRI, etc
    account_number = Column(String(50))
    account_name = Column(String(200))
    
    # Amount
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Dates
    received_date = Column(Date, default=func.current_date())  # Tanggal terima
    due_date = Column(Date, nullable=False)  # Tanggal jatuh tempo
    deposited_date = Column(Date)  # Tanggal setor ke bank
    cleared_date = Column(Date)  # Tanggal cair
    bounced_date = Column(Date)  # Tanggal tolak
    
    # Customer
    customer_id = Column(Integer)
    customer_name = Column(String(200))
    
    # Link to Invoice/Payment
    invoice_id = Column(Integer)
    invoice_number = Column(String(50))
    
    # Status
    status = Column(String(20), default='RECEIVED')  # RECEIVED, DEPOSITED, CLEARED, BOUNCED
    
    # For bounced giro
    bounce_reason = Column(Text)
    bounce_fee = Column(Numeric(15, 2), default=0)
    
    # Notes
    notes = Column(Text)
    
    # Audit
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Giro {self.giro_number} - {self.status}>"
    
    @property
    def is_overdue(self):
        """Check if giro is past due date but not yet cleared/bounced"""
        if self.status in ['RECEIVED', 'DEPOSITED']:
            return date.today() > self.due_date if self.due_date else False
        return False
    
    @property
    def days_until_due(self):
        """Days until due date, negative if overdue"""
        if self.due_date:
            return (self.due_date - date.today()).days
        return 0
    
    def to_dict(self):
        return {
            "id": self.id,
            "giro_number": self.giro_number,
            "bank_name": self.bank_name,
            "account_number": self.account_number,
            "account_name": self.account_name,
            "amount": float(self.amount or 0),
            "received_date": self.received_date.isoformat() if self.received_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "deposited_date": self.deposited_date.isoformat() if self.deposited_date else None,
            "cleared_date": self.cleared_date.isoformat() if self.cleared_date else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice_number,
            "status": self.status,
            "is_overdue": self.is_overdue,
            "days_until_due": self.days_until_due,
            "bounce_reason": self.bounce_reason,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
