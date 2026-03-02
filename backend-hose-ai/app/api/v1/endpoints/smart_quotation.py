"""
HosePro AI - Smart Quotation Engine
Phase 2 of the Super ERP Roadmap.

Features:
1. Instant Quote Generation (from product list)
2. Customer-Specific Pricing (loyalty discounts)
3. Quote-to-SO Conversion
4. QR Self-Service Reorder Links
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib
import json

from app.core.database import get_db
from app.models.product import Product
from app.models import SalesOrder, InventoryBatch
from app.core.config import settings


router = APIRouter(prefix="/quotation", tags=["Smart Quotation"])


# ============ Schemas ============

class QuoteLineRequest(BaseModel):
    product_id: int
    qty: float
    notes: Optional[str] = None

class QuoteRequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    lines: List[QuoteLineRequest]
    discount_pct: float = 0  # Overall discount %
    valid_days: int = 7      # Quote validity in days
    notes: Optional[str] = None

class QRReorderRequest(BaseModel):
    product_id: int
    default_qty: float = 1
    customer_name: Optional[str] = None


# ============ Endpoints ============

@router.post("/generate")
def generate_instant_quote(
    data: QuoteRequest,
    db: Session = Depends(get_db)
):
    """
    ⚡ Instant Quote Generator

    Create a professional quote in seconds.
    Uses sell_price from Product Master + customer loyalty discount.
    Returns a complete quote object ready for PDF rendering or SO conversion.
    """
    lines = []
    subtotal = 0

    # Check customer loyalty (purchase count & lifetime value)
    loyalty = db.execute(text("""
        SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(CAST(total AS float)), 0) as lifetime_value
        FROM sales_orders
        WHERE customer_name = :name
          AND is_deleted = false AND status != 'CANCELLED'
    """), {"name": data.customer_name}).fetchone()

    loyalty_discount = 0
    loyalty_tier = "NEW"
    if loyalty and loyalty.total_orders > 0:
        if loyalty.lifetime_value >= 100_000_000:  # > 100jt
            loyalty_tier = "🏆 PLATINUM"
            loyalty_discount = 5
        elif loyalty.lifetime_value >= 50_000_000:
            loyalty_tier = "🥇 GOLD"
            loyalty_discount = 3
        elif loyalty.lifetime_value >= 10_000_000:
            loyalty_tier = "🥈 SILVER"
            loyalty_discount = 1

    for idx, line in enumerate(data.lines, 1):
        product = db.query(Product).filter(Product.id == line.product_id).first()
        if not product:
            raise HTTPException(404, f"Product ID {line.product_id} not found")

        unit_price = float(product.sell_price or 0)
        line_total = unit_price * line.qty

        # Check stock availability
        stock_result = db.execute(text("""
            SELECT COALESCE(SUM(current_qty), 0) as available
            FROM inventory_batches
            WHERE product_id = :pid AND is_deleted = false AND current_qty > 0
        """), {"pid": line.product_id}).fetchone()
        available = float(stock_result.available) if stock_result else 0

        unit_val = product.unit.value if product.unit and hasattr(product.unit, 'value') else "pcs"

        lines.append({
            "line_number": idx,
            "product_id": product.id,
            "sku": product.sku,
            "product_name": product.name,
            "brand": product.brand,
            "qty": line.qty,
            "unit": unit_val,
            "unit_price": unit_price,
            "line_total": line_total,
            "stock_available": available,
            "in_stock": available >= line.qty,
            "notes": line.notes,
        })
        subtotal += line_total

    # Apply discounts
    total_discount_pct = data.discount_pct + loyalty_discount
    discount_amount = subtotal * (total_discount_pct / 100)
    tax_amount = (subtotal - discount_amount) * 0.11  # PPN 11%
    grand_total = subtotal - discount_amount + tax_amount

    # Generate quote number
    quote_number = f"QT-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    return {
        "status": "success",
        "quote": {
            "quote_number": quote_number,
            "date": datetime.now().isoformat(),
            "valid_until": (datetime.now() + timedelta(days=data.valid_days)).isoformat(),
            "customer": {
                "name": data.customer_name,
                "phone": data.customer_phone,
                "address": data.customer_address,
                "loyalty_tier": loyalty_tier,
                "total_past_orders": loyalty.total_orders if loyalty else 0,
                "lifetime_value": float(loyalty.lifetime_value) if loyalty else 0,
            },
            "lines": lines,
            "subtotal": subtotal,
            "discount_pct": total_discount_pct,
            "discount_amount": discount_amount,
            "loyalty_discount_pct": loyalty_discount,
            "manual_discount_pct": data.discount_pct,
            "tax_pct": 11,
            "tax_amount": round(tax_amount, 0),
            "grand_total": round(grand_total, 0),
            "notes": data.notes,
            "all_in_stock": all(l["in_stock"] for l in lines),
        }
    }


@router.post("/convert-to-so")
def convert_quote_to_so(
    data: QuoteRequest,
    db: Session = Depends(get_db)
):
    """
    🔄 Convert Quote to Sales Order

    Takes the same QuoteRequest and creates a real SO from it.
    """
    from app.models.sales_order import SalesOrder as SO, SOLine
    from app.models.enums import SOStatus

    # Generate SO number
    last_so = db.query(SO).order_by(SO.id.desc()).first()
    next_num = (last_so.id + 1) if last_so else 1
    so_number = f"SO-{datetime.now().strftime('%Y%m')}-{next_num:04d}"

    so = SO(
        so_number=so_number,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_address=data.customer_address,
        status=SOStatus.DRAFT,
        notes=data.notes or "Created from Smart Quote",
        created_by="QuotationEngine",
    )

    subtotal = 0
    for idx, line in enumerate(data.lines, 1):
        product = db.query(Product).filter(Product.id == line.product_id).first()
        if not product:
            continue
        unit_price = float(product.sell_price or 0)
        line_total = unit_price * line.qty
        subtotal += line_total

        so_line = SOLine(
            line_number=idx,
            product_id=product.id,
            description=f"{product.name} ({product.sku})",
            qty=int(line.qty),
            unit_price=unit_price,
            line_total=line_total,
            notes=line.notes,
        )
        so.lines.append(so_line)

    discount_amount = subtotal * (data.discount_pct / 100)
    tax_amount = (subtotal - discount_amount) * 0.11
    so.subtotal = subtotal
    so.discount = discount_amount
    so.tax = round(tax_amount, 0)
    so.total = round(subtotal - discount_amount + tax_amount, 0)

    db.add(so)
    db.commit()
    db.refresh(so)

    # 🔗 INTEGRATION: Notify system of Quote→SO conversion
    integration_result = None
    try:
        from app.services.integration import on_quote_converted_to_so
        integration_result = on_quote_converted_to_so(db, so.id)
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Sales Order {so_number} created from quote",
        "so_id": so.id,
        "so_number": so_number,
        "total": float(so.total),
        "integration": integration_result
    }


# ============================================================
# QR SELF-SERVICE REORDER
# ============================================================

@router.post("/qr-reorder-link")
def generate_qr_reorder_link(
    data: QRReorderRequest,
    db: Session = Depends(get_db)
):
    """
    📱 Generate QR Reorder Link

    Create a unique URL/token that a customer can scan to instantly
    create a draft order. Print this as a sticker on customer's shelf.
    """
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    # Generate a unique token for this reorder link
    token_data = f"{data.product_id}-{data.default_qty}-{data.customer_name or 'ANY'}"
    token = hashlib.md5(token_data.encode()).hexdigest()[:12]

    # The URL that the QR code should point to
    base_url = f"http://localhost:8000/api/v1/quotation/qr-reorder/{token}"

    unit_val = product.unit.value if product.unit and hasattr(product.unit, 'value') else "pcs"

    return {
        "status": "success",
        "qr_data": {
            "token": token,
            "reorder_url": base_url,
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "default_qty": data.default_qty,
            "unit": unit_val,
            "customer_name": data.customer_name,
            "label_text": f"📱 Scan to reorder: {product.name} ({data.default_qty} {unit_val})",
        },
        "instructions": "Use any QR code generator to encode the 'reorder_url'. Print as a shelf sticker for the customer."
    }


@router.get("/qr-reorder/{token}")
def process_qr_reorder(
    token: str,
    qty: Optional[float] = None,
    customer: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    📱 Process QR Reorder (Customer scans this)

    When a customer scans the QR, this endpoint shows product info
    and allows them to confirm the order.
    """
    return {
        "status": "success",
        "message": "Reorder request received",
        "token": token,
        "action": "Confirm this order by calling POST /quotation/convert-to-so with the product details",
        "note": "This endpoint would normally render a mobile-friendly page or redirect to the customer portal",
    }
