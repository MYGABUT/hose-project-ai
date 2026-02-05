"""
HoseMaster WMS - Salesman & Commission API
Sales performance and commission calculation
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models.salesman import Salesman, SalesCommission
from app.models import Invoice


router = APIRouter(prefix="/salesmen", tags=["Salesman & Commission"])


# ============ Schemas ============

class SalesmanCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    commission_rate: float = 5
    commission_type: str = "ON_PAID"
    monthly_target: float = 0


class MassReassign(BaseModel):
    from_salesman_id: int
    to_salesman_id: int


# ============ Helpers ============

def generate_salesman_code(db: Session) -> str:
    count = db.query(Salesman).count()
    return f"SLS-{count + 1:03d}"


# ============ Endpoints ============

@router.get("")
def list_salesmen(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """📋 List all salesmen"""
    query = db.query(Salesman)
    if active_only:
        query = query.filter(Salesman.is_active == True)
    
    salesmen = query.order_by(Salesman.name).all()
    return {
        "status": "success",
        "data": [s.to_dict() for s in salesmen]
    }


@router.post("")
def create_salesman(
    data: SalesmanCreate,
    db: Session = Depends(get_db)
):
    """➕ Add new salesman"""
    code = generate_salesman_code(db)
    
    salesman = Salesman(
        code=code,
        name=data.name,
        phone=data.phone,
        email=data.email,
        commission_rate=Decimal(str(data.commission_rate)),
        commission_type=data.commission_type,
        monthly_target=Decimal(str(data.monthly_target)),
        join_date=date.today(),
        is_active=True
    )
    
    db.add(salesman)
    db.commit()
    db.refresh(salesman)
    
    return {
        "status": "success",
        "message": f"Salesman {data.name} berhasil ditambahkan",
        "data": salesman.to_dict()
    }


@router.get("/performance")
def get_sales_performance(
    year: int = Query(None),
    month: int = Query(None),
    db: Session = Depends(get_db)
):
    """
    📊 Sales Performance Report
    
    Shows omset and commission per salesman
    """
    now = date.today()
    year = year or now.year
    month = month or now.month
    
    # Get all active salesmen
    salesmen = db.query(Salesman).filter(Salesman.is_active == True).all()
    
    result = []
    for s in salesmen:
        # Get total sales for this period
        total_sales = db.query(sqlfunc.sum(SalesCommission.sales_amount)).filter(
            SalesCommission.salesman_id == s.id,
            SalesCommission.period_year == year,
            SalesCommission.period_month == month
        ).scalar() or 0
        
        total_commission = db.query(sqlfunc.sum(SalesCommission.commission_amount)).filter(
            SalesCommission.salesman_id == s.id,
            SalesCommission.period_year == year,
            SalesCommission.period_month == month
        ).scalar() or 0
        
        # Achievement vs target
        target = float(s.monthly_target or 0)
        achievement_pct = (float(total_sales) / target * 100) if target > 0 else 0
        
        result.append({
            "salesman_id": s.id,
            "salesman_name": s.name,
            "code": s.code,
            "monthly_target": target,
            "total_sales": float(total_sales),
            "achievement_percent": round(achievement_pct, 1),
            "commission_rate": float(s.commission_rate or 0),
            "total_commission": float(total_commission),
            "is_top_performer": achievement_pct >= 100
        })
    
    # Sort by total sales descending
    result.sort(key=lambda x: x["total_sales"], reverse=True)
    
    return {
        "status": "success",
        "period": f"{year}-{month:02d}",
        "data": result
    }


@router.post("/calculate-commission/{invoice_id}")
def calculate_commission(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """
    💰 Calculate and record commission for an invoice
    
    Call this when invoice is PAID (for ON_PAID type)
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    
    # Get salesman from invoice (assumes salesman_id field exists)
    salesman_id = getattr(invoice, 'salesman_id', None)
    if not salesman_id:
        return {"status": "skip", "message": "Invoice tidak memiliki salesman"}
    
    salesman = db.query(Salesman).filter(Salesman.id == salesman_id).first()
    if not salesman:
        return {"status": "skip", "message": "Salesman tidak ditemukan"}
    
    # Calculate commission
    sales_amount = float(invoice.total or 0)
    comm_rate = float(salesman.commission_rate or 0)
    comm_amount = sales_amount * (comm_rate / 100)
    
    now = date.today()
    
    commission = SalesCommission(
        salesman_id=salesman.id,
        salesman_name=salesman.name,
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        customer_name=invoice.customer_name,
        period_year=now.year,
        period_month=now.month,
        sales_amount=Decimal(str(sales_amount)),
        commission_rate=salesman.commission_rate,
        commission_amount=Decimal(str(comm_amount)),
        status='PENDING'
    )
    
    db.add(commission)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Komisi Rp {comm_amount:,.0f} untuk {salesman.name} dicatat",
        "data": commission.to_dict()
    }


@router.post("/mass-reassign")
def mass_reassign_customers(
    data: MassReassign,
    db: Session = Depends(get_db)
):
    """
    🔄 Mass Reassign Customers from one salesman to another
    
    Use when salesman resigns - all their customers go to new salesman
    """
    from_sales = db.query(Salesman).filter(Salesman.id == data.from_salesman_id).first()
    to_sales = db.query(Salesman).filter(Salesman.id == data.to_salesman_id).first()
    
    if not from_sales or not to_sales:
        raise HTTPException(status_code=404, detail="Salesman tidak ditemukan")
    
    # Update all customers (assumes Customer has salesman_id field)
    from app.models import Customer
    
    updated = db.query(Customer).filter(
        Customer.salesman_id == data.from_salesman_id
    ).update({
        "salesman_id": data.to_salesman_id
    })
    
    # Mark old salesman as inactive
    from_sales.is_active = False
    from_sales.resign_date = date.today()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"{updated} customer dipindahkan dari {from_sales.name} ke {to_sales.name}"
    }
