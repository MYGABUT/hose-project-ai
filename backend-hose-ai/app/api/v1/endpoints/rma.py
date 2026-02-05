"""
HoseMaster WMS - RMA API
Customer Return Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, desc
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.rma import RMATicket, RMAStatus, RMARootCause, RMASolution

router = APIRouter(prefix="/rma", tags=["RMA"])

# Schema
class RMACreate(BaseModel):
    client: str
    invoice: str
    item: str
    qty: int
    rootCause: Optional[str] = None
    supplier: Optional[str] = None
    solution: Optional[str] = None

class RMAUpdate(BaseModel):
    status: Optional[str] = None
    rootCause: Optional[str] = None
    supplier: Optional[str] = None
    solution: Optional[str] = None

@router.get("/rma")
def list_rma_tickets(
    status: str = Query("all"),
    db: Session = Depends(get_db)
):
    """📋 List all RMA Tickets"""
    query = db.query(RMATicket)
    
    if status != "all":
        query = query.filter(RMATicket.status == status)
        
    tickets = query.order_by(RMATicket.created_at.desc()).limit(100).all()
    
    return {
        "status": "success",
        "data": [t.to_dict() for t in tickets]
    }

@router.post("/rma")
def create_rma_ticket(
    data: RMACreate,
    db: Session = Depends(get_db)
):
    """➕ Create New RMA Ticket"""
    
    # Generate ID: RMA-YYYY-XXX
    year = datetime.now().year
    count = db.query(RMATicket).filter(
        sqlfunc.extract('year', RMATicket.created_at) == year
    ).count() + 1
    
    ticket_id = f"RMA-{year}-{count:03d}"
    
    new_ticket = RMATicket(
        ticket_number=ticket_id,
        customer_name=data.client,
        invoice_number=data.invoice,
        product_name=data.item,
        qty=data.qty,
        status=RMAStatus.NEW,
        root_cause=data.rootCause,
        supplier_name=data.supplier,
        solution=data.solution
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    return {
        "status": "success",
        "message": f"Tiket RMA {ticket_id} berhasil dibuat",
        "data": new_ticket.to_dict()
    }

@router.put("/rma/{ticket_id}")
def update_rma_ticket(
    ticket_id: str,
    data: RMAUpdate,
    db: Session = Depends(get_db)
):
    """✏️ Update RMA Ticket"""
    # Find by ticket number (frontend uses RMA-xxx) or DB ID?
    # Let's support ticket_number
    ticket = db.query(RMATicket).filter(RMATicket.ticket_number == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Tiket tidak ditemukan")
        
    if data.status:
        ticket.status = data.status
        
    if data.rootCause:
        ticket.root_cause = data.rootCause
        
    if data.supplier:
        ticket.supplier_name = data.supplier
        
    if data.solution:
        ticket.solution = data.solution
        
    # LOGIC FOR RESTOCKING
    if ticket.status == "closed" and ticket.solution == "restock":
        # Check if we haven't already restocked (to prevent double count)
        # For now, simplistic check. Ideal: have a flag is_restocked
        
        # We need to find the product ID or create a new batch
        # Since RMATicket uses product_name, we try to find Product by name or create a 'RETURN' batch
        from app.models import Product, InventoryBatch, BatchStatus, StorageLocation
        
        # Try to find product
        product = db.query(Product).filter(Product.name == ticket.product_name).first()
        
        if product:
             # Find a default return location or just put in 'GUDANG_UTAMA'
            location = db.query(StorageLocation).filter(StorageLocation.code == "RETUR-AREA").first()
            if not location:
                # Fallback to first available location or create dummy
                location = db.query(StorageLocation).first()
                
            if location:
                 # Create new Batch for the returned item
                new_batch = InventoryBatch(
                    product_id=product.id,
                    location_id=location.id,
                    batch_number=f"RET-{ticket.ticket_number}",
                    barcode=f"RMA-{ticket.ticket_number}",
                    current_qty=ticket.qty,
                    initial_qty=ticket.qty,
                    status=BatchStatus.QC_PENDING, # Needs Inspection
                    source_type="RMA_RETURN",
                    source_reference=ticket.ticket_number,
                    notes=f"Restock from RMA {ticket.ticket_number}"
                )
                db.add(new_batch)
                print(f"[SUCCESS] Auto-restocked RMA item as new batch: {new_batch.barcode}")
    
    db.commit()
    db.refresh(ticket)
    
    return {
        "status": "success",
        "message": "Tiket berhasil diupdate",
        "data": ticket.to_dict()
    }
