"""
HoseMaster WMS - Best-Fit Algorithm
Intelligent material allocation for cutting optimization

Strategy:
1. Prioritas roll SISA (< 10m) agar habis duluan
2. Jika tidak cukup, ambil roll UTUH terkecil
3. Minimize waste (sisa potongan)
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException

from app.core.config import settings
from app.models import (
    InventoryBatch, 
    Product, 
    BatchStatus,
    JOMaterial,
    JOMaterialStatus
)


class BestFitResult:
    """Result from best-fit calculation"""
    def __init__(self):
        self.can_fulfill = False
        self.allocations = []
        self.total_allocated = 0
        self.shortage = 0
        self.waste_estimate = 0


def find_best_fit_rolls(
    db: Session,
    product_id: int,
    required_length: float,
    cut_length: Optional[float] = None,
    exclude_batches: List[int] = None
) -> BestFitResult:
    """
    Find optimal rolls for cutting.
    
    Args:
        db: Database session
        product_id: Product ID to search
        required_length: Total length needed (meter)
        cut_length: Individual cut length (for waste calculation)
        exclude_batches: List of batch IDs to exclude
    
    Returns:
        BestFitResult with allocation recommendations
    """
    result = BestFitResult()
    exclude_batches = exclude_batches or []
    
    # Query available batches
    query = db.query(InventoryBatch).filter(
        and_(
            InventoryBatch.product_id == product_id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > InventoryBatch.reserved_qty,
            InventoryBatch.is_deleted == False
        )
    )
    
    if exclude_batches:
        query = query.filter(~InventoryBatch.id.in_(exclude_batches))
    
    available = query.all()
    
    if not available:
        result.shortage = required_length
        return result
    
    # Sort strategy: smallest available first (use up remnants)
    # Rolls with qty < 10m are prioritized (remnants)
    def sort_key(batch):
        avail = batch.current_qty - batch.reserved_qty
        # Remnants (< 10m) get priority (negative weight)
        is_remnant = 1000 if avail >= 10 else 0
        return is_remnant + avail
    
    available.sort(key=sort_key)
    
    remaining = required_length
    
    for batch in available:
        if remaining <= 0:
            break
        
        available_qty = batch.current_qty - batch.reserved_qty
        take = min(available_qty, remaining)
        
        # Calculate pieces if cut_length provided
        pieces = 0
        if cut_length and cut_length > 0:
            pieces = int(take / cut_length)
            take = pieces * cut_length  # Adjust to exact cut length
            if take == 0 and available_qty >= cut_length:
                pieces = 1
                take = cut_length
        
        if take > 0:
            allocation = {
                "batch_id": batch.id,
                "barcode": batch.barcode,
                "location_code": batch.location.code if batch.location else "N/A",
                "location_id": batch.location_id,
                "batch_current_qty": batch.current_qty,
                "batch_available_qty": available_qty,
                "take_qty": take,
                "pieces": pieces,
                "roll_remaining_after": batch.current_qty - take,
                "is_remnant": available_qty < 10,
            }
            result.allocations.append(allocation)
            result.total_allocated += take
            remaining -= take
    
    result.can_fulfill = remaining <= 0
    result.shortage = max(0, remaining)
    
    # Calculate estimated waste
    if cut_length and result.allocations:
        for alloc in result.allocations:
            leftover = alloc["roll_remaining_after"]
            if leftover > 0 and leftover < cut_length:
                result.waste_estimate += leftover
    
    return result


def allocate_materials_for_jo_line(
    db: Session,
    jo_line_id: int,
    product_id: int,
    total_length: float,
    cut_length: float = None
) -> Dict:
    """
    Allocate materials for a JO Line and create JOMaterial records.
    
    This reserves the rolls (increases reserved_qty).
    
    Args:
        db: Database session
        jo_line_id: JO Line ID
        product_id: Product ID for the hose
        total_length: Total length needed
        cut_length: Length per piece
    
    Returns:
        Dict with allocation result
    """
    # Get existing allocations to exclude
    existing = db.query(JOMaterial.batch_id).filter(
        JOMaterial.jo_line_id == jo_line_id
    ).all()
    exclude_ids = [e[0] for e in existing]
    
    # Find best fit
    result = find_best_fit_rolls(
        db=db,
        product_id=product_id,
        required_length=total_length,
        cut_length=cut_length,
        exclude_batches=exclude_ids
    )
    
    if not result.can_fulfill:
        return {
            "success": False,
            "message": f"Stok tidak cukup. Kurang {result.shortage:.2f} meter",
            "shortage": result.shortage,
            "allocations": result.allocations
        }
    
    # Create JOMaterial records and reserve batches
    created_materials = []
    for i, alloc in enumerate(result.allocations, start=1):
        # LOCK: Re-fetch batch with lock to prevent race conditions
        batch = db.query(InventoryBatch).filter(
            InventoryBatch.id == alloc["batch_id"]
        ).with_for_update().first()

        if not batch:
             raise HTTPException(status_code=409, detail=f"Roll {alloc['barcode']} tidak ditemukan saat alokasi")
        
        # Double check availability after lock
        if batch.available_qty < alloc["take_qty"]:
             raise HTTPException(status_code=409, detail=f"Stok berubah untuk {batch.barcode}. Silakan coba lagi.")

        # Create JOMaterial
        jo_material = JOMaterial(
            jo_line_id=jo_line_id,
            batch_id=batch.id,
            sequence_order=i,
            allocated_qty=alloc["take_qty"],
            consumed_qty=0,
            status=JOMaterialStatus.ALLOCATED
        )
        db.add(jo_material)
        
        # Reserve the batch
        batch.reserved_qty = (batch.reserved_qty or 0) + alloc["take_qty"]
        if batch.reserved_qty >= batch.current_qty * 0.99:
            batch.status = BatchStatus.RESERVED_JO
        
        created_materials.append(jo_material)
    
    db.flush()
    
    return {
        "success": True,
        "message": f"Berhasil alokasi {result.total_allocated:.2f} meter dari {len(result.allocations)} roll",
        "total_allocated": result.total_allocated,
        "materials_count": len(created_materials),
        "allocations": result.allocations,
        "waste_estimate": result.waste_estimate
    }


def get_cutting_wizard_steps(
    db: Session,
    jo_line_id: int
) -> List[Dict]:
    """
    Generate cutting wizard steps for a JO Line.
    
    Each step = 1 roll to pick and cut.
    
    Returns:
        List of wizard steps with instructions
    """
    materials = db.query(JOMaterial).filter(
        JOMaterial.jo_line_id == jo_line_id
    ).order_by(JOMaterial.sequence_order).all()
    
    steps = []
    for material in materials:
        batch = material.batch
        remaining_to_cut = material.allocated_qty - material.consumed_qty
        
        if remaining_to_cut <= 0:
            continue
        
        step = {
            "step_number": material.sequence_order,
            "material_id": material.id,
            "status": material.status.value,
            "batch": {
                "id": batch.id,
                "barcode": batch.barcode,
                "location": batch.location.code if batch.location else "N/A",
                "current_qty": batch.current_qty,
            },
            "instruction": {
                "action": "AMBIL & POTONG",
                "take_from_roll": remaining_to_cut,
                "roll_after_cut": batch.current_qty - remaining_to_cut,
                "is_finish_roll": (batch.current_qty - remaining_to_cut) < settings.WASTE_THRESHOLD_METERS,
            },
            "scan_required": material.status == JOMaterialStatus.ALLOCATED,
        }
        steps.append(step)
    
    return steps


def confirm_material_picked(
    db: Session,
    material_id: int,
    scanned_barcode: str
) -> Dict:
    """
    Confirm material has been picked (scanned by technician).
    
    Validates that correct roll was scanned.
    """
    material = db.query(JOMaterial).filter(
        JOMaterial.id == material_id
    ).first()
    
    if not material:
        return {"success": False, "error": "Material tidak ditemukan"}
    
    batch = material.batch
    if batch.barcode != scanned_barcode:
        return {
            "success": False, 
            "error": f"Barcode salah! Expected: {batch.barcode}, Scanned: {scanned_barcode}"
        }
    
    material.status = JOMaterialStatus.PICKED
    material.picked_at = db.func.now()
    db.commit()
    
    return {
        "success": True,
        "message": f"Roll {batch.barcode} berhasil diambil",
        "next_action": "Lanjutkan pemotongan"
    }


def complete_material_cutting(
    db: Session,
    material_id: int,
    qty_consumed: float
) -> Dict:
    """
    Record that material has been cut/consumed.
    
    Updates batch qty and movement log.
    """
    from app.models import log_movement, MovementType
    
    material = db.query(JOMaterial).filter(
        JOMaterial.id == material_id
    ).first()
    
    if not material:
        return {"success": False, "error": "Material tidak ditemukan"}
    
    batch = material.batch
    
    if qty_consumed > batch.current_qty:
        return {"success": False, "error": f"Qty melebihi sisa roll ({batch.current_qty}m)"}
    
    # Update material
    material.consumed_qty += qty_consumed
    material.status = JOMaterialStatus.CONSUMED
    material.consumed_at = db.func.now()
    
    # Update batch
    qty_before = batch.current_qty
    batch.current_qty -= qty_consumed
    batch.reserved_qty = max(0, batch.reserved_qty - qty_consumed)
    
    if batch.current_qty < settings.WASTE_THRESHOLD_METERS:
        batch.status = BatchStatus.CONSUMED
    else:
        batch.status = BatchStatus.AVAILABLE
    
    # Log movement
    log_movement(
        db=db,
        batch_id=batch.id,
        movement_type=MovementType.CONSUME,
        qty=qty_consumed,
        qty_before=qty_before,
        qty_after=batch.current_qty,
        from_location_id=batch.location_id,
        reference_type="JO",
        reference_id=material.jo_line.job_order.id if material.jo_line else None,
        performed_by="technician",
        notes=f"Cutting for JO Material #{material.id}"
    )
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Berhasil potong {qty_consumed}m dari roll {batch.barcode}",
        "roll_remaining": batch.current_qty,
        "roll_status": batch.status.value
    }
