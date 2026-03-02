"""
HoseMaster WMS - Inter-Company (B2B) Loan Model
Track items loaned between internal branches or external partners.
Supports Inbound/Outbound workflows and approval sync.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func as sqlfunc
from app.core.database import Base


class InterCompanyLoan(Base):
    """
    Inter-Company Loan - Pinjaman Barang B2B (Konsinyasi/Titipan antar Pabrik)
    
    Status Workflow:
    - PENDING_APPROVAL: Dibuat oleh peminjam (lending company), menunggu ACC oleh penerima (borrowing company)
    - APPROVED: Disetujui, fisik barang ditambahkan ke gudang penerima (hak milik tetap peminjam)
    - REJECTED: Ditolak oleh penerima
    - RETURNED: Semua barang sisa/tidak laku sudah dikembalikan
    - CLOSED: Semua sisa selesai (dikembalikan/ditagihkan)
    """
    __tablename__ = "intercompany_loans"

    id = Column(Integer, primary_key=True, index=True)
    loan_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Perusahaan yang meminjamkan (Lender)
    from_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Perusahaan yang meminjam/menerima (Borrower)
    to_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    loan_date = Column(Date, default=sqlfunc.current_date())
    due_date = Column(Date)  # Batas waktu konsinyasi/peminjaman
    
    notes = Column(Text)
    
    status = Column(String(20), default='PENDING_APPROVAL') # PENDING_APPROVAL, APPROVED, REJECTED, RETURNED, CLOSED
    
    # Audit
    created_by = Column(String(100))
    approved_by = Column(String(100))
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    updated_at = Column(DateTime(timezone=True), onupdate=sqlfunc.now())
    
    # Relationships
    from_company = relationship("Company", foreign_keys=[from_company_id])
    to_company = relationship("Company", foreign_keys=[to_company_id])
    items = relationship("InterCompanyLoanItem", back_populates="loan", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "loan_number": self.loan_number,
            "from_company_id": self.from_company_id,
            "from_company_name": self.from_company.name if self.from_company else None,
            "to_company_id": self.to_company_id,
            "to_company_name": self.to_company.name if self.to_company else None,
            "loan_date": self.loan_date.isoformat() if self.loan_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "status": self.status,
            "notes": self.notes,
            "created_by": self.created_by,
            "approved_by": self.approved_by,
            "items": [i.to_dict() for i in self.items] if self.items else []
        }


class InterCompanyLoanItem(Base):
    """
    Detail Item Peminjaman Antar Perusahaan
    Mencatat kuantitas dipinjam, laku terjual (sold), dan dikembalikan (returned).
    """
    __tablename__ = "intercompany_loan_items"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("intercompany_loans.id", ondelete="CASCADE"), index=True)
    
    product_id = Column(Integer, ForeignKey("products.id"))
    product_sku = Column(String(50))
    product_name = Column(String(200))
    
    # Kuantitas
    qty_loaned = Column(Numeric(10, 2), default=0)
    qty_returned = Column(Numeric(10, 2), default=0) # Balik ke Lender
    qty_sold = Column(Numeric(10, 2), default=0)     # Laku terjual di pihak Borrower
    
    # Batch tracking
    source_batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=True)
    
    # Auto Set
    loan = relationship("InterCompanyLoan", back_populates="items")
    product = relationship("Product")
    source_batch = relationship("InventoryBatch")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_sku": self.product_sku,
            "product_name": self.product_name,
            "qty_loaned": float(self.qty_loaned or 0),
            "qty_returned": float(self.qty_returned or 0),
            "qty_sold": float(self.qty_sold or 0),
            "qty_outstanding": float((self.qty_loaned or 0) - (self.qty_returned or 0) - (self.qty_sold or 0)),
            "source_batch_id": self.source_batch_id
        }
