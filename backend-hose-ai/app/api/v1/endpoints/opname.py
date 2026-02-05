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

router = APIRouter()

# Schemas
class OpnameCreate(BaseModel):
    description: str

class ScanItem(BaseModel):
    barcode: str

@router.post("/opname")
def start_opname(data: OpnameCreate, db: Session = Depends(get_db)):
    """🏁 Start New Opname Session (Snapshot Inventory)"""
    
    # 1. Check for existing open session
    existing = db.query(StockOpname).filter(StockOpname.status == OpnameStatus.OPEN).first()
    if existing:
        raise HTTPException(400, "There is already an open opname session. Please complete it first.")
    
    # 2. Create Session
    opname = StockOpname(
        description=data.description,
        status=OpnameStatus.OPEN,
        created_by="Admin" # Replace with real user
    )
    db.add(opname)
    db.flush() # Get ID
    
    # 3. Snapshot: Get all AVAILABLE batches
    batches = db.query(InventoryBatch).filter(
        InventoryBatch.status == BatchStatus.AVAILABLE,
        InventoryBatch.current_qty > 0
    ).all()
    
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
        "message": f"Opname started with {count} items",
        "data": opname.to_dict()
    }

@router.get("/opname/current")
def get_current_opname(db: Session = Depends(get_db)):
    """🔍 Get Active Opname Session"""
    opname = db.query(StockOpname).filter(StockOpname.status == OpnameStatus.OPEN).first()
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
    if not opname or opname.status != OpnameStatus.OPEN:
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
    
    # Mark found
    if item.status != OpnameItemStatus.FOUND:
        item.status = OpnameItemStatus.FOUND
        item.scanned_at = sqlfunc.now()
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
    
    missing_count = 0
    for item in pending_items:
        item.status = OpnameItemStatus.MISSING
        missing_count += 1
        
    opname.missing_count = missing_count
    opname.status = OpnameStatus.COMPLETED
    opname.completed_at = sqlfunc.now()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Opname completed. {opname.found_count} found, {missing_count} missing.",
        "data": opname.to_dict()
    }
