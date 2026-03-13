"""
HoseMaster WMS - Blanket Order Endpoints
Pengiriman bertahap — call-off / release berdasarkan kebutuhan customer
"""
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqla_func
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.models import (
    SalesOrder, SOLine, DeliveryOrder, DOLine,
    Invoice, InvoiceLine, BlanketRelease, BlanketReleaseLine,
    BlanketReleaseStatus
)

router = APIRouter(prefix="/blanket-orders", tags=["Sales - Blanket Orders"])


# ──────── Pydantic Schemas ────────

class BlanketSOCreate(BaseModel):
    customer_name: str
    customer_id: Optional[int] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    valid_from: Optional[str] = None  # ISO date
    valid_until: Optional[str] = None
    notes: Optional[str] = None
    lines: List[dict]  # [{product_id, description, qty, unit_price, ...}]


class ReleaseCreate(BaseModel):
    requested_date: Optional[str] = None
    notes: Optional[str] = None
    lines: List[dict]  # [{so_line_id, qty}]


# ──────── Helper ────────

def _gen_release_number(db: Session, so_id: int) -> str:
    count = db.query(BlanketRelease).filter(BlanketRelease.so_id == so_id).count()
    return f"REL-{count + 1:03d}"


def _gen_so_number() -> str:
    now = datetime.now()
    import random, string
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"BSO-{now.strftime('%Y%m%d')}-{suffix}"


def _gen_do_number() -> str:
    now = datetime.now()
    import random, string
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"DO-{now.strftime('%Y%m%d')}-{suffix}"


def _gen_inv_number() -> str:
    now = datetime.now()
    import random, string
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"INV-{now.strftime('%Y%m')}-{suffix}"


# ──────── CRUD Endpoints ────────

@router.get("")
def list_blanket_orders(
    status: Optional[str] = None,
    customer: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all blanket sales orders"""
    q = db.query(SalesOrder).filter(SalesOrder.order_type == 'BLANKET', SalesOrder.is_deleted == False)
    if status:
        q = q.filter(SalesOrder.status == status)
    if customer:
        q = q.filter(SalesOrder.customer_name.ilike(f"%{customer}%"))
    orders = q.order_by(SalesOrder.created_at.desc()).all()
    
    result = []
    for so in orders:
        d = so.to_dict()
        d["order_type"] = so.order_type
        d["blanket_valid_from"] = so.blanket_valid_from.isoformat() if so.blanket_valid_from else None
        d["blanket_valid_until"] = so.blanket_valid_until.isoformat() if so.blanket_valid_until else None
        d["qty_reserved"] = so.qty_reserved
        d["release_count"] = len(so.releases) if so.releases else 0
        d["qty_released"] = sum(l.qty_released for l in so.lines) if so.lines else 0
        d["qty_total"] = sum(l.qty for l in so.lines) if so.lines else 0
        result.append(d)
    
    return {"status": "success", "data": result}


@router.post("")
def create_blanket_order(payload: BlanketSOCreate, db: Session = Depends(get_db)):
    """Create a new blanket sales order"""
    so = SalesOrder(
        so_number=_gen_so_number(),
        customer_name=payload.customer_name,
        customer_id=payload.customer_id,
        customer_phone=payload.customer_phone,
        customer_address=payload.customer_address,
        order_type='BLANKET',
        status='BLANKET',
        blanket_valid_from=date.fromisoformat(payload.valid_from) if payload.valid_from else date.today(),
        blanket_valid_until=date.fromisoformat(payload.valid_until) if payload.valid_until else None,
        notes=payload.notes,
    )
    db.add(so)
    db.flush()
    
    total = 0
    total_qty = 0
    for i, line_data in enumerate(payload.lines, 1):
        line = SOLine(
            so_id=so.id,
            line_number=i,
            product_id=line_data.get("product_id"),
            description=line_data.get("description", ""),
            qty=line_data.get("qty", 1),
            unit_price=line_data.get("unit_price", 0),
            line_total=line_data.get("qty", 1) * line_data.get("unit_price", 0),
            is_assembly=line_data.get("is_assembly", False),
        )
        db.add(line)
        total += float(line.line_total)
        total_qty += line.qty
    
    so.subtotal = total
    so.total = total
    so.qty_reserved = total_qty
    
    db.commit()
    db.refresh(so)
    
    return {"status": "success", "data": so.to_dict(), "message": f"Blanket Order {so.so_number} berhasil dibuat"}


@router.get("/{so_id}")
def get_blanket_order(so_id: int, db: Session = Depends(get_db)):
    """Get blanket order detail with releases"""
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id, SalesOrder.order_type == 'BLANKET').first()
    if not so:
        raise HTTPException(404, "Blanket Order tidak ditemukan")
    
    d = so.to_dict()
    d["order_type"] = so.order_type
    d["blanket_valid_from"] = so.blanket_valid_from.isoformat() if so.blanket_valid_from else None
    d["blanket_valid_until"] = so.blanket_valid_until.isoformat() if so.blanket_valid_until else None
    d["qty_reserved"] = so.qty_reserved
    d["releases"] = [r.to_dict() for r in so.releases] if so.releases else []
    d["qty_released"] = sum(l.qty_released for l in so.lines) if so.lines else 0
    d["qty_total"] = sum(l.qty for l in so.lines) if so.lines else 0
    
    return {"status": "success", "data": d}


# ──────── Release / Call-off ────────

@router.get("/{so_id}/releases")
def list_releases(so_id: int, db: Session = Depends(get_db)):
    """List all releases for a blanket order"""
    releases = db.query(BlanketRelease).filter(BlanketRelease.so_id == so_id)\
        .order_by(BlanketRelease.created_at.desc()).all()
    return {"status": "success", "data": [r.to_dict() for r in releases]}


@router.post("/{so_id}/releases")
def create_release(so_id: int, payload: ReleaseCreate, db: Session = Depends(get_db)):
    """Create a new call-off/release from blanket order"""
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id, SalesOrder.order_type == 'BLANKET').first()
    if not so:
        raise HTTPException(404, "Blanket Order tidak ditemukan")
    
    # Check validity
    if so.blanket_valid_until and date.today() > so.blanket_valid_until:
        raise HTTPException(400, "Blanket Order sudah expired")
    
    # Validate quantities
    for line_data in payload.lines:
        so_line = db.query(SOLine).filter(SOLine.id == line_data["so_line_id"], SOLine.so_id == so_id).first()
        if not so_line:
            raise HTTPException(400, f"SO Line {line_data['so_line_id']} tidak ditemukan")
        remaining = so_line.qty - so_line.qty_released
        if line_data["qty"] > remaining:
            raise HTTPException(400, f"Qty release ({line_data['qty']}) melebihi sisa ({remaining}) untuk {so_line.description}")
    
    # Create release
    release = BlanketRelease(
        so_id=so_id,
        release_number=_gen_release_number(db, so_id),
        requested_date=date.fromisoformat(payload.requested_date) if payload.requested_date else None,
        notes=payload.notes,
        status=BlanketReleaseStatus.PLANNED,
    )
    db.add(release)
    db.flush()
    
    for line_data in payload.lines:
        rel_line = BlanketReleaseLine(
            release_id=release.id,
            so_line_id=line_data["so_line_id"],
            qty=line_data["qty"],
        )
        db.add(rel_line)
        
        # Update SO Line qty_released
        so_line = db.query(SOLine).filter(SOLine.id == line_data["so_line_id"]).first()
        so_line.qty_released = (so_line.qty_released or 0) + line_data["qty"]
    
    db.commit()
    db.refresh(release)
    
    return {"status": "success", "data": release.to_dict(), "message": f"Release {release.release_number} berhasil dibuat"}


@router.post("/{so_id}/releases/{release_id}/confirm")
def confirm_release(so_id: int, release_id: int, db: Session = Depends(get_db)):
    """Confirm release → creates Delivery Order automatically"""
    release = db.query(BlanketRelease).filter(
        BlanketRelease.id == release_id, BlanketRelease.so_id == so_id
    ).first()
    if not release:
        raise HTTPException(404, "Release tidak ditemukan")
    if release.status != BlanketReleaseStatus.PLANNED:
        raise HTTPException(400, f"Release status {release.status.value}, harus PLANNED untuk confirm")
    
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    
    # Create DO
    do = DeliveryOrder(
        do_number=_gen_do_number(),
        so_id=so_id,
        delivery_date=datetime.combine(release.requested_date, datetime.min.time()) if release.requested_date else datetime.now(),
        recipient_name=so.customer_name,
        recipient_phone=so.customer_phone,
        delivery_address=so.customer_address,
        status='DRAFT',
        notes=f"Blanket Release: {release.release_number}",
        created_by="System",
    )
    db.add(do)
    db.flush()
    
    # Create DO Lines
    for rel_line in release.lines:
        so_line = rel_line.so_line
        do_line = DOLine(
            do_id=do.id,
            so_line_id=rel_line.so_line_id,
            product_id=so_line.product_id if so_line else None,
            description=so_line.description if so_line else "",
            qty_shipped=rel_line.qty,
        )
        db.add(do_line)
    
    release.do_id = do.id
    release.status = BlanketReleaseStatus.RELEASED
    release.released_at = datetime.now()
    
    db.commit()
    db.refresh(release)
    
    return {
        "status": "success",
        "data": release.to_dict(),
        "message": f"Release {release.release_number} dikonfirmasi → DO {do.do_number} dibuat"
    }


@router.post("/{so_id}/releases/{release_id}/deliver")
def deliver_release(so_id: int, release_id: int, db: Session = Depends(get_db)):
    """Mark release as delivered → creates per-release invoice"""
    release = db.query(BlanketRelease).filter(
        BlanketRelease.id == release_id, BlanketRelease.so_id == so_id
    ).first()
    if not release:
        raise HTTPException(404, "Release tidak ditemukan")
    if release.status != BlanketReleaseStatus.RELEASED:
        raise HTTPException(400, f"Release status {release.status.value}, harus RELEASED untuk deliver")
    
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    
    # Create per-release invoice
    inv = Invoice(
        invoice_number=_gen_inv_number(),
        so_id=so_id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        customer_address=so.customer_address,
        invoice_date=date.today(),
        due_date=date.today(),
        status='DRAFT',
        notes=f"Invoice untuk Release {release.release_number}",
        created_by="System",
    )
    db.add(inv)
    db.flush()
    
    subtotal = 0
    for i, rel_line in enumerate(release.lines, 1):
        so_line = rel_line.so_line
        line_subtotal = rel_line.qty * float(so_line.unit_price or 0)
        inv_line = InvoiceLine(
            invoice_id=inv.id,
            line_number=i,
            product_id=so_line.product_id if so_line else None,
            description=so_line.description if so_line else "",
            qty=rel_line.qty,
            unit_price=so_line.unit_price if so_line else 0,
            subtotal=line_subtotal,
        )
        db.add(inv_line)
        subtotal += line_subtotal
        
        # Update SO Line qty_shipped
        so_line.qty_shipped = (so_line.qty_shipped or 0) + rel_line.qty
    
    inv.subtotal = subtotal
    inv.dpp = subtotal
    inv.tax_amount = subtotal * float(inv.tax_rate or 11) / 100
    inv.total = subtotal + float(inv.tax_amount)
    
    release.invoice_id = inv.id
    release.status = BlanketReleaseStatus.DELIVERED
    release.actual_date = date.today()
    
    # Update SO status
    total_shipped = sum(l.qty_shipped for l in so.lines)
    total_ordered = sum(l.qty for l in so.lines)
    if total_shipped >= total_ordered:
        so.status = 'COMPLETED'
    elif total_shipped > 0:
        so.status = 'PARTIAL_DELIVERED'
    
    db.commit()
    db.refresh(release)
    
    return {
        "status": "success",
        "data": release.to_dict(),
        "message": f"Release {release.release_number} delivered → Invoice {inv.invoice_number} dibuat"
    }


# ──────── Summary Invoice ────────

@router.post("/{so_id}/invoice-summary")
def generate_summary_invoice(so_id: int, db: Session = Depends(get_db)):
    """Generate accumulated summary invoice for all delivered releases"""
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id, SalesOrder.order_type == 'BLANKET').first()
    if not so:
        raise HTTPException(404, "Blanket Order tidak ditemukan")
    
    delivered = [r for r in so.releases if r.status == BlanketReleaseStatus.DELIVERED]
    if not delivered:
        raise HTTPException(400, "Belum ada release yang DELIVERED")
    
    # Create summary invoice
    inv = Invoice(
        invoice_number=_gen_inv_number(),
        so_id=so_id,
        so_number=so.so_number,
        customer_id=so.customer_id,
        customer_name=so.customer_name,
        customer_address=so.customer_address,
        invoice_date=date.today(),
        due_date=date.today(),
        status='DRAFT',
        notes=f"Invoice Akumulasi — {len(delivered)} release (Blanket SO {so.so_number})",
        created_by="System",
    )
    db.add(inv)
    db.flush()
    
    # Aggregate by SO Line
    line_totals = {}
    for release in delivered:
        for rl in release.lines:
            key = rl.so_line_id
            if key not in line_totals:
                line_totals[key] = {"so_line": rl.so_line, "total_qty": 0}
            line_totals[key]["total_qty"] += rl.qty
    
    subtotal = 0
    for i, (so_line_id, info) in enumerate(line_totals.items(), 1):
        so_line = info["so_line"]
        line_sub = info["total_qty"] * float(so_line.unit_price or 0)
        inv_line = InvoiceLine(
            invoice_id=inv.id,
            line_number=i,
            product_id=so_line.product_id if so_line else None,
            description=f"[AKUMULASI] {so_line.description}" if so_line else "",
            qty=info["total_qty"],
            unit_price=so_line.unit_price if so_line else 0,
            subtotal=line_sub,
        )
        db.add(inv_line)
        subtotal += line_sub
    
    inv.subtotal = subtotal
    inv.dpp = subtotal
    inv.tax_amount = subtotal * float(inv.tax_rate or 11) / 100
    inv.total = subtotal + float(inv.tax_amount)
    
    db.commit()
    db.refresh(inv)
    
    return {
        "status": "success",
        "data": inv.to_dict(),
        "message": f"Invoice Akumulasi {inv.invoice_number} berhasil dibuat"
    }


# ──────── Cancel / Delete ────────

@router.post("/{so_id}/releases/{release_id}/cancel")
def cancel_release(so_id: int, release_id: int, db: Session = Depends(get_db)):
    """Cancel a planned release"""
    release = db.query(BlanketRelease).filter(
        BlanketRelease.id == release_id, BlanketRelease.so_id == so_id
    ).first()
    if not release:
        raise HTTPException(404, "Release tidak ditemukan")
    if release.status == BlanketReleaseStatus.DELIVERED:
        raise HTTPException(400, "Tidak bisa cancel release yang sudah DELIVERED")
    
    # Restore qty_released
    for rl in release.lines:
        so_line = rl.so_line
        so_line.qty_released = max(0, (so_line.qty_released or 0) - rl.qty)
    
    release.status = BlanketReleaseStatus.CANCELLED
    db.commit()
    
    return {"status": "success", "message": f"Release {release.release_number} dibatalkan"}
