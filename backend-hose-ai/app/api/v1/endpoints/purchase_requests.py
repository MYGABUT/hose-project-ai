"""
HoseMaster WMS - Purchase Request API
Purchase Request with Approval Workflow

Endpoints:
- CRUD for PR
- Submit for approval
- Approve/Reject
- Convert to PO
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models import PurchaseRequest, PRLine, PurchaseOrder, POLine, Supplier, Product


router = APIRouter(prefix="/pr", tags=["Purchase Requests"])


# ============ Schemas ============

class PRLineCreate(BaseModel):
    product_id: Optional[int] = None
    product_sku: Optional[str] = None
    product_name: str
    qty_requested: float
    unit: str = "PCS"
    estimated_price: float = 0
    reason: Optional[str] = None


class PRCreate(BaseModel):
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    required_date: Optional[str] = None
    priority: str = "NORMAL"
    notes: Optional[str] = None
    requested_by: str
    lines: List[PRLineCreate]


class PRApproval(BaseModel):
    approved_by: str
    notes: Optional[str] = None


class PRRejection(BaseModel):
    rejected_by: str
    reason: str


# ============ Endpoints ============

def generate_pr_number(db: Session) -> str:
    """Generate PR number: PR-YYYYMMDD-XXX"""
    today = date.today()
    prefix = f"PR-{today.strftime('%Y%m%d')}"
    
    count = db.query(PurchaseRequest).filter(
        PurchaseRequest.pr_number.like(f"{prefix}%")
    ).count()
    
    return f"{prefix}-{count + 1:03d}"


@router.get("")
def list_purchase_requests(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📋 Get list of Purchase Requests"""
    query = db.query(PurchaseRequest).filter(PurchaseRequest.is_deleted == False)
    
    if status:
        query = query.filter(PurchaseRequest.status == status)
    
    total = query.count()
    prs = query.order_by(PurchaseRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [pr.to_dict() for pr in prs]
    }


@router.get("/pending")
def list_pending_approvals(db: Session = Depends(get_db)):
    """
    ⏳ Get PRs waiting for approval
    For Bos/Manager to review
    """
    prs = db.query(PurchaseRequest).filter(
        PurchaseRequest.is_deleted == False,
        PurchaseRequest.status == 'PENDING'
    ).order_by(
        # Urgent first, then by date
        PurchaseRequest.priority.desc(),
        PurchaseRequest.request_date
    ).all()
    
    return {
        "status": "success",
        "total": len(prs),
        "data": [pr.to_dict() for pr in prs]
    }


@router.get("/{pr_id}")
def get_purchase_request(pr_id: int, db: Session = Depends(get_db)):
    """🔍 Get PR detail with lines"""
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    
    if not pr:
        raise HTTPException(status_code=404, detail="PR tidak ditemukan")
    
    result = pr.to_dict()
    result["lines"] = [line.to_dict() for line in pr.lines]
    
    return {"status": "success", "data": result}


@router.post("")
def create_purchase_request(data: PRCreate, db: Session = Depends(get_db)):
    """
    ➕ Create new Purchase Request
    Status starts as DRAFT
    """
    if not data.lines:
        raise HTTPException(status_code=400, detail="Minimal 1 item diperlukan")
    
    pr_number = generate_pr_number(db)
    
    # Calculate estimated total
    estimated_total = sum(
        line.qty_requested * line.estimated_price 
        for line in data.lines
    )
    
    pr = PurchaseRequest(
        pr_number=pr_number,
        supplier_id=data.supplier_id,
        supplier_name=data.supplier_name,
        required_date=datetime.strptime(data.required_date, "%Y-%m-%d").date() if data.required_date else None,
        priority=data.priority,
        notes=data.notes,
        requested_by=data.requested_by,
        status='DRAFT',
        estimated_total=Decimal(str(estimated_total))
    )
    
    db.add(pr)
    db.flush()  # Get PR ID
    
    # Add lines
    for line_data in data.lines:
        line = PRLine(
            pr_id=pr.id,
            product_id=line_data.product_id,
            product_sku=line_data.product_sku,
            product_name=line_data.product_name,
            qty_requested=Decimal(str(line_data.qty_requested)),
            unit=line_data.unit,
            estimated_price=Decimal(str(line_data.estimated_price)),
            estimated_subtotal=Decimal(str(line_data.qty_requested * line_data.estimated_price)),
            reason=line_data.reason
        )
        db.add(line)
    
    db.commit()
    db.refresh(pr)
    
    return {
        "status": "success",
        "message": f"PR {pr_number} berhasil dibuat",
        "data": pr.to_dict()
    }


@router.post("/{pr_id}/submit")
def submit_for_approval(pr_id: int, db: Session = Depends(get_db)):
    """
    📤 Submit PR for approval
    DRAFT → PENDING
    """
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    
    if not pr:
        raise HTTPException(status_code=404, detail="PR tidak ditemukan")
    
    if pr.status != 'DRAFT':
        raise HTTPException(status_code=400, detail=f"PR status {pr.status}, tidak bisa submit")
    
    if not pr.lines:
        raise HTTPException(status_code=400, detail="PR harus memiliki minimal 1 item")
    
    pr.status = 'PENDING'
    pr.requested_at = datetime.now()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"PR {pr.pr_number} berhasil disubmit untuk approval",
        "data": pr.to_dict()
    }


@router.post("/{pr_id}/approve")
def approve_purchase_request(
    pr_id: int,
    data: PRApproval,
    db: Session = Depends(get_db)
):
    """
    ✅ Approve Purchase Request
    PENDING → APPROVED
    """
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    
    if not pr:
        raise HTTPException(status_code=404, detail="PR tidak ditemukan")
    
    if pr.status != 'PENDING':
        raise HTTPException(status_code=400, detail=f"PR status {pr.status}, tidak bisa approve")
    
    pr.status = 'APPROVED'
    pr.approved_by = data.approved_by
    pr.approved_at = datetime.now()
    
    if data.notes:
        pr.notes = (pr.notes or "") + f"\n[Approval] {data.notes}"
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"PR {pr.pr_number} DISETUJUI oleh {data.approved_by}",
        "data": pr.to_dict()
    }


@router.post("/{pr_id}/reject")
def reject_purchase_request(
    pr_id: int,
    data: PRRejection,
    db: Session = Depends(get_db)
):
    """
    ❌ Reject Purchase Request
    PENDING → REJECTED
    """
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    
    if not pr:
        raise HTTPException(status_code=404, detail="PR tidak ditemukan")
    
    if pr.status != 'PENDING':
        raise HTTPException(status_code=400, detail=f"PR status {pr.status}, tidak bisa reject")
    
    pr.status = 'REJECTED'
    pr.approved_by = data.rejected_by  # Store who rejected
    pr.approved_at = datetime.now()
    pr.rejection_reason = data.reason
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"PR {pr.pr_number} DITOLAK: {data.reason}",
        "data": pr.to_dict()
    }


@router.post("/{pr_id}/convert-to-po")
def convert_to_po(
    pr_id: int,
    db: Session = Depends(get_db)
):
    """
    🔄 Convert approved PR to Purchase Order
    APPROVED → ORDERED (and creates PO)
    """
    pr = db.query(PurchaseRequest).filter(
        PurchaseRequest.id == pr_id,
        PurchaseRequest.is_deleted == False
    ).first()
    
    if not pr:
        raise HTTPException(status_code=404, detail="PR tidak ditemukan")
    
    if pr.status != 'APPROVED':
        raise HTTPException(status_code=400, detail=f"PR status {pr.status}, harus APPROVED untuk konversi")
    
    if pr.po_id:
        raise HTTPException(status_code=400, detail=f"PR sudah dikonversi ke PO {pr.po_number}")
    
    # Generate PO number
    today = date.today()
    po_prefix = f"PO-{today.strftime('%Y%m%d')}"
    po_count = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{po_prefix}%")
    ).count()
    po_number = f"{po_prefix}-{po_count + 1:03d}"
    
    # Calculate due date based on supplier payment term
    payment_term = 30
    if pr.supplier_id:
        supplier = db.query(Supplier).filter(Supplier.id == pr.supplier_id).first()
        if supplier:
            payment_term = supplier.payment_term or 30
    
    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        supplier_id=pr.supplier_id,
        supplier_name=pr.supplier_name,
        order_date=date.today(),
        expected_date=pr.required_date,
        status='ORDERED',
        subtotal=pr.estimated_total,
        total=pr.estimated_total,
        payment_status='UNPAID',
        payment_due_date=date.today() + __import__('datetime').timedelta(days=payment_term),
        requested_by=pr.requested_by,
        approved_by=pr.approved_by,
        approved_at=pr.approved_at,
        notes=f"Dari PR: {pr.pr_number}"
    )
    
    db.add(po)
    db.flush()
    
    # Copy lines from PR to PO
    for pr_line in pr.lines:
        po_line = POLine(
            po_id=po.id,
            product_id=pr_line.product_id,
            product_sku=pr_line.product_sku,
            product_name=pr_line.product_name,
            qty_ordered=pr_line.qty_requested,
            unit=pr_line.unit,
            unit_price=pr_line.estimated_price,
            subtotal=pr_line.estimated_subtotal
        )
        db.add(po_line)
    
    # Update PR
    pr.status = 'ORDERED'
    pr.po_id = po.id
    pr.po_number = po_number
    
    # Update supplier outstanding
    if pr.supplier_id:
        supplier = db.query(Supplier).filter(Supplier.id == pr.supplier_id).first()
        if supplier:
            supplier.total_outstanding = Decimal(float(supplier.total_outstanding or 0) + float(pr.estimated_total))
            supplier.total_orders = (supplier.total_orders or 0) + 1
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"PR {pr.pr_number} berhasil dikonversi ke {po_number}",
        "data": {
            "pr": pr.to_dict(),
            "po": po.to_dict()
        }
    }
