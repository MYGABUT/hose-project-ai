"""
WMS Enterprise - Storage Location Model
Hierarchical location tracking: Warehouse → Zone → Rack → Level → Bin
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import LocationType


class StorageLocation(Base):
    """
    Storage Location Master
    
    Hierarki: WAREHOUSE → ZONE → RACK → LEVEL → BIN
    Contoh Code: WH1-HYDRAULIC-A01-L2-B05
    """
    __tablename__ = "storage_locations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Unique location code
    code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Hierarchy
    warehouse = Column(String(50), nullable=False, default="MAIN")
    zone = Column(String(50), nullable=False)  # HYDRAULIC, FITTING, STAGING
    rack = Column(String(20))  # A01, B02
    level = Column(String(10))  # L1, L2, L3
    bin = Column(String(10))  # B01, B02
    
    # Location type
    type = Column(
        Enum(LocationType),
        default=LocationType.HOSE_RACK,
        nullable=False
    )
    
    # Capacity
    capacity = Column(Float)  # Max capacity (meters/pcs)
    current_usage = Column(Float, default=0)  # Current usage
    
    # Description
    description = Column(String(200))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    batches = relationship("InventoryBatch", back_populates="location")
    
    # NEW: Multi-Entity Support
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True) # Nullable for migration
    company = relationship("Company", back_populates="locations")

    def __repr__(self):
        return f"<StorageLocation {self.code}>"
    
    @staticmethod
    def generate_code(warehouse: str, zone: str, rack: str = None, 
                      level: str = None, bin: str = None) -> str:
        """Generate location code from hierarchy"""
        parts = [warehouse, zone]
        if rack:
            parts.append(rack)
        if level:
            parts.append(level)
        if bin:
            parts.append(bin)
        return "-".join(parts)
    
    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "warehouse": self.warehouse,
            "zone": self.zone,
            "rack": self.rack,
            "level": self.level,
            "bin": self.bin,
            "type": self.type.value if self.type else None,
            "capacity": self.capacity,
            "current_usage": self.current_usage,
            "is_active": self.is_active,
            "description": self.description,
        }
