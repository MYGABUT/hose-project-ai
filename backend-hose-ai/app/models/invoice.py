"""
HoseMaster WMS - Invoice Model
Sales Invoice with auto-generated invoice number
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from decimal import Decimal

from app.core.database import Base
from app.models.enums import InvoiceStatus


class Invoice(Base):
    """
    Invoice - Faktur Penjualan
    
    Workflow:
    1. SO Complete → Create Invoice
    2. Invoice dikirim ke customer
    3. Payment received → Mark as PAID
    """
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    
    # Invoice number: INV-YYYYMM-XXX
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Link to SO
    so_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    so_number = Column(String(50))
    salesman_id = Column(Integer, index=True) # Copied from SO matches Salesman.id
    
    # Customer
    customer_id = Column(Integer, ForeignKey("customers.id"))
    customer_name = Column(String(200))
    customer_address = Column(Text)
    
    # Dates
    invoice_date = Column(Date, default=func.current_date())
    due_date = Column(Date)
    
    # Amounts
    subtotal = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    
    # Tax (PPN)
    tax_rate = Column(Numeric(5, 2), default=11)  # PPN 11%
    dpp = Column(Numeric(15, 2), default=0)  # Dasar Pengenaan Pajak (subtotal - discount)
    tax_amount = Column(Numeric(15, 2), default=0)  # PPN = DPP * tax_rate
    total = Column(Numeric(15, 2), default=0)  # DPP + PPN
    
    # Faktur Pajak
    tax_invoice_number = Column(String(50))  # Nomor Seri Faktur Pajak e.g. 010.000-23.12345678
    customer_npwp = Column(String(30))  # NPWP Customer
    
    # Payment
    amount_paid = Column(Numeric(15, 2), default=0)
    amount_paid = Column(Numeric(15, 2), default=0)
    payment_status = Column(String(20), default='UNPAID')  # UNPAID, PARTIAL, PAID
    
    # Down Payment (Phase 9)
    is_dp = Column(Boolean, default=False)
    deduction_amount = Column(Numeric(15, 2), default=0) # For Final Invoice deducting DP
    
    # Status
    status = Column(String(20), default='DRAFT')  # DRAFT, SENT, PAID, CANCELLED
    
    # Notes
    notes = Column(Text)
    terms = Column(Text)  # Payment terms
    
    # Audit
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True))
    
    # Relationships
    items = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Invoice {self.invoice_number}>"
    
    @property
    def amount_due(self):
        return float(self.total or 0) - float(self.amount_paid or 0)
    
    @property
    def is_overdue(self):
        from datetime import date
        if self.due_date and self.payment_status != 'PAID':
            return date.today() > self.due_date
        return False
    
    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "so_id": self.so_id,
            "so_number": self.so_number,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "subtotal": float(self.subtotal or 0),
            "discount": float(self.discount or 0),
            "dpp": float(self.dpp or 0),
            "tax_rate": float(self.tax_rate or 0),
            "tax_amount": float(self.tax_amount or 0),
            "tax_invoice_number": self.tax_invoice_number,
            "total": float(self.total or 0),
            "amount_paid": float(self.amount_paid or 0),
            "amount_due": self.amount_due,
            "payment_status": self.payment_status,
            "status": self.status,
            "is_overdue": self.is_overdue,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "item_count": len(self.items) if self.items else 0,
        }


class InvoiceLine(Base):
    """Invoice Line Item"""
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    
    # Product/Item
    line_number = Column(Integer, default=1)
    product_id = Column(Integer)
    product_sku = Column(String(100))
    description = Column(Text)
    
    # Quantity & Price
    qty = Column(Numeric(10, 2), default=1)
    unit = Column(String(20), default='PCS')
    unit_price = Column(Numeric(15, 2), default=0)
    discount = Column(Numeric(15, 2), default=0)
    subtotal = Column(Numeric(15, 2), default=0)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "line_number": self.line_number,
            "product_sku": self.product_sku,
            "description": self.description,
            "qty": float(self.qty or 0),
            "unit": self.unit,
            "unit_price": float(self.unit_price or 0),
            "discount": float(self.discount or 0),
            "subtotal": float(self.subtotal or 0),
        }
