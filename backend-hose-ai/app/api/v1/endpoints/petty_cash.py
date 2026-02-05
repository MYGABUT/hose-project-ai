"""
HoseMaster WMS - Petty Cash API
Kas Kecil management for operational expenses
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models.petty_cash import PettyCashTransaction, PettyCashBalance


router = APIRouter(prefix="/petty-cash", tags=["Petty Cash"])


# ============ Schemas ============

class ExpenseCreate(BaseModel):
    category: str  # TRANSPORT, SUPPLIES, LABOR, SECURITY, MEALS, OTHER
    amount: float
    description: str
    recipient: Optional[str] = None
    has_receipt: str = "NO"


class TopUpCreate(BaseModel):
    amount: float
    description: str = "Top-up kas kecil"


# ============ Helpers ============

def generate_transaction_number(db: Session) -> str:
    today = date.today()
    prefix = f"PC-{today.strftime('%Y%m')}"
    count = db.query(PettyCashTransaction).filter(
        PettyCashTransaction.transaction_number.like(f"{prefix}%")
    ).count()
    return f"{prefix}-{count + 1:03d}"


def get_current_balance(db: Session) -> float:
    balance_record = db.query(PettyCashBalance).first()
    if not balance_record:
        balance_record = PettyCashBalance(current_balance=Decimal(0))
        db.add(balance_record)
        db.commit()
    return float(balance_record.current_balance or 0)


def update_balance(db: Session, new_balance: float):
    balance_record = db.query(PettyCashBalance).first()
    if balance_record:
        balance_record.current_balance = Decimal(str(new_balance))
        balance_record.last_updated = datetime.now()
    db.commit()


# ============ Endpoints ============

@router.get("")
def list_transactions(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📋 List petty cash transactions"""
    query = db.query(PettyCashTransaction)
    
    if category:
        query = query.filter(PettyCashTransaction.category == category)
    if start_date:
        query = query.filter(PettyCashTransaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(PettyCashTransaction.transaction_date <= end_date)
    
    total = query.count()
    transactions = query.order_by(PettyCashTransaction.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "current_balance": get_current_balance(db),
        "data": [t.to_dict() for t in transactions]
    }


@router.get("/summary")
def get_summary(
    year: int = Query(None),
    month: int = Query(None),
    db: Session = Depends(get_db)
):
    """📊 Get petty cash summary by category"""
    now = date.today()
    year = year or now.year
    month = month or now.month
    
    # Get all expenses this month
    expenses = db.query(PettyCashTransaction).filter(
        PettyCashTransaction.transaction_type == 'OUT',
        sqlfunc.extract('year', PettyCashTransaction.transaction_date) == year,
        sqlfunc.extract('month', PettyCashTransaction.transaction_date) == month
    ).all()
    
    # Group by category
    by_category = {}
    for exp in expenses:
        cat = exp.category or "OTHER"
        if cat not in by_category:
            by_category[cat] = {"count": 0, "total": 0}
        by_category[cat]["count"] += 1
        by_category[cat]["total"] += float(exp.amount or 0)
    
    total_out = sum(c["total"] for c in by_category.values())
    
    return {
        "status": "success",
        "period": f"{year}-{month:02d}",
        "current_balance": get_current_balance(db),
        "total_expenses": total_out,
        "by_category": by_category
    }


@router.post("/expense")
def record_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db)
):
    """
    💸 Record expense (Pengeluaran)
    
    Categories: TRANSPORT, SUPPLIES, LABOR, SECURITY, MEALS, OTHER
    """
    current_balance = get_current_balance(db)
    
    if data.amount > current_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo tidak cukup. Saldo saat ini: Rp {current_balance:,.0f}"
        )
    
    tx_number = generate_transaction_number(db)
    new_balance = current_balance - data.amount
    
    transaction = PettyCashTransaction(
        transaction_number=tx_number,
        transaction_date=date.today(),
        transaction_type='OUT',
        category=data.category,
        amount=Decimal(str(data.amount)),
        description=data.description,
        recipient=data.recipient,
        balance_before=Decimal(str(current_balance)),
        balance_after=Decimal(str(new_balance)),
        has_receipt=data.has_receipt,
        created_by='Admin'
    )
    
    db.add(transaction)
    update_balance(db, new_balance)
    db.commit()
    db.refresh(transaction)
    
    return {
        "status": "success",
        "message": f"Pengeluaran Rp {data.amount:,.0f} dicatat. Saldo: Rp {new_balance:,.0f}",
        "data": transaction.to_dict()
    }


@router.post("/topup")
def top_up(
    data: TopUpCreate,
    db: Session = Depends(get_db)
):
    """💰 Top-up petty cash balance"""
    current_balance = get_current_balance(db)
    tx_number = generate_transaction_number(db)
    new_balance = current_balance + data.amount
    
    transaction = PettyCashTransaction(
        transaction_number=tx_number,
        transaction_date=date.today(),
        transaction_type='IN',
        category='TOPUP',
        amount=Decimal(str(data.amount)),
        description=data.description,
        balance_before=Decimal(str(current_balance)),
        balance_after=Decimal(str(new_balance)),
        created_by='Admin'
    )
    
    db.add(transaction)
    update_balance(db, new_balance)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Top-up Rp {data.amount:,.0f}. Saldo baru: Rp {new_balance:,.0f}"
    }


@router.get("/balance")
def get_balance(db: Session = Depends(get_db)):
    """💵 Get current petty cash balance"""
    return {
        "status": "success",
        "current_balance": get_current_balance(db)
    }
