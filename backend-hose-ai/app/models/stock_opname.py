"""
HoseMaster WMS - Stock Opname Model
Inventory Audit Sessions
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class OpnameStatus(str, enum.Enum):
    OPEN = "OPEN"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    IN_PROGRESS = "IN_PROGRESS" # Legacy support

class OpnameItemStatus(str, enum.Enum):
    PENDING = "PENDING"
    FOUND = "FOUND"
    MISSING = "MISSING"
    MISMATCH = "MISMATCH"
    COUNTED = "COUNTED"
    IN_PROGRESS = "IN_PROGRESS"

class OpnameScopeType(str, enum.Enum):
    ALL = "ALL"
    LOCATION = "LOCATION"
    CATEGORY = "CATEGORY"

class StockOpname(Base):
    """
    Stock Opname Session
    Represents one audit event (e.g., "Opname Januari 2024")
    """
    __tablename__ = "stock_opnames"

    id = Column(Integer, primary_key=True, index=True)
    
    # Legacy / Required Fields
    opname_number = Column(String(50), unique=True, nullable=False) # Added for legacy compatibility
    
    # Session Info
    description = Column(String(200), nullable=False) # e.g. "Monthly Audit Jan 25"
    status = Column(Enum(OpnameStatus, values_callable=lambda x: [e.value for e in x]), default=OpnameStatus.OPEN, nullable=False)
    
    # Stats (Snapshots)
    total_items = Column(Integer, default=0)
    scanned_items = Column(Integer, default=0)
    found_count = Column(Integer, default=0)
    missing_count = Column(Integer, default=0)
    
    # Scope (Dynamic Opname)
    scope_type = Column(String(20), default="ALL") # ALL, LOCATION, CATEGORY
    scope_value = Column(String(100), nullable=True) # e.g. "RAK-A", "HOSE-HYDRAULIC"
    is_blind = Column(Boolean, default=False) # Hide system qty from counters

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_by = Column(String(100))
    
    # Relationships
    items = relationship("OpnameItem", back_populates="opname", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "opname_number": self.opname_number,
            "description": self.description,
            "status": self.status.value,
            "total_items": self.total_items,
            "scanned_items": self.scanned_items,
            "found_count": self.found_count,
            "missing_count": self.missing_count,
            "scope_type": self.scope_type,
            "scope_value": self.scope_value,
            "is_blind": self.is_blind,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_by": self.created_by,
            "progress": int((self.scanned_items / self.total_items * 100)) if self.total_items > 0 else 0
        }

class OpnameItem(Base):
    """
    Opname Item Detail
    Snapshot of a specific batch during opname
    """
    __tablename__ = "opname_items"

    id = Column(Integer, primary_key=True, index=True)
    
    opname_id = Column(Integer, ForeignKey("stock_opnames.id"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), nullable=False, index=True)
    
    # Snapshot Data (Frozen at start of opname)
    system_qty = Column(Float, nullable=False)
    
    # Audit Data
    actual_qty = Column(Float, nullable=True) # Counted quantity
    status = Column(Enum(OpnameItemStatus), default=OpnameItemStatus.PENDING)
    scanned_at = Column(DateTime(timezone=True))
    
    # Relationships
    opname = relationship("StockOpname", back_populates="items")
    batch = relationship("InventoryBatch")
    
    def to_dict(self):
        return {
            "id": self.id,
            "opname_id": self.opname_id,
            "batch_id": self.batch_id,
            "barcode": self.batch.barcode if self.batch else "Unknown",
            "system_qty": self.system_qty,
            "actual_qty": self.actual_qty,
            "status": self.status.value,
            "scanned_at": self.scanned_at.isoformat() if self.scanned_at else None,
            
            # Product details flattened for UI
            "brand": self.batch.product.brand if self.batch and self.batch.product else "Unknown",
            "name": self.batch.product.name if self.batch and self.batch.product else "Unknown",
            "location": self.batch.location.code if self.batch and self.batch.location else "Unknown"
        }

# Alias for backward compatibility
StockOpnameItem = OpnameItem
