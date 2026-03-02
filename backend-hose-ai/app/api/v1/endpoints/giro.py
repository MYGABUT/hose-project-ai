"""
HoseMaster WMS - Giro Mundur API
Post-dated cheque management with reminder dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.models.giro import Giro
from app.models import Invoice, create_audit_log


router = APIRouter(prefix="/giro", tags=["Giro Mundur"])


# ============ Schemas ============

class GiroCreate(BaseModel):
    giro_number: str
    bank_name: str
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    amount: float
    due_date: str  # YYYY-MM-DD
    customer_id: Optional[int] = None
    customer_name: str
    invoice_id: Optional[int] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None


class GiroBounce(BaseModel):
    reason: str
    fee: float = 0


# ============ Endpoints ============

@router.get("")
def list_giros(
    status: Optional[str] = None,
    customer_name: Optional[str] = None,
    due_soon: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📋 List all giros with filters"""
    query = db.query(Giro)
    
    if status:
        query = query.filter(Giro.status == status)
    if customer_name:
        query = query.filter(Giro.customer_name.ilike(f"%{customer_name}%"))
    if due_soon:
        # Due within 7 days
        query = query.filter(
            Giro.status.in_(['RECEIVED', 'DEPOSITED']),
            Giro.due_date <= date.today() + timedelta(days=7)
        )
    
    total = query.count()
    giros = query.order_by(Giro.due_date.asc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [g.to_dict() for g in giros]
    }


@router.get("/dashboard")
def get_giro_dashboard(db: Session = Depends(get_db)):
    """
    📊 Giro Dashboard - Reminder untuk Admin Keuangan
    
    Shows:
    - Giro jatuh tempo hari ini
    - Giro jatuh tempo minggu ini
    - Total nilai giro pending
    """
    today = date.today()
    week_later = today + timedelta(days=7)
    
    # Due today
    due_today = db.query(Giro).filter(
        Giro.status.in_(['RECEIVED', 'DEPOSITED']),
        Giro.due_date == today
    ).all()
    
    # Due this week
    due_week = db.query(Giro).filter(
        Giro.status.in_(['RECEIVED', 'DEPOSITED']),
        Giro.due_date > today,
        Giro.due_date <= week_later
    ).all()
    
    # Overdue
    overdue = db.query(Giro).filter(
        Giro.status.in_(['RECEIVED', 'DEPOSITED']),
        Giro.due_date < today
    ).all()
    
    # Summary
    pending_total = db.query(sqlfunc.sum(Giro.amount)).filter(
        Giro.status.in_(['RECEIVED', 'DEPOSITED'])
    ).scalar() or 0
    
    return {
        "status": "success",
        "data": {
            "reminders": {
                "due_today": {
                    "count": len(due_today),
                    "amount": sum(float(g.amount or 0) for g in due_today),
                    "items": [g.to_dict() for g in due_today]
                },
                "due_this_week": {
                    "count": len(due_week),
                    "amount": sum(float(g.amount or 0) for g in due_week),
                    "items": [g.to_dict() for g in due_week]
                },
                "overdue": {
                    "count": len(overdue),
                    "amount": sum(float(g.amount or 0) for g in overdue),
                    "items": [g.to_dict() for g in overdue]
                }
            },
            "pending_total": float(pending_total)
        }
    }


@router.post("")
def create_giro(
    data: GiroCreate,
    db: Session = Depends(get_db)
):
    """➕ Record new giro received from customer"""
    due_date = datetime.strptime(data.due_date, "%Y-%m-%d").date()
    
    giro = Giro(
        giro_number=data.giro_number,
        bank_name=data.bank_name,
        account_number=data.account_number,
        account_name=data.account_name,
        amount=Decimal(str(data.amount)),
        due_date=due_date,
        received_date=date.today(),
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        invoice_id=data.invoice_id,
        invoice_number=data.invoice_number,
        status='RECEIVED',
        notes=data.notes,
        created_by='Admin'
    )
    
    db.add(giro)
    db.commit()
    db.refresh(giro)
    
    return {
        "status": "success",
        "message": f"Giro {data.giro_number} berhasil dicatat",
        "data": giro.to_dict()
    }


@router.post("/{giro_id}/deposit")
def deposit_giro(giro_id: int, db: Session = Depends(get_db)):
    """📥 Mark giro as deposited to bank"""
    giro = db.query(Giro).filter(Giro.id == giro_id).first()
    if not giro:
        raise HTTPException(status_code=404, detail="Giro tidak ditemukan")
    
    if giro.status != 'RECEIVED':
        raise HTTPException(status_code=400, detail="Giro harus berstatus RECEIVED")
    
    giro.status = 'DEPOSITED'
    giro.deposited_date = date.today()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Giro {giro.giro_number} sudah disetor ke bank"
    }


@router.post("/{giro_id}/clear")
def clear_giro(giro_id: int, db: Session = Depends(get_db)):
    """
    ✅ Mark giro as cleared - Payment successful
    
    This will update the linked invoice as PAID
    """
    giro = db.query(Giro).filter(Giro.id == giro_id).first()
    if not giro:
        raise HTTPException(status_code=404, detail="Giro tidak ditemukan")
    
    if giro.status not in ['RECEIVED', 'DEPOSITED']:
        raise HTTPException(status_code=400, detail="Giro sudah diproses")
    
    giro.status = 'CLEARED'
    giro.cleared_date = date.today()
    
    # Update linked invoice if exists
    if giro.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == giro.invoice_id).first()
        if invoice:
            invoice.amount_paid = (invoice.amount_paid or Decimal(0)) + giro.amount
            if invoice.amount_paid >= invoice.total:
                invoice.payment_status = 'PAID'
                invoice.paid_at = datetime.now()
            else:
                invoice.payment_status = 'PARTIAL'
    
    create_audit_log(
        db=db, action="CLEAR", entity_type="Giro",
        entity_id=giro.id, entity_number=giro.giro_number,
        changes_summary=f"Giro {giro.giro_number} cair, Rp {float(giro.amount):,.0f}",
        user_name="Admin", module="Finance"
    )
    
    db.commit()
    
    # 🔗 INTEGRATION: Update customer payment reliability
    try:
        from app.services.integration import on_giro_cleared
        on_giro_cleared(db, giro_id)
    except Exception:
        pass
    
    return {
        "status": "success",
        "message": f"Giro {giro.giro_number} sudah cair"
    }


@router.post("/{giro_id}/bounce")
def bounce_giro(
    giro_id: int,
    data: GiroBounce,
    db: Session = Depends(get_db)
):
    """
    ❌ Mark giro as bounced - Payment failed
    
    This will REVERSE the payment on linked invoice (piutang muncul lagi)
    """
    giro = db.query(Giro).filter(Giro.id == giro_id).first()
    if not giro:
        raise HTTPException(status_code=404, detail="Giro tidak ditemukan")
    
    giro.status = 'BOUNCED'
    giro.bounced_date = date.today()
    giro.bounce_reason = data.reason
    giro.bounce_fee = Decimal(str(data.fee))
    
    # REVERSE payment on linked invoice
    if giro.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == giro.invoice_id).first()
        if invoice:
            # Subtract the giro amount from paid
            invoice.amount_paid = max(Decimal(0), (invoice.amount_paid or Decimal(0)) - giro.amount)
            
            # Recalculate payment status
            if invoice.amount_paid == 0:
                invoice.payment_status = 'UNPAID'
            elif invoice.amount_paid < invoice.total:
                invoice.payment_status = 'PARTIAL'
            
            invoice.paid_at = None
    
    create_audit_log(
        db=db, action="BOUNCE", entity_type="Giro",
        entity_id=giro.id, entity_number=giro.giro_number,
        changes_summary=f"Giro {giro.giro_number} TOLAK! Alasan: {data.reason}",
        user_name="Admin", module="Finance"
    )
    
    db.commit()
    
    # 🔗 INTEGRATION: Flag customer as HIGH RISK
    try:
        from app.services.integration import on_giro_bounced
        on_giro_bounced(db, giro_id, data.reason)
    except Exception:
        pass
    
    return {
        "status": "success",
        "message": f"Giro {giro.giro_number} ditolak. Piutang customer muncul kembali."
    }
