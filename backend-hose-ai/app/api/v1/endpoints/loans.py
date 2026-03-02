"""
HoseMaster WMS - Product Loan API
Manage loaned items (Pinjam Pakai)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.models import ProductLoan, ProductLoanItem, InventoryBatch, Product, Invoice, InvoiceLine, StorageLocation, BatchMovement, MovementType, BatchStatus, LocationType
from app.api.v1.endpoints.invoices import generate_invoice_number

router = APIRouter(prefix="/loans", tags=["Inventory - Loan"])

# ============ Schemas ============

class LoanItemRequest(BaseModel):
    product_id: int
    qty: float
    batch_id: int

class LoanCreate(BaseModel):
    customer_id: int
    customer_name: str
    due_date: str
    notes: Optional[str] = None
    items: List[LoanItemRequest]

class LoanReturn(BaseModel):
    items: List[dict] # {item_id: 1, qty: 5}

class LoanConvertToInvoice(BaseModel):
    items: List[dict] # {item_id: 1, qty: 5, price: 10000}


# ============ Helper ============
def get_or_create_loan_location(db: Session, customer_name: str = "General") -> StorageLocation:
    # We can have one global "VIRTUAL_LOAN" or per customer.
    # Simpler: One Global Virtual Loan Warehouse, Zone separated by Customer? 
    # Or just one Big Virtual Location.
    # Let's use one "VIRTUAL_LOAN" location for simplicity for now.
    
    loc_code = "VIRTUAL-LOAN-001"
    loc = db.query(StorageLocation).filter(StorageLocation.code == loc_code).first()
    
    if not loc:
        loc = StorageLocation(
            code=loc_code,
            warehouse="VIRTUAL",
            zone="LOAN",
            type=LocationType.STAGING_AREA,
            description="Virtual Location for Loaned Items",
            is_active=True
        )
        db.add(loc)
        db.flush()
        
    return loc

# ============ Endpoints ============

@router.post("")
def create_loan(
    data: LoanCreate,
    db: Session = Depends(get_db)
):
    """
    📤 Create Product Loan (Barang Keluar: PINJAM)
    
    Moves stock from Available -> Loaned (Virtual Location)
    """
    # Generate Number
    today = date.today()
    prefix = f"LOAN/{today.strftime('%y%m')}/"
    count = db.query(ProductLoan).filter(ProductLoan.loan_number.like(f"{prefix}%")).count()
    loan_number = f"{prefix}{count + 1:03d}"
    
    loan = ProductLoan(
        loan_number=loan_number,
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        due_date=datetime.strptime(data.due_date, "%Y-%m-%d").date(),
        notes=data.notes,
        status='OPEN'
    )
    db.add(loan)
    db.flush()
    
    loan_location = get_or_create_loan_location(db)
    
    for item in data.items:
        # Check stock
        batch = db.query(InventoryBatch).filter(InventoryBatch.id == item.batch_id).first()
        if not batch or batch.current_qty < Decimal(str(item.qty)):
            raise HTTPException(status_code=400, detail=f"Stok tidak cukup untuk batch {item.batch_id}")
            
        product = db.query(Product).filter(Product.id == item.product_id).first()
        
        qty_loan = Decimal(str(item.qty))
        
        # 1. Deduct Physical Stock (Transfer Out)
        batch.current_qty -= float(qty_loan)
        
        BatchMovement(
            batch_id=batch.id,
            movement_type=MovementType.LOAN_OUT,
            qty=float(qty_loan),
            qty_before=float(batch.current_qty) + float(qty_loan),
            qty_after=float(batch.current_qty),
            notes=f"Loan Out to {data.customer_name} (Ref: {loan_number})"
        )
        
        # 2. Create Virtual Batch (Stock at Customer)
        loan_batch = InventoryBatch(
            product_id=product.id,
            sku=product.sku,
            product_name=product.name,
            initial_qty=float(qty_loan),
            current_qty=float(qty_loan),
            received_date=datetime.now(),
            status=BatchStatus.LOANED.value,
            location_id=loan_location.id,
            location_name=loan_location.code,
            source_type="LOAN",
            cost_price=batch.cost_price, 
            barcode=f"LOAN-{loan_number}-{product.id}" 
        )
        db.add(loan_batch)
        db.flush()
        
        # 3. Create Loan Item linked to the NEW Virtual Batch
        loan_item = ProductLoanItem(
            loan_id=loan.id,
            product_id=product.id,
            product_sku=product.sku,
            product_name=product.name,
            qty_loaned=qty_loan,
            batch_id=loan_batch.id # This is the VIRTUAL batch ID
        )
        db.add(loan_item)
        
    db.commit()
    return {"status": "success", "data": loan.to_dict()}


@router.get("")
def list_loans(
    status: Optional[str] = None,
    customer_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductLoan)
    if status:
        query = query.filter(ProductLoan.status == status)
    if customer_name:
        query = query.filter(ProductLoan.customer_name.ilike(f"%{customer_name}%"))
        
    loans = query.order_by(ProductLoan.created_at.desc()).all()
    return {"status": "success", "data": [l.to_dict() for l in loans]}


@router.post("/{loan_id}/return")
def return_loan(
    loan_id: int,
    data: LoanReturn,
    db: Session = Depends(get_db)
):
    """
    🔙 Return Loaned Items (Barang Kembali)
    
    Moves stock Virtual -> Main Warehouse
    """
    loan = db.query(ProductLoan).filter(ProductLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    for ret_item in data.items:
        item_id = ret_item['item_id']
        qty = Decimal(str(ret_item['qty']))
        
        li = db.query(ProductLoanItem).filter(ProductLoanItem.id == item_id).first()
        if not li: continue
        
        # Validate logic
        outstanding = li.qty_loaned - li.qty_returned - li.qty_invoiced
        if qty > outstanding:
            raise HTTPException(status_code=400, detail=f"Return qty exceeds outstanding for {li.product_sku}")
            
        li.qty_returned += qty
        
        # 1. Deduct Virtual Batch
        virtual_batch = db.query(InventoryBatch).filter(InventoryBatch.id == li.batch_id).first()
        if virtual_batch:
            virtual_batch.current_qty -= float(qty)
            
            BatchMovement(
                batch_id=virtual_batch.id,
                movement_type=MovementType.LOAN_RETURN,
                qty=float(qty),
                qty_before=float(virtual_batch.current_qty + qty),
                qty_after=float(virtual_batch.current_qty),
                notes=f"Returned from Loan {loan.loan_number}"
            )

        # 2. Add to Main Warehouse (Create New Batch or Add to recent?)
        # Safe: Create New Batch "Returned from Loan"
        # Or find main location
        main_loc = db.query(StorageLocation).filter(StorageLocation.code == "RECEIVING").first() or db.query(StorageLocation).first()
        
        return_batch = InventoryBatch(
            product_id=li.product_id,
            sku=li.product_sku,
            product_name=li.product_name,
            initial_qty=float(qty),
            current_qty=float(qty),
            received_date=datetime.now(),
            status=BatchStatus.AVAILABLE,
            location_id=main_loc.id,
            location_name=main_loc.code,
            source_type="LOAN_RETURN",
            cost_price=virtual_batch.cost_price if virtual_batch else 0
        )
        db.add(return_batch)
        db.flush()
        
        BatchMovement(
            batch_id=return_batch.id,
            movement_type=MovementType.INBOUND, # Physically inbound
            qty=float(qty),
            qty_before=0,
            qty_after=float(qty),
            notes=f"Returned from Loan {loan.loan_number}"
        )
            
    # Check if fully closed
    total_outstanding = sum(
        (i.qty_loaned - i.qty_returned - i.qty_invoiced) 
        for i in loan.items
    )
    
    if total_outstanding <= 0:
        loan.status = 'RETURNED' if all(i.qty_invoiced == 0 for i in loan.items) else 'CLOSED'
    else:
        loan.status = 'PARTIAL'
        
    db.commit()
    return {"status": "success", "message": "Items returned successfully"}


@router.post("/{loan_id}/invoice")
def convert_loan_to_invoice(
    loan_id: int,
    data: LoanConvertToInvoice,
    db: Session = Depends(get_db)
):
    """
    💰 Convert Loan to Sales (Barang Laku)
    
    Consumes Virtual Stock -> Creates Invoice
    """
    loan = db.query(ProductLoan).filter(ProductLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    # Create Invoice Header
    inv_number = generate_invoice_number(db)
    invoice = Invoice(
        invoice_number=inv_number,
        date=date.today(),
        due_date=date.today(),
        customer_name=loan.customer_name,
        payment_status='UNPAID',
        notes=f"Converted from Loan {loan.loan_number}"
    )
    db.add(invoice)
    db.flush()
    
    total_amount = Decimal(0)
    
    for inv_item in data.items:
        item_id = inv_item['item_id']
        qty = Decimal(str(inv_item['qty']))
        price = Decimal(str(inv_item['price']))
        
        li = db.query(ProductLoanItem).filter(ProductLoanItem.id == item_id).first()
        if not li: continue
        
        outstanding = li.qty_loaned - li.qty_returned - li.qty_invoiced
        if qty > outstanding:
            raise HTTPException(status_code=400, detail=f"Invoice qty exceeds outstanding for {li.product_sku}")
            
        li.qty_invoiced += qty
        
        # 1. Deduct Virtual Batch (Consume)
        virtual_batch = db.query(InventoryBatch).filter(InventoryBatch.id == li.batch_id).first()
        if virtual_batch:
            virtual_batch.current_qty -= float(qty)
            virtual_batch.status = BatchStatus.SOLD if virtual_batch.current_qty <= 0 else BatchStatus.LOANED
            
            BatchMovement(
                batch_id=virtual_batch.id,
                movement_type=MovementType.OUTBOUND, # Sold
                qty=float(qty),
                qty_before=float(virtual_batch.current_qty + qty),
                qty_after=float(virtual_batch.current_qty),
                notes=f"Converted to Invoice {inv_number}"
            )
        
        # Create Invoice Item
        new_inv_item = InvoiceLine(
            invoice_id=invoice.id,
            product_id=li.product_id,
            product_sku=li.product_sku,
            description=li.product_name,
            qty=qty,
            unit_price=price,
            subtotal=qty * price
        )
        db.add(new_inv_item)
        total_amount += (qty * price)
        
    invoice.subtotal = total_amount
    invoice.total = total_amount
    
    # Check loan status
    total_outstanding = sum(
        (i.qty_loaned - i.qty_returned - i.qty_invoiced) 
        for i in loan.items
    )
    
    if total_outstanding <= 0:
        loan.status = 'INVOICED'
    else:
        loan.status = 'PARTIAL'
        
    db.commit()
    
    # 🔗 INTEGRATION: Update sales intelligence (consignment sale = active customer)
    try:
        from app.services.integration import on_loan_converted_to_invoice
        on_loan_converted_to_invoice(db, loan_id, inv_number)
    except Exception:
        pass
    
    return {"status": "success", "message": f"Invoice {inv_number} created"}


@router.post("/{loan_id}/consignment/report-sales")
def report_consignment_sales(
    loan_id: int,
    data: LoanConvertToInvoice,
    db: Session = Depends(get_db)
):
    return convert_loan_to_invoice(loan_id, data, db)
