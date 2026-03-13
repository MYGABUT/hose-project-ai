
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.helpers import get_enum_value
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
            "type": get_enum_value(move.movement_type),
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

@router.get("/document-flow/{entity_type}/{entity_id}")
def get_document_flow(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    """
    🌐 Visual Relationship Map (SAP B1 Style)
    Retrieves the lineage of a document: 
    Quotation -> Sales Order -> (Job Order) -> Delivery Order -> Invoice -> Payment
    """
    nodes = []
    edges = []
    
    # Helper to add node safely
    def add_node(n_id, n_type, n_label, n_status, amount=None, date=None):
        import datetime
        dt = date.isoformat() if isinstance(date, datetime.date) or isinstance(date, datetime.datetime) else date
        if not any(n['id'] == n_id for n in nodes):
            nodes.append({
                "id": n_id,
                "type": n_type,
                "label": n_label,
                "status": n_status,
                "amount": amount,
                "date": dt
            })
            
    def add_edge(src, tgt):
        if not any(e['source'] == src and e['target'] == tgt for e in edges):
            edges.append({"source": src, "target": tgt})

    so = None
    
    # Resolve the anchor entity
    if entity_type.upper() == 'SO':
        so = db.query(SalesOrder).filter(SalesOrder.id == entity_id).first()
    elif entity_type.upper() == 'JO':
        jo = db.query(JobOrder).filter(JobOrder.id == entity_id).first()
        if jo and jo.sales_order_id:
            so = db.query(SalesOrder).filter(SalesOrder.id == jo.sales_order_id).first()
    # If other types clicked (DO, INV), we could resolve back to SO, but for now we assume entry is predominantly SO.

    if not so:
        raise HTTPException(status_code=404, detail=f"Base Sales Order not found for trace")

    # 1. Base Node (Sales Order)
    so_node_id = f"SO-{so.id}"
    add_node(so_node_id, "SalesOrder", so.so_number, so.status.value if so.status else "UNKNOWN", float(so.total or 0), so.order_date)

    # 2. Upstream: Quotation
    # Need to check models for direct linkage. Assuming quotation_id on SO if it exists.
    # We will use raw SQL for generic flexibility across potentially loosely coupled tables
    from sqlalchemy import text
    
    try:
        quo_res = db.execute(text("SELECT id, quotation_number, status, total_amount, quotation_date FROM quotations WHERE id = (SELECT quotation_id FROM sales_orders WHERE id = :sid LIMIT 1)"), {"sid": so.id}).fetchone()
        if quo_res:
            quo_node_id = f"QT-{quo_res.id}"
            add_node(quo_node_id, "Quotation", quo_res.quotation_number, quo_res.status, float(quo_res.total_amount), quo_res.quotation_date)
            add_edge(quo_node_id, so_node_id)
    except Exception as e:
        db.rollback()  # Prevent transaction poisoning

    # 3. Downstream: Job Orders
    try:
        jo_res = db.execute(text("SELECT id, jo_number, status, due_date FROM job_orders WHERE so_id = :sid"), {"sid": so.id}).fetchall()
        for j in jo_res:
            jo_id = f"JO-{j.id}"
            add_node(jo_id, "JobOrder", j.jo_number, j.status, None, j.due_date)
            add_edge(so_node_id, jo_id)
    except Exception as e:
        db.rollback()

    # 4. Downstream: Delivery Orders
    try:
        do_res = db.execute(text("SELECT id, do_number, status, delivery_date FROM delivery_orders WHERE so_id = :sid"), {"sid": so.id}).fetchall()
        for d in do_res:
            do_id = f"DO-{d.id}"
            add_node(do_id, "DeliveryOrder", d.do_number, d.status, None, d.delivery_date)
            add_edge(so_node_id, do_id)
    except Exception as e:
        db.rollback()
        
        # Delivery Order might spawn Invoices technically, or SO does. 

    # 5. Downstream: Invoices
    try:
        inv_res = db.execute(text("SELECT id, invoice_number, status, total, invoice_date FROM invoices WHERE so_id = :sid"), {"sid": so.id}).fetchall()
        for i in inv_res:
            inv_id = f"INV-{i.id}"
            add_node(inv_id, "Invoice", i.invoice_number, i.status, float(i.total), i.invoice_date)
            
            # Link Invoice from DO if available, else SO
            # For simplicity in this graph logic, we link from SO
            add_edge(so_node_id, inv_id)
            
            # 6. Downstream: Payments linked to Invoice
            try:
                pay_res = db.execute(text("SELECT id, payment_number, status, amount, payment_date FROM payments WHERE invoice_id = :iid"), {"iid": i.id}).fetchall()
                for p in pay_res:
                    pay_id = f"PAY-{p.id}"
                    add_node(pay_id, "Payment", p.payment_number, p.status, float(p.amount), p.payment_date)
                    add_edge(inv_id, pay_id)
            except Exception as e:
                db.rollback()  # Prevent transaction poisoning
    except Exception as e:
        db.rollback()  # Prevent transaction poisoning

    return {
        "status": "success",
        "data": {
            "nodes": nodes,
            "edges": edges
        }
    }
