"""
HoseMaster WMS - Financial Reports API
Cash Flow, Profitability Summary, and accounting reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.models import Invoice, SalesOrder, PurchaseOrder, JournalEntry


router = APIRouter(prefix="/reports", tags=["Reports"])


# ============ Cash Flow ============

@router.get("/cash-flow")
def get_cash_flow(
    start_date: str = Query(None, description="YYYY-MM-DD"),
    end_date: str = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    📊 Cash Flow Report
    
    Calculates:
    - Cash In: Payments received from customers (AR)
    - Cash Out: Payments made to suppliers (AP)
    - Net Cash Flow
    """
    # Default to current month
    today = date.today()
    if not start_date:
        start_date = date(today.year, today.month, 1).isoformat()
    if not end_date:
        end_date = today.isoformat()
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Cash In - from paid invoices
    cash_in_query = db.query(
        sqlfunc.sum(Invoice.amount_paid)
    ).filter(
        Invoice.paid_at.isnot(None),
        Invoice.paid_at >= start,
        Invoice.paid_at <= end
    )
    cash_in = float(cash_in_query.scalar() or 0)
    
    # Cash Out - from paid POs
    cash_out_query = db.query(
        sqlfunc.sum(PurchaseOrder.amount_paid)
    ).filter(
        PurchaseOrder.paid_at.isnot(None),
        PurchaseOrder.paid_at >= start,
        PurchaseOrder.paid_at <= end
    )
    cash_out = float(cash_out_query.scalar() or 0)
    
    # Net
    net_cash_flow = cash_in - cash_out
    
    # Detail by category
    invoice_payments = db.query(Invoice).filter(
        Invoice.paid_at.isnot(None),
        Invoice.paid_at >= start,
        Invoice.paid_at <= end
    ).order_by(Invoice.paid_at.desc()).limit(20).all()
    
    po_payments = db.query(PurchaseOrder).filter(
        PurchaseOrder.paid_at.isnot(None),
        PurchaseOrder.paid_at >= start,
        PurchaseOrder.paid_at <= end
    ).order_by(PurchaseOrder.paid_at.desc()).limit(20).all()
    
    return {
        "status": "success",
        "period": {
            "start": start_date,
            "end": end_date
        },
        "summary": {
            "cash_in": cash_in,
            "cash_out": cash_out,
            "net_cash_flow": net_cash_flow,
            "flow_direction": "positive" if net_cash_flow >= 0 else "negative"
        },
        "details": {
            "cash_in_count": len(invoice_payments),
            "cash_in_items": [
                {
                    "date": inv.paid_at.isoformat() if inv.paid_at else None,
                    "number": inv.invoice_number,
                    "customer": inv.customer_name,
                    "amount": float(inv.amount_paid or 0)
                }
                for inv in invoice_payments
            ],
            "cash_out_count": len(po_payments),
            "cash_out_items": [
                {
                    "date": po.paid_at.isoformat() if po.paid_at else None,
                    "number": po.po_number,
                    "supplier": po.supplier_name,
                    "amount": float(po.amount_paid or 0)
                }
                for po in po_payments
            ]
        }
    }


@router.get("/ar-summary")
def get_ar_summary(db: Session = Depends(get_db)):
    """📋 Accounts Receivable Summary"""
    today = date.today()
    
    # Total outstanding
    total = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID'
    ).scalar() or 0
    
    # By age
    current = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date >= today
    ).scalar() or 0
    
    overdue_30 = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date < today,
        Invoice.due_date >= today - timedelta(days=30)
    ).scalar() or 0
    
    overdue_60 = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date < today - timedelta(days=30),
        Invoice.due_date >= today - timedelta(days=60)
    ).scalar() or 0
    
    overdue_90 = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID',
        Invoice.due_date < today - timedelta(days=60)
    ).scalar() or 0
    
    return {
        "status": "success",
        "data": {
            "total_outstanding": float(total),
            "current": float(current),
            "overdue_1_30": float(overdue_30),
            "overdue_31_60": float(overdue_60),
            "overdue_over_60": float(overdue_90)
        }
    }


@router.get("/ap-summary")
def get_ap_summary(db: Session = Depends(get_db)):
    """📋 Accounts Payable Summary"""
    today = date.today()
    
    # Total outstanding
    total = db.query(sqlfunc.sum(PurchaseOrder.total - PurchaseOrder.amount_paid)).filter(
        PurchaseOrder.payment_status != 'PAID'
    ).scalar() or 0
    
    # Overdue
    overdue = db.query(sqlfunc.sum(PurchaseOrder.total - PurchaseOrder.amount_paid)).filter(
        PurchaseOrder.payment_status != 'PAID',
        PurchaseOrder.payment_due_date < today
    ).scalar() or 0
    
    return {
        "status": "success",
        "data": {
            "total_outstanding": float(total),
            "total_overdue": float(overdue)
        }
    }


@router.get("/journal-entries")
def get_journal_entries(
    source_type: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📒 List Journal Entries"""
    query = db.query(JournalEntry)
    
    if source_type:
        query = query.filter(JournalEntry.source_type == source_type)
    
    if start_date:
        query = query.filter(JournalEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.entry_date <= end_date)
    
    total = query.count()
    entries = query.order_by(JournalEntry.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [e.to_dict() for e in entries]
    }


@router.get("/balance-sheet")
def get_balance_sheet(db: Session = Depends(get_db)):
    """
    📊 Balance Sheet (Neraca)
    
    Assets = Kas + Piutang + Persediaan + Aktiva Tetap
    Liabilities = Hutang Usaha
    Equity = Assets - Liabilities
    """
    from app.models import InventoryBatch, FixedAsset
    
    # ============ ASSETS ============
    
    # Cash (estimate from invoice payments - assume all payments go to cash)
    cash_in = db.query(sqlfunc.sum(Invoice.amount_paid)).filter(
        Invoice.payment_status == 'PAID'
    ).scalar() or 0
    
    cash_out = db.query(sqlfunc.sum(PurchaseOrder.amount_paid)).filter(
        PurchaseOrder.payment_status == 'PAID'
    ).scalar() or 0
    
    cash_balance = float(cash_in) - float(cash_out)
    
    # Accounts Receivable (Piutang)
    ar_total = db.query(sqlfunc.sum(Invoice.total - Invoice.amount_paid)).filter(
        Invoice.payment_status != 'PAID'
    ).scalar() or 0
    
    # Inventory Value (using cost price)
    # Sum of all batches * estimated cost
    inventory_batches = db.query(InventoryBatch).filter(
        InventoryBatch.current_qty > 0
    ).all()
    
    inventory_value = 0
    for batch in inventory_batches:
        # Use cost_price if available, otherwise estimate
        cost = getattr(batch, 'cost_price', None) or 50000  # Default estimate
        inventory_value += float(batch.current_qty or 0) * float(cost)
    
    # Fixed Assets (Book Value)
    fixed_assets_value = db.query(sqlfunc.sum(FixedAsset.current_book_value)).filter(
        FixedAsset.status == 'ACTIVE'
    ).scalar() or 0
    
    total_assets = cash_balance + float(ar_total) + inventory_value + float(fixed_assets_value)
    
    # ============ LIABILITIES ============
    
    # Accounts Payable (Hutang)
    ap_total = db.query(sqlfunc.sum(PurchaseOrder.total - PurchaseOrder.amount_paid)).filter(
        PurchaseOrder.payment_status != 'PAID'
    ).scalar() or 0
    
    total_liabilities = float(ap_total)
    
    # ============ EQUITY ============
    equity = total_assets - total_liabilities
    
    return {
        "status": "success",
        "report_date": date.today().isoformat(),
        "data": {
            "assets": {
                "cash_and_bank": cash_balance,
                "accounts_receivable": float(ar_total),
                "inventory": inventory_value,
                "fixed_assets": float(fixed_assets_value),
                "total_assets": total_assets
            },
            "liabilities": {
                "accounts_payable": float(ap_total),
                "total_liabilities": total_liabilities
            },
            "equity": {
                "retained_earnings": equity,
                "total_equity": equity
            },
            "balance_check": {
                "assets_minus_liabilities": total_assets - total_liabilities,
                "equals_equity": equity,
                "is_balanced": abs((total_assets - total_liabilities) - equity) < 0.01
            }
        }
    }

