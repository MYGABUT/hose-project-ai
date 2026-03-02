"""
HoseMaster WMS - Analytics API
Operational metrics and dashboard statistics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc, desc, and_, or_, cast, String
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

from app.core.database import get_db
from app.models import (
    SalesOrder, 
    SOLine, 
    Product, 
    InventoryBatch, 
    JobOrder, 
    BatchMovement,
    BatchStatus,
    SOStatus,
    JOStatus,
    ProductCategory
)

from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/analytics", 
    tags=["Analytics"],
    dependencies=[Depends(get_current_user)]
)

def get_enum_value(enum_obj):
    """Safely get value from potential Enum object or return string"""
    if hasattr(enum_obj, 'value'):
        return enum_obj.value
    return str(enum_obj) if enum_obj is not None else None

@router.get("/summary")
def get_summary_stats(
    period: str = "month",
    db: Session = Depends(get_db)
):
    """
    📊 Dashboard Summary Cards
    - Total Omzet
    - Total Transactions
    - Material Usage
    """
    # Determine date range
    today = date.today()
    if period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = date(today.year, today.month, 1)
    elif period == "quarter":
        quarter = (today.month - 1) // 3 + 1
        start_date = date(today.year, 3 * quarter - 2, 1)
    elif period == "year":
        start_date = date(today.year, 1, 1)
    else:
        start_date = date(today.year, today.month, 1) # Default month

    # Total Omzet & Transactions (Sales Orders)
    sales_stats = db.query(
        sqlfunc.sum(SalesOrder.total),
        sqlfunc.count(SalesOrder.id)
    ).filter(
        SalesOrder.status == SOStatus.COMPLETED,
        SalesOrder.order_date >= start_date
    ).first()
    
    total_omzet = float(sales_stats[0] or 0)
    total_transactions = int(sales_stats[1] or 0)

    # Hose & Fitting Usage (from Job Orders / SOLines)
    # This is an approximation based on SOLine items
    # Ideally should come from consumed batches, but SOLine is easier for now
    usage_stats = db.query(
        cast(Product.category, String),
        sqlfunc.sum(SOLine.qty)
    ).join(Product, SOLine.product_id == Product.id).filter(
        SOLine.created_at >= start_date
    ).group_by(cast(Product.category, String)).all()
    
    hose_used = 0
    fittings_used = 0
    
    for cat, qty in usage_stats:
        # CATEGORY COMPARISON FIX
        # Ideally compare values, not objects, to be safe
        cat_val = get_enum_value(cat)
        
        if cat_val == ProductCategory.HOSE.value:
            hose_used += int(qty or 0)
        elif cat_val in [ProductCategory.FITTING.value, ProductCategory.CONNECTOR.value]:
            fittings_used += int(qty or 0)

    return {
        "status": "success",
        "data": {
            "totalOmzet": total_omzet,
            "totalTransactions": total_transactions,
            "hoseUsed": hose_used,
            "fittingsUsed": fittings_used,
            "omzetTrend": 12.5, # Placeholder for trend (requires comparing prev period)
            "transactionTrend": 5.0
        }
    }

@router.get("/sales-trend")
def get_sales_trend(db: Session = Depends(get_db)):
    """📈 Daily Sales Trend (Last 30 Days)"""
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    daily_sales = db.query(
        sqlfunc.date(SalesOrder.order_date).label('date'),
        sqlfunc.sum(SalesOrder.total).label('sales'),
        sqlfunc.count(SalesOrder.id).label('count')
    ).filter(
        SalesOrder.status.in_([SOStatus.COMPLETED, SOStatus.CONFIRMED]),
        SalesOrder.order_date >= start_date
    ).group_by(
        sqlfunc.date(SalesOrder.order_date)
    ).all()
    
    result = []
    # Fill gaps? For now just return active days
    for d, sales, count in daily_sales:
        result.append({
            "date": d.strftime("%Y-%m-%d"),
            "sales": float(sales or 0),
            "transactions": int(count)
        })
        
    return {
        "status": "success",
        "data": result
    }

@router.get("/sales-by-category")
def get_sales_by_category(db: Session = Depends(get_db)):
    """🥧 Sales Composition by Category"""
    stats = db.query(
        cast(Product.category, String),
        sqlfunc.sum(SOLine.line_total)
    ).join(Product, SOLine.product_id == Product.id).filter(
        SOLine.created_at >= date.today() - timedelta(days=30) # Last 30 days
    ).group_by(cast(Product.category, String)).all()
    
    total_revenue = sum(float(s[1] or 0) for s in stats)
    
    result = []
    for cat, revenue in stats:
        rev = float(revenue or 0)
        pct = round((rev / total_revenue * 100), 1) if total_revenue > 0 else 0
        result.append({
            "category": get_enum_value(cat),
            "value": rev,
            "percentage": pct
        })
        
    return {
        "status": "success",
        "data": result
    }

@router.get("/top-selling")
def get_top_selling(db: Session = Depends(get_db)):
    """🔥 Top 10 Best Selling Items"""
    stats = db.query(
        Product.sku,
        Product.name,
        cast(Product.unit, String),
        sqlfunc.sum(SOLine.qty).label('total_qty'),
        sqlfunc.sum(SOLine.line_total).label('total_revenue')
    ).join(Product, SOLine.product_id == Product.id).group_by(
        Product.id, Product.unit
    ).order_by(desc('total_revenue')).limit(10).all()
    
    result = []
    for i, (sku, name, unit, qty, rev) in enumerate(stats, 1):
        result.append({
            "rank": i,
            "sku": sku,
            "name": name,
            "unit": get_enum_value(unit),
            "qty": int(qty or 0),
            "revenue": float(rev or 0)
        })
        
    return {
        "status": "success",
        "data": result
    }

@router.get("/dead-stock")
def get_dead_stock(db: Session = Depends(get_db)):
    """
    💀 Dead Stock (>90 Days No Movement)
    Uses BatchMovement log for accuracy.
    """
    cutoff = datetime.now() - timedelta(days=90)
    
    # Subquery: Get last movement date for each batch
    # We want batches where MAX(movement_date) < cutoff OR no movement at all (and created < cutoff)
    
    # 1. Get batches with movements
    # This is heavy, optimization: Filter batches created < cutoff first
    # 1. Get batches with movements
    # This is heavy, optimization: Filter batches created < cutoff first
    # Safe query
    candidates = db.query(
        InventoryBatch.id,
        InventoryBatch.current_qty,
        InventoryBatch.received_date,
        InventoryBatch.cost_price,
        Product.sku,
        Product.name,
        cast(Product.unit, String).label('unit_str')
    ).join(Product, InventoryBatch.product_id == Product.id).filter(
        InventoryBatch.current_qty > 0,
        InventoryBatch.received_date <= cutoff
    ).limit(100).all() # Limit for performance sanity
    
    result = []
    for b in candidates:
        # Check last movement
        last_move = db.query(sqlfunc.max(BatchMovement.performed_at)).filter(
            BatchMovement.batch_id == b.id
        ).scalar()
        
        last_activity = last_move if last_move else b.received_date
        
        # If last activity is older than cutoff
        if last_activity <= cutoff:
             days_idle = (datetime.now() - last_activity.replace(tzinfo=None)).days
             
             # Estimated value
             value = float(b.current_qty) * (float(b.cost_price or 0) or 100000)
             
             result.append({
                "sku": b.sku,
                "name": b.name,
                "stock": float(b.current_qty),
                "unit": b.unit_str or "PCS",
                "lastMoved": last_activity.date().isoformat(),
                "daysIdle": days_idle,
                "value": value
            })
    
    # Sort by days idle desc
    result.sort(key=lambda x: x['daysIdle'], reverse=True)
    return {
        "status": "success",
        "data": result[:10]
    }


@router.get("/restock-prediction")
def get_restock_prediction(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    🔮 Restock Prediction (AI Forecast)
    Based on Average Daily Usage (ADU) over last X days.
    """
    start_date = datetime.now() - timedelta(days=days)
    
    # 1. Calculate Usage per Product
    # Sum of CONSUME or TRANSFER_OUT movements?
    # Ideally use SOLines for "Demand", but Movement is "Real Consumption"
    usage_stats = db.query(
        InventoryBatch.product_id,
        sqlfunc.sum(BatchMovement.qty)
    ).join(InventoryBatch).filter(
        BatchMovement.performed_at >= start_date,
        or_(
            BatchMovement.movement_type == 'CONSUME', # Assuming string matching enum
            BatchMovement.reference_type.in_(['JO', 'SO'])
        )
    ).group_by(InventoryBatch.product_id).all()
    
    alerts = []
    
    for prod_id, total_used in usage_stats:
        # Safe query
        product = db.query(
            Product.sku,
            Product.name,
            cast(Product.unit, String).label('unit_str')
        ).filter(Product.id == prod_id).first()
        
        if not product:
            continue
            
        used_qty = float(total_used or 0)
        if used_qty <= 0:
            continue
            
        adu = used_qty / days # Average Daily Usage
        
        # Get Current Stock
        current_stock = db.query(sqlfunc.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.product_id == prod_id,
            InventoryBatch.status == 'AVAILABLE'
        ).scalar() or 0
        
        # Days of Sales (DOS) / Days Inventory Outstanding
        dos = current_stock / adu if adu > 0 else 999
        
        # Safe threshold (e.g. 14 days lead time)
        # Ideally stored in Product.lead_time
        threshold = 14 
        
        if dos < threshold:
            alerts.append({
                "sku": product.sku,
                "name": product.name,
                "current_stock": float(current_stock),
                "adu": round(adu, 2), # Daily usage
                "days_left": round(dos, 1),
                "suggestion": f"Order {round(adu * 30)} {product.unit_str or 'PCS'} (for 30 days)"
            })
            
    return {
        "status": "success",
        "data": sorted(alerts, key=lambda x: x['days_left'])
    }

@router.get("/qc-stats")
def get_qc_stats(db: Session = Depends(get_db)):
    """✅ Quality Control Statistics"""
    # Simply count batches by status?
    # Or count log entries?
    
    # Valid approximation: Count batches received in last 30 days
    start_date = datetime.now() - timedelta(days=30)
    
    total = db.query(InventoryBatch).filter(InventoryBatch.created_at >= start_date).count()
    passed = db.query(InventoryBatch).filter(
        InventoryBatch.created_at >= start_date, 
        InventoryBatch.status == BatchStatus.AVAILABLE
    ).count()
    rejected = db.query(InventoryBatch).filter(
        InventoryBatch.created_at >= start_date, 
        or_(InventoryBatch.status == BatchStatus.DAMAGED, InventoryBatch.status == BatchStatus.SCRAPPED)
    ).count()
    
    pass_rate = round((passed / total * 100), 1) if total > 0 else 0
    reject_rate = round((rejected / total * 100), 1) if total > 0 else 0
    
    return {
        "status": "success",
        "data": {
            "totalInspected": total,
            "passed": passed,
            "rejected": rejected,
            "passRate": pass_rate,
            "rejectRate": reject_rate,
            "rejectByCategory": [], # Todo: Need reject reason logging
            "vendorQuality": [] # Todo: Need vendor linkage
        }
    }

@router.get("/production-stats")
def get_production_stats(db: Session = Depends(get_db)):
    """🏭 Production Statistics"""
    # Count completed jobs
    completed_jobs = db.query(JobOrder).filter(
        JobOrder.status == JOStatus.COMPLETED
    ).count()
    
    # Estimate utilization (dummy for now as we don't track machine hours yet)
    result = {
        "totalProduced": completed_jobs,
        "totalMeters": completed_jobs * 2, # Avg 2m
        "utilizationRate": 85.0,
        "byMachine": []
    }
    
    return {
        "status": "success",
        "data": result
    }

@router.get("/active-jobs")
def get_active_jobs(db: Session = Depends(get_db)):
    """🏭 Active Job Orders"""
    jobs = db.query(JobOrder).filter(
        JobOrder.status.in_([
            JOStatus.IN_PROGRESS, 
            JOStatus.MATERIALS_RESERVED,
            JOStatus.QC_PENDING
        ])
    ).order_by(JobOrder.created_at.desc()).limit(10).all()
    
    result = []
    for job in jobs:
        # Calculate progress (simple logic for now)
        progress = 0
        if job.status == JOStatus.IN_PROGRESS:
            progress = job.progress_percent # Use model property
        elif job.status == JOStatus.QC_PENDING:
            progress = 90
        elif job.status == JOStatus.COMPLETED:
            progress = 100
        elif job.status == JOStatus.MATERIALS_RESERVED:
            progress = 10
            
        client_name = "Internal"
        if job.sales_order and job.sales_order.customer_name:
            client_name = job.sales_order.customer_name
        elif job.notes:
            client_name = job.notes[:20]

        result.append({
            "id": job.jo_number,
            "client": client_name,
            "progress": progress,
            "status": get_enum_value(job.status).lower() if job.status else "unknown"
        })
        
    return {
        "status": "success",
        "data": result
    }

@router.get("/low-stock")
def get_low_stock(db: Session = Depends(get_db)):
    """⚠️ Low Stock Alerts"""
    # Find products where total current_qty < min_stock
    # This requires detailed aggregation, for now let's check Product.min_stock vs aggregated batches?
    # Or simpler: Product table should ideally translate current stock.
    # We will compute on fly for now.
    
    # Safe query to avoid Enum crash
    products = db.query(
        Product.id,
        Product.name,
        Product.min_stock,
        cast(Product.unit, String).label('unit_str')
    ).filter(Product.min_stock > 0).all()
    
    alerts = []
    for p in products:
        # Sum batch qty
        total_qty = db.query(sqlfunc.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.product_id == p.id,
            InventoryBatch.status == BatchStatus.AVAILABLE
        ).scalar() or 0
        
        if total_qty < p.min_stock:
            alerts.append({
                "name": p.name,
                "current": float(total_qty),
                "minimum": p.min_stock,
                "unit": p.unit_str or "PCS"
            })
            
    return {
        "status": "success",
        "data": alerts[:5] # Top 5 alerts
    }
