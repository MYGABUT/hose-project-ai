"""
HoseMaster WMS - Job Order Profitability Reports
Calculates HPP, revenue, profit margins for Job Orders
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.models import (
    JobOrder, JOLine, SalesOrder, SOLine, JOStatus
)


router = APIRouter(prefix="/jo", tags=["Job Orders - Profitability"])


@router.get("/{jo_id}/profit")
def get_jo_profit(jo_id: int, db: Session = Depends(get_db)):
    """
    📈 Get profitability for a Job Order
    
    Calculates:
    - Revenue (from SO line price)
    - HPP (from JO completion)
    - Profit = Revenue - HPP
    - Margin % = Profit / Revenue * 100
    """
    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    
    if not jo:
        raise HTTPException(status_code=404, detail="Job Order tidak ditemukan")
    
    # Get SO for revenue
    so = db.query(SalesOrder).filter(SalesOrder.id == jo.so_id).first()
    
    # Calculate total revenue and HPP per line
    lines_profit = []
    total_revenue = 0
    total_hpp = 0
    
    for line in jo.lines:
        # Get revenue from SO line
        revenue = 0
        if line.so_line_id:
            so_line = db.query(SOLine).filter(SOLine.id == line.so_line_id).first()
            if so_line:
                unit_price = float(so_line.unit_price or 0)
                revenue = unit_price * float(line.qty_ordered or 0)
        
        # HPP from JO line
        hpp = float(line.line_hpp or 0)
        profit = revenue - hpp
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        total_revenue += revenue
        total_hpp += hpp
        
        lines_profit.append({
            "line_number": line.line_number,
            "description": line.description,
            "qty": float(line.qty_ordered or 0),
            "revenue": revenue,
            "hpp": hpp,
            "profit": profit,
            "margin_percent": round(margin, 1)
        })
    
    total_profit = total_revenue - total_hpp
    total_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "status": "success",
        "data": {
            "jo_id": jo.id,
            "jo_number": jo.jo_number,
            "so_number": so.so_number if so else None,
            "customer_name": so.customer_name if so else None,
            "status": get_enum_value(jo.status) if jo.status else None,
            "summary": {
                "total_revenue": total_revenue,
                "total_hpp": total_hpp,
                "total_profit": total_profit,
                "margin_percent": round(total_margin, 1),
                "is_profitable": total_profit > 0
            },
            "lines": lines_profit
        }
    }


@router.get("/reports/profitability")
def get_profitability_report(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    📊 Get profitability report for completed JOs
    
    Summary of all profitable/unprofitable jobs in date range.
    """
    from datetime import datetime, timedelta
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Get completed JOs
    jos = db.query(JobOrder).filter(
        JobOrder.status == JOStatus.COMPLETED,
        JobOrder.completed_at >= start_date
    ).all()
    
    total_revenue = 0
    total_hpp = 0
    profitable_count = 0
    unprofitable_count = 0
    jo_profits = []
    
    for jo in jos:
        so = db.query(SalesOrder).filter(SalesOrder.id == jo.so_id).first()
        
        jo_revenue = 0
        for line in jo.lines:
            if line.so_line_id:
                so_line = db.query(SOLine).filter(SOLine.id == line.so_line_id).first()
                if so_line:
                    jo_revenue += float(so_line.unit_price or 0) * float(line.qty_ordered or 0)
        
        jo_hpp = float(jo.total_hpp or 0)
        jo_profit = jo_revenue - jo_hpp
        margin = (jo_profit / jo_revenue * 100) if jo_revenue > 0 else 0
        
        total_revenue += jo_revenue
        total_hpp += jo_hpp
        
        if jo_profit > 0:
            profitable_count += 1
        else:
            unprofitable_count += 1
        
        jo_profits.append({
            "jo_number": jo.jo_number,
            "customer": so.customer_name if so else "Unknown",
            "completed_at": jo.completed_at.isoformat() if jo.completed_at else None,
            "revenue": jo_revenue,
            "hpp": jo_hpp,
            "profit": jo_profit,
            "margin_percent": round(margin, 1)
        })
    
    total_profit = total_revenue - total_hpp
    overall_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    jo_profits_sorted = sorted(jo_profits, key=lambda x: x["profit"])
    
    return {
        "status": "success",
        "period_days": days,
        "summary": {
            "total_jobs": len(jos),
            "profitable_jobs": profitable_count,
            "unprofitable_jobs": unprofitable_count,
            "total_revenue": total_revenue,
            "total_hpp": total_hpp,
            "total_profit": total_profit,
            "overall_margin_percent": round(overall_margin, 1)
        },
        "top_unprofitable": jo_profits_sorted[:5] if unprofitable_count > 0 else [],
        "top_profitable": list(reversed(jo_profits_sorted[-5:])) if len(jo_profits) > 0 else []
    }
