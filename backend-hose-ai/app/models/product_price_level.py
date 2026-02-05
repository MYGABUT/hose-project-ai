"""
HoseMaster WMS - Product Price Level Model
Multi-level pricing for different customer types
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class ProductPriceLevel(Base):
    """
    Product Price Level - Harga berbeda per level customer
    
    Example:
    - Level A (Distributor): Rp 50,000
    - Level B (Retail): Rp 55,000
    - Level C (Walk-in): Rp 60,000
    """
    __tablename__ = "product_price_levels"
    __table_args__ = (
        UniqueConstraint('product_id', 'price_level', name='uq_product_price_level'),
    )

    id = Column(Integer, primary_key=True, index=True)
    
    # Product
    product_id = Column(Integer, ForeignKey("products.id"), index=True, nullable=False)
    
    # Price level code (matches with Customer.price_level)
    price_level = Column(String(20), nullable=False)  # A, B, C, VIP, REGULAR, etc
    price_level_name = Column(String(100))  # Descriptive name
    
    # Price
    unit_price = Column(Numeric(15, 2), nullable=False)
    
    # Discount from base price (optional)
    discount_percent = Column(Numeric(5, 2), default=0)
    
    # Minimum qty for this price
    min_qty = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<ProductPriceLevel {self.product_id} Level {self.price_level} @ Rp{self.unit_price}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "price_level": self.price_level,
            "price_level_name": self.price_level_name,
            "unit_price": float(self.unit_price or 0),
            "discount_percent": float(self.discount_percent or 0),
            "min_qty": self.min_qty,
        }
