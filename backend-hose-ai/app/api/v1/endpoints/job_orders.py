"""
HoseMaster WMS - Job Order & Cutting Wizard API
Production management with Best-Fit material allocation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.core.config import settings
from app.models import (
    JobOrder, JOLine, JOMaterial,
    SalesOrder, SOLine, Product,
    JOStatus, JOMaterialStatus, SOStatus, BatchStatus
)
from app.services.best_fit import (
    find_best_fit_rolls,
    allocate_materials_for_jo_line,
    get_cutting_wizard_steps,
    confirm_material_picked,
    complete_material_cutting
)


router = APIRouter(prefix="/jo", tags=["Job Orders"])


# ============ Schemas ============

class JOCreateFromSO(BaseModel):
    """Create JO from SO"""
    so_id: int
    so_line_ids: Optional[List[int]] = None  # If None, create for all lines
    priority: int = 3
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    requires_assembly: bool = True  # False = skip cutting wizard, ready for delivery


class MaterialScanConfirm(BaseModel):
    """Confirm material picked"""
    material_id: int
    scanned_barcode: str


class MaterialCutComplete(BaseModel):
    """Complete material cutting"""
    material_id: int
    qty_consumed: float


class JOLineProgress(BaseModel):
    """Update JO Line Progress"""
    qty_completed: int
    notes: Optional[str] = None


class JOMaterialSubstitute(BaseModel):
    """Schema for manual material substitution"""
    original_material_id: int
    new_batch_id: int
    quantity: float
    reason: Optional[str] = "Manual Substitution"



# ============ Helper Functions ============

def generate_jo_number():
    """Generate unique JO number"""
    today = datetime.now()
    random_part = uuid.uuid4().hex[:6].upper()
    return f"JO-{today.strftime('%Y%m%d')}-{random_part}"


# ============ Endpoints ============

# Static routes MUST come before dynamic routes (/{jo_id})

@router.get("/preview-allocation")
def preview_material_allocation(
    product_id: int,
    length: float,
    cut_length: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Preview best-fit allocation without creating JO.
    
    Use this to show user what rolls will be used.
    """
    result = find_best_fit_rolls(
        db=db,
        product_id=product_id,
        required_length=length,
        cut_length=cut_length
    )
    
    return {
        "status": "success",
        "data": {
            "can_fulfill": result.can_fulfill,
            "total_allocated": result.total_allocated,
            "shortage": result.shortage,
            "waste_estimate": result.waste_estimate,
            "allocations": result.allocations
        }
    }


@router.get("")
def list_job_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[int] = None,
    assigned_to: Optional[str] = None,
    so_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get list of job orders"""
    query = db.query(JobOrder)
    
    if status:
        try:
            status_enum = JOStatus(status)
            query = query.filter(JobOrder.status == status_enum)
        except ValueError:
            pass # Or standard string filter if enum conversion fails
            query = query.filter(JobOrder.status == status)
            
    if so_id:
        query = query.filter(JobOrder.so_id == so_id)
    
    if priority:
        query = query.filter(JobOrder.priority == priority)
    
    if assigned_to:
        query = query.filter(JobOrder.assigned_to.ilike(f"%{assigned_to}%"))
    
    total = query.count()
    orders = query.order_by(
        JobOrder.priority,
        JobOrder.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "data": [o.to_dict_simple() for o in orders],
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit
        }
    }


# ============ Outstanding JO Tracker (MUST be before /{jo_id}) ============

@router.get("/tracking/outstanding")
def get_outstanding_jos(
    db: Session = Depends(get_db)
):
    """
    📦 Outstanding JO Tracker — Partial Shipment Monitor
    
    Returns all JOs that are not fully completed/delivered,
    with line-level breakdown of ordered vs completed.
    """
    from app.models.enums import JOStatus
    
    # Get all JOs that are not COMPLETED or CANCELLED
    active_statuses = ['DRAFT', 'MATERIALS_RESERVED', 'IN_PROGRESS', 'PARTIAL']
    
    jos = db.query(JobOrder).filter(
        JobOrder.status.in_(active_statuses)
    ).order_by(JobOrder.due_date.asc()).all()
    
    outstanding = []
    total_pending = 0
    
    for jo in jos:
        lines_summary = []
        jo_total_ordered = 0
        jo_total_completed = 0
        
        for line in jo.lines:
            ordered = line.qty_ordered or 0
            completed = line.qty_completed or 0
            pending = ordered - completed
            jo_total_ordered += ordered
            jo_total_completed += completed
            total_pending += pending
            
            lines_summary.append({
                "line_number": line.line_number,
                "description": line.description,
                "qty_ordered": ordered,
                "qty_completed": completed,
                "qty_pending": pending,
                "progress_pct": round((completed / ordered * 100) if ordered > 0 else 0, 1)
            })
        
        outstanding.append({
            "jo_id": jo.id,
            "jo_number": jo.jo_number,
            "so_number": jo.sales_order.so_number if jo.sales_order else None,
            "customer_name": jo.sales_order.customer_name if jo.sales_order else None,
            "status": jo.status,
            "priority": jo.priority,
            "assigned_to": jo.assigned_to,
            "requires_assembly": jo.requires_assembly,
            "due_date": jo.due_date.isoformat() if jo.due_date else None,
            "total_ordered": jo_total_ordered,
            "total_completed": jo_total_completed,
            "total_pending": jo_total_ordered - jo_total_completed,
            "progress_pct": round((jo_total_completed / jo_total_ordered * 100) if jo_total_ordered > 0 else 0, 1),
            "lines": lines_summary
        })
    
    return {
        "status": "success",
        "summary": {
            "total_active_jos": len(outstanding),
            "total_pending_qty": total_pending,
            "urgent_count": sum(1 for j in outstanding if j["priority"] <= 2)
        },
        "data": outstanding
    }


# ============ JO Detail (path-param routes below) ============

@router.get("/{jo_id}")
def get_job_order(
    jo_id: int,
    db: Session = Depends(get_db)
):
    """Get JO detail with lines and materials"""
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    return {
        "status": "success",
        "data": jo.to_dict()
    }


@router.post("/create-from-so")
def create_jo_from_so(
    data: JOCreateFromSO,
    db: Session = Depends(get_db)
):
    """
    Create Job Order from Sales Order.
    
    Auto-allocates materials using Best-Fit Algorithm.
    """
    # Get SO
    so = db.query(SalesOrder).filter(
        SalesOrder.id == data.so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if so.status not in [SOStatus.CONFIRMED, SOStatus.PARTIAL_JO]:
        raise HTTPException(status_code=400, detail="SO harus dikonfirmasi terlebih dahulu")
    
    # Get lines to process
    if data.so_line_ids:
        so_lines = [l for l in so.lines if l.id in data.so_line_ids and l.qty_pending > 0]
    else:
        so_lines = [l for l in so.lines if l.qty_pending > 0]
    
    if not so_lines:
        raise HTTPException(status_code=400, detail="Tidak ada item yang perlu diproduksi")
    
    # Create JO
    jo = JobOrder(
        jo_number=generate_jo_number(),
        so_id=so.id,
        status=JOStatus.DRAFT,
        priority=data.priority,
        due_date=data.due_date or so.required_date,
        assigned_to=data.assigned_to,
        requires_assembly=data.requires_assembly,
        notes=data.notes,
        created_by="system"
    )
    db.add(jo)
    db.flush()
    
    # Create JO Lines and allocate materials
    allocation_results = []
    total_steps = 0
    
    for i, so_line in enumerate(so_lines, start=1):
        # Create JO Line
        jo_line = JOLine(
            jo_id=jo.id,
            so_line_id=so_line.id,
            product_id=so_line.product_id,
            line_number=i,
            description=so_line.description,
            hose_type=so_line.hose_product.specifications.get('standard') if so_line.hose_product and so_line.hose_product.specifications else None,
            hose_size=so_line.hose_product.specifications.get('size_inch') if so_line.hose_product and so_line.hose_product.specifications else None,
            cut_length=so_line.cut_length,
            fitting_a_code=None,
            fitting_b_code=None,
            qty_ordered=so_line.qty_pending,
            total_hose_length=so_line.cut_length * so_line.qty_pending if so_line.cut_length else 0
        )
        db.add(jo_line)
        db.flush()
        
        # Auto-allocate materials if hose assembly
        if so_line.is_assembly and so_line.hose_product_id and jo_line.total_hose_length > 0:
            result = allocate_materials_for_jo_line(
                db=db,
                jo_line_id=jo_line.id,
                product_id=so_line.hose_product_id,
                total_length=jo_line.total_hose_length,
                cut_length=so_line.cut_length
            )
            allocation_results.append({
                "line": jo_line.line_number,
                "description": jo_line.description,
                "result": result
            })
            total_steps += result.get("materials_count", 0)
    
    jo.total_steps = total_steps
    
    # Update JO status based on allocation or skip-assembly flag
    if not data.requires_assembly:
        # Non-assembly JO — skip cutting wizard, mark as ready
        jo.status = JOStatus.COMPLETED if hasattr(JOStatus, 'COMPLETED') else 'COMPLETED'
        jo.notes = (jo.notes or '') + "\n🚀 Skip Assembly — langsung siap kirim"
    else:
        all_success = all(r["result"].get("success", False) for r in allocation_results if r["result"])
        if total_steps > 0 and all_success:
            jo.status = JOStatus.MATERIALS_RESERVED
        elif total_steps > 0:
            jo.status = JOStatus.DRAFT  # Partial allocation
    
    # Update SO status
    remaining_lines = [l for l in so.lines if l.qty_pending > 0 and l.id not in [sol.id for sol in so_lines]]
    if remaining_lines:
        so.status = SOStatus.PARTIAL_JO
    else:
        so.status = SOStatus.FULL_JO
    
    db.commit()
    db.refresh(jo)
    
    return {
        "status": "success",
        "message": f"Job Order {jo.jo_number} berhasil dibuat",
        "data": jo.to_dict(),
        "allocations": allocation_results
    }


class JOMaterialAdd(BaseModel):
    """Schema for manually adding material"""
    batch_id: int
    quantity: float
    
@router.post("/{jo_id}/lines/{line_id}/add-material")
def add_material(
    jo_id: int,
    line_id: int,
    data: JOMaterialAdd,
    db: Session = Depends(get_db)
):
    """
    ➕ Manual Material Addition
    
    Allows user to manually allocate a batch to a JO Line.
    Useful when auto-allocation failed (stock empty) or for custom additions.
    """
    from app.models import InventoryBatch, BatchMovement, MovementType
    
    # 1. Get JO and Line
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    if not jo or jo.status not in [JOStatus.DRAFT, JOStatus.MATERIALS_RESERVED]:
        raise HTTPException(status_code=400, detail="JO cannot be modified in current status")
        
    line = db.query(JOLine).filter(JOLine.id == line_id, JOLine.jo_id == jo_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="JO Line not found")
        
    # 2. Get Batch
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.id == data.batch_id,
        InventoryBatch.is_deleted == False
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    if batch.available_qty < data.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient qty in batch (Available: {batch.available_qty})")

    # 3. Reserve Batch
    batch.reserved_qty = (batch.reserved_qty or 0) + data.quantity
    
    # 4. Create Allocation Record
    # Determine sequence
    last_seq = 0
    if line.materials:
        last_seq = max([m.sequence_order for m in line.materials], default=0)
        
    new_material = JOMaterial(
        jo_line_id=line.id,
        batch_id=batch.id,
        sequence_order=last_seq + 1,
        allocated_qty=data.quantity,
        consumed_qty=0,
        status=JOMaterialStatus.ALLOCATED
    )
    db.add(new_material)
    
    # 5. Update Status if needed
    # If we added material to a DRAFT JO, and now it has materials, maybe valid to move to RESERVED?
    # Or just leave it to the user to 'Start'. 
    # But if it was DRAFT due to missing materials, we should check if lines are now covered.
    # For simplicity, if we add material, we ensure status is at least MATERIALS_RESERVED if it was DRAFT, as manual intervention implies "Ready" or "fixing".
    if jo.status == JOStatus.DRAFT:
        jo.status = JOStatus.MATERIALS_RESERVED
    
    # Add note
    line.notes = (line.notes or "") + f"\n[{datetime.now().strftime('%H:%M')}] Manually added {batch.barcode} ({data.quantity})"
    
    db.commit()
    db.refresh(new_material)
    
    return {
        "status": "success",
        "message": f"Material added successfully",
        "data": new_material.to_dict()
    }


@router.get("/{jo_id}/wizard")
def get_wizard_steps(
    jo_id: int,
    line_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get cutting wizard steps for JO.
    
    Returns step-by-step instructions for technician.
    """
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    wizard_data = {
        "jo_number": jo.jo_number,
        "status": jo.status.value,
        "current_step": jo.current_step,
        "total_steps": jo.total_steps,
        "lines": []
    }
    
    for jo_line in jo.lines:
        if line_number and jo_line.line_number != line_number:
            continue
        
        steps = get_cutting_wizard_steps(db, jo_line.id)
        
        line_data = {
            "id": jo_line.id,
            "line_number": jo_line.line_number,
            "description": jo_line.description,
            "target": {
                "qty": jo_line.qty_ordered,
                "cut_length": jo_line.cut_length,
                "total_length": jo_line.total_hose_length
            },
            "progress": {
                "completed": jo_line.qty_completed,
                "pending": jo_line.qty_pending
            },
            "steps": steps
        }
        wizard_data["lines"].append(line_data)
    
    return {
        "status": "success",
        "data": wizard_data
    }


@router.post("/scan-material")
def scan_material(
    data: MaterialScanConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm material picked by scanning barcode.
    
    Validates correct roll was taken.
    """
    result = confirm_material_picked(
        db=db,
        material_id=data.material_id,
        scanned_barcode=data.scanned_barcode
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "success",
        **result
    }


@router.post("/complete-cut")
def complete_cut(
    data: MaterialCutComplete,
    db: Session = Depends(get_db)
):
    """
    Record completed cutting of material.
    
    Updates batch qty and logs movement.
    """
    result = complete_material_cutting(
        db=db,
        material_id=data.material_id,
        qty_consumed=data.qty_consumed
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {
        "status": "success",
        **result
    }


@router.post("/{jo_id}/lines/{line_id}/update-progress")
def update_line_progress(
    jo_id: int,
    line_id: int,
    data: JOLineProgress,
    db: Session = Depends(get_db)
):
    """
    Update JO Line progress (e.g. after crimping).
    """
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
        
    line = db.query(JOLine).filter(
        JOLine.id == line_id,
        JOLine.jo_id == jo_id
    ).first()
    
    if not line:
        raise HTTPException(status_code=404, detail="JO Line tidak ditemukan")
        
    # Validate qty
    if line.qty_completed + data.qty_completed > line.qty_ordered:
        raise HTTPException(
            status_code=400, 
            detail=f"Qty melebihi order (Max: {line.qty_ordered}, Current: {line.qty_completed})"
        )
        
    line.qty_completed += data.qty_completed
    
    if data.notes:
        line.notes = (line.notes or "") + f"\n[PROGRESS] {data.notes}"
        
    db.commit()
    db.refresh(line) # Refresh to get latest state
    
    # Check if ALL lines are completed
    # We need to query the JO again or refresh it to get updated lines
    db.refresh(jo)
    
    all_completed = True
    for l in jo.lines:
        if l.qty_completed < l.qty_ordered:
            all_completed = False
            break
            
    if all_completed and jo.status == JOStatus.IN_PROGRESS:
        jo.status = JOStatus.QC_PENDING
        # Add note
        jo.notes = (jo.notes or "") + "\n[SYSTEM] Production completed. Moved to QC."
        db.commit()
    
    return {
        "status": "success",
        "message": f"Progress updated for Line {line.line_number}",
        "data": line.to_dict()
    }


@router.post("/{jo_id}/start")
def start_job_order(
    jo_id: int,
    db: Session = Depends(get_db)
):
    """Start JO production"""
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    jo.status = JOStatus.IN_PROGRESS
    jo.started_at = datetime.now()
    jo.current_step = 1
    
    db.commit()
    
    # 🔗 INTEGRATION: Check materials + reorder alerts
    integration_result = None
    try:
        from app.services.integration import on_jo_started
        integration_result = on_jo_started(db, jo_id)
    except Exception as e:
        import logging
        logging.getLogger("integration").warning(f"Integration hook failed: {e}")
    
    return {
        "status": "success",
        "message": f"JO {jo.jo_number} dimulai",
        "data": jo.to_dict_simple(),
        "integration": integration_result
    }


@router.post("/{jo_id}/complete")
def complete_job_order(
    jo_id: int,
    db: Session = Depends(get_db)
):
    """
    Complete JO - creates finished goods batch in staging.
    Also calculates HPP (Harga Pokok Produksi) for each line.
    """
    from app.models import InventoryBatch, StorageLocation
    
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    # Update JO status
    jo.status = JOStatus.COMPLETED
    jo.completed_at = datetime.now()
    
    # Calculate HPP and create finished goods
    finished_batches = []
    total_hpp = 0
    labor_cost_per_unit = settings.LABOR_COST_PER_UNIT  # Configured in settings
    
    for jo_line in jo.lines:
        # Calculate line HPP
        line_hpp = 0
        hose_cost = 0
        fitting_a_cost = 0
        fitting_b_cost = 0
        labor = labor_cost_per_unit * jo_line.qty_ordered
        
        # Get hose cost from materials
        for material in jo_line.materials:
            if material.batch and material.batch.product:
                product = material.batch.product
                if product.cost_price:
                    # Cost = price per meter * consumed qty
                    hose_cost += int(product.cost_price * material.consumed_qty)
        
        # Get fitting costs from SO line
        if jo_line.so_line:
            # Fitting A
            if jo_line.so_line.fitting_a_id:
                fitting_a = db.query(Product).filter(Product.id == jo_line.so_line.fitting_a_id).first()
                if fitting_a and fitting_a.cost_price:
                    fitting_a_cost = fitting_a.cost_price * jo_line.qty_ordered
            
            # Fitting B
            if jo_line.so_line.fitting_b_id:
                fitting_b = db.query(Product).filter(Product.id == jo_line.so_line.fitting_b_id).first()
                if fitting_b and fitting_b.cost_price:
                    fitting_b_cost = fitting_b.cost_price * jo_line.qty_ordered
        
        # Calculate total line HPP
        line_hpp = hose_cost + fitting_a_cost + fitting_b_cost + labor
        
        # Update JO Line HPP fields
        jo_line.line_hpp = line_hpp
        jo_line.hose_cost = hose_cost
        jo_line.fitting_a_cost = fitting_a_cost
        jo_line.fitting_b_cost = fitting_b_cost
        jo_line.labor_cost = labor
        
        total_hpp += line_hpp
        
        # Update SO Line qty_produced
        if jo_line.so_line:
            jo_line.so_line.qty_produced += jo_line.qty_completed
        
        # Find or create staging location
        staging = db.query(StorageLocation).filter(
            StorageLocation.zone == "STAGING"
        ).first()
        
        if not staging:
             # Create STAGING if missing
             staging = StorageLocation(zone="STAGING", code="STG-01", name="Staging Area")
             db.add(staging)
             db.flush()
        
        if staging and jo_line.product_id:
            # Create finished goods batch
            batch = InventoryBatch(
                product_id=jo_line.product_id,
                batch_number=f"FG-{jo.jo_number}-{jo_line.line_number}",
                location_id=staging.id,
                initial_qty=jo_line.qty_completed,
                current_qty=jo_line.qty_completed,
                # unit="pcs",  <-- REMOVED
                source_type="PRODUCTION", 
                source_reference=jo.jo_number,
                status=BatchStatus.AVAILABLE.value
            )
            db.add(batch)
            finished_batches.append(batch.batch_number)
    
    # Update total HPP on JO
    jo.total_hpp = total_hpp
    
    db.commit()
    
    # 🔗 INTEGRATION: Auto-create Draft DO from completed JO
    integration_result = None
    try:
        from app.services.integration import on_jo_completed
        integration_result = on_jo_completed(db, jo_id)
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger("integration").warning(f"Integration hook failed: {e}")
    
    return {
        "status": "success",
        "message": f"JO {jo.jo_number} selesai. HPP: Rp {total_hpp:,}",
        "data": jo.to_dict(),
        "hpp_breakdown": {
            "total_hpp": total_hpp,
            "lines": [
                {
                    "line": line.line_number,
                    "description": line.description,
                    "hose_cost": line.hose_cost,
                    "fitting_a_cost": line.fitting_a_cost,
                    "fitting_b_cost": line.fitting_b_cost,
                    "labor_cost": line.labor_cost,
                    "line_hpp": line.line_hpp
                }
                for line in jo.lines
            ]
        },
        "finished_batches": finished_batches,
        "integration": integration_result
    }

