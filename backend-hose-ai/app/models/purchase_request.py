"""
HoseMaster WMS - Purchase Request Model
Purchase Request with Approval Workflow

Flow: DRAFT → PENDING → APPROVED/REJECTED → (if approved) → PO Created
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class PurchaseRequest(Base):
    """
    Purchase Request (PR) - Permintaan pembelian yang perlu approval
    
    Workflow:
    1. Gudang buat PR (DRAFT)
    2. Submit untuk approval (PENDING)
    3. Bos approve/reject (APPROVED/REJECTED)
    4. Jika approved, bisa dikonversi ke PO (ORDERED)
    """
    __tablename__ = "purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # PR Info
    pr_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Supplier (opsional - bisa diisi saat konversi ke PO)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    supplier_name = Column(String(200))
    
    # Request info
    request_date = Column(Date, default=func.current_date())
    required_date = Column(Date)  # Tanggal barang dibutuhkan
    
    # Status workflow
    status = Column(String(30), default='DRAFT')  # DRAFT, PENDING, APPROVED, REJECTED, ORDERED, CANCELLED
    
    # Approval tracking
    requested_by = Column(String(100))  # Nama yang request
    requested_at = Column(DateTime(timezone=True))
    approved_by = Column(String(100))  # Nama yang approve
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)  # Alasan jika ditolak
    
    # Priority
    priority = Column(String(20), default='NORMAL')  # LOW, NORMAL, HIGH, URGENT
    
    # Estimate total (untuk approval reference)
    estimated_total = Column(Numeric(15, 2), default=0)
    
    # Notes
    notes = Column(Text)
    
    # Resulting PO (jika sudah dikonversi)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    po_number = Column(String(50))

    # Link to Sales Order (Traceability)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=True)  
    sales_order = relationship("SalesOrder", backref="purchase_requests")
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lines = relationship("PRLine", back_populates="purchase_request", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PurchaseRequest {self.pr_number}>"
    
    @property
    def can_submit(self):
        """Bisa disubmit untuk approval?"""
        return self.status == 'DRAFT' and len(self.lines) > 0
    
    @property
    def can_approve(self):
        """Bisa di-approve?"""
        return self.status == 'PENDING'
    
    @property
    def can_convert_to_po(self):
        """Bisa dikonversi ke PO?"""
        return self.status == 'APPROVED' and not self.po_id
    
    def to_dict(self):
        return {
            "id": self.id,
            "pr_number": self.pr_number,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "request_date": self.request_date.isoformat() if self.request_date else None,
            "required_date": self.required_date.isoformat() if self.required_date else None,
            "status": self.status,
            "priority": self.priority,
            "requested_by": self.requested_by,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "rejection_reason": self.rejection_reason,
            "estimated_total": float(self.estimated_total or 0),
            "notes": self.notes,
            "po_id": self.po_id,
            "po_number": self.po_number,
            "line_count": len(self.lines) if self.lines else 0,
            "can_submit": self.can_submit,
            "can_approve": self.can_approve,
            "can_convert_to_po": self.can_convert_to_po,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PRLine(Base):
    """
    PR Line Item - Detail barang yang diminta
    """
    __tablename__ = "pr_lines"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    
    # Product info
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_sku = Column(String(100))
    product_name = Column(String(200))
    
    # Request qty
    qty_requested = Column(Numeric(10, 2), default=0)
    unit = Column(String(20), default='PCS')
    
    # Estimate pricing (opsional)
    estimated_price = Column(Numeric(15, 2), default=0)
    estimated_subtotal = Column(Numeric(15, 2), default=0)
    
    # Why needed?
    reason = Column(Text)  # Alasan butuh barang ini
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    purchase_request = relationship("PurchaseRequest", back_populates="lines")

    def __repr__(self):
        return f"<PRLine {self.product_sku} x{self.qty_requested}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "pr_id": self.pr_id,
            "product_id": self.product_id,
            "product_sku": self.product_sku,
            "product_name": self.product_name,
            "qty_requested": float(self.qty_requested or 0),
            "unit": self.unit,
            "estimated_price": float(self.estimated_price or 0),
            "estimated_subtotal": float(self.estimated_subtotal or 0),
            "reason": self.reason,
        }
