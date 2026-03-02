"""
HoseMaster WMS - Sales Order Payment & Receivables (Piutang)
Payment tracking, piutang summary, aging schedule, down payment
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models import SalesOrder, SOStatus


router = APIRouter(prefix="/so", tags=["Sales Orders - Payments"])


class PaymentUpdate(BaseModel):
    """Update payment on SO"""
    amount: float
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_note: Optional[str] = None


@router.post("/{so_id}/payment")
def record_payment(
    so_id: int,
    data: PaymentUpdate,
    db: Session = Depends(get_db)
):
    """
    💳 Record payment for a Sales Order
    
    Updates payment_status:
    - UNPAID: amount_paid == 0
    - PARTIAL: 0 < amount_paid < total
    - PAID: amount_paid >= total
    """
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    current_paid = float(so.amount_paid or 0)
    new_paid = current_paid + data.amount
    total = float(so.total or 0)
    
    if new_paid > total:
        raise HTTPException(
            status_code=400, 
            detail=f"Pembayaran melebihi total. Sisa tagihan: Rp {total - current_paid:,.0f}"
        )
    
    so.amount_paid = Decimal(new_paid)
    
    if new_paid >= total:
        so.payment_status = "PAID"
    elif new_paid > 0:
        so.payment_status = "PARTIAL"
    else:
        so.payment_status = "UNPAID"
    
    db.commit()
    
    # Integration: Update customer score
    try:
        from app.services.integration import on_payment_received
        on_payment_received(db, so_id, data.amount)
    except Exception:
        pass
    
    return {
        "status": "success",
        "message": f"Pembayaran Rp {data.amount:,.0f} berhasil dicatat",
        "data": {
            "so_number": so.so_number,
            "customer_name": so.customer_name,
            "total": total,
            "amount_paid": new_paid,
            "amount_due": total - new_paid,
            "payment_status": so.payment_status
        }
    }


@router.get("/piutang/summary")
def get_piutang_summary(
    db: Session = Depends(get_db)
):
    """
    📊 Get summary of outstanding receivables (Piutang)
    """
    orders = db.query(SalesOrder).filter(
        SalesOrder.is_deleted == False,
        SalesOrder.payment_status.in_(["UNPAID", "PARTIAL"])
    ).all()
    
    total_piutang = 0
    by_customer = {}
    
    for so in orders:
        amount_due = float(so.total or 0) - float(so.amount_paid or 0)
        total_piutang += amount_due
        
        customer = so.customer_name
        if customer not in by_customer:
            by_customer[customer] = {
                "customer_name": customer,
                "total_orders": 0,
                "total_piutang": 0,
                "orders": []
            }
        
        by_customer[customer]["total_orders"] += 1
        by_customer[customer]["total_piutang"] += amount_due
        by_customer[customer]["orders"].append({
            "so_number": so.so_number,
            "order_date": so.order_date.isoformat() if so.order_date else None,
            "due_date": so.payment_due_date.isoformat() if so.payment_due_date else None,
            "total": float(so.total or 0),
            "amount_paid": float(so.amount_paid or 0),
            "amount_due": amount_due,
            "payment_status": so.payment_status
        })
    
    customers_list = sorted(
        by_customer.values(), 
        key=lambda x: x["total_piutang"], 
        reverse=True
    )
    
    return {
        "status": "success",
        "summary": {
            "total_piutang": total_piutang,
            "total_customers": len(by_customer),
            "total_unpaid_orders": len(orders)
        },
        "data": customers_list
    }


@router.get("/piutang/aging")
def get_aging_schedule(db: Session = Depends(get_db)):
    """
    📊 Get Aging Schedule (Umur Piutang)
    
    Groups receivables by age:
    - CURRENT: Belum jatuh tempo
    - 1-30: Telat 1-30 hari
    - 31-60: Telat 31-60 hari
    - 61-90: Telat 61-90 hari
    - >90: Macet (lebih dari 90 hari)
    """
    from datetime import timedelta
    
    today = date.today()
    
    orders = db.query(SalesOrder).filter(
        SalesOrder.is_deleted == False,
        SalesOrder.payment_status.in_(["UNPAID", "PARTIAL"])
    ).all()
    
    aging = {
        "current": {"label": "Belum Jatuh Tempo", "count": 0, "total": 0, "orders": []},
        "1_30": {"label": "1-30 Hari", "count": 0, "total": 0, "orders": []},
        "31_60": {"label": "31-60 Hari", "count": 0, "total": 0, "orders": []},
        "61_90": {"label": "61-90 Hari", "count": 0, "total": 0, "orders": []},
        "over_90": {"label": ">90 Hari (Macet)", "count": 0, "total": 0, "orders": []}
    }
    
    total_piutang = 0
    
    for so in orders:
        amount_due = float(so.total or 0) - float(so.amount_paid or 0)
        total_piutang += amount_due
        
        days_overdue = 0
        try:
            if so.payment_due_date:
                due = so.payment_due_date
                if hasattr(due, 'date'):
                    due = due.date()
                days_overdue = (today - due).days
            elif so.order_date:
                order_dt = so.order_date
                if hasattr(order_dt, 'date'):
                    order_dt = order_dt.date()
                default_due = order_dt + timedelta(days=30)
                days_overdue = (today - default_due).days
        except Exception:
            days_overdue = 0
        
        order_info = {
            "so_number": so.so_number,
            "customer_name": so.customer_name,
            "order_date": so.order_date.isoformat() if so.order_date else None,
            "due_date": so.payment_due_date.isoformat() if so.payment_due_date else None,
            "days_overdue": max(0, days_overdue),
            "total": float(so.total or 0),
            "amount_paid": float(so.amount_paid or 0),
            "amount_due": amount_due
        }
        
        if days_overdue <= 0:
            bucket = "current"
        elif days_overdue <= 30:
            bucket = "1_30"
        elif days_overdue <= 60:
            bucket = "31_60"
        elif days_overdue <= 90:
            bucket = "61_90"
        else:
            bucket = "over_90"
        
        aging[bucket]["count"] += 1
        aging[bucket]["total"] += amount_due
        aging[bucket]["orders"].append(order_info)
    
    for key in aging:
        if total_piutang > 0:
            aging[key]["percentage"] = round(aging[key]["total"] / total_piutang * 100, 1)
        else:
            aging[key]["percentage"] = 0
    
    return {
        "status": "success",
        "summary": {
            "total_piutang": total_piutang,
            "total_orders": len(orders),
            "overdue_amount": sum(aging[k]["total"] for k in ["1_30", "31_60", "61_90", "over_90"]),
            "macet_amount": aging["over_90"]["total"]
        },
        "aging": aging
    }


@router.post("/{so_id}/create-dp", tags=["Sales Orders (Go-Live)"])
def create_customer_dp(
    so_id: int,
    amount: float,
    db: Session = Depends(get_db)
):
    """
    💰 Create Down Payment Invoice (Faktur Uang Muka)
    
    1. Validate amount vs SO Total
    2. Create a special Invoice (is_dp=True)
    3. Update SO.dp_amount
    """
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="SO not found")
        
    if amount > float(so.total):
        raise HTTPException(status_code=400, detail="DP melebihi total order")
        
    import uuid
    from app.models.invoice import Invoice, InvoiceLine
    
    inv_number = f"INV-DP-{datetime.now().strftime('%y%m')}-{uuid.uuid4().hex[:4].upper()}"
    
    invoice = Invoice(
        invoice_number=inv_number,
        so_id=so.id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        invoice_date=date.today(),
        due_date=date.today(),
        subtotal=amount,
        discount=0,
        tax_amount=0,
        total=Decimal(amount),
        status="SENT",
        is_dp=True,
        payment_status="UNPAID"
    )
    db.add(invoice)
    db.flush()
    
    line = InvoiceLine(
        invoice_id=invoice.id,
        description=f"Uang Muka / Down Payment for Order {so.so_number}",
        qty=1,
        unit_price=amount,
        line_total=amount
    )
    db.add(line)
    
    so.dp_amount = Decimal(amount)
    so.dp_invoice_id = invoice.id
    
    db.commit()
    return {
        "status": "success",
        "message": f"Faktur Uang Muka {inv_number} berhasil dibuat",
        "invoice_id": invoice.id
    }
