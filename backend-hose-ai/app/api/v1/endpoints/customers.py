"""
HoseMaster WMS - Customer API
Customer management with credit limit tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.core.database import get_db
from app.models import Customer, SalesOrder


router = APIRouter(prefix="/customers", tags=["Customers"])


# ============ Schemas ============

class CustomerCreate(BaseModel):
    """Create new customer"""
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    customer_type: str = "RETAIL"
    price_level: str = "REGULAR"
    credit_limit: float = 0
    credit_term: int = 30
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    """Update customer"""
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    customer_type: Optional[str] = None
    price_level: Optional[str] = None
    credit_limit: Optional[float] = None
    credit_term: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CreditLimitUpdate(BaseModel):
    """Update credit limit"""
    credit_limit: float


# ============ Endpoints ============

@router.get("")
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    has_outstanding: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    📋 Get list of customers with credit info
    """
    query = db.query(Customer).filter(Customer.is_active == True)
    
    if search:
        query = query.filter(Customer.name.ilike(f"%{search}%"))
    
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)
    
    if has_outstanding:
        query = query.filter(Customer.total_outstanding > 0)
    
    total = query.count()
    customers = query.order_by(Customer.name).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [c.to_dict_simple() for c in customers]
    }


@router.get("/credit-summary")
def get_credit_summary(db: Session = Depends(get_db)):
    """
    📊 Get summary of customer credit usage
    """
    customers = db.query(Customer).filter(Customer.is_active == True).all()
    
    total_credit_limit = sum(float(c.credit_limit or 0) for c in customers)
    total_outstanding = sum(float(c.total_outstanding or 0) for c in customers)
    over_limit_count = sum(1 for c in customers if c.is_over_limit)
    
    # Top 5 highest outstanding
    top_outstanding = sorted(
        [c for c in customers if float(c.total_outstanding or 0) > 0],
        key=lambda x: float(x.total_outstanding or 0),
        reverse=True
    )[:5]
    
    return {
        "status": "success",
        "summary": {
            "total_customers": len(customers),
            "total_credit_limit": total_credit_limit,
            "total_outstanding": total_outstanding,
            "utilization_percent": round((total_outstanding / total_credit_limit * 100) if total_credit_limit > 0 else 0),
            "over_limit_count": over_limit_count
        },
        "top_outstanding": [c.to_dict_simple() for c in top_outstanding]
    }


@router.get("/check-credit/{customer_name}")
def check_customer_credit(
    customer_name: str,
    order_amount: float = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    ⛔ Check if customer can place order within credit limit
    
    Returns warning if order would exceed credit limit.
    """
    # Find or match customer
    customer = db.query(Customer).filter(
        Customer.name.ilike(f"%{customer_name}%"),
        Customer.is_active == True
    ).first()
    
    if not customer:
        # New customer - no limit set, allow but warn
        return {
            "status": "success",
            "customer_found": False,
            "can_proceed": True,
            "warning": "Customer baru, belum ada limit kredit",
            "data": None
        }
    
    # Calculate available credit
    available = customer.available_credit
    would_exceed = order_amount > available if customer.credit_limit > 0 else False
    
    result = {
        "status": "success",
        "customer_found": True,
        "can_proceed": not would_exceed,
        "data": {
            "customer_id": customer.id,
            "customer_name": customer.name,
            "credit_limit": float(customer.credit_limit or 0),
            "total_outstanding": float(customer.total_outstanding or 0),
            "available_credit": available,
            "order_amount": order_amount,
            "would_exceed": would_exceed,
            "over_by": max(0, order_amount - available) if would_exceed else 0
        }
    }
    
    if customer.is_blacklisted:
        result["can_proceed"] = False
        result["warning"] = f"Customer di-blacklist: {customer.blacklist_reason}"
    elif would_exceed:
        result["warning"] = f"Order melebihi limit! Over Rp {order_amount - available:,.0f}"
    
    return result


@router.get("/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """
    🔍 Get customer detail
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")
    
    return {
        "status": "success",
        "data": customer.to_dict()
    }


@router.post("")
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db)
):
    """
    ➕ Create new customer
    """
    # Check if name exists
    existing = db.query(Customer).filter(Customer.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Customer '{data.name}' sudah ada")
    
    customer = Customer(
        name=data.name,
        phone=data.phone,
        address=data.address,
        email=data.email,
        customer_type=data.customer_type,
        price_level=data.price_level,
        credit_limit=Decimal(data.credit_limit),
        credit_term=data.credit_term,
        notes=data.notes
    )
    
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    return {
        "status": "success",
        "message": f"Customer '{customer.name}' berhasil dibuat",
        "data": customer.to_dict()
    }


@router.put("/{customer_id}")
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db)
):
    """
    ✏️ Update customer
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")
    
    update_dict = data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            if field == 'credit_limit':
                value = Decimal(value)
            setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    
    return {
        "status": "success",
        "message": f"Customer '{customer.name}' berhasil diupdate",
        "data": customer.to_dict()
    }


@router.post("/{customer_id}/set-credit-limit")
def set_credit_limit(
    customer_id: int,
    data: CreditLimitUpdate,
    db: Session = Depends(get_db)
):
    """
    💳 Set credit limit for customer
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")
    
    old_limit = float(customer.credit_limit or 0)
    customer.credit_limit = Decimal(data.credit_limit)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Credit limit diupdate: Rp {old_limit:,.0f} → Rp {data.credit_limit:,.0f}",
        "data": customer.to_dict_simple()
    }


@router.post("/sync-outstanding")
def sync_outstanding_balances(db: Session = Depends(get_db)):
    """
    🔄 Recalculate outstanding balances from SO data
    
    Use this to sync customer outstanding with actual SO piutang.
    """
    # Get all unpaid SO grouped by customer
    from sqlalchemy import func as sqlfunc
    
    outstanding_data = db.query(
        SalesOrder.customer_name,
        sqlfunc.sum(SalesOrder.total - SalesOrder.amount_paid).label('total_outstanding'),
        sqlfunc.count(SalesOrder.id).label('order_count')
    ).filter(
        SalesOrder.is_deleted == False,
        SalesOrder.payment_status.in_(['UNPAID', 'PARTIAL'])
    ).group_by(SalesOrder.customer_name).all()
    
    updated_count = 0
    created_count = 0
    
    for row in outstanding_data:
        customer_name = row.customer_name
        outstanding = float(row.total_outstanding or 0)
        
        # Find or create customer
        customer = db.query(Customer).filter(Customer.name == customer_name).first()
        
        if customer:
            customer.total_outstanding = Decimal(outstanding)
            customer.total_orders = row.order_count
            updated_count += 1
        else:
            # Create new customer from SO data
            customer = Customer(
                name=customer_name,
                total_outstanding=Decimal(outstanding),
                total_orders=row.order_count
            )
            db.add(customer)
            created_count += 1
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Sync selesai. Updated: {updated_count}, Created: {created_count}",
        "data": {
            "updated": updated_count,
            "created": created_count
        }
    }
