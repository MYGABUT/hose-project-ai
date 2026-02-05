"""
HoseMaster WMS - Invoice API
Create invoices from Sales Orders, track payments
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.config import settings
from app.models import Invoice, InvoiceLine, SalesOrder, SOLine, Customer


router = APIRouter(prefix="/invoices", tags=["Invoices"])


# ============ Helpers ============

def generate_invoice_number(db: Session) -> str:
    """Generate invoice number: INV-YYYYMM-XXX"""
    today = date.today()
    prefix = f"INV-{today.strftime('%Y%m')}"
    
    count = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"{prefix}%")
    ).count()
    
    return f"{prefix}-{count + 1:03d}"


# ============ Schemas ============

class CreateInvoiceRequest(BaseModel):
    due_days: int = 30
    include_tax: bool = True
    tax_rate: float = settings.DEFAULT_TAX_RATE
    notes: Optional[str] = None
    terms: Optional[str] = "Pembayaran dalam 30 hari"


class RecordPaymentRequest(BaseModel):
    amount: float
    payment_date: Optional[str] = None
    payment_method: Optional[str] = "TRANSFER"
    reference: Optional[str] = None


# ============ Endpoints ============

@router.get("")
def list_invoices(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_name: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📋 List all invoices with filters"""
    query = db.query(Invoice)
    
    if status:
        query = query.filter(Invoice.status == status)
    if payment_status:
        query = query.filter(Invoice.payment_status == payment_status)
    if customer_name:
        query = query.filter(Invoice.customer_name.ilike(f"%{customer_name}%"))
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [inv.to_dict() for inv in invoices]
    }


@router.get("/summary")
def invoice_summary(db: Session = Depends(get_db)):
    """📊 Get invoice summary - total, unpaid, overdue"""
    today = date.today()
    
    # Totals
    total_invoices = db.query(Invoice).count()
    total_amount = db.query(sqlfunc.sum(Invoice.total)).scalar() or 0
    total_paid = db.query(sqlfunc.sum(Invoice.amount_paid)).scalar() or 0
    
    # Unpaid
    unpaid = db.query(Invoice).filter(Invoice.payment_status != 'PAID').count()
    unpaid_amount = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID'
    ).scalar() or 0
    
    # Overdue
    overdue = db.query(Invoice).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date < today
    ).count()
    overdue_amount = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date < today
    ).scalar() or 0
    
    return {
        "status": "success",
        "data": {
            "total_invoices": total_invoices,
            "total_amount": float(total_amount),
            "total_paid": float(total_paid),
            "total_outstanding": float(total_amount) - float(total_paid),
            "unpaid_count": unpaid,
            "unpaid_amount": float(unpaid_amount),
            "overdue_count": overdue,
            "overdue_amount": float(overdue_amount)
        }
    }


@router.post("/from-so/{so_id}")
def create_invoice_from_so(
    so_id: int,
    data: CreateInvoiceRequest,
    db: Session = Depends(get_db)
):
    """
    🧾 Create Invoice from Sales Order
    
    Auto-generates invoice number and copies SO lines
    """
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    # Check if invoice already exists for this SO
    existing = db.query(Invoice).filter(Invoice.so_id == so_id).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Invoice sudah ada: {existing.invoice_number}"
        )
    
    # Generate invoice number
    invoice_number = generate_invoice_number(db)
    
    # Calculate amounts
    subtotal = float(so.total or 0)
    tax_amount = 0
    if data.include_tax:
        tax_amount = subtotal * (data.tax_rate / 100)
    total = subtotal + tax_amount
    
    # Get customer info
    customer = None
    if so.customer_id:
        customer = db.query(Customer).filter(Customer.id == so.customer_id).first()
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        so_id=so.id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        customer_address=customer.address if customer else None,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=data.due_days),
        subtotal=Decimal(str(subtotal)),
        tax_rate=Decimal(str(data.tax_rate)) if data.include_tax else Decimal(0),
        tax_amount=Decimal(str(tax_amount)),
        total=Decimal(str(total)),
        status='DRAFT',
        payment_status='UNPAID',
        notes=data.notes,
        terms=data.terms
    )
    
    db.add(invoice)
    db.flush()
    
    # Copy SO lines to invoice lines
    so_lines = db.query(SOLine).filter(SOLine.so_id == so_id).all()
    for idx, sol in enumerate(so_lines, 1):
        inv_line = InvoiceLine(
            invoice_id=invoice.id,
            line_number=idx,
            product_id=sol.product_id,
            product_sku=sol.hose_spec,
            description=f"{sol.hose_spec} - {sol.length}m" if sol.length else sol.hose_spec,
            qty=sol.qty,
            unit="PCS",
            unit_price=sol.unit_price,
            subtotal=sol.subtotal
        )
        db.add(inv_line)
    
    db.commit()
    db.refresh(invoice)
    
    return {
        "status": "success",
        "message": f"Invoice {invoice_number} berhasil dibuat",
        "data": invoice.to_dict()
    }


@router.post("/from-do/{do_id}")
def create_invoice_from_do(
    do_id: int,
    data: CreateInvoiceRequest,
    db: Session = Depends(get_db)
):
    """
    🧾 Create Invoice from Delivery Order
    
    Generates invoice based on ACTUALLY DELIVERED quantities.
    """
    from app.models import DeliveryOrder, DOLine, DOStatus
    
    do = db.query(DeliveryOrder).filter(DeliveryOrder.id == do_id).first()
    if not do:
        raise HTTPException(status_code=404, detail="Delivery Order tidak ditemukan")
    
    if do.status != DOStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Hanya DO yang sudah terkirim (DELIVERED) yang bisa ditagih")
    
    # Check if invoice already exists for this DO (check notes/so_id combo roughly or implement strict check later)
    # Ideally checking if we have already invoiced this DO. 
    # For now, we trust the user not to double invoice or we check note content.
    existing = db.query(Invoice).filter(
        Invoice.so_id == do.so_id, 
        Invoice.notes.like(f"%{do.do_number}%")
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Invoice sepertinya sudah ada untuk DO ini: {existing.invoice_number}"
        )
    
    so = do.sales_order
    if not so:
         raise HTTPException(status_code=404, detail="Sales Order terkait tidak ditemukan")

    # Generate invoice number
    invoice_number = generate_invoice_number(db)
    
    # Calculate amounts based on DO Lines * SO Unit Price
    subtotal = 0
    invoice_lines = []
    
    for do_line in do.lines:
        so_line = do_line.so_line
        if so_line:
            qty = Decimal(do_line.qty)
            unit_price = so_line.unit_price
            line_subtotal = qty * unit_price
            subtotal += float(line_subtotal)
            
            invoice_lines.append({
                "product_id": do_line.product_id,
                "product_sku": do_line.description, # Or product.sku
                "description": f"{do_line.description} (DO: {do.do_number})",
                "qty": qty,
                "unit": "PCS",
                "unit_price": unit_price,
                "subtotal": line_subtotal
            })

    tax_amount = 0
    if data.include_tax:
        tax_amount = subtotal * (data.tax_rate / 100)
    total = subtotal + tax_amount
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        so_id=so.id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        customer_address=so.customer_address,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=data.due_days),
        subtotal=Decimal(str(subtotal)),
        tax_rate=Decimal(str(data.tax_rate)) if data.include_tax else Decimal(0),
        tax_amount=Decimal(str(tax_amount)),
        total=Decimal(str(total)),
        status='DRAFT',
        payment_status='UNPAID',
        notes=f"Invoice for Delivery {do.do_number}. {data.notes or ''}",
        terms=data.terms
    )
    
    db.add(invoice)
    db.flush()
    
    # Add lines
    for line in invoice_lines:
        inv_line = InvoiceLine(
            invoice_id=invoice.id,
            line_number=1, # TODO: increment
            product_id=line["product_id"],
            product_sku=line["product_sku"],
            description=line["description"],
            qty=line["qty"],
            unit=line["unit"],
            unit_price=line["unit_price"],
            subtotal=line["subtotal"]
        )
        db.add(inv_line)
    
    db.commit()
    db.refresh(invoice)
    
    return {
        "status": "success",
        "message": f"Invoice {invoice_number} berhasil dibuat dari Delivery Order",
        "data": invoice.to_dict()
    }


@router.get("/{invoice_id}")
def get_invoice_detail(invoice_id: int, db: Session = Depends(get_db)):
    """🔍 Get invoice detail with line items"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    
    result = invoice.to_dict()
    result["items"] = [item.to_dict() for item in invoice.items]
    result["customer_address"] = invoice.customer_address
    result["notes"] = invoice.notes
    result["terms"] = invoice.terms
    
    return {"status": "success", "data": result}


@router.post("/{invoice_id}/send")
def send_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """📤 Mark invoice as sent"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    
    invoice.status = 'SENT'
    db.commit()
    
    return {
        "status": "success",
        "message": f"Invoice {invoice.invoice_number} ditandai terkirim"
    }


@router.post("/{invoice_id}/payment")
def record_invoice_payment(
    invoice_id: int,
    data: RecordPaymentRequest,
    db: Session = Depends(get_db)
):
    """
    💰 Record payment for invoice
    
    Updates payment_status based on amount:
    - PARTIAL if amount_paid < total
    - PAID if amount_paid >= total
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    
    # Update amount paid
    current_paid = float(invoice.amount_paid or 0)
    new_paid = current_paid + data.amount
    invoice.amount_paid = Decimal(str(new_paid))
    
    # Update payment status
    total = float(invoice.total or 0)
    if new_paid >= total:
        invoice.payment_status = 'PAID'
        invoice.status = 'PAID'
        invoice.paid_at = datetime.now()
    elif new_paid > 0:
        invoice.payment_status = 'PARTIAL'
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Pembayaran Rp {data.amount:,.0f} dicatat. Sisa: Rp {invoice.amount_due:,.0f}",
        "data": {
            "invoice_number": invoice.invoice_number,
            "total": float(invoice.total),
            "amount_paid": float(invoice.amount_paid),
            "amount_due": invoice.amount_due,
            "payment_status": invoice.payment_status
        }
    }
