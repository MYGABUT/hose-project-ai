"""
HoseMaster WMS - Sales Order API
Endpoints for managing sales orders
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import logging

logger = logging.getLogger("integration")

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.models import (
    SalesOrder, SOLine, Product,
    SOStatus
)


router = APIRouter(prefix="/so", tags=["Sales Orders"])


# ============ Schemas ============

class SOLineCreate(BaseModel):
    """Schema for creating SO line"""
    product_id: Optional[int] = None
    description: str
    hose_product_id: Optional[int] = None
    fitting_a_id: Optional[int] = None
    fitting_b_id: Optional[int] = None
    cut_length: Optional[float] = None
    qty: int = 1
    unit_price: float = 0
    is_assembly: bool = False
    notes: Optional[str] = None


class SOCreate(BaseModel):
    """Schema for creating SO"""
    customer_name: str
    salesman_id: Optional[int] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    required_date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: List[SOLineCreate] = []


class SOUpdate(BaseModel):
    """Schema for updating SO"""
    customer_name: Optional[str] = None
    salesman_id: Optional[int] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    required_date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ============ Helper Functions ============

def generate_so_number():
    """Generate unique SO number"""
    today = datetime.now()
    random_part = uuid.uuid4().hex[:6].upper()
    return f"SO-{today.strftime('%Y%m%d')}-{random_part}"


# ============ Endpoints ============

@router.get("")
def list_sales_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of sales orders"""
    query = db.query(SalesOrder).filter(SalesOrder.is_deleted == False)
    
    if status:
        try:
            status_enum = SOStatus(status)
            query = query.filter(SalesOrder.status == status_enum)
        except ValueError:
            pass
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                SalesOrder.so_number.ilike(search_term),
                SalesOrder.customer_name.ilike(search_term)
            )
        )
    
    total = query.count()
    orders = query.order_by(SalesOrder.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "data": [o.to_dict_simple() for o in orders],
        "pagination": {
            "total": total,
            "skip": skip,
            "limit": limit
        }
    }


# ============ Analytics (MUST be before /{so_id}) ============

@router.get("/analytics/loss-analysis")
def get_loss_analysis(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    📉 Loss Analysis — Why are we losing deals?
    
    Aggregates cancelled SOs by reason for management insights.
    """
    from datetime import timedelta
    
    cutoff = datetime.now() - timedelta(days=days)
    
    cancelled_sos = db.query(SalesOrder).filter(
        SalesOrder.status == SOStatus.CANCELLED,
        SalesOrder.is_deleted == False,
        SalesOrder.created_at >= cutoff
    ).order_by(SalesOrder.created_at.desc()).all()
    
    # Parse reasons from notes
    reason_counts = {}
    total_value_lost = 0
    
    for so in cancelled_sos:
        total = float(so.total or 0)
        total_value_lost += total
        
        # Extract reason from notes
        reason = "Tidak disebutkan"
        if so.notes:
            for line in so.notes.split('\n'):
                if '📉' in line:
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        reason = parts[1].strip()
                    break
        
        if reason not in reason_counts:
            reason_counts[reason] = {"count": 0, "total_value": 0}
        reason_counts[reason]["count"] += 1
        reason_counts[reason]["total_value"] += total
    
    # Sort by count
    reasons_sorted = sorted(
        [{"reason": k, **v} for k, v in reason_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    
    return {
        "status": "success",
        "period_days": days,
        "summary": {
            "total_cancelled": len(cancelled_sos),
            "total_value_lost": total_value_lost,
        },
        "by_reason": reasons_sorted,
        "recent_cancellations": [
            {
                "so_number": so.so_number,
                "customer": so.customer_name,
                "total": float(so.total or 0),
                "date": so.created_at.strftime('%Y-%m-%d') if so.created_at else None,
                "notes": so.notes
            }
            for so in cancelled_sos[:10]
        ]
    }


# ============ Customer History (MUST be before /{so_id}) ============

@router.get("/customers/list")
def list_so_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    📋 Get unique customer list from SO history
    """
    from sqlalchemy import func, distinct
    
    query = db.query(
        SalesOrder.customer_name,
        SalesOrder.customer_phone,
        SalesOrder.customer_address,
        func.count(SalesOrder.id).label('total_orders'),
        func.sum(SalesOrder.total).label('total_value')
    ).filter(
        SalesOrder.is_deleted == False
    ).group_by(
        SalesOrder.customer_name,
        SalesOrder.customer_phone,
        SalesOrder.customer_address
    )
    
    if search:
        query = query.filter(SalesOrder.customer_name.ilike(f"%{search}%"))
    
    customers = query.order_by(SalesOrder.customer_name).all()
    
    return {
        "status": "success",
        "total": len(customers),
        "data": [
            {
                "customer_name": c.customer_name,
                "customer_phone": c.customer_phone,
                "customer_address": c.customer_address,
                "total_orders": c.total_orders,
                "total_value": c.total_value or 0
            }
            for c in customers
        ]
    }


@router.get("/customers/history/{customer_name}")
def get_customer_history(
    customer_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    📜 Get purchase history for a specific customer
    
    Returns all SO lines with product info, date, quantity
    """
    from app.models import DeliveryOrder, DOLine
    
    # Get all SOs for this customer
    orders = db.query(SalesOrder).filter(
        SalesOrder.customer_name.ilike(f"%{customer_name}%"),
        SalesOrder.is_deleted == False
    ).order_by(SalesOrder.order_date.desc()).all()
    
    history = []
    
    for so in orders:
        for line in so.lines:
            product_name = line.description
            if line.product:
                product_name = f"{line.product.sku} - {line.product.name}"
            
            # Check delivery status
            delivered_qty = 0
            for do in so.delivery_orders:
                for do_line in do.lines:
                    if do_line.so_line_id == line.id and get_enum_value(do.status) == "DELIVERED":
                        delivered_qty += do_line.qty
            
            history.append({
                "tanggal": so.order_date.isoformat() if so.order_date else so.created_at.isoformat() if so.created_at else None,
                "so_number": so.so_number,
                "product_sku": line.product.sku if line.product else None,
                "product_name": product_name,
                "qty_ordered": line.qty,
                "qty_delivered": delivered_qty,
                "unit_price": line.unit_price,
                "line_total": line.line_total,
                "status": so.status.value
            })
    
    # Pagination
    total = len(history)
    history = history[skip:skip + limit]
    
    # Calculate summary
    total_ordered = sum(h["qty_ordered"] for h in history)
    total_delivered = sum(h["qty_delivered"] for h in history)
    total_value = sum(h["line_total"] or 0 for h in history)
    
    return {
        "status": "success",
        "customer_name": customer_name,
        "summary": {
            "total_transactions": total,
            "total_qty_ordered": total_ordered,
            "total_qty_delivered": total_delivered,
            "total_value": total_value
        },
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": history
    }


# ============ SO Detail (path-param routes below) ============

@router.get("/{so_id}")
def get_sales_order(
    so_id: int,
    db: Session = Depends(get_db)
):
    """Get SO detail with lines"""
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    return {
        "status": "success",
        "data": so.to_dict()
    }


@router.post("")
def create_sales_order(
    data: SOCreate,
    db: Session = Depends(get_db)
):
    """Create new Sales Order"""
    # Create SO
    so = SalesOrder(
        so_number=generate_so_number(),
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_address=data.customer_address,
        salesman_id=data.salesman_id,
        required_date=data.required_date,
        status=SOStatus.DRAFT,
        notes=data.notes,
        created_by="system"
    )
    db.add(so)
    db.flush()
    
    # Create lines
    subtotal = 0
    for i, line_data in enumerate(data.lines, start=1):
        line = SOLine(
            so_id=so.id,
            line_number=i,
            product_id=line_data.product_id,
            description=line_data.description,
            hose_product_id=line_data.hose_product_id,
            fitting_a_id=line_data.fitting_a_id,
            fitting_b_id=line_data.fitting_b_id,
            cut_length=line_data.cut_length,
            qty=line_data.qty,
            unit_price=line_data.unit_price,
            line_total=line_data.qty * line_data.unit_price,
            is_assembly=line_data.is_assembly,
            notes=line_data.notes
        )
        subtotal += line.line_total
        db.add(line)
    
    so.subtotal = subtotal
    so.total = subtotal  # TODO: Add tax calculation
    
    db.commit()
    db.refresh(so)
    
    return {
        "status": "success",
        "message": f"Sales Order {so.so_number} berhasil dibuat",
        "data": so.to_dict()
    }


@router.put("/{so_id}")
def update_sales_order(
    so_id: int,
    data: SOUpdate,
    db: Session = Depends(get_db)
):
    """Update Sales Order"""
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if data.customer_name:
        so.customer_name = data.customer_name
    if data.customer_phone:
        so.customer_phone = data.customer_phone
    if data.customer_address:
        so.customer_address = data.customer_address
    if data.required_date:
        so.required_date = data.required_date
    if data.status:
        try:
            so.status = SOStatus(data.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")
    if data.notes:
        so.notes = data.notes
    
    db.commit()
    db.refresh(so)
    
    return {
        "status": "success",
        "message": "Sales Order berhasil diupdate",
        "data": so.to_dict()
    }


@router.post("/{so_id}/confirm")
def confirm_sales_order(
    so_id: int,
    db: Session = Depends(get_db)
):
    """Confirm SO - ready for JO creation (with margin check)"""
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if so.status != SOStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Hanya SO Draft yang bisa dikonfirmasi")
    
    # --- Margin Check ---
    MARGIN_THRESHOLD = 15.0  # Minimum margin % before requiring approval
    low_margin_lines = []
    
    for line in so.lines:
        if line.product and line.unit_price and line.unit_price > 0:
            # Get buy price from product
            buy_price = float(getattr(line.product, 'buy_price', 0) or getattr(line.product, 'cost_price', 0) or 0)
            sell_price = float(line.unit_price)
            if buy_price > 0:
                margin_pct = ((sell_price - buy_price) / sell_price) * 100
                if margin_pct < MARGIN_THRESHOLD:
                    low_margin_lines.append({
                        "line_number": line.line_number,
                        "product": line.description,
                        "buy_price": buy_price,
                        "sell_price": sell_price,
                        "margin_pct": round(margin_pct, 1)
                    })
    
    if low_margin_lines:
        # Flag as needing approval
        so.status = SOStatus.PENDING_APPROVAL if hasattr(SOStatus, 'PENDING_APPROVAL') else SOStatus.CONFIRMED
        so.notes = (so.notes or '') + f"\n⚠️ LOW MARGIN: {len(low_margin_lines)} line(s) below {MARGIN_THRESHOLD}%"
        db.commit()
        
        return {
            "status": "warning",
            "message": f"SO memiliki {len(low_margin_lines)} barang dengan margin dibawah {MARGIN_THRESHOLD}%. Perlu approval Manager.",
            "needs_approval": True,
            "low_margin_lines": low_margin_lines,
            "data": so.to_dict_simple()
        }
    
    so.status = SOStatus.CONFIRMED
    so.approved_at = datetime.now()
    
    db.commit()
    
    # 🔗 INTEGRATION: Auto-create JO for assembly lines
    integration_result = None
    try:
        from app.services.integration import on_so_confirmed
        integration_result = on_so_confirmed(db, so_id)
        db.commit()
    except Exception as e:
        logger.warning(f"Integration hook failed (non-blocking): {e}")
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} berhasil dikonfirmasi",
        "needs_approval": False,
        "data": so.to_dict_simple(),
        "integration": integration_result
    }


@router.post("/{so_id}/approve-margin")
def approve_low_margin(
    so_id: int,
    approved_by: str = Query("Manager"),
    db: Session = Depends(get_db)
):
    """
    ✅ Manager approval for low-margin SO
    
    Allows confirming an SO that was flagged for low margin.
    """
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    so.status = SOStatus.CONFIRMED
    so.approved_at = datetime.now()
    so.notes = (so.notes or '') + f"\n✅ Margin approved by {approved_by} at {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} berhasil di-approve oleh {approved_by}",
        "data": so.to_dict_simple()
    }


@router.delete("/{so_id}")
def delete_sales_order(
    so_id: int,
    reason_lost: str = Query(None, description="Reason for cancellation/loss"),
    db: Session = Depends(get_db)
):
    """Soft delete SO with optional loss reason"""
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if so.status not in [SOStatus.DRAFT, SOStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Hanya SO Draft/Cancelled yang bisa dihapus")
    
    so.is_deleted = True
    so.status = SOStatus.CANCELLED
    if reason_lost:
        so.notes = (so.notes or '') + f"\n📉 Reason lost: {reason_lost}"
    db.commit()
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} berhasil dihapus"
    }


@router.post("/{so_id}/cancel")
def cancel_sales_order(
    so_id: int,
    reason_lost: str = Query("Dibatalkan", description="Reason for cancellation"),
    cancelled_by: str = Query("Admin"),
    db: Session = Depends(get_db)
):
    """
    ❌ Cancel SO — cascades to linked JOs and unreserves allocated materials.
    
    1. Marks SO as CANCELLED
    2. Finds all linked Job Orders and marks them CANCELLED
    3. Unreserves any allocated JOMaterial back to InventoryBatch
    4. Logs UNRESERVE movements for audit trail
    """
    from app.models import JobOrder, JOMaterial, InventoryBatch
    from app.models.enums import MovementType, JOMaterialStatus
    from app.models.batch_movement import log_movement

    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if so.status == SOStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="SO sudah dibatalkan")
    
    # 1. Cancel the SO
    so.status = SOStatus.CANCELLED
    so.notes = (so.notes or '') + f"\n📉 CANCELLED by {cancelled_by}: {reason_lost}"
    
    # 2. Cascade to linked Job Orders
    cancelled_jos = []
    linked_jos = db.query(JobOrder).filter(JobOrder.so_id == so_id).all()
    
    for jo in linked_jos:
        if jo.status in ['COMPLETED', 'DELIVERED']:
            continue  # Don't cancel already completed/delivered JOs
        
        jo.status = 'CANCELLED'
        jo.notes = (jo.notes or '') + f"\n❌ Auto-cancelled: SO {so.so_number} dibatalkan"
        cancelled_jos.append(jo.jo_number)
        
        # 3. Unreserve allocated materials
        for line in jo.lines:
            for mat in line.materials:
                if mat.status in [JOMaterialStatus.ALLOCATED.value, 'ALLOCATED']:
                    batch = mat.batch
                    if batch:
                        qty_before = batch.current_qty
                        batch.current_qty += mat.allocated_qty
                        
                        # Log the UNRESERVE movement
                        log_movement(
                            db=db,
                            batch_id=batch.id,
                            movement_type=MovementType.UNRESERVE,
                            qty=mat.allocated_qty,
                            qty_before=qty_before,
                            qty_after=batch.current_qty,
                            from_location_id=batch.location_id,
                            to_location_id=batch.location_id,
                            reference_type="SO_CANCEL",
                            reference_id=so.id,
                            reference_number=so.so_number,
                            performed_by=cancelled_by,
                            reason=f"SO Cancelled: {reason_lost}"
                        )
                    
                    mat.status = 'RETURNED'
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} dibatalkan: {reason_lost}",
        "cancelled_jos": cancelled_jos,
        "data": so.to_dict_simple()
    }
