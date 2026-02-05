"""
HoseMaster WMS - Warehouse Transfer Model
Inter-warehouse stock movement with in-transit tracking
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from decimal import Decimal
from datetime import date

from app.core.database import Base


class WarehouseTransfer(Base):
    """
    Warehouse Transfer - Mutasi Antar Gudang
    
    Workflow:
    1. Gudang A buat Transfer Request → Status: DRAFT
    2. Manager approve → Status: APPROVED
    3. Barang dikirim → Status: IN_TRANSIT
    4. Gudang B terima → Status: RECEIVED
    
    Prevents stock loss during transit by tracking movement.
    """
    __tablename__ = "warehouse_transfers"

    id = Column(Integer, primary_key=True, index=True)
    
    # Transfer number: WT-YYYYMM-XXX
    transfer_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Locations
    from_location_id = Column(Integer)
    from_location_name = Column(String(100))
    to_location_id = Column(Integer)
    to_location_name = Column(String(100))
    
    # Dates
    request_date = Column(Date, default=func.current_date())
    shipped_date = Column(Date)
    received_date = Column(Date)
    
    # Status
    status = Column(String(20), default='DRAFT')  # DRAFT, APPROVED, IN_TRANSIT, RECEIVED, CANCELLED
    
    # People
    requested_by = Column(String(100))
    approved_by = Column(String(100))
    shipped_by = Column(String(100))
    received_by = Column(String(100))
    
    # Notes
    notes = Column(Text)
    rejection_reason = Column(Text)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<WarehouseTransfer {self.transfer_number}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "transfer_number": self.transfer_number,
            "from_location": self.from_location_name,
            "to_location": self.to_location_name,
            "request_date": self.request_date.isoformat() if self.request_date else None,
            "shipped_date": self.shipped_date.isoformat() if self.shipped_date else None,
            "received_date": self.received_date.isoformat() if self.received_date else None,
            "status": self.status,
            "requested_by": self.requested_by,
            "approved_by": self.approved_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TransferItem(Base):
    """Items in a warehouse transfer"""
    __tablename__ = "transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, nullable=False, index=True)
    
    # Product info
    product_id = Column(Integer)
    product_sku = Column(String(100))
    product_name = Column(String(200))
    
    # Batch info
    batch_id = Column(Integer)
    batch_number = Column(String(100))
    
    # Quantity
    qty_requested = Column(Numeric(10, 2), default=0)
    qty_shipped = Column(Numeric(10, 2), default=0)
    qty_received = Column(Numeric(10, 2), default=0)
    unit = Column(String(20), default='PCS')
    
    # Variance
    qty_variance = Column(Numeric(10, 2), default=0)  # received - shipped
    variance_reason = Column(Text)
    
    # Status
    line_status = Column(String(20), default='PENDING')  # PENDING, SHIPPED, RECEIVED, VARIANCE

    def to_dict(self):
        return {
            "id": self.id,
            "product_sku": self.product_sku,
            "product_name": self.product_name,
            "batch_number": self.batch_number,
            "qty_requested": float(self.qty_requested or 0),
            "qty_shipped": float(self.qty_shipped or 0),
            "qty_received": float(self.qty_received or 0),
            "qty_variance": float(self.qty_variance or 0),
            "unit": self.unit,
            "line_status": self.line_status
        }
