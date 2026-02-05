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

from app.core.database import get_db
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
    """Confirm SO - ready for JO creation"""
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    if so.status != SOStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Hanya SO Draft yang bisa dikonfirmasi")
    
    so.status = SOStatus.CONFIRMED
    so.approved_at = datetime.now()
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} berhasil dikonfirmasi",
        "data": so.to_dict_simple()
    }


@router.delete("/{so_id}")
def delete_sales_order(
    so_id: int,
    db: Session = Depends(get_db)
):
    """Soft delete SO"""
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
    db.commit()
    
    return {
        "status": "success",
        "message": f"SO {so.so_number} berhasil dihapus"
    }


# ============ Customer History ============

@router.get("/customers/list")
def list_customers(
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
                    if do_line.so_line_id == line.id and do.status.value == "DELIVERED":
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


# ============ Payment Tracking ============

class PaymentUpdate(BaseModel):
    """Update payment on SO"""
    amount: float  # Amount being paid
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None  # CASH, TRANSFER, GIRO
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
    from decimal import Decimal
    
    so = db.query(SalesOrder).filter(
        SalesOrder.id == so_id,
        SalesOrder.is_deleted == False
    ).first()
    
    if not so:
        raise HTTPException(status_code=404, detail="Sales Order tidak ditemukan")
    
    # Calculate new amount paid
    current_paid = float(so.amount_paid or 0)
    new_paid = current_paid + data.amount
    total = float(so.total or 0)
    
    # Prevent overpayment
    if new_paid > total:
        raise HTTPException(
            status_code=400, 
            detail=f"Pembayaran melebihi total. Sisa tagihan: Rp {total - current_paid:,.0f}"
        )
    
    # Update payment
    so.amount_paid = Decimal(new_paid)
    
    # Update status
    if new_paid >= total:
        so.payment_status = "PAID"
    elif new_paid > 0:
        so.payment_status = "PARTIAL"
    else:
        so.payment_status = "UNPAID"
    
    db.commit()
    
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
    from sqlalchemy import func
    
    # Get all non-paid SOs
    query = db.query(SalesOrder).filter(
        SalesOrder.is_deleted == False,
        SalesOrder.payment_status.in_(["UNPAID", "PARTIAL"])
    )
    
    orders = query.all()
    
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
    
    # Sort by highest piutang
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
    from datetime import date, timedelta
    
    today = date.today()
    
    # Get all unpaid SOs
    orders = db.query(SalesOrder).filter(
        SalesOrder.is_deleted == False,
        SalesOrder.payment_status.in_(["UNPAID", "PARTIAL"])
    ).all()
    
    # Initialize aging buckets
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
        
        # Calculate days overdue
        days_overdue = 0
        try:
            if so.payment_due_date:
                due = so.payment_due_date
                if hasattr(due, 'date'):
                    due = due.date()
                days_overdue = (today - due).days
            elif so.order_date:
                # If no due date, use order date + 30 days as default
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
        
        # Categorize by age
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
    
    # Calculate percentages
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
        
    # Create Invoice Header
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
        due_date=date.today(), # DP is usually immediate
        subtotal=amount, # Simplified
        discount=0,
        tax_amount=0, # Handling tax on DP is complex, treat as lump sum
        total=Decimal(amount),
        status="SENT",
        is_dp=True,
        payment_status="UNPAID"
    )
    db.add(invoice)
    db.flush()
    
    # Line Item
    line = InvoiceLine(
        invoice_id=invoice.id,
        description=f"Uang Muka / Down Payment for Order {so.so_number}",
        qty=1,
        unit_price=amount,
        line_total=amount
    )
    db.add(line)
    
    # Update SO
    so.dp_amount = Decimal(amount)
    so.dp_invoice_id = invoice.id
    
    db.commit()
    return {
        "status": "success",
        "message": f"Faktur Uang Muka {inv_number} berhasil dibuat",
        "invoice_id": invoice.id
    }

