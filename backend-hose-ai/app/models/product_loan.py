"""
HoseMaster WMS - Product Loan (Pinjam Barang) Model
Track items loaned to customers (Pinjam Pakai)
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func as sqlfunc
from app.core.database import Base


class ProductLoan(Base):
    """
    Product Loan - Peminjaman Barang
    
    Status Workflow:
    - OPEN: Barang keluar dari gudang (Stock moved to LOAN location)
    - RETURNED: Barang kembali ke gudang
    - INVOICED: Barang dibeli (Converted to Sales Invoice)
    - PARTIAL: Sebagian balik, sebagian beli
    """
    __tablename__ = "product_loans"

    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(50), unique=True, nullable=False, index=True)
    
    customer_id = Column(Integer, nullable=False)
    customer_name = Column(String(200))
    
    loan_date = Column(Date, default=sqlfunc.current_date())
    due_date = Column(Date)  # Tanggal janji kembali
    
    notes = Column(Text)
    
    type = Column(String(20), default='LOAN') # LOAN, CONSIGNMENT
    status = Column(String(20), default='OPEN')  # OPEN, RETURNED, INVOICED, PARTIAL, OVERDUE
    
    # Audit
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    updated_at = Column(DateTime(timezone=True), onupdate=sqlfunc.now())
    
    items = relationship("ProductLoanItem", back_populates="loan")

    def to_dict(self):
        return {
            "id": self.id,
            "loan_number": self.loan_number,
            "customer_name": self.customer_name,
            "loan_date": self.loan_date.isoformat() if self.loan_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "items": [i.to_dict() for i in self.items]
        }


class ProductLoanItem(Base):
    __tablename__ = "product_loan_items"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("product_loans.id"))
    
    product_id = Column(Integer)
    product_sku = Column(String(50))
    product_name = Column(String(200))
    
    qty_loaned = Column(Numeric(10, 2), default=0)
    qty_returned = Column(Numeric(10, 2), default=0)
    qty_invoiced = Column(Numeric(10, 2), default=0)
    
    batch_id = Column(Integer)  # Source batch
    
    loan = relationship("ProductLoan", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_sku": self.product_sku,
            "product_name": self.product_name,
            "qty_loaned": float(self.qty_loaned),
            "qty_returned": float(self.qty_returned),
            "qty_invoiced": float(self.qty_invoiced),
            "qty_outstanding": float(self.qty_loaned - self.qty_returned - self.qty_invoiced)
        }
