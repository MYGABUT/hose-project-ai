from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProductSubstitute(Base):
    __tablename__ = "product_substitutes"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    substitute_product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product", foreign_keys=[product_id], back_populates="substitutes")
    substitute_product = relationship("Product", foreign_keys=[substitute_product_id])
