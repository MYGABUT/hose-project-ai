"""
WMS Enterprise - Batch Movement Model
Complete audit trail for all inventory movements
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Text, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import MovementType


class BatchMovement(Base):
    """
    Batch Movement / Inventory Audit Trail
    
    Records every movement of inventory:
    - Inbound (receiving)
    - Outbound (shipping)
    - Transfer (between locations)
    - Reserve (for JO/SO)
    - Consume (production)
    - Adjust (corrections)
    - Return (in/out)
    """
    __tablename__ = "batch_movements"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to batch
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), index=True, nullable=False)
    
    # Movement type
    movement_type = Column(
        Enum(MovementType, native_enum=False),
        nullable=False,
        index=True
    )
    
    # Location tracking
    from_location_id = Column(Integer, ForeignKey("storage_locations.id"))
    to_location_id = Column(Integer, ForeignKey("storage_locations.id"))
    
    # Quantity
    qty = Column(Float, nullable=False)
    
    # Financials (Added for HPP Reprocess support)
    unit_cost = Column(Numeric(15, 2)) # Cost at the time of movement (or updated by Reprocess)
    total_value = Column(Numeric(15, 2)) # qty * unit_cost
    
    # Before/After for audit
    qty_before = Column(Float)
    qty_after = Column(Float)
    
    # Reference to source document
    reference_type = Column(String(20), index=True)  # SO, JO, DO, PO, RMA, ADJUST
    reference_id = Column(Integer)
    reference_number = Column(String(50))  # SO-2026-0001
    
    # User tracking
    performed_by = Column(String(50))
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Notes
    reason = Column(String(200))
    notes = Column(Text)
    
    # Relationships
    batch = relationship("InventoryBatch", back_populates="movements")
    from_location = relationship("StorageLocation", foreign_keys=[from_location_id])
    to_location = relationship("StorageLocation", foreign_keys=[to_location_id])
    
    def __repr__(self):
        return f"<BatchMovement {self.movement_type.value}: {self.qty} @ {self.performed_at}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "movement_type": self.movement_type.value if self.movement_type else None,
            "from_location_id": self.from_location_id,
            "to_location_id": self.to_location_id,
            "qty": self.qty,
            "qty_before": self.qty_before,
            "qty_after": self.qty_after,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "reference_number": self.reference_number,
            "performed_by": self.performed_by,
            "performed_at": self.performed_at.isoformat() if self.performed_at else None,
            "reason": self.reason,
            "notes": self.notes,
            "from_location": self.from_location.code if self.from_location else None,
            "to_location": self.to_location.code if self.to_location else None,
        }


def log_movement(
    db,
    batch_id: int,
    movement_type: MovementType,
    qty: float,
    qty_before: float,
    qty_after: float,
    from_location_id: int = None,
    to_location_id: int = None,
    reference_type: str = None,
    reference_id: int = None,
    reference_number: str = None,
    performed_by: str = "system",
    reason: str = None,
    notes: str = None
) -> BatchMovement:
    """
    Helper function to create movement log
    """
    movement = BatchMovement(
        batch_id=batch_id,
        movement_type=movement_type,
        qty=qty,
        qty_before=qty_before,
        qty_after=qty_after,
        from_location_id=from_location_id,
        to_location_id=to_location_id,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        performed_by=performed_by,
        reason=reason,
        notes=notes
    )
    db.add(movement)
    return movement
