"""
HoseMaster WMS - Sales Order Model
Customer orders with line items
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, Float, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import SOStatus


class SalesOrder(Base):
    """
    Sales Order (SO) - Pesanan dari Customer
    
    Flow: SO Created → JO Generated → Production → Ready → Shipped
    """
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # SO Number (auto-generated)
    so_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Customer info
    customer_name = Column(String(200), nullable=False)
    customer_id = Column(Integer, index=True)  # Future: FK to customers table
    salesman_id = Column(Integer, index=True)  # Link to Salesman
    customer_phone = Column(String(50))
    customer_address = Column(Text)
    
    # Dates
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    required_date = Column(DateTime(timezone=True))  # Customer wants by this date
    
    # Status
    status = Column(
        Enum(SOStatus, native_enum=False),
        default=SOStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Financials
    subtotal = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    tax = Column(Numeric(15, 2), default=0)
    tax = Column(Numeric(15, 2), default=0)
    total = Column(Numeric(15, 2), default=0)
    
    # Down Payment (Phase 9)
    dp_amount = Column(Numeric(15, 2), default=0)
    dp_invoice_id = Column(Integer)
    
    # Payment Tracking (Piutang)
    payment_status = Column(String(20), default='UNPAID')  # UNPAID, PARTIAL, PAID
    amount_paid = Column(Numeric(15, 2), default=0)
    payment_due_date = Column(DateTime(timezone=True))  # Jatuh tempo
    
    # Notes
    notes = Column(Text)
    internal_notes = Column(Text)
    
    # Tracking
    created_by = Column(String(50))
    approved_by = Column(String(50))
    approved_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False, index=True)
    
    # Relationships
    lines = relationship("SOLine", back_populates="sales_order", cascade="all, delete-orphan")
    job_orders = relationship("JobOrder", back_populates="sales_order")
    delivery_orders = relationship("DeliveryOrder", back_populates="sales_order")
    
    def __repr__(self):
        return f"<SalesOrder {self.so_number}: {self.customer_name}>"
    
    @property
    def total_qty_ordered(self):
        return sum(line.qty for line in self.lines)
    
    @property
    def total_qty_produced(self):
        return sum(line.qty_produced for line in self.lines)
    
    @property
    def total_qty_shipped(self):
        return sum(line.qty_shipped for line in self.lines)
    
    def to_dict(self):
        return {
            "id": self.id,
            "so_number": self.so_number,
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "required_date": self.required_date.isoformat() if self.required_date else None,
            "status": self.status.value if self.status else None,
            "subtotal": float(self.subtotal) if self.subtotal else 0,
            "total": float(self.total) if self.total else 0,
            "payment_status": self.payment_status,
            "amount_paid": float(self.amount_paid) if self.amount_paid else 0,
            "amount_due": float(self.total) - float(self.amount_paid or 0) if self.total else 0,
            "payment_due_date": self.payment_due_date.isoformat() if self.payment_due_date else None,
            "notes": self.notes,
            "created_by": self.created_by,
            "lines": [line.to_dict() for line in self.lines] if self.lines else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_dict_simple(self):
        return {
            "id": self.id,
            "so_number": self.so_number,
            "customer_name": self.customer_name,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "required_date": self.required_date.isoformat() if self.required_date else None,
            "status": self.status.value if self.status else None,
            "total": float(self.total) if self.total else 0,
            "line_count": len(self.lines) if self.lines else 0,
            "qty_ordered": self.total_qty_ordered,
            "qty_produced": self.total_qty_produced,
            "qty_shipped": self.total_qty_shipped,
        }


class SOLine(Base):
    """
    Sales Order Line - Detail item dalam SO
    
    Bisa berupa:
    - Hose Assembly (perlu produksi: potong + crimping)
    - Fitting/Part (jual langsung dari stok)
    """
    __tablename__ = "so_lines"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent SO
    so_id = Column(Integer, ForeignKey("sales_orders.id"), index=True, nullable=False)
    
    # Product (bisa product jadi atau custom assembly)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    
    # Line details
    line_number = Column(Integer, default=1)
    description = Column(String(500), nullable=False)  # "Hose Assembly R2 1/2 x 3m"
    
    # For custom hose assembly
    hose_product_id = Column(Integer, ForeignKey("products.id"))  # Raw hose material
    fitting_a_id = Column(Integer)  # Fitting ujung A
    fitting_b_id = Column(Integer)  # Fitting ujung B
    cut_length = Column(Float)  # Panjang potong per pcs (meter)
    
    # Quantity
    qty = Column(Integer, nullable=False, default=1)
    qty_produced = Column(Integer, default=0)  # Sudah selesai produksi
    qty_shipped = Column(Integer, default=0)  # Sudah dikirim
    
    # Pricing
    unit_price = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    line_total = Column(Numeric(15, 2), default=0)
    
    # Status
    is_assembly = Column(Boolean, default=False)  # True = perlu produksi
    
    # Notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sales_order = relationship("SalesOrder", back_populates="lines")
    product = relationship("Product", foreign_keys=[product_id])
    hose_product = relationship("Product", foreign_keys=[hose_product_id])
    jo_lines = relationship("JOLine", back_populates="so_line")
    
    def __repr__(self):
        return f"<SOLine {self.line_number}: {self.description} x{self.qty}>"
    
    @property
    def qty_pending(self):
        """Qty yang belum diproduksi"""
        return self.qty - self.qty_produced
    
    @property
    def qty_ready_to_ship(self):
        """Qty yang sudah siap kirim (produced - shipped)"""
        return self.qty_produced - self.qty_shipped
    
    def to_dict(self):
        return {
            "id": self.id,
            "line_number": self.line_number,
            "product_id": self.product_id,
            "description": self.description,
            "cut_length": self.cut_length,
            "qty": self.qty,
            "qty_produced": self.qty_produced,
            "qty_shipped": self.qty_shipped,
            "qty_pending": self.qty_pending,
            "qty_ready_to_ship": self.qty_ready_to_ship,
            "unit_price": float(self.unit_price) if self.unit_price else 0,
            "line_total": float(self.line_total) if self.line_total else 0,
            "is_assembly": self.is_assembly,
            "notes": self.notes,
        }
