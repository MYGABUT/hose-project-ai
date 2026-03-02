"""
WMS Enterprise - Inventory Batch Model
Per-roll/per-batch tracking with status and location
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import BatchStatus


class InventoryBatch(Base):
    """
    Inventory Batch / Per-Roll Tracking
    
    Each physical item (roll of hose, box of fittings) has its own record.
    This enables:
    - Tracking per roll (ID_Roll_A: 40m, ID_Roll_B: 60m)
    - FIFO/LIFO picking
    - Lot/batch traceability
    - Location tracking
    """
    __tablename__ = "inventory_batches"
    __table_args__ = (
        CheckConstraint('current_qty >= 0', name='check_positive_qty'),
    )

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to product/SKU
    product_id = Column(Integer, ForeignKey("products.id"), index=True, nullable=False)
    
    # Link to storage location
    location_id = Column(Integer, ForeignKey("storage_locations.id"), index=True)
    
    # Unique identifiers
    batch_number = Column(String(50), index=True)  # LOT number from manufacturer
    barcode = Column(String(100), unique=True, index=True)  # Unique barcode for this batch
    serial_number = Column(String(100), index=True)  # Optional serial number
    
    # Quantities
    initial_qty = Column(Float, nullable=False)  # Original quantity (e.g., 50m)
    current_qty = Column(Float, nullable=False)  # Current remaining (e.g., 12.5m)
    reserved_qty = Column(Float, default=0)  # Reserved for JO/SO
    
    # Available = current_qty - reserved_qty
    
    # Status
    status = Column(
        String(50), # Changed from Enum to String to prevent serialization crashes
        default=BatchStatus.AVAILABLE.value,
        nullable=False,
        index=True
    )
    
    # Pricing
    cost_price = Column(Numeric(15, 2))  # Cost per unit
    currency = Column(String(3), default="IDR")
    
    # Dates
    received_date = Column(DateTime(timezone=True), server_default=func.now())
    manufacture_date = Column(DateTime(timezone=True))
    expiry_date = Column(DateTime(timezone=True))
    
    # Source tracking
    source_type = Column(String(20))  # PO, RETURN, ADJUST, AI_SCANNER
    source_reference = Column(String(50))  # PO number, etc.
    
    # AI Scanner data (if scanned)
    ai_confidence = Column(Integer)  # 0-100
    ai_raw_text = Column(Text)  # OCR result
    image_path = Column(String(255))  # Path to stored image
    
    
    # Audit
    created_by = Column(String(50))
    notes = Column(Text)
    
    # Opname Tracking
    is_opnamed = Column(Boolean, default=False)
    last_opname_date = Column(DateTime(timezone=True), nullable=True)
    
    # Soft delete
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="batches")
    location = relationship("StorageLocation", back_populates="batches")
    movements = relationship("BatchMovement", back_populates="batch")
    
    # NEW: Multi-Entity Support (Asset Owner)
    owner_id = Column(Integer, ForeignKey("companies.id"), nullable=True) # Nullable for migration
    owner = relationship("Company", back_populates="owned_batches")

    def __repr__(self):
        return f"<InventoryBatch {self.barcode}: {self.current_qty} ({self.status})>"
    
    @property
    def available_qty(self) -> float:
        """Quantity available for reservation"""
        return max(0, self.current_qty - (self.reserved_qty or 0))
    
    def reserve(self, qty: float) -> bool:
        """Reserve quantity for JO/SO"""
        if qty <= self.available_qty:
            self.reserved_qty = (self.reserved_qty or 0) + qty
            return True
        return False
    
    def unreserve(self, qty: float) -> bool:
        """Release reserved quantity"""
        if qty <= (self.reserved_qty or 0):
            self.reserved_qty = (self.reserved_qty or 0) - qty
            return True
        return False
    
    def consume(self, qty: float) -> bool:
        """Consume quantity (for production/sales)"""
        if qty <= self.current_qty:
            self.current_qty -= qty
            if self.reserved_qty and self.reserved_qty >= qty:
                self.reserved_qty -= qty
            if self.current_qty <= 0:
                self.status = BatchStatus.CONSUMED
            return True
        return False
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "location_id": self.location_id,
            "batch_number": self.batch_number,
            "barcode": self.barcode,
            "serial_number": self.serial_number,
            "initial_qty": self.initial_qty,
            "current_qty": self.current_qty,
            "reserved_qty": self.reserved_qty,
            "available_qty": self.available_qty,
            "status": self.status if self.status else None,
            "cost_price": float(self.cost_price) if self.cost_price else None,
            "received_date": self.received_date.isoformat() if self.received_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "source_type": self.source_type,
            "source_reference": self.source_reference,
            "ai_confidence": self.ai_confidence,
            "image_path": f"/static/{self.image_path}" if self.image_path else None,
            "notes": self.notes,
            "is_opnamed": self.is_opnamed,
            "last_opname_date": self.last_opname_date.isoformat() if self.last_opname_date else None,
            "owner_id": self.owner_id,
            "owner_name": self.owner.name if self.owner else "Unknown",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "location": self.location.to_dict() if self.location else None,
            "product": self.product.to_dict() if self.product else None,
        }
    
    def to_dict_simple(self):
        """Simplified dict without relationships"""
        return {
            "id": self.id,
            "barcode": self.barcode,
            "batch_number": self.batch_number,
            "initial_qty": self.initial_qty,
            "current_qty": self.current_qty,
            "available_qty": self.available_qty,
            "status": self.status if self.status else None,
            "location_code": self.location.code if self.location else None,
            "location_zone": self.location.zone if self.location else None,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_sku": self.product.sku if self.product else None,
            "product_brand": self.product.brand if self.product else None,
            "product_brand": self.product.brand if self.product else None,
            "product_category": self.product.category.value if self.product and self.product.category else None,
            "owner_id": self.owner_id,
            "owner_name": self.owner.name if self.owner else None,
            "unit": self.product.unit.value if self.product and self.product.unit else "pcs",
            "received_date": self.received_date.isoformat() if self.received_date else None,
            
            # Frontend Compatibility Fields (QualityControl.jsx)
            "brand": self.product.brand if self.product else None,
            "size": self.product.specifications.get('size_inch', self.product.specifications.get('size_dn', '-')) if self.product and self.product.specifications else "-",
            "quantity": self.current_qty,
            "source_reference": self.source_reference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
