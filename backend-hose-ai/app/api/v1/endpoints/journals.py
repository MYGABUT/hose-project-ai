"""
HoseMaster WMS - Journal API
Endpoints for General Ledger and Core Financials
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from typing import Optional, List, Dict, Any
from datetime import date
from decimal import Decimal

from app.core.database import get_db
from app.models.journal import JournalEntry, JournalLine, COA

router = APIRouter(prefix="/journals", tags=["Core Financials"])


@router.get("")
async def list_journals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    source_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """📘 List all General Ledger Journal Entries"""
    query = db.query(JournalEntry)
    
    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    if source_type:
        query = query.filter(JournalEntry.source_type == source_type)
    if search:
        query = query.filter(
            or_(
                JournalEntry.entry_number.ilike(f"%{search}%"),
                JournalEntry.source_number.ilike(f"%{search}%"),
                JournalEntry.description.ilike(f"%{search}%")
            )
        )
        
    total = query.count()
    entries = query.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id)).offset(skip).limit(limit).all()
    
    # Include lines for expandability in UI
    data = []
    for entry in entries:
        entry_dict = entry.to_dict()
        lines = db.query(JournalLine).filter(JournalLine.journal_id == entry.id).all()
        entry_dict['lines'] = [line.to_dict() for line in lines]
        data.append(entry_dict)
        
    return {
        "status": "success",
        "total": total,
        "data": data
    }


@router.get("/coa")
async def get_chart_of_accounts():
    """📊 Get the active Chart of Accounts (COA)"""
    return {
        "status": "success",
        "data": COA
    }


@router.get("/balance-sheet")
async def get_balance_sheet(db: Session = Depends(get_db)):
    """⚖️ Calculate live Balance Sheet (Assets = Liabilities + Equity)"""
    
    # Aggregate all journal lines by account code
    # Net Balance = Debit - Credit for normal assets/expenses.
    # Net Balance = Credit - Debit for normal liabilities/equity/revenue.
    
    lines = db.query(
        JournalLine.account_code,
        JournalLine.account_name,
        func.sum(JournalLine.debit).label('total_debit'),
        func.sum(JournalLine.credit).label('total_credit')
    ).join(JournalEntry, JournalLine.journal_id == JournalEntry.id)\
     .filter(JournalEntry.status == 'POSTED')\
     .group_by(JournalLine.account_code, JournalLine.account_name)\
     .all()
     
    assets = []
    liabilities = []
    equity = []
    revenue = []
    expenses = []
    
    total_assets = Decimal('0.00')
    total_liabilities = Decimal('0.00')
    total_equity = Decimal('0.00')
    total_revenue = Decimal('0.00')
    total_expenses = Decimal('0.00')

    for code, name, t_debit, t_credit in lines:
        t_deb = Decimal(str(t_debit or 0))
        t_cre = Decimal(str(t_credit or 0))
        
        prefix = str(code)[0] if code else "0"
        
        if prefix == "1": # Assets (Normal Balance: Debit)
            balance = t_deb - t_cre
            assets.append({"code": code, "name": name, "balance": float(balance)})
            total_assets += balance
            
        elif prefix == "2": # Liabilities (Normal Balance: Credit)
            balance = t_cre - t_deb
            liabilities.append({"code": code, "name": name, "balance": float(balance)})
            total_liabilities += balance
            
        elif prefix == "3": # Equity (Normal Balance: Credit)
            balance = t_cre - t_deb
            equity.append({"code": code, "name": name, "balance": float(balance)})
            total_equity += balance
            
        elif prefix == "4": # Revenue (Normal Balance: Credit)
            balance = t_cre - t_deb
            revenue.append({"code": code, "name": name, "balance": float(balance)})
            total_revenue += balance
            
        elif prefix == "5": # Expenses (Normal Balance: Debit)
            balance = t_deb - t_cre
            expenses.append({"code": code, "name": name, "balance": float(balance)})
            total_expenses += balance

    # Net Income = Revenue - Expenses
    net_income = total_revenue - total_expenses
    
    # Calculate Retained Earnings to balance the sheet (Equity + Net Income)
    total_equity_and_liabilities = total_liabilities + total_equity + net_income
    
    is_balanced = abs(total_assets - total_equity_and_liabilities) < Decimal('0.01')
    
    return {
        "status": "success",
        "data": {
            "assets": {
                "items": assets,
                "total": float(total_assets)
            },
            "liabilities": {
                "items": liabilities,
                "total": float(total_liabilities)
            },
            "equity": {
                "items": equity,
                "total": float(total_equity),
                "net_income": float(net_income)
            },
            "revenue": {
                "items": revenue,
                "total": float(total_revenue)
            },
            "expenses": {
                "items": expenses,
                "total": float(total_expenses)
            },
            "summary": {
                "total_assets": float(total_assets),
                "total_liabilities_and_equity": float(total_equity_and_liabilities),
                "net_income": float(net_income),
                "is_balanced": is_balanced
            }
        }
    }
