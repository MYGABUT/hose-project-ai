"""
HoseMaster WMS - Delivery Order Model
Surat jalan dengan support partial delivery
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, Float, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import DOStatus


class DeliveryOrder(Base):
    """
    Delivery Order (DO) - Surat Jalan
    
    Mendukung partial delivery: kirim sebagian dari SO.
    """
    __tablename__ = "delivery_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # DO Number (auto-generated)
    do_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Parent SO
    so_id = Column(Integer, ForeignKey("sales_orders.id"), index=True, nullable=False)
    
    # Delivery info
    delivery_date = Column(DateTime(timezone=True))
    recipient_name = Column(String(200))
    recipient_phone = Column(String(50))
    delivery_address = Column(Text)
    
    # Driver & Vehicle
    driver_name = Column(String(100))
    driver_phone = Column(String(50))
    vehicle_number = Column(String(50))
    
    # Status
    status = Column(
        Enum(DOStatus),
        default=DOStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Timestamps
    shipped_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    
    # Notes
    notes = Column(Text)
    
    # Tracking
    created_by = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sales_order = relationship("SalesOrder", back_populates="delivery_orders")
    lines = relationship("DOLine", back_populates="delivery_order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DeliveryOrder {self.do_number}>"
    
    @property
    def total_items(self):
        return sum(line.qty_shipped for line in self.lines)
    
    def to_dict(self):
        return {
            "id": self.id,
            "do_number": self.do_number,
            "so_id": self.so_id,
            "so_number": self.sales_order.so_number if self.sales_order else None,
            "delivery_date": self.delivery_date.isoformat() if self.delivery_date else None,
            "recipient_name": self.recipient_name,
            "delivery_address": self.delivery_address,
            "driver_name": self.driver_name,
            "vehicle_number": self.vehicle_number,
            "status": self.status.value if self.status else None,
            "lines": [line.to_dict() for line in self.lines] if self.lines else [],
            "total_items": self.total_items,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DOLine(Base):
    """
    DO Line - Detail item yang dikirim
    
    Link ke JOLine atau langsung ke Product (untuk jual lepas).
    """
    __tablename__ = "do_lines"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent DO
    do_id = Column(Integer, ForeignKey("delivery_orders.id"), index=True, nullable=False)
    
    # Link to source
    so_line_id = Column(Integer, ForeignKey("so_lines.id"), index=True)
    jo_line_id = Column(Integer, ForeignKey("jo_lines.id"), index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), index=True)
    
    # Details
    description = Column(String(500))
    qty_shipped = Column(Integer, nullable=False, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    delivery_order = relationship("DeliveryOrder", back_populates="lines")
    so_line = relationship("SOLine")
    jo_line = relationship("JOLine")
    product = relationship("Product")
    batch = relationship("InventoryBatch")
    
    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "qty_shipped": self.qty_shipped,
            "product_id": self.product_id,
            "batch_barcode": self.batch.barcode if self.batch else None,
        }
