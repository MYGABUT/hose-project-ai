from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductComponent(Base):
    __tablename__ = "product_components"
    
    id = Column(Integer, primary_key=True, index=True)
    parent_product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    child_product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty = Column(Numeric(10, 4), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    parent_product = relationship("Product", foreign_keys=[parent_product_id], back_populates="components")
    child_product = relationship("Product", foreign_keys=[child_product_id])
