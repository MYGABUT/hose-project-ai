"""
HoseMaster WMS - Assembly Service
Handles Auto-Assembly and manufacturing logic
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from decimal import Decimal
import uuid

from app.models import (
    Product, InventoryBatch, BatchMovement, 
    JobOrder, JOLine, JOMaterial,
    ProductComponent, MovementType
)

def generate_batch_number():
    return f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def auto_assemble(db: Session, product_id: int, qty_needed: float) -> InventoryBatch:
    """
    🏭 Auto-Assemble Product
    
    1. Check BOM (Components)
    2. Deduct Raw Materials (FIFO)
    3. Create "Instant" Job Order (Completed)
    4. Create Finished Good Batch
    """
    parent_product = db.query(Product).filter(Product.id == product_id).first()
    if not parent_product:
        raise ValueError(f"Product {product_id} not found")
        
    components = db.query(ProductComponent).filter(ProductComponent.parent_product_id == product_id).all()
    if not components:
        raise ValueError(f"Product {parent_product.sku} has no BOM components defined for auto-assembly")
        
    # 1. Check and Consume Raw Materials
    consumed_materials = []
    
    for comp in components:
        total_qty_needed = float(comp.qty) * float(qty_needed)
        
        # Find batches for component (FIFO)
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.product_id == comp.child_product_id,
            InventoryBatch.current_qty > 0,
            InventoryBatch.status == 'AVAILABLE'
        ).order_by(InventoryBatch.created_at.asc()).all()
        
        qty_to_deduct = total_qty_needed
        comp_deducted = 0
        
        for batch in batches:
            if qty_to_deduct <= 0:
                break
                
            deduct = min(float(batch.current_qty), qty_to_deduct)
            
            # Deduct
            batch.current_qty -= Decimal(deduct)
            qty_to_deduct -= deduct
            comp_deducted += deduct
            
            # Log Movement
            from app.models.batch_movement import log_movement
            log_movement(
                db=db,
                batch_id=batch.id,
                movement_type=MovementType.CONSUME,
                qty=deduct,
                qty_before=float(batch.current_qty) + deduct,
                qty_after=float(batch.current_qty),
                reason="Auto-Assembly",
                notes=f"Used for {parent_product.sku}"
            )
            
            consumed_materials.append({
                "product_id": comp.child_product_id,
                "batch_id": batch.id,
                "qty": deduct
            })
            
        if qty_to_deduct > 0.001: # Tolerance
            raise ValueError(f"Not enough stock for component {comp.child_product.sku}. Needed: {total_qty_needed}, Found: {comp_deducted}")

    # 2. Create Finished Good Batch
    new_batch_number = generate_batch_number()
    
    # Calculate Cost Price (Sum of components)
    # Simplified: We should track cost from consumed batches. 
    # For now, just assume master cost or 0.
    unit_cost = 0 # To be calculated properly in full version
    
    new_batch = InventoryBatch(
        product_id=product_id,
        batch_number=new_batch_number,
        barcode=new_batch_number, # Simplified
        initial_qty=Decimal(qty_needed),
        current_qty=Decimal(qty_needed),
        status='AVAILABLE',
        source_type='AUTO_ASSEMBLY',
        received_date=datetime.now()
    )
    db.add(new_batch)
    db.flush()
    
    from app.models.batch_movement import log_movement
    log_movement(
        db=db,
        batch_id=new_batch.id,
        movement_type=MovementType.ADJUST, # Or INBOUND
        qty=qty_needed,
        qty_before=0,
        qty_after=qty_needed,
        reason="Auto-Assembly Output",
        notes=f"Auto-assembled"
    )
    
    return new_batch
