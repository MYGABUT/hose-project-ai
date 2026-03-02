from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.invoice import Invoice, InvoiceLine
from app.models.delivery_order import DeliveryOrder, DOStatus
from app.models.sales_order import SalesOrder, SOLine


router = APIRouter()

def generate_invoice_number(db: Session) -> str:
    """Generate next invoice number: INV-YYYYMM-0001"""
    # 1. Get max ID
    last_id = db.query(func.max(Invoice.id)).scalar() or 0
    next_id = last_id + 1
    
    # 2. Format
    today_str = date.today().strftime("%Y%m")
    return f"INV-{today_str}-{next_id:04d}"


@router.get("/")
def get_invoices(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice)
    if status:
        query = query.filter(Invoice.status == status)
    if payment_status and payment_status != 'ALL':
        query = query.filter(Invoice.payment_status == payment_status)
        
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return {"status": "success", "data": [inv.to_dict() for inv in invoices]}

@router.get("/summary")
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_inv = db.query(func.count(Invoice.id)).scalar()
    total_outstanding = db.query(func.sum(Invoice.total - Invoice.amount_paid)).scalar() or 0
    
    overdue_count = 0 
    # Proper overdue query needs date comparison in DB or logic here
    # Simplified for now
    
    total_paid = db.query(func.sum(Invoice.amount_paid)).scalar() or 0
    
    return {
        "status": "success", 
        "data": {
            "total_invoices": total_inv,
            "total_outstanding": float(total_outstanding),
            "overdue_amount": 0, # Placeholder
            "overdue_count": 0,
            "total_paid": float(total_paid)
        }
    }

@router.post("/from-do/{do_id}")
def create_invoice_from_do(
    do_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get DO
    do = db.query(DeliveryOrder).filter(DeliveryOrder.id == do_id).first()
    if not do:
        raise HTTPException(status_code=404, detail="Delivery Order not found")
        
    if do.status != DOStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="DO must be DELIVERED to create invoice")
        
    # Check if invoice exists? (Optional: Add link in DO model to avoid dupes)
    # For now, allow multiple invoices per DO? Or check notes.
    
    # 2. Get SO
    so = db.query(SalesOrder).filter(SalesOrder.id == do.so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order not found")
        
    # 3. Create Invoice Header
    # Auto-generate Invoice Number (INV-YYYYMM-{ID})
    inv_number = generate_invoice_number(db)
    
    invoice = Invoice(
        invoice_number=inv_number,
        so_id=so.id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30), # Default 30 days
        salesman_id=so.salesman_id,
        status="DRAFT",
        created_by=current_user.email
    )
    db.add(invoice)
    db.flush() # Get ID
    
    # 4. Create Lines
    total_amount = 0
    for do_line in do.lines:
        line_qty = do_line.qty_shipped
        if line_qty <= 0:
            continue
            
        # Find price from SO Line
        so_line = db.query(SOLine).filter(SOLine.id == do_line.so_line_id).first()
        unit_price = so_line.unit_price if so_line else 0
        
        line_subtotal = float(unit_price) * float(line_qty)
        total_amount += line_subtotal
        
        inv_line = InvoiceLine(
            invoice_id=invoice.id,
            product_id=do_line.product_id,
            description=do_line.description,
            qty=line_qty,
            unit="PCS", # Should get from Product/SO
            unit_price=unit_price,
            subtotal=line_subtotal
        )
        db.add(inv_line)
        
    # 5. Calc Tax & Total
    invoice.subtotal = total_amount
    invoice.dpp = total_amount
    invoice.tax_rate = 11
    invoice.tax_amount = total_amount * 0.11
    invoice.total = total_amount * 1.11
    invoice.amount_due = invoice.total
    
    db.commit()
    db.refresh(invoice)
    
    return {"status": "success", "message": "Invoice Created", "data": invoice.to_dict()}

@router.post("/{inv_id}/payment")
def record_payment(
    inv_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    amount = payload.get("amount", 0)
    invoice = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.amount_paid = float(invoice.amount_paid or 0) + float(amount)
    
    if invoice.amount_paid >= invoice.total:
        invoice.payment_status = "PAID"
        invoice.status = "PAID"
    elif invoice.amount_paid > 0:
        invoice.payment_status = "PARTIAL"
        
    db.commit()
    return {"status": "success", "data": invoice.to_dict()}
