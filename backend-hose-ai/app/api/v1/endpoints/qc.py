
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import (
    JobOrder, 
    JOLine, 
    InventoryBatch, 
    StorageLocation, 
    Product,
    BatchStatus,
    MovementType,
    JOStatus,
    LocationType,
    log_movement
)

router = APIRouter(prefix="/qc", tags=["Quality Control"])

# Schemas
class QCInspection(BaseModel):
    jo_line_id: int
    qty_passed: float
    qty_failed: float
    notes: Optional[str] = None
    inspected_by: str = "system"

class QCItemResponse(BaseModel):
    id: int
    jo_number: str
    product_name: str
    qty_ordered: float
    qty_completed: float
    status: str

# Endpoints

@router.get("/pending")
async def get_pending_qc(db: Session = Depends(get_db)):
    """📋 List items waiting for QC (from Job Orders)"""
    # Find JOs that are specifically marked as QC_PENDING
    pending_items = []
    
    jos = db.query(JobOrder).filter(
        JobOrder.status == JOStatus.QC_PENDING,
        JobOrder.is_deleted == False
    ).all()
    
    for jo in jos:
        for line in jo.lines:
            # If line is completed in production, it's ready for QC 
            # (Assuming qty_ordered = what they've produced and are waiting to be QC'd)
            pending_items.append({
                "id": line.id,
                "jo_number": jo.jo_number,
                "product_name": line.description,
                "qty_ordered": line.qty_ordered,
                "qty_completed": line.qty_completed,
                "qty_pending": line.qty_ordered, # In QC context, all ordered qty is pending QC
                "status": jo.status
            })
                
    return {
        "status": "success",
        "data": pending_items
    }

@router.post("/inspect")
async def submit_inspection(
    data: QCInspection,
    db: Session = Depends(get_db)
):
    """✅ Submit QC Results -> Create Finished Goods Batch"""
    try:
        # 1. Validate Operation
        line = db.query(JOLine).get(data.jo_line_id)
        if not line:
            raise HTTPException(status_code=404, detail="JO Line not found")
            
        jo = line.job_order
        
        if data.qty_passed + data.qty_failed <= 0:
             raise HTTPException(status_code=400, detail="Total qty must be > 0")
    
        # 2. Update Production Progress
        line.qty_completed += (data.qty_passed + data.qty_failed)
        
        # 3. Create Inventory Batch for PASSED items (Finished Goods)
        new_batch = None
        if data.qty_passed > 0:
            # Get Output Location (e.g. STAGING-OUT or FINISHED-GOODS)
            # For now, we assume a default location or find one
            location = db.query(StorageLocation).filter(
                StorageLocation.type == LocationType.STAGING_AREA
            ).first()
            
            if not location:
                # Fallback to first active location
                location = db.query(StorageLocation).filter(StorageLocation.is_active == True).first()
                
            if not location:
                 # Critical error if no location at all
                 raise HTTPException(status_code=500, detail="No storage locations defined in system")
    
            # Create Batch
            batch_number = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            barcode = f"FG-{batch_number}"
            
            new_batch = InventoryBatch(
                product_id=line.product_id,
                location_id=location.id,
                batch_number=batch_number,
                barcode=barcode,
                initial_qty=data.qty_passed,
                current_qty=data.qty_passed,
                status=BatchStatus.AVAILABLE.value, # Use .value for String column
                source_type="PRODUCTION",
                source_reference=jo.jo_number,
                notes=f"Generated from JO {jo.jo_number} (QC Passed)",
                created_by=data.inspected_by
            )
            db.add(new_batch)
            db.flush()
            
            # Log Inbound Movement
            log_movement(
                db=db,
                batch_id=new_batch.id,
                movement_type=MovementType.ASSEMBLY_RESULT,
                qty=data.qty_passed,
                qty_before=0,
                qty_after=data.qty_passed,
                to_location_id=location.id,
                reference_type="JO",
                reference_number=jo.jo_number,
                performed_by=data.inspected_by,
                notes=data.notes
            )
    
        # 4. Handle FAILED items (Scrap?)
        if data.qty_failed > 0:
            # Logic to record scrap/waste could go here
            pass
    
        # 5. Check if JO is Complete
        all_lines_complete = all(l.qty_completed >= l.qty_ordered for l in jo.lines)
        if all_lines_complete:
            jo.status = JOStatus.QC_PASSED # Or COMPLETED
            jo.completed_at = datetime.now()
        else:
            # Ensure status reflects progress
            if jo.status == JOStatus.QC_PENDING:
                jo.status = JOStatus.IN_PROGRESS
                
        db.commit()
        
        return {
            "status": "success",
            "message": f"QC Completed. {data.qty_passed} passed, {data.qty_failed} failed.",
            "data": {
                "batch_barcode": new_batch.barcode if new_batch else None,
                "jo_status": jo.status
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"QC Error: {str(e)}")
