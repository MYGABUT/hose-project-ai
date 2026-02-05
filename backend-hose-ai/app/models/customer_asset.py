"""
HoseMaster WMS - Customer Asset Model
Machine/Unit Tracking for Predictive Maintenance
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class TrackingMode(str, enum.Enum):
    HOUR_METER = "hour_meter"
    CALENDAR = "calendar"

class AssetStressLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class CustomerAsset(Base):
    """
    Customer Asset (Machine/Unit)
    e.g. Excavator PC200, Dump Truck HD785
    """
    __tablename__ = "customer_assets"

    id = Column(Integer, primary_key=True, index=True)
    
    # Identification
    name = Column(String(200), nullable=False) # Unit Code / Name
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True) # Optional if public/demo
    customer_name = Column(String(200)) # Denormalized for display
    location = Column(String(200))
    category = Column(String(50)) # heavy, factory, marine, oil_gas
    
    # Tracking
    tracking_mode = Column(Enum(TrackingMode), default=TrackingMode.HOUR_METER)
    current_hm = Column(Float, default=0)
    last_hm_update = Column(DateTime(timezone=True))
    
    # Status
    grade = Column(String(5), default='A') # A, B, C, D
    image_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    components = relationship("AssetComponent", back_populates="asset", cascade="all, delete-orphan")
    hm_logs = relationship("AssetHMLog", back_populates="asset", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "client": self.customer_name or "Unknown",
            "location": self.location,
            "category": self.category,
            "trackingMode": self.tracking_mode.value,
            "currentHM": self.current_hm,
            "grade": self.grade,
            "photo": self.image_path,
            "hoses": [c.to_dict() for c in self.components]
        }

class AssetComponent(Base):
    """
    Asset Component (Hose Assembly)
    Installed on a specific machine position
    """
    __tablename__ = "asset_components"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("customer_assets.id"), nullable=False)
    
    # Details
    position = Column(String(200), nullable=False) # e.g. Boom Lift, Bucket Cylinder
    stress_level = Column(Enum(AssetStressLevel), default=AssetStressLevel.MEDIUM)
    
    # Product Link (Optional)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product_name = Column(String(200)) # Denormalized
    
    # Life Cycle
    install_date = Column(Date, nullable=False)
    install_hm = Column(Float, default=0)
    
    # Estimates
    estimated_life_hm = Column(Float, default=2000) # Life in Hours
    estimated_life_months = Column(Integer, default=12) # Life in Months (backup)
    
    # Status
    status = Column(String(20), default="good") # good, warning, critical
    
    # Relationships
    asset = relationship("CustomerAsset", back_populates="components")
    
    def calculate_status(self, current_asset_hm):
        """Calculate health status based on usage"""
        if self.asset.tracking_mode == TrackingMode.HOUR_METER:
            used = current_asset_hm - self.install_hm
            percent = (used / self.estimated_life_hm) * 100
            if percent >= 100: return "critical"
            if percent >= 80: return "warning"
            return "good"
        else:
            # Calendar based (Todo)
            return "good"

    def to_dict(self):
        # Calculate derived fields for frontend
        current_hm = self.asset.current_hm
        used_hm = max(0, current_hm - self.install_hm)
        percent = min(100, (used_hm / self.estimated_life_hm * 100)) if self.estimated_life_hm > 0 else 0
        
        predicted_change_hm = self.install_hm + self.estimated_life_hm
        
        # Simple date prediction: Avg 8 hours/day
        import datetime
        remaining_hm = max(0, predicted_change_hm - current_hm)
        days_remaining = remaining_hm / 8 
        predicted_date = (datetime.date.today() + datetime.timedelta(days=int(days_remaining))).isoformat()
        
        if percent >= 100:
            predicted_date = "OVERDUE"

        return {
            "id": self.id,
            "position": self.position,
            "stressLevel": self.stress_level.value,
            "installDate": self.install_date.isoformat() if self.install_date else None,
            "installHM": self.install_hm,
            "estimatedLife": self.estimated_life_hm,
            "usedPercent": int(percent),
            "status": self.calculate_status(current_hm),
            "predictedChangeHM": predicted_change_hm,
            "predictedDate": predicted_date
        }

class AssetHMLog(Base):
    """History of Hour Meter updates"""
    __tablename__ = "asset_hm_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("customer_assets.id"))
    prev_hm = Column(Float)
    new_hm = Column(Float)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_by = Column(String(100))
    
    asset = relationship("CustomerAsset", back_populates="hm_logs")
