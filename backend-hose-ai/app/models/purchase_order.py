"""
HoseMaster WMS - Purchase Order Model
Purchase Order with AP (Account Payable) tracking
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import POStatus


class PurchaseOrder(Base):
    """
    Purchase Order - Order pembelian ke supplier
    
    Status Flow:
    DRAFT → APPROVED → ORDERED → PARTIAL_RECEIVED → RECEIVED → PAID
    """
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # PO Info
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    supplier_name = Column(String(200))  # Denormalized for quick display
    
    # Dates
    order_date = Column(Date, default=func.current_date())
    expected_date = Column(Date)  # Tanggal harapan barang datang
    received_date = Column(Date)  # Tanggal barang diterima
    
    # Status
    status = Column(String(30), default='DRAFT')  # DRAFT, APPROVED, ORDERED, PARTIAL_RECEIVED, RECEIVED, CANCELLED
    
    # Totals
    subtotal = Column(Numeric(15, 2), default=0)
    tax = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    total = Column(Numeric(15, 2), default=0)
    
    # Payment (AP Tracking)
    payment_status = Column(String(20), default='UNPAID')  # UNPAID, PARTIAL, PAID
    amount_paid = Column(Numeric(15, 2), default=0)
    payment_due_date = Column(Date)  # Jatuh tempo pembayaran
    
    # Approval
    requested_by = Column(String(100))
    approved_by = Column(String(100))
    approved_at = Column(DateTime(timezone=True))
    
    # Notes
    notes = Column(Text)
    
    # Multi-Currency (Phase 8)
    currency = Column(String(3), default='IDR')
    exchange_rate = Column(Numeric(10, 2), default=1.0)
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lines = relationship("POLine", back_populates="purchase_order", cascade="all, delete-orphan")
    landed_costs = relationship("LandedCost", back_populates="purchase_order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="purchase_order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PurchaseOrder {self.po_number}>"
    
    @property
    def amount_due(self):
        """Sisa hutang yang belum dibayar"""
        return float(self.total or 0) - float(self.amount_paid or 0)
    
    @property
    def is_overdue(self):
        """Apakah sudah lewat jatuh tempo"""
        from datetime import date
        if self.payment_due_date and self.payment_status != 'PAID':
            return date.today() > self.payment_due_date
        return False
    
    @property
    def days_overdue(self):
        """Berapa hari keterlambatan"""
        from datetime import date
        if self.is_overdue:
            return (date.today() - self.payment_due_date).days
        return 0
    
    def to_dict(self):
        return {
            "id": self.id,
            "po_number": self.po_number,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier_name,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "expected_date": self.expected_date.isoformat() if self.expected_date else None,
            "received_date": self.received_date.isoformat() if self.received_date else None,
            "status": self.status,
            "subtotal": float(self.subtotal or 0),
            "tax": float(self.tax or 0),
            "discount": float(self.discount or 0),
            "total": float(self.total or 0),
            "payment_status": self.payment_status,
            "amount_paid": float(self.amount_paid or 0),
            "amount_due": self.amount_due,
            "payment_due_date": self.payment_due_date.isoformat() if self.payment_due_date else None,
            "is_overdue": self.is_overdue,
            "days_overdue": self.days_overdue,
            "requested_by": self.requested_by,
            "approved_by": self.approved_by,
            "notes": self.notes,
            "line_count": len(self.lines) if self.lines else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class POLine(Base):
    """
    PO Line Item - Detail barang yang dibeli
    """
    __tablename__ = "po_lines"

    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    
    # Product info
    product_id = Column(Integer, ForeignKey("products.id"))
    product_sku = Column(String(100))
    product_name = Column(String(200))
    
    # Quantity
    qty_ordered = Column(Numeric(10, 2), default=0)
    qty_received = Column(Numeric(10, 2), default=0)
    unit = Column(String(20), default='PCS')
    
    # Pricing
    unit_price = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    subtotal = Column(Numeric(15, 2), default=0)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="lines")

    def __repr__(self):
        return f"<POLine {self.product_sku} x{self.qty_ordered}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "po_id": self.po_id,
            "product_id": self.product_id,
            "product_sku": self.product_sku,
            "product_name": self.product_name,
            "qty_ordered": float(self.qty_ordered or 0),
            "qty_received": float(self.qty_received or 0),
            "unit": self.unit,
            "unit_price": float(self.unit_price or 0),
            "discount": float(self.discount or 0),
            "subtotal": float(self.subtotal or 0),
        }
