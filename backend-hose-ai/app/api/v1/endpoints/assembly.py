"""
HoseMaster WMS - Assembly API
Instant Assembly / Modif (Rakitan Dadakan)
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from app.core.database import get_db
from app.models import Product, InventoryBatch, BatchMovement, MovementType, BatchStatus

router = APIRouter(prefix="/assembly", tags=["Production - Assembly"])

class MaterialRequest(BaseModel):
    product_id: int
    qty: float
    batch_id: Optional[int] = None

class InstantAssemblyRequest(BaseModel):
    result_product_id: int
    qty_result: float
    materials: List[MaterialRequest] # If empty, system tries to auto-find BOM (future feature)
    notes: Optional[str] = None
    allow_partial_materials: bool = False # If true, proceed even if some material is short (dangerous)


@router.post("/instant")
def instant_assembly(
    data: InstantAssemblyRequest,
    db: Session = Depends(get_db)
):
    """
    ⚡ Instant Assembly / Modif (Rakitan Dadakan)
    
    1. Deduct Materials (ASSEMBLY_USE)
    2. Add Result Product (ASSEMBLY_RESULT)
    3. Calculate Cost
    """
    
    # 1. Validate Result Product
    result_product = db.query(Product).filter(Product.id == data.result_product_id).first()
    if not result_product:
        raise HTTPException(status_code=404, detail="Result Product not found")
        
    total_material_cost = Decimal(0)
    
    # 2. Process Materials (Deduct Stock)
    for mat in data.materials:
        # Find product config
        mat_product = db.query(Product).filter(Product.id == mat.product_id).first()
        if not mat_product:
            raise HTTPException(status_code=400, detail=f"Material ID {mat.product_id} not found")
            
        qty_needed = Decimal(str(mat.qty))
        
        # FIFO Allocation Strategy if batch_id not provided
        if not mat.batch_id:
            # Find available batches
            batches = db.query(InventoryBatch).filter(
                InventoryBatch.product_id == mat.product_id,
                InventoryBatch.status == BatchStatus.AVAILABLE,
                InventoryBatch.current_qty > 0
            ).order_by(InventoryBatch.received_date.asc()).all()
            
            qty_remaining = qty_needed
            
            for batch in batches:
                if qty_remaining <= 0:
                    break
                    
                take_qty = min(batch.current_qty, qty_remaining)
                
                # Deduct
                batch.current_qty -= take_qty
                
                # Log Movement
                mov = BatchMovement(
                    batch_id=batch.id,
                    movement_type=MovementType.ASSEMBLY_USE,
                    qty=float(take_qty),
                    qty_before=float(batch.current_qty + take_qty),
                    qty_after=float(batch.current_qty),
                    notes=f"Used for Assembly Modif {result_product.name}"
                )
                db.add(mov)
                
                # Accumulate Cost
                cost_per_unit = batch.cost_price or mat_product.cost_price or 0
                total_material_cost += (take_qty * cost_per_unit)
                
                qty_remaining -= take_qty
            
            if qty_remaining > 0 and not data.allow_partial_materials:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for material {mat_product.name}")
        
        else:
            # Specific Batch
            batch = db.query(InventoryBatch).filter(InventoryBatch.id == mat.batch_id).first()
            if not batch or batch.current_qty < qty_needed:
                raise HTTPException(status_code=400, detail=f"Batch {mat.batch_id} insufficient")
                
            batch.current_qty -= qty_needed
            
            mov = BatchMovement(
                batch_id=batch.id,
                movement_type=MovementType.ASSEMBLY_USE,
                qty=float(qty_needed),
                qty_before=float(batch.current_qty + qty_needed),
                qty_after=float(batch.current_qty),
                notes=f"Used for Assembly Modif {result_product.name}"
            )
            db.add(mov)
            
            cost_per_unit = batch.cost_price or mat_product.cost_price or 0
            total_material_cost += (qty_needed * cost_per_unit)

    # 3. Create Result Batch
    new_batch = InventoryBatch(
        product_id=result_product.id,
        sku=result_product.sku,
        product_name=result_product.name,
        initial_qty=Decimal(str(data.qty_result)),
        current_qty=Decimal(str(data.qty_result)),
        received_date=datetime.now(),
        status=BatchStatus.AVAILABLE,
        location_id=1, 
        location_name="ASSEMBLY_AREA",
        source_type="ASSEMBLY",
        cost_price=total_material_cost / Decimal(str(data.qty_result)) if data.qty_result > 0 else 0
    )
    
    # Resolve correct location (Look for ASSEMBLY or MAIN)
    from app.models import StorageLocation, LocationType
    loc = db.query(StorageLocation).filter(StorageLocation.code == "ASSEMBLY").first()
    if not loc:
        loc = db.query(StorageLocation).filter(StorageLocation.type == LocationType.STAGING_AREA).first()
    if not loc:
        loc = db.query(StorageLocation).first() # Fallback
        
    if loc:
        new_batch.location_id = loc.id
        new_batch.location_name = loc.code

    db.add(new_batch)
    db.flush() # Get ID
    
    # Log Result Movement
    mov_res = BatchMovement(
        batch_id=new_batch.id,
        movement_type=MovementType.ASSEMBLY_RESULT,
        qty=float(data.qty_result),
        qty_before=0.0,
        qty_after=float(data.qty_result),
        notes=f"Result of Assembly Modif {data.notes or ''}"
    )
    db.add(mov_res)
    
    db.commit()
    
    return {
        "status": "success", 
        "message": "Assembly completed", 
        "new_batch_id": new_batch.id,
        "cost_per_unit": float(new_batch.cost_price)
    }
