"""
HoseMaster WMS - Opname API
Inventory Audit Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.models.stock_opname import StockOpname, OpnameItem, OpnameStatus, OpnameItemStatus
from app.models.inventory_batch import InventoryBatch, BatchStatus
from app.models.enums import MovementType
from app.models.batch_movement import log_movement

router = APIRouter()

# Schemas
class OpnameCreate(BaseModel):
    description: str
    scope_type: Optional[str] = "ALL" # ALL, LOCATION, CATEGORY
    scope_value: Optional[str] = None # e.g. "RAK-A"
    is_blind: Optional[bool] = False
    counted_by: Optional[str] = "Admin"

class ScanItem(BaseModel):
    barcode: str
    qty: float = 1.0 # Allow manual qty input

@router.post("/opname")
def start_opname(data: OpnameCreate, db: Session = Depends(get_db)):
    """🏁 Start New Opname Session (Snapshot Inventory)"""
    
    try:
        # 1. Check for existing open session
        existing = db.query(StockOpname).filter(StockOpname.status == OpnameStatus.IN_PROGRESS).first()
        if existing:
            raise HTTPException(400, "There is already an open opname session. Please complete it first.")
        
        # Generate Opname Number
        today_str = datetime.now().strftime('%Y%m%d')
        count_today = db.query(StockOpname).filter(StockOpname.opname_number.like(f"OPN-{today_str}-%")).count()
        opname_number = f"OPN-{today_str}-{count_today + 1:03d}"

        # 2. Create Session
        opname = StockOpname(
            opname_number=opname_number,
            description=data.description,
            status=OpnameStatus.IN_PROGRESS,
            scope_type=data.scope_type,
            scope_value=data.scope_value,
            is_blind=data.is_blind,
            created_by=data.counted_by # Use provided user or default
        )
        db.add(opname)
        db.flush() # Get ID
        
        # 3. Snapshot: Get all AVAILABLE batches based on SCOPE that haven't been opnamed yet
        query = db.query(InventoryBatch).filter(
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0,
            (InventoryBatch.is_opnamed == False) | (InventoryBatch.is_opnamed == None)
        )
        
        if data.scope_type == "LOCATION" and data.scope_value:
            from app.models.storage_location import StorageLocation
            # Find location ID by Code
            loc = db.query(StorageLocation).filter(StorageLocation.code == data.scope_value).first()
            if loc:
                query = query.filter(InventoryBatch.location_id == loc.id)
                
        elif data.scope_type == "CATEGORY" and data.scope_value:
            from app.models.product import Product
            # Filter by Product Category (Assumes Batch -> Product relationship)
            query = query.join(Product).filter(Product.category == data.scope_value)
        
        batches = query.all()
        
        count = 0
        for batch in batches:
            item = OpnameItem(
                opname_id=opname.id,
                batch_id=batch.id,
                system_qty=batch.current_qty,
                status=OpnameItemStatus.PENDING
            )
            db.add(item)
            count += 1
            
        opname.total_items = count
        db.commit()
        db.refresh(opname)
        
        return {
            "status": "success",
            "message": f"Opname started with {count} items (Scope: {data.scope_type})",
            "data": opname.to_dict()
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, f"Internal Error: {str(e)}")

@router.get("/opname/{opname_id}/variance")
def get_opname_variance(opname_id: int, db: Session = Depends(get_db)):
    """📊 Get Variance Report"""
    opname = db.query(StockOpname).filter(StockOpname.id == opname_id).first()
    if not opname:
        raise HTTPException(404, "Opname not found")
    
    # Get all items with variance (MISMATCH or MISSING)
    # We also want to see FOUND items if there is small variance that was tolerated, 
    # but strictly speaking variance report usually focuses on problems.
    # Let's return EVERYTHING but enriched with variance data.
    
    items = db.query(OpnameItem).filter(OpnameItem.opname_id == opname_id).all()
    
    report = []
    total_variance_value = 0
    
    for item in items:
        actual = item.actual_qty if item.actual_qty is not None else 0
        if item.status == OpnameItemStatus.MISSING:
            actual = 0
            
        diff = actual - item.system_qty
        
        # Calculate Value (Cost Price)
        cost_price = 0
        if item.batch and item.batch.cost_price:
            cost_price = float(item.batch.cost_price)
            
        value_diff = diff * cost_price
        total_variance_value += value_diff
        
        report.append({
            "id": item.id,
            "barcode": item.batch.barcode if item.batch else "Unknown",
            "name": item.batch.product.name if item.batch and item.batch.product else "Unknown",
            "system_qty": item.system_qty,
            "actual_qty": actual,
            "diff": diff,
            "value_diff": value_diff,
            "status": item.status.value,
            "location": item.batch.location.code if item.batch and item.batch.location else "-"
        })
        
    # Sort by absolute value diff descending
    report.sort(key=lambda x: abs(x['value_diff']), reverse=True)
    
    return {
        "status": "success", 
        "data": {
            "summary": {
                "total_items": opname.total_items,
                "total_variance_value": total_variance_value,
                "mismatch_count": len([i for i in report if i['diff'] != 0])
            },
            "items": report
        }
    }

@router.get("/opname/current")
def get_current_opname(db: Session = Depends(get_db)):
    """🔍 Get Active Opname Session"""
    opname = db.query(StockOpname).filter(StockOpname.status == OpnameStatus.IN_PROGRESS).first()
    if not opname:
        return {"status": "success", "data": None}
        
    return {
        "status": "success",
        "data": opname.to_dict()
    }

@router.get("/opname/{opname_id}/items")
def get_opname_items(opname_id: int, db: Session = Depends(get_db)):
    """📜 Get Items for Session"""
    opname = db.query(StockOpname).filter(StockOpname.id == opname_id).first()
    if not opname:
        raise HTTPException(404, "Opname not found")
    
    # Return items joined with batch info (handled in to_dict)
    return {
        "status": "success",
        "data": [item.to_dict() for item in opname.items]
    }

@router.post("/opname/{opname_id}/scan")
def scan_item(opname_id: int, data: ScanItem, db: Session = Depends(get_db)):
    """📷 Scan Barcode in Opname"""
    
    opname = db.query(StockOpname).filter(StockOpname.id == opname_id).first()
    if not opname or opname.status != OpnameStatus.IN_PROGRESS:
        raise HTTPException(400, "Invalid opname session")
        
    # Find item by barcode
    # Join OpnameItem -> InventoryBatch to check barcode
    item = db.query(OpnameItem).join(InventoryBatch).filter(
        OpnameItem.opname_id == opname_id,
        InventoryBatch.barcode == data.barcode
    ).first()
    
    if not item:
        # TODO: Handle "Unexpected Item" (item physically exists but not in system snapshot)
        # For now, just error or ignore
        return {"status": "error", "message": "Item not found in snapshot (Unexpected Item)"}
    
    # Mark found and update Qty
    item.actual_qty = data.qty
    item.scanned_at = sqlfunc.now()
    
    # Determine Status
    # If Blind, we don't know if it's mismatch until verified. 
    # But for data consistency, we can flag MISMATCH internally.
    if abs(item.system_qty - data.qty) > 0.01: # Tolerance
        item.status = OpnameItemStatus.MISMATCH
    else:
        item.status = OpnameItemStatus.FOUND
        
    # Update Stats (if not already scanned)
    # Logic to prevent double counting stats if rescan?
    # Simple approach: Just increment if previously PENDING. 
    # If updating existing scan, stats don't change count, just values.
    # Ideally tracked via specific logic, but simple is ok for now.
    if item.scanned_at is None: # First scan
        opname.scanned_items += 1
        opname.found_count += 1
        
    db.commit()
        
    return {
        "status": "success",
        "message": "Item verified",
        "data": item.to_dict()
    }

@router.post("/opname/{opname_id}/mark-missing")
def mark_item_missing(opname_id: int, item_id: int = Body(..., embed=True), db: Session = Depends(get_db)):
    """❌ Manually Mark Item as Missing (if user wants to skip)"""
    item = db.query(OpnameItem).filter(OpnameItem.id == item_id, OpnameItem.opname_id == opname_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
        
    if item.status == OpnameItemStatus.PENDING:
        item.status = OpnameItemStatus.MISSING
        db.commit()
        
    return {"status": "success"}

@router.post("/opname/{opname_id}/finalize")
def finalize_opname(opname_id: int, db: Session = Depends(get_db)):
    """✅ Finish Opname: Mark remaining as Missing"""
    opname = db.query(StockOpname).filter(StockOpname.id == opname_id).first()
    if not opname:
        raise HTTPException(404, "Opname not found")
        
    # Mark all PENDING as MISSING
    pending_items = db.query(OpnameItem).filter(
        OpnameItem.opname_id == opname_id,
        OpnameItem.status == OpnameItemStatus.PENDING
    ).all()
    
    for item in pending_items:
        item.status = OpnameItemStatus.MISSING
        
    db.commit() # Save statuses
    
    # Process physical adjustments & log movements
    all_items = db.query(OpnameItem).filter(OpnameItem.opname_id == opname_id).all()
    for item in all_items:
        batch = item.batch
        if not batch: continue
        
        diff = 0
        actual_qty = batch.current_qty
        
        if item.status == OpnameItemStatus.MISSING:
            diff = 0 - batch.current_qty
            actual_qty = 0
            
        elif item.status == OpnameItemStatus.MISMATCH:
            actual = item.actual_qty if item.actual_qty is not None else 0
            diff = actual - batch.current_qty
            actual_qty = actual
            
            # Opname Tracking
            batch.is_opnamed = True
            batch.last_opname_date = sqlfunc.now()
            
        elif item.status == OpnameItemStatus.FOUND:
            # Opname Tracking
            batch.is_opnamed = True
            batch.last_opname_date = sqlfunc.now()
            
        if diff != 0:
            qty_before = batch.current_qty
            batch.current_qty = actual_qty
            m_type = MovementType.ADJUST_PLUS if diff > 0 else MovementType.ADJUST_MINUS
            
            # Record audit trail
            log_movement(
                db=db,
                batch_id=batch.id,
                movement_type=m_type,
                qty=abs(diff),
                qty_before=qty_before,
                qty_after=actual_qty,
                from_location_id=batch.location_id,
                to_location_id=batch.location_id,
                reference_type="OPNAME",
                reference_id=opname.id,
                reference_number=opname.opname_number,
                performed_by=opname.created_by,
                reason=f"Stock Opname Var: {diff}"
            )
        
    # Recalculate stats accurately
    opname.missing_count = db.query(OpnameItem).filter(
        OpnameItem.opname_id == opname_id, 
        OpnameItem.status == OpnameItemStatus.MISSING
    ).count()
    
    opname.found_count = db.query(OpnameItem).filter(
        OpnameItem.opname_id == opname_id, 
        OpnameItem.status.in_([OpnameItemStatus.FOUND, OpnameItemStatus.MISMATCH])
    ).count()

    opname.status = OpnameStatus.COMPLETED
    opname.completed_at = sqlfunc.now()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Opname completed. {opname.found_count} found, {opname.missing_count} missing.",
        "data": opname.to_dict()
    }
