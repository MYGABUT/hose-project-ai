from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.product import Product
from app.models.inventory_batch import InventoryBatch
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter()

@router.get("/global")
def global_search(
    q: str = Query(..., min_length=2, description="Search query: SKU, Batch No, Name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Global Search for 'Track' Feature in Header.
    Prioritizes:
    1. Exact Batch/Barcode match (Specific Hose Tracking)
    2. Product SKU/Name match (General Product Info)
    """
    query = q.strip()
    
    # 1. Search Inventory Batch (Specific Item)
    batch = db.query(InventoryBatch).filter(
        or_(
            InventoryBatch.batch_number == query,
            InventoryBatch.barcode == query,
            InventoryBatch.serial_number == query
        )
    ).first()
    
    if batch:
        # Found specific item
        return format_batch_response(batch, db)
        
    # 2. Search Product (General Info)
    product = db.query(Product).filter(
        or_(
            Product.sku.ilike(f"%{query}%"),
            Product.name.ilike(f"%{query}%"),
            Product.search_keywords.ilike(f"%{query}%")
        )
    ).first()
    
    if product:
        return format_product_response(product, db)
        
    return {"found": False, "message": "No results found"}

def format_batch_response(batch: InventoryBatch, db: Session):
    # Fetch timeline from Audit Logs
    logs = db.query(AuditLog).filter(
        or_(
            (AuditLog.entity_type == 'InventoryBatch') & (AuditLog.entity_id == batch.id),
            (AuditLog.entity_number == batch.batch_number)
        )
    ).order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    events = []
    # Add Creation Event (from batch data)
    events.append({
        "date": batch.created_at.strftime("%Y-%m-%d"),
        "action": "Created",
        "detail": f"Initial Qty: {batch.initial_qty}",
        "user": batch.created_by or "System"
    })
    
    # Add Log Events
    for log in logs:
        events.append({
            "date": log.timestamp.strftime("%Y-%m-%d"),
            "action": log.action,
            "detail": log.changes_summary or log.notes or "-",
            "user": log.user_name
        })
        
    return {
        "found": True,
        "type": "batch",
        "hoseId": batch.batch_number or batch.barcode,
        "spec": batch.product.name,
        "status": batch.status,
        "events": events
    }

def format_product_response(product: Product, db: Session):
    # Fetch Audit Logs for Product
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == 'Product',
        AuditLog.entity_id == product.id
    ).order_by(AuditLog.timestamp.desc()).limit(5).all()
    
    events = []
    for log in logs:
        events.append({
            "date": log.timestamp.strftime("%Y-%m-%d"),
            "action": log.action,
            "detail": log.changes_summary or "-",
            "user": log.user_name
        })
        
    return {
        "found": True,
        "type": "product",
        "hoseId": product.sku,
        "spec": product.name,
        "status": "Active" if product.is_active else "Inactive",
        "events": events
    }
