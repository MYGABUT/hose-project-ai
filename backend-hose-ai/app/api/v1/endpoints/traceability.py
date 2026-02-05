
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import SalesOrder, JobOrder, PurchaseRequest, PurchaseOrder, InventoryBatch, BatchMovement, MovementType

router = APIRouter(prefix="/traceability", tags=["Analytics - Traceability"])

@router.get("/so/{so_id}")
def get_so_traceability(so_id: int, db: Session = Depends(get_db)):
    """
    🌳 Get Full Traceability Tree for a Sales Order
    SO -> JO -> PR -> PO
    """
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")
        
    # Build Tree
    tree = {
        "id": f"SO-{so.id}",
        "type": "SO",
        "label": f"SO: {so.so_number}",
        "status": so.status.value if so.status else "UNKNOWN",
        "details": f"Customer: {so.customer_name}",
        "children": []
    }
    
    # 1. Links to Job Orders (Production)
    for jo in so.job_orders:
        jo_node = {
            "id": f"JO-{jo.id}",
            "type": "JO",
            "label": f"JO: {jo.jo_number}",
            "status": jo.status,
            "details": f"Due: {jo.due_date}",
            "children": []
        }
        
        # Link JO to Batches (Finished Goods) - Implementation detail dependent on Batch schema
        # For now, simplistic view
        
        tree["children"].append(jo_node)
        
    # 2. Links to Purchase Requests (Procurement)
    # Direct link from SO (if added) OR inferred via logic?
    # We added `sales_order_id` to PR, so we use that.
    
    prs = db.query(PurchaseRequest).filter(PurchaseRequest.sales_order_id == so.id).all()
    for pr in prs:
        pr_node = {
            "id": f"PR-{pr.id}",
            "type": "PR",
            "label": f"PR: {pr.pr_number}",
            "status": pr.status,
            "details": f"Req: {pr.requested_by}",
            "children": []
        }
        
        # Link PR to PO
        if pr.po_id:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == pr.po_id).first()
            if po:
                po_node = {
                    "id": f"PO-{po.id}",
                    "type": "PO",
                    "label": f"PO: {po.po_number}",
                    "status": po.status,
                    "details": f"Supplier: {po.supplier_name}",
                    "children": []
                }
                pr_node["children"].append(po_node)
                
        tree["children"].append(pr_node)
        
    return {"status": "success", "data": tree}


@router.get("/batch/{batch_id}")
def get_batch_traceability(batch_id: int, db: Session = Depends(get_db)):
    """
    🧵 Get Chain of Custody for a specific Batch
    Receipt -> Movements -> Consumption
    """
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    # 1. Origin
    origin = {
        "source": batch.source_type or "UNKNOWN",
        "reference": batch.source_reference or "N/A",
        "date": batch.received_date.isoformat() if batch.received_date else None,
        "initial_qty": batch.initial_qty
    }
    
    # 2. Movement History (Chain of Custody)
    # Sort by date
    history = []
    # Use relationship or query depending on how it's set up. Assuming relationship
    movements = batch.movements if batch.movements else []
    
    for move in sorted(movements, key=lambda x: x.performed_at if x.performed_at else datetime.min):
        history.append({
            "date": move.performed_at.isoformat() if move.performed_at else None,
            "type": move.movement_type.value if hasattr(move.movement_type, 'value') else str(move.movement_type),
            "qty": move.qty,
            "from": move.from_location.code if move.from_location else "External/System",
            "to": move.to_location.code if move.to_location else "External/Consumption",
            "performed_by": move.performed_by,
            "ref_type": move.reference_type,
            "ref_number": move.reference_number,
            "notes": move.notes
        })
        
    # 3. Usage / Current Status
    status = {
        "current_qty": batch.current_qty,
        "location": batch.location.code if batch.location else "N/A",
        "status": batch.status,
        "age_days": (datetime.now() - batch.received_date.replace(tzinfo=None)).days if batch.received_date else 0
    }
    
    return {
        "status": "success",
        "data": {
            "batch_info": {
                "id": batch.id,
                "barcode": batch.barcode,
                "product": batch.product.name if batch.product else "Unknown",
                "sku": batch.product.sku if batch.product else "Unknown"
            },
            "origin": origin,
            "history": history,
            "current_status": status
        }
    }
