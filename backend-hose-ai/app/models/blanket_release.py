"""
HoseMaster WMS - Blanket Release Model
Call-off / Release untuk Blanket Order — pengiriman bertahap sesuai kebutuhan customer
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import BlanketReleaseStatus


class BlanketRelease(Base):
    """
    Blanket Release (Call-off) — satu kali permintaan pengiriman dari Blanket SO.
    
    Flow:
    PLANNED → READY → RELEASED (DO dibuat) → DELIVERED (invoice dibuat)
    """
    __tablename__ = "blanket_releases"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent Blanket SO
    so_id = Column(Integer, ForeignKey("sales_orders.id"), index=True, nullable=False)
    
    # Release number: REL-001, REL-002, etc.
    release_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Schedule
    requested_date = Column(Date)          # Customer minta dikirim kapan
    actual_date = Column(Date)             # Tanggal aktual pengiriman
    
    # Linked documents
    do_id = Column(Integer, ForeignKey("delivery_orders.id"), index=True)    # Created on confirm
    invoice_id = Column(Integer, ForeignKey("invoices.id"), index=True)      # Created on deliver
    
    # Status
    status = Column(
        Enum(BlanketReleaseStatus, native_enum=False),
        default=BlanketReleaseStatus.PLANNED,
        nullable=False,
        index=True
    )
    
    # Notes
    notes = Column(Text)
    
    # Audit
    released_by = Column(String(100))
    released_at = Column(DateTime(timezone=True))
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sales_order = relationship("SalesOrder", back_populates="releases")
    delivery_order = relationship("DeliveryOrder", foreign_keys=[do_id])
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    lines = relationship("BlanketReleaseLine", back_populates="release", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BlanketRelease {self.release_number}: {self.status}>"
    
    @property
    def total_qty(self):
        return sum(line.qty for line in self.lines) if self.lines else 0
    
    def to_dict(self):
        return {
            "id": self.id,
            "so_id": self.so_id,
            "release_number": self.release_number,
            "requested_date": self.requested_date.isoformat() if self.requested_date else None,
            "actual_date": self.actual_date.isoformat() if self.actual_date else None,
            "do_id": self.do_id,
            "invoice_id": self.invoice_id,
            "status": self.status.value if self.status else None,
            "total_qty": self.total_qty,
            "notes": self.notes,
            "released_by": self.released_by,
            "released_at": self.released_at.isoformat() if self.released_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "lines": [l.to_dict() for l in self.lines] if self.lines else [],
        }


class BlanketReleaseLine(Base):
    """Detail item dalam satu release/call-off"""
    __tablename__ = "blanket_release_lines"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent release
    release_id = Column(Integer, ForeignKey("blanket_releases.id"), index=True, nullable=False)
    
    # SO Line reference
    so_line_id = Column(Integer, ForeignKey("so_lines.id"), index=True, nullable=False)
    
    # Qty for this release
    qty = Column(Integer, nullable=False, default=1)
    
    # Relationships
    release = relationship("BlanketRelease", back_populates="lines")
    so_line = relationship("SOLine")
    
    def to_dict(self):
        return {
            "id": self.id,
            "so_line_id": self.so_line_id,
            "description": self.so_line.description if self.so_line else None,
            "product_id": self.so_line.product_id if self.so_line else None,
            "qty": self.qty,
        }
