"""
HoseMaster WMS - Global Activity Log API
Aggregates recent stock changes, SO events, JO events into a single feed.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models import SalesOrder, InventoryBatch, Product
from app.models.job_order import JobOrder
from app.models.purchase_order import PurchaseOrder


router = APIRouter(prefix="/activity-log", tags=["Activity Log"])


@router.get("")
def get_activity_log(
    days: int = Query(7, ge=1, le=90),
    event_type: Optional[str] = Query(None, description="Filter: stock, sales, production, purchase"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    📋 Global Activity Log — Recent stock & order events
    
    Aggregates events from:
    - Stock: Batch creation, qty changes
    - Sales: SO created, confirmed, cancelled
    - Production: JO created, completed
    - Purchase: PO created, received
    """
    cutoff = datetime.now() - timedelta(days=days)
    activities = []
    
    # --- Stock Activities (eager load product to avoid N+1) ---
    if not event_type or event_type == "stock":
        batches = db.query(InventoryBatch).options(
            joinedload(InventoryBatch.product)
        ).filter(
            InventoryBatch.created_at >= cutoff
        ).order_by(desc(InventoryBatch.created_at)).limit(limit).all()
        
        for b in batches:
            activities.append({
                "type": "stock",
                "icon": "📦",
                "action": "Batch Created",
                "description": f"Batch {b.barcode} - {b.product.name if b.product else 'Unknown'} ({b.current_qty} {b.product.unit.value if b.product and b.product.unit else 'pcs'})",
                "reference": b.barcode,
                "timestamp": b.created_at.isoformat() if b.created_at else None,
                "details": {
                    "batch_id": b.id,
                    "product_id": b.product_id,
                    "qty": float(b.current_qty or 0),
                    "location": b.location.code if hasattr(b, 'location') and b.location else None
                }
            })
    
    # --- Sales Activities ---
    if not event_type or event_type == "sales":
        sos = db.query(SalesOrder).filter(
            SalesOrder.is_deleted == False,
            SalesOrder.created_at >= cutoff
        ).order_by(desc(SalesOrder.created_at)).limit(limit).all()
        
        for so in sos:
            action = "SO Created"
            icon = "📝"
            if so.status == "CONFIRMED":
                action = "SO Confirmed"
                icon = "✅"
            elif so.status == "CANCELLED":
                action = "SO Cancelled"
                icon = "❌"
            elif so.status == "INVOICED":
                action = "SO Invoiced"
                icon = "💰"
            
            activities.append({
                "type": "sales",
                "icon": icon,
                "action": action,
                "description": f"{so.so_number} — {so.customer_name} (Rp {float(so.total or 0):,.0f})",
                "reference": so.so_number,
                "timestamp": so.created_at.isoformat() if so.created_at else None,
                "details": {
                    "so_id": so.id,
                    "customer": so.customer_name,
                    "status": so.status,
                    "total": float(so.total or 0)
                }
            })
    
    # --- Production Activities ---
    if not event_type or event_type == "production":
        jos = db.query(JobOrder).filter(
            JobOrder.created_at >= cutoff
        ).order_by(desc(JobOrder.created_at)).limit(limit).all()
        
        for jo in jos:
            action = "JO Created"
            icon = "🔧"
            if jo.status == "COMPLETED":
                action = "JO Completed"
                icon = "✅"
            elif jo.status == "IN_PROGRESS":
                action = "JO In Progress"
                icon = "⚙️"
            
            activities.append({
                "type": "production",
                "icon": icon,
                "action": action,
                "description": f"{jo.jo_number} — {jo.assigned_to or 'Unassigned'} ({jo.progress_percent}%)",
                "reference": jo.jo_number,
                "timestamp": jo.created_at.isoformat() if jo.created_at else None,
                "details": {
                    "jo_id": jo.id,
                    "status": jo.status,
                    "progress": jo.progress_percent,
                    "requires_assembly": jo.requires_assembly
                }
            })
    
    # --- Purchase Activities ---
    if not event_type or event_type == "purchase":
        pos = db.query(PurchaseOrder).filter(
            PurchaseOrder.created_at >= cutoff
        ).order_by(desc(PurchaseOrder.created_at)).limit(limit).all()
        
        for po in pos:
            action = "PO Created"
            icon = "🛒"
            if po.status == "RECEIVED":
                action = "PO Received"  
                icon = "📬"
            elif po.status == "CANCELLED":
                action = "PO Cancelled"
                icon = "❌"
            
            activities.append({
                "type": "purchase",
                "icon": icon,
                "action": action,
                "description": f"{po.po_number} — {po.supplier_name or 'Unknown'} (Rp {float(po.total or 0):,.0f})",
                "reference": po.po_number,
                "timestamp": po.created_at.isoformat() if po.created_at else None,
                "details": {
                    "po_id": po.id,
                    "supplier": po.supplier_name,
                    "status": po.status,
                    "total": float(po.total or 0)
                }
            })
    
    # Sort all by timestamp descending
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    activities = activities[:limit]
    
    return {
        "status": "success",
        "period_days": days,
        "total_events": len(activities),
        "data": activities
    }
