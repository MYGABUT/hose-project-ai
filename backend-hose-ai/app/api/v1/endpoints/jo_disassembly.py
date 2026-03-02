"""
HoseMaster WMS - Job Order Disassembly
Handles disassembly of failed JO lines, material return & salvage
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.models import JobOrder, JOLine, InventoryBatch, Product


router = APIRouter(prefix="/jo", tags=["Job Orders - Disassembly"])


class DisassemblyRequest(BaseModel):
    """Disassemble a failed JO line"""
    jo_line_id: int
    reason: str
    hose_remaining_length: float = 0
    fitting_a_salvageable: bool = False
    fitting_b_salvageable: bool = False


@router.post("/{jo_id}/disassemble")
def disassemble_jo_line(
    jo_id: int,
    data: DisassemblyRequest,
    db: Session = Depends(get_db)
):
    """
    🔧 Disassemble a failed Job Order line
    
    When assembly fails (wrong press, damaged fitting), this endpoint:
    1. Returns fitting as REJECT or SALVAGE
    2. Updates hose batch with remaining length (or marks as scrap)
    3. Logs the disassembly for tracking
    
    NOTE: This is for COMPLETED JO lines that need to be undone
    """
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    jo_line = db.query(JOLine).filter(
        JOLine.id == data.jo_line_id,
        JOLine.jo_id == jo_id
    ).first()
    
    if not jo_line:
        raise HTTPException(status_code=404, detail="JO Line tidak ditemukan")
    
    # Track what was disassembled
    disassembly_log = {
        "jo_number": jo.jo_number,
        "line_number": jo_line.line_number,
        "reason": data.reason,
        "returned_materials": []
    }
    
    # Process hose return
    if data.hose_remaining_length > 0:
        batch_number = f"REM-{jo.jo_number}-{jo_line.line_number}"
        
        hose_batch = InventoryBatch(
            batch_number=batch_number,
            product_id=jo_line.product_id,
            product_sku=jo_line.hose_spec,
            product_name=f"Remnant dari {jo.jo_number}",
            initial_qty=Decimal(str(data.hose_remaining_length)),
            current_qty=Decimal(str(data.hose_remaining_length)),
            unit="meter",
            source="DISASSEMBLY",
            source_reference=jo.jo_number,
            status="AVAILABLE",
            is_remnant=True
        )
        db.add(hose_batch)
        
        disassembly_log["returned_materials"].append({
            "type": "HOSE_REMNANT",
            "batch_number": batch_number,
            "qty": data.hose_remaining_length,
            "unit": "meter"
        })
    
    # Process fitting returns
    if jo_line.fitting_a_sku:
        status = "SALVAGE" if data.fitting_a_salvageable else "REJECT"
        fitting_a_batch = InventoryBatch(
            batch_number=f"DIS-A-{jo.jo_number}-{jo_line.line_number}",
            product_sku=jo_line.fitting_a_sku,
            product_name=f"Fitting A dari {jo.jo_number}",
            initial_qty=Decimal(1),
            current_qty=Decimal(1),
            unit="PCS",
            source="DISASSEMBLY",
            source_reference=jo.jo_number,
            status=status
        )
        db.add(fitting_a_batch)
        
        disassembly_log["returned_materials"].append({
            "type": f"FITTING_A_{status}",
            "sku": jo_line.fitting_a_sku,
            "qty": 1
        })
    
    if jo_line.fitting_b_sku:
        status = "SALVAGE" if data.fitting_b_salvageable else "REJECT"
        fitting_b_batch = InventoryBatch(
            batch_number=f"DIS-B-{jo.jo_number}-{jo_line.line_number}",
            product_sku=jo_line.fitting_b_sku,
            product_name=f"Fitting B dari {jo.jo_number}",
            initial_qty=Decimal(1),
            current_qty=Decimal(1),
            unit="PCS",
            source="DISASSEMBLY",
            source_reference=jo.jo_number,
            status=status
        )
        db.add(fitting_b_batch)
        
        disassembly_log["returned_materials"].append({
            "type": f"FITTING_B_{status}",
            "sku": jo_line.fitting_b_sku,
            "qty": 1
        })
    
    # Mark line as disassembled
    jo_line.notes = (jo_line.notes or "") + f"\n[DISASSEMBLED] {data.reason}"
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"JO Line {jo_line.line_number} berhasil dibongkar",
        "data": disassembly_log
    }
