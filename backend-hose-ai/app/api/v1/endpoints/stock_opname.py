"""
HoseMaster WMS - Stock Opname API
Inventory audit/cycle count endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models import StockOpname, StockOpnameItem, InventoryBatch, Product


router = APIRouter(prefix="/opname", tags=["Stock Opname"])


# ============ Schemas ============

class OpnameStart(BaseModel):
    scope_type: str = "ALL" # ALL, LOCATION, CATEGORY
    scope_value: Optional[str] = None # e.g. "RAK-A", "HOSE"
    counted_by: str


class ItemCount(BaseModel):
    item_id: int
    counted_qty: float
    notes: Optional[str] = None


class OpnameFinish(BaseModel):
    approved_by: str
    notes: Optional[str] = None


# ============ Endpoints ============

def generate_opname_number(db: Session) -> str:
    """Generate opname number: OPN-YYYYMMDD-XXX"""
    today = date.today()
    prefix = f"OPN-{today.strftime('%Y%m%d')}"
    
    count = db.query(StockOpname).filter(
        StockOpname.opname_number.like(f"{prefix}%")
    ).count()
    
    return f"{prefix}-{count + 1:03d}"


@router.get("")
def list_opnames(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📋 Get list of stock opname sessions"""
    query = db.query(StockOpname)
    
    if status:
        query = query.filter(StockOpname.status == status)
    
    total = query.count()
    opnames = query.order_by(StockOpname.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [o.to_dict() for o in opnames]
    }


@router.post("/start")
def start_opname(
    data: OpnameStart,
    db: Session = Depends(get_db)
):
    """
    🚀 Start a new stock opname session
    
    Creates opname session and populates with items from inventory.
    Supports Partial Opname via scope_type.
    """
    opname_number = generate_opname_number(db)
    
    # Create opname session
    opname = StockOpname(
        opname_number=opname_number,
        description=f"Opname {data.scope_type} - {data.scope_value or 'ALL'}",
        scope_type=data.scope_type,
        scope_value=data.scope_value,
        counted_by=data.counted_by,
        status='IN_PROGRESS'
    )
    
    db.add(opname)
    db.flush()  # Get opname ID
    
    # Get items to count
    batch_query = db.query(InventoryBatch).filter(
        InventoryBatch.current_qty > 0,
        InventoryBatch.status == 'AVAILABLE'
    )
    
    # Apply Scope Filters
    if data.scope_type == "LOCATION":
        if not data.scope_value:
             raise HTTPException(status_code=400, detail="Scope Value required for LOCATION opname")
        # Filter by location code prefix (e.g., 'A-01' matches 'A-01-01')
        batch_query = batch_query.join(InventoryBatch.location).filter(
            InventoryBatch.location.has(code=data.scope_value)
        )
        
    elif data.scope_type == "CATEGORY":
        if not data.scope_value:
             raise HTTPException(status_code=400, detail="Scope Value required for CATEGORY opname")
        # Filter by product category (e.g., 'HOSE', 'FITTING')
        batch_query = batch_query.join(InventoryBatch.product).filter(
            InventoryBatch.product.has(category=data.scope_value)
        )
    
    batches = batch_query.all()
    
    if not batches:
        raise HTTPException(status_code=400, detail="Tidak ada item yang ditemukan untuk scope ini")

    # Create opname items
    for batch in batches:
        item = StockOpnameItem(
            opname_id=opname.id,
            batch_id=batch.id,
            system_qty=batch.current_qty,
            status='PENDING'
        )
        db.add(item)
    
    opname.total_items = len(batches)
    
    db.commit()
    db.refresh(opname)
    
    return {
        "status": "success",
        "message": f"Stock Opname {opname_number} dimulai. Scope: {data.scope_type}. Items: {len(batches)}",
        "data": opname.to_dict()
    }


@router.get("/{opname_id}")
def get_opname_detail(opname_id: int, db: Session = Depends(get_db)):
    """🔍 Get opname session with items"""
    opname = db.query(StockOpname).filter(StockOpname.id == opname_id).first()
    
    if not opname:
        raise HTTPException(status_code=404, detail="Opname tidak ditemukan")
    
    result = opname.to_dict()
    result["items"] = [item.to_dict() for item in opname.items]
    
    return {"status": "success", "data": result}


@router.post("/{opname_id}/count")
def count_item(
    opname_id: int,
    data: ItemCount,
    db: Session = Depends(get_db)
):
    """
    📝 Record counted quantity for an item
    """
    opname = db.query(StockOpname).filter(
        StockOpname.id == opname_id,
        StockOpname.status == 'IN_PROGRESS'
    ).first()
    
    if not opname:
        raise HTTPException(status_code=404, detail="Opname tidak ditemukan atau sudah selesai")
    
    item = db.query(StockOpnameItem).filter(
        StockOpnameItem.id == data.item_id,
        StockOpnameItem.opname_id == opname_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    
    # Update counted qty
    item.counted_qty = Decimal(str(data.counted_qty))
    item.variance = Decimal(str(data.counted_qty)) - Decimal(str(item.system_qty))
    item.status = 'COUNTED'
    item.counted_at = datetime.now()
    item.notes = data.notes
    
    # Calculate variance value (assuming we have cost price)
    if item.batch and item.batch.cost_price:
         item.variance_value = item.variance * item.batch.cost_price
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Recorded: Sistem {float(item.system_qty)}, Fisik {data.counted_qty}",
        "data": item.to_dict()
    }


@router.post("/{opname_id}/finish")
def finish_opname(
    opname_id: int,
    data: OpnameFinish,
    db: Session = Depends(get_db)
):
    """
    ✅ Finish and summarize stock opname session
    """
    opname = db.query(StockOpname).filter(
        StockOpname.id == opname_id,
        StockOpname.status == 'IN_PROGRESS'
    ).first()
    
    if not opname:
        raise HTTPException(status_code=404, detail="Opname tidak ditemukan atau sudah selesai")
    
    # Check all items counted
    pending = db.query(StockOpnameItem).filter(
        StockOpnameItem.opname_id == opname_id,
        StockOpnameItem.status == 'PENDING'
    ).count()
    
    if pending > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Masih ada {pending} item yang belum dicount"
        )
    
    # Calculate summary
    items_matched = 0
    items_over = 0
    items_under = 0
    total_variance_value = Decimal(0)
    
    for item in opname.items:
        variance = float(item.variance or 0)
        if variance == 0:
            items_matched += 1
        elif variance > 0:
            items_over += 1
        else:
            items_under += 1
        
        total_variance_value += Decimal(str(item.variance_value or 0))
    
    # Update opname
    opname.status = 'COMPLETED'
    opname.items_matched = items_matched
    opname.items_over = items_over
    opname.items_under = items_under
    opname.total_variance_value = total_variance_value
    opname.approved_by = data.approved_by
    opname.completed_at = datetime.now()
    opname.notes = data.notes
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Stock Opname {opname.opname_number} selesai",
        "data": {
            "opname_number": opname.opname_number,
            "summary": {
                "total_items": opname.total_items,
                "items_matched": items_matched,
                "items_over": items_over,
                "items_under": items_under,
                "total_variance_value": float(total_variance_value)
            }
        }
    }


@router.get("/cycle-count/today")
def get_cycle_count_assignment(
    rack_count: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    🎲 Partial Cycle Count - Random Daily Audit
    """
    import random
    from app.models import StorageLocation
    
    # Get all racks with stock
    racks_with_stock = db.query(
        InventoryBatch.location_code
    ).filter(
        InventoryBatch.current_qty > 0,
        InventoryBatch.location_code.isnot(None)
    ).distinct().all()
    
    rack_codes = [r[0] for r in racks_with_stock if r[0]]
    
    if not rack_codes:
        return {
            "status": "success",
            "message": "Tidak ada rak dengan stok untuk diaudit",
            "data": {"racks_to_count": [], "items": []}
        }
    
    # Random select racks
    selected_racks = random.sample(rack_codes, min(rack_count, len(rack_codes)))
    
    # Get items in these racks
    items_to_count = db.query(InventoryBatch).filter(
        InventoryBatch.location_code.in_(selected_racks),
        InventoryBatch.current_qty > 0
    ).all()
    
    return {
        "status": "success",
        "date": date.today().isoformat(),
        "message": f"Hari ini audit {len(selected_racks)} rak: {', '.join(selected_racks)}",
        "data": {
            "racks_to_count": selected_racks,
            "total_items": len(items_to_count),
            "items": [
                {
                    "batch_id": b.id,
                    "sku": b.product_sku,
                    "name": b.product_name,
                    "location": b.location_code,
                    "system_qty": float(b.current_qty or 0)
                }
                for b in items_to_count
            ]
        }
    }
