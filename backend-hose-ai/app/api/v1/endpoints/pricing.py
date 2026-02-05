"""
HoseMaster WMS - Pricing API
Bulk Price Management & History
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.models.product import Product
from app.models.price_history import PriceHistory, PriceChangeType

router = APIRouter()

class BulkPriceAdjust(BaseModel):
    category_id: Optional[str] = 'all'
    brand_id: Optional[str] = 'all'
    method: str # percentage, fixed
    direction: str # increase, decrease
    value: float
    reason: str

@router.post("/pricing/bulk-adjust")
def bulk_adjust_prices(
    data: BulkPriceAdjust,
    db: Session = Depends(get_db)
):
    """💰 Bulk Adjust Base Prices (HPP)"""
    
    query = db.query(Product)
    
    # Filter
    if data.category_id != 'all':
        # Simple match for now, assuming category is stored as string/enum value
        # In real app, might need more complex enum mapping
        query = query.filter(Product.category == data.category_id)
        
    if data.brand_id != 'all':
        query = query.filter(Product.brand == data.brand_id)
        
    products = query.all()
    count = 0
    
    for product in products:
        old_price = product.cost_price or 0
        new_price = old_price
        
        if data.method == 'percentage':
            factor = (data.value / 100)
            if data.direction == 'increase':
                new_price = old_price * (1 + factor)
            else:
                new_price = old_price * (1 - factor)
        else: # fixed
            if data.direction == 'increase':
                new_price = old_price + data.value
            else:
                new_price = old_price - data.value
                
        # Update Product
        product.cost_price = int(new_price)
        
        # Log History
        log = PriceHistory(
            product_id=product.id,
            old_base_price=old_price,
            new_base_price=new_price,
            change_type=PriceChangeType.BULK,
            reason=data.reason,
            created_by="Admin" # Replace with real user context
        )
        db.add(log)
        count += 1
        
    db.commit()
    
    return {
        "status": "success",
        "message": f"Updated {count} products",
        "affected_count": count
    }

@router.get("/pricing/{product_id}/history")
def get_price_history(product_id: int, db: Session = Depends(get_db)):
    """📜 Get Price Change History"""
    history = db.query(PriceHistory)\
        .filter(PriceHistory.product_id == product_id)\
        .order_by(PriceHistory.created_at.desc())\
        .limit(20)\
        .all()
        
    return {
        "status": "success",
        "data": [h.to_dict() for h in history]
    }
