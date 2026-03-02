"""
HoseMaster WMS - Inter-Company Loans API
B2B Consignment & Loan Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.models import (
    InterCompanyLoan, InterCompanyLoanItem, Company, 
    InventoryBatch, Product, StorageLocation, BatchMovement, 
    MovementType, BatchStatus, LocationType
)

router = APIRouter(prefix="/intercompany-loans", tags=["Inventory - B2B Sync"])

# ============ Schemas ============

class LoanItemRequest(BaseModel):
    product_id: int
    qty: float
    source_batch_id: int

class InterCompanyLoanCreate(BaseModel):
    to_company_id: int  # Lender creates this for the Borrower
    from_company_id: int # Often the current logged in user's company
    due_date: str
    notes: Optional[str] = None
    items: List[LoanItemRequest]

# ============ Endpoints ============

@router.post("")
def create_loan(
    data: InterCompanyLoanCreate,
    db: Session = Depends(get_db)
):
    """
    📤 Create B2B Loan (Lender mengirim ke Borrower)
    Status awal: PENDING_APPROVAL
    """
    if data.from_company_id == data.to_company_id:
        raise HTTPException(status_code=400, detail="Tidak bisa pinjam ke perusahaan sendiri")
        
    # Generate Number
    today = date.today()
    prefix = f"B2B/{today.strftime('%y%m')}/"
    count = db.query(InterCompanyLoan).filter(InterCompanyLoan.loan_number.like(f"{prefix}%")).count()
    loan_number = f"{prefix}{count + 1:03d}"
    
    loan = InterCompanyLoan(
        loan_number=loan_number,
        from_company_id=data.from_company_id,
        to_company_id=data.to_company_id,
        due_date=datetime.strptime(data.due_date, "%Y-%m-%d").date(),
        notes=data.notes,
        status='PENDING_APPROVAL'
    )
    db.add(loan)
    db.flush()
    
    for item in data.items:
        batch = db.query(InventoryBatch).filter(InventoryBatch.id == item.source_batch_id).first()
        if not batch or batch.current_qty < Decimal(str(item.qty)):
            raise HTTPException(status_code=400, detail=f"Stok tidak cukup untuk batch {item.source_batch_id}")
            
        product = db.query(Product).filter(Product.id == item.product_id).first()
        
        # 1. Deduct Main Stock (Reserve it while pending approval)
        qty_loan = Decimal(str(item.qty))
        batch.current_qty -= float(qty_loan)
        
        BatchMovement(
            batch_id=batch.id,
            movement_type=MovementType.LOAN_OUT,
            qty=float(qty_loan),
            qty_before=float(batch.current_qty) + float(qty_loan),
            qty_after=float(batch.current_qty),
            notes=f"Pending B2B transfer to Company {data.to_company_id}"
        )
        
        # Create Loan Item
        loan_item = InterCompanyLoanItem(
            loan_id=loan.id,
            product_id=product.id,
            product_sku=product.sku,
            product_name=product.name,
            qty_loaned=qty_loan,
            source_batch_id=batch.id
        )
        db.add(loan_item)
        
    db.commit()
    return {"status": "success", "data": loan.to_dict()}


@router.get("")
def list_loans(
    company_id: Optional[int] = None,
    mode: Optional[str] = "outbound",  # 'outbound' (Lent) or 'inbound' (Borrowed)
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(InterCompanyLoan)
    
    if company_id:
        if mode == "outbound":
            query = query.filter(InterCompanyLoan.from_company_id == company_id)
        else:
            query = query.filter(InterCompanyLoan.to_company_id == company_id)
            
    if status:
        query = query.filter(InterCompanyLoan.status == status)
        
    loans = query.order_by(InterCompanyLoan.created_at.desc()).all()
    return {"status": "success", "data": [l.to_dict() for l in loans]}


@router.post("/{loan_id}/approve")
def approve_loan(
    loan_id: int,
    db: Session = Depends(get_db)
):
    """
    ✅ Approve Inbound Loan (Borrower confirms receipt)
    Menciptakan InventoryBatch baru di Lokasi Borrower, namun owner_id tetap Lender.
    """
    loan = db.query(InterCompanyLoan).filter(InterCompanyLoan.id == loan_id).first()
    if not loan or loan.status != 'PENDING_APPROVAL':
        raise HTTPException(status_code=400, detail="Loan not found or not pending")
        
    # Temukan/buat Receive Location di sisi Borrower
    loc_code = f"BORROWED-{loan.to_company_id}"
    borrower_loc = db.query(StorageLocation).filter(StorageLocation.code == loc_code).first()
    if not borrower_loc:
        borrower_loc = StorageLocation(
            code=loc_code,
            warehouse="B2B-INBOUND",
            zone="CONSIGNMENT",
            type=LocationType.STAGING_AREA,
            company_id=loan.to_company_id,
            is_active=True
        )
        db.add(borrower_loc)
        db.flush()
        
    for item in loan.items:
        source_batch = db.query(InventoryBatch).filter(InventoryBatch.id == item.source_batch_id).first()
        
        # Buat batch baru di sisi Borrower, tapi Hak Milik milik Lender
        new_batch = InventoryBatch(
            product_id=item.product_id,
            sku=item.product_sku,
            product_name=item.product_name,
            initial_qty=float(item.qty_loaned),
            current_qty=float(item.qty_loaned),
            status=BatchStatus.AVAILABLE.value,
            location_id=borrower_loc.id,
            source_type="B2B_LOAN",
            owner_id=loan.from_company_id,           # Hak milik Lender
            cost_price=source_batch.cost_price if source_batch else 0,
            barcode=f"B2B-{loan.loan_number}-{item.id}"
        )
        db.add(new_batch)
        db.flush()
        
        BatchMovement(
            batch_id=new_batch.id,
            movement_type=MovementType.INBOUND,
            qty=float(item.qty_loaned),
            qty_before=0,
            qty_after=float(item.qty_loaned),
            notes=f"Approved B2B Loan from Company {loan.from_company_id}"
        )
        
    loan.status = 'APPROVED'
    loan.approved_at = datetime.now()
    db.commit()
    return {"status": "success", "message": "Barang pinjaman berhasil diterima"}


class InterCompanyReturnRequest(BaseModel):
    items: List[dict] # {item_id: 1, qty: 5}


@router.post("/{loan_id}/return")
def return_loan(
    loan_id: int,
    data: InterCompanyReturnRequest,
    db: Session = Depends(get_db)
):
    """
    🔙 Return Loaned Items (Borrower mengembalikan barang sisa ke Lender)
    """
    loan = db.query(InterCompanyLoan).filter(InterCompanyLoan.id == loan_id).first()
    if not loan or loan.status not in ['APPROVED', 'PARTIAL']:
        raise HTTPException(status_code=400, detail="Loan not found or not in valid status")
        
    for ret_item in data.items:
        item_id = ret_item['item_id']
        qty = Decimal(str(ret_item['qty']))
        
        li = db.query(InterCompanyLoanItem).filter(InterCompanyLoanItem.id == item_id).first()
        if not li: continue
        
        outstanding = li.qty_loaned - li.qty_returned - li.qty_sold
        if qty > outstanding:
            raise HTTPException(status_code=400, detail=f"Return qty exceeds outstanding for {li.product_sku}")
            
        li.qty_returned += qty
        
        # In real life, we would create a batch movement from Borrower back to Lender.
        # But for simplicity, we just adjust the source batch at Lender side or create a new batch.
        
        # 1. Deduct Borrower's Batch
        borrower_batch = db.query(InventoryBatch).filter(
            InventoryBatch.barcode == f"B2B-{loan.loan_number}-{li.id}"
        ).first()
        
        if borrower_batch:
            borrower_batch.current_qty -= float(qty)
            if borrower_batch.current_qty <= 0:
                borrower_batch.status = BatchStatus.CONSUMED.value
            
            BatchMovement(
                batch_id=borrower_batch.id,
                movement_type=MovementType.OUTBOUND,
                qty=float(qty),
                qty_before=float(borrower_batch.current_qty + qty),
                qty_after=float(borrower_batch.current_qty),
                notes=f"Returned B2B Loan to Company {loan.from_company_id}"
            )
            
        # 2. Add back to Lender's Source Batch
        source_batch = db.query(InventoryBatch).filter(InventoryBatch.id == li.source_batch_id).first()
        if source_batch:
            source_batch.current_qty += float(qty)
            BatchMovement(
                batch_id=source_batch.id,
                movement_type=MovementType.INBOUND,
                qty=float(qty),
                qty_before=float(source_batch.current_qty - qty),
                qty_after=float(source_batch.current_qty),
                notes=f"Internal return of B2B Loan {loan.loan_number}"
            )
            
    # Check if fully closed
    total_outstanding = sum(
        (i.qty_loaned - i.qty_returned - i.qty_sold) 
        for i in loan.items
    )
    
    if total_outstanding <= 0:
        loan.status = 'CLOSED'
    else:
        loan.status = 'PARTIAL'
        
    db.commit()
    return {"status": "success", "message": "Barang pinjaman berhasil dikembalikan"}


@router.post("/{loan_id}/invoice")
def create_invoice_from_loan(
    loan_id: int,
    db: Session = Depends(get_db)
):
    """
    💰 Invoice B2B Loan (Lender menagih Borrower berdasarkan qty yang laku terjual / qty_sold)
    """
    loan = db.query(InterCompanyLoan).filter(InterCompanyLoan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    from app.models.invoice import Invoice, InvoiceLine
    from app.api.v1.endpoints.invoices import generate_invoice_number
    
    # Check if there are items to invoice (qty_sold > 0)
    has_billable = False
    for i in loan.items:
        if i.qty_sold > 0:
             has_billable = True
             break
             
    if not has_billable:
        raise HTTPException(status_code=400, detail="Tidak ada barang konsinyasi yang terjual, tidak bisa nagih.")
        
    inv_number = generate_invoice_number(db)
    invoice = Invoice(
        invoice_number=inv_number,
        date=date.today(),
        due_date=date.today(),
        customer_name=f"Company {loan.to_company_id}", # Idealnya ngambil dari relation
        payment_status='UNPAID',
        notes=f"Penagihan B2B Loan {loan.loan_number}"
    )
    db.add(invoice)
    db.flush()
    
    total_amount = Decimal(0)
    for li in loan.items:
        if li.qty_sold > 0:
             # Logic penetapan harga B2B di sini. Kita pakai cost_price untuk testing.
             price = Decimal(100000) # Placeholder
             
             new_inv_item = InvoiceLine(
                 invoice_id=invoice.id,
                 product_id=li.product_id,
                 product_sku=li.product_sku,
                 description=f"[B2B] {li.product_name}",
                 qty=li.qty_sold,
                 unit_price=price,
                 subtotal=li.qty_sold * price
             )
             db.add(new_inv_item)
             total_amount += (li.qty_sold * price)
             
             # Reset qty_sold karena sudah ditagih (atau tambah qty_invoiced kalau ada strukturnya)
             # Demi simplicity, kita anggap lunas/tagih selesai
             li.qty_sold = 0 # reset setelah ditagih
             # Idealnya: li.qty_invoiced = li.qty_sold
             
    invoice.subtotal = total_amount
    invoice.total = total_amount
    
    # Check status
    total_outstanding = sum(
        (i.qty_loaned - i.qty_returned - i.qty_sold) 
        for i in loan.items
    )
    
    if total_outstanding <= 0:
        loan.status = 'CLOSED'
        
    db.commit()
    return {"status": "success", "message": f"Invoice penagihan B2B {inv_number} berhasil dibuat."}
