"""
HoseMaster WMS - Product Pricing & Substitutes
Price history, multi-level pricing, tiered discounts, substitutes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.models import Product, ProductPriceLevel


router = APIRouter(prefix="/products", tags=["Products - Pricing"])


# ============ Price History ============

@router.get("/{product_id}/price-history")
def get_product_price_history(
    product_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    📜 Get purchase price history for a product
    
    Shows prices from different suppliers over time.
    Useful for price comparison before creating PO.
    """
    from app.models import PriceHistory
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    history = db.query(PriceHistory).filter(
        PriceHistory.product_id == product_id
    ).order_by(
        PriceHistory.created_at.desc()
    ).limit(limit).all()
    
    suppliers_prices = {}
    for h in history:
        if h.supplier_name and h.supplier_name not in suppliers_prices:
            suppliers_prices[h.supplier_name] = {
                "supplier_name": h.supplier_name,
                "last_price": float(h.unit_price or 0),
                "last_date": h.created_at.isoformat() if h.created_at else None
            }
    
    prices = [float(h.unit_price) for h in history if h.unit_price]
    avg_price = sum(prices) / len(prices) if prices else 0
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0
    
    return {
        "status": "success",
        "product": {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "current_cost": float(product.cost_price or 0)
        },
        "stats": {
            "avg_price": round(avg_price, 0),
            "min_price": min_price,
            "max_price": max_price,
            "total_records": len(history)
        },
        "by_supplier": list(suppliers_prices.values()),
        "history": [h.to_dict() for h in history]
    }


@router.post("/{product_id}/log-price")
def log_price_history(
    product_id: int,
    supplier_name: str,
    unit_price: float,
    source: str = "MANUAL",
    notes: str = None,
    db: Session = Depends(get_db)
):
    """
    📝 Log a price for a product (manual entry)
    """
    from app.models import PriceHistory
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    price_log = PriceHistory(
        product_id=product_id,
        product_sku=product.sku,
        product_name=product.name,
        supplier_name=supplier_name,
        unit_price=Decimal(str(unit_price)),
        unit=product.unit.value if product.unit else "PCS",
        source=source,
        notes=notes
    )
    
    db.add(price_log)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Harga Rp {unit_price:,.0f} dari {supplier_name} tercatat",
        "data": price_log.to_dict()
    }


# ============ Multi-Level Pricing ============

@router.post("/{product_id}/set-price-level")
def set_product_price_level(
    product_id: int,
    price_level: str,
    unit_price: float,
    level_name: str = None,
    discount_percent: float = 0,
    min_qty: int = 1,
    db: Session = Depends(get_db)
):
    """
    🏷️ Set price for a specific customer level
    
    Example levels:
    - A or VIP: Distributor/Reseller
    - B or REGULAR: Retail customer
    - C or WALKIN: Walk-in customer
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    existing = db.query(ProductPriceLevel).filter(
        ProductPriceLevel.product_id == product_id,
        ProductPriceLevel.price_level == price_level.upper()
    ).first()
    
    if existing:
        existing.unit_price = Decimal(str(unit_price))
        existing.price_level_name = level_name
        existing.discount_percent = Decimal(str(discount_percent))
        existing.min_qty = min_qty
        db.commit()
        return {
            "status": "success",
            "message": f"Harga level {price_level} diupdate",
            "data": existing.to_dict()
        }
    else:
        price_level_obj = ProductPriceLevel(
            product_id=product_id,
            price_level=price_level.upper(),
            price_level_name=level_name or price_level,
            unit_price=Decimal(str(unit_price)),
            discount_percent=Decimal(str(discount_percent)),
            min_qty=min_qty
        )
        db.add(price_level_obj)
        db.commit()
        return {
            "status": "success",
            "message": f"Harga level {price_level} = Rp {unit_price:,.0f} ditambahkan",
            "data": price_level_obj.to_dict()
        }


@router.get("/{product_id}/price-levels")
def get_product_price_levels(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    📋 Get all price levels for a product
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    levels = db.query(ProductPriceLevel).filter(
        ProductPriceLevel.product_id == product_id
    ).order_by(ProductPriceLevel.unit_price).all()
    
    return {
        "status": "success",
        "product": {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "base_price": float(product.sell_price or 0)
        },
        "price_levels": [l.to_dict() for l in levels]
    }


@router.get("/{product_id}/get-customer-price")
def get_customer_price(
    product_id: int,
    customer_name: str = None,
    price_level: str = None,
    qty: int = 1,
    db: Session = Depends(get_db)
):
    """
    💰 Get price for a product based on customer or level
    
    Priority:
    1. If customer_name provided, use customer's price_level
    2. If price_level provided directly, use that
    3. Otherwise use base price
    """
    from app.models import Customer
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    base_price = float(product.sell_price or 0)
    applied_level = None
    final_price = base_price
    
    level_to_use = None
    if customer_name:
        customer = db.query(Customer).filter(Customer.name == customer_name).first()
        if customer and customer.price_level:
            level_to_use = customer.price_level.upper()
    elif price_level:
        level_to_use = price_level.upper()
    
    if level_to_use:
        level_price = db.query(ProductPriceLevel).filter(
            ProductPriceLevel.product_id == product_id,
            ProductPriceLevel.price_level == level_to_use,
            ProductPriceLevel.min_qty <= qty
        ).first()
        
        if level_price:
            final_price = float(level_price.unit_price)
            applied_level = level_to_use
    
    discount = base_price - final_price
    discount_percent = (discount / base_price * 100) if base_price > 0 else 0
    
    return {
        "status": "success",
        "data": {
            "product_id": product.id,
            "product_name": product.name,
            "qty": qty,
            "base_price": base_price,
            "applied_level": applied_level,
            "final_price": final_price,
            "discount": discount,
            "discount_percent": round(discount_percent, 1),
            "total": final_price * qty
        }
    }


# ============ Tiered Discount ============

class TieredDiscountRequest(BaseModel):
    """Calculate tiered/cascading discount"""
    base_price: float
    discounts: list  # [30, 5] for "30% + 5%"


@router.post("/calculate-tiered-discount")
def calculate_tiered_discount(
    data: TieredDiscountRequest,
    db: Session = Depends(get_db)
):
    """
    🧮 Calculate Tiered/Cascading Discount
    
    Example: Diskon 30% + 5%
    - Base: Rp 100,000
    - After 30%: Rp 70,000 (diskon Rp 30,000)
    - After 5% of 70,000: Rp 66,500 (diskon lagi Rp 3,500)
    - Total diskon: Rp 33,500 (33.5%)
    
    Usage: Customer minta diskon bertingkat "30% + 5%"
    """
    from app.utils.discount import calculate_tiered_discount as calc_discount
    
    result = calc_discount(data.base_price, data.discounts)
    
    return {
        "status": "success",
        "message": f"Harga {data.base_price:,.0f} setelah diskon {'+'.join([str(d) for d in data.discounts])}% = {result['final_price']:,.0f}",
        "data": result
    }


# ============ Substitute Items ============

class SubstituteCreate(BaseModel):
    substitute_product_id: int
    notes: Optional[str] = None

@router.post("/{id}/substitutes", tags=["Products (Go-Live)"])
def add_substitute_item(
    id: int,
    data: SubstituteCreate,
    db: Session = Depends(get_db)
):
    """
    🔄 Add Substitute / Alternative Item
    """
    from app.models.product_substitute import ProductSubstitute
    
    if id == data.substitute_product_id:
        raise HTTPException(status_code=400, detail="Cannot substitute with self")
        
    exists = db.query(ProductSubstitute).filter(
        ProductSubstitute.product_id == id,
        ProductSubstitute.substitute_product_id == data.substitute_product_id
    ).first()
    
    if exists:
         return {"status": "success", "message": "Substitute already linked"}
         
    sub = ProductSubstitute(
        product_id=id,
        substitute_product_id=data.substitute_product_id,
        notes=data.notes
    )
    db.add(sub)
    db.commit()
    
    return {"status": "success", "message": "Substitute item added"}

@router.get("/{id}/substitutes", tags=["Products (Go-Live)"])
def get_substitutes(
    id: int,
    db: Session = Depends(get_db)
):
    """
    🔍 Get list of substitute items
    """
    from app.models.product_substitute import ProductSubstitute
    
    subs = db.query(ProductSubstitute).filter(ProductSubstitute.product_id == id).all()
    
    results = []
    for sub in subs:
        prod = sub.substitute_product
        if prod:
            results.append({
                "product_id": prod.id,
                "sku": prod.sku,
                "name": prod.name,
                "brand": prod.brand,
                "notes": sub.notes
            })
        
    return {"status": "success", "data": results}
