"""
HoseMaster WMS - Products API
CRUD for Products with Auto-Generated SKU Codes
Format: [BRAND]-[CATEGORY]-[NUMBER]
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Product, ProductAlias
from app.models.enums import ProductCategory, ProductUnit


router = APIRouter(prefix="/products", tags=["Products"])


# ============ Schemas ============

class ProductCreate(BaseModel):
    """Create new product with auto-generated SKU"""
    name: str
    brand: str  # Required for SKU generation
    category: str = "HOSE"  # HOSE, FITTING, COUPLING, etc.
    description: Optional[str] = None
    unit: str = "METER"
    specifications: Optional[dict] = None
    cost_price: Optional[int] = None
    sell_price: Optional[int] = None
    min_stock: Optional[int] = 0


class ProductUpdate(BaseModel):
    """Update product (SKU cannot be changed)"""
    name: Optional[str] = None
    description: Optional[str] = None
    specifications: Optional[dict] = None
    cost_price: Optional[int] = None
    sell_price: Optional[int] = None
    min_stock: Optional[int] = None
    is_active: Optional[bool] = None


# ============ SKU Generation ============

# Brand codes mapping
BRAND_CODES = {
    "EATON": "EAT",
    "GATES": "GAT",
    "YOKOHAMA": "YOK",
    "PARKER": "PAR",
    "MANULI": "MAN",
    "ALFAGOMMA": "ALF",
    "CONTINENTAL": "CON",
    "DUNLOP": "DUN",
    "SEMPERIT": "SEM",
    "BRIDGESTONE": "BRI",
    "PACIFIC": "PAC",
}

# Category codes mapping
CATEGORY_CODES = {
    "HOSE": "HS",
    "FITTING": "FT",
    "COUPLING": "CP",
    "FERRULE": "FR",
    "ADAPTER": "AD",
    "VALVE": "VL",
    "FLANGE": "FL",
    "ACCESSORY": "AC",
    "R1": "R1",
    "R2": "R2",
    "R4": "R4",
    "4SP": "SP",
    "4SH": "SH",
}


def generate_sku(brand: str, category: str, db: Session) -> str:
    """
    Generate SKU in format: [BRAND]-[CATEGORY]-[NUMBER]
    Example: EAT-R2-005
    """
    # Get brand code (uppercase first 3 chars if not in mapping)
    brand_upper = brand.upper()
    brand_code = BRAND_CODES.get(brand_upper, brand_upper[:3])
    
    # Get category code
    cat_upper = category.upper()
    cat_code = CATEGORY_CODES.get(cat_upper, cat_upper[:2])
    
    # Count existing products with same brand+category prefix
    prefix = f"{brand_code}-{cat_code}-"
    count = db.query(Product).filter(
        Product.sku.like(f"{prefix}%")
    ).count()
    
    # Generate next number (3 digits, zero-padded)
    next_num = str(count + 1).zfill(3)
    
    return f"{brand_code}-{cat_code}-{next_num}"


# ============ Endpoints ============

@router.get("")
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    search: Optional[str] = None,
    brand: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    📋 List all products with pagination and filters
    """
    query = db.query(Product)
    
    if active_only:
        query = query.filter(Product.is_active == True)
    
    if search:
        search_term = f"%{search.upper()}%"
        query = query.filter(
            or_(
                Product.sku.ilike(search_term),
                Product.name.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.search_keywords.ilike(search_term)
            )
        )
    
    if brand:
        query = query.filter(Product.brand == brand.upper())
    
    if category:
        query = query.filter(Product.category == category.upper())
    
    total = query.count()
    products = query.order_by(Product.sku).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [p.to_dict() for p in products]
    }


@router.get("/brands")
async def list_brands(db: Session = Depends(get_db)):
    """
    📋 Get list of all brands
    """
    brands = db.query(Product.brand).distinct().filter(
        Product.brand.isnot(None),
        Product.is_active == True
    ).all()
    
    return {
        "status": "success",
        "data": [b[0] for b in brands if b[0]],
        "brand_codes": BRAND_CODES
    }


@router.get("/preview-sku")
async def preview_sku(
    brand: str,
    category: str = "HOSE",
    db: Session = Depends(get_db)
):
    """
    👀 Preview what SKU will be generated
    """
    sku = generate_sku(brand, category, db)
    
    return {
        "status": "success",
        "data": {
            "sku": sku,
            "brand_code": BRAND_CODES.get(brand.upper(), brand.upper()[:3]),
            "category_code": CATEGORY_CODES.get(category.upper(), category.upper()[:2])
        }
    }


@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    🔍 Get product by ID
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    return {
        "status": "success",
        "data": product.to_dict()
    }


@router.post("")
async def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db)
):
    """
    ➕ Create new product with auto-generated SKU
    
    SKU Format: [BRAND]-[CATEGORY]-[NUMBER]
    Example: EAT-R2-005
    """
    # Generate SKU automatically
    sku = generate_sku(data.brand, data.category, db)
    
    # Check if SKU already exists (shouldn't happen, but safety check)
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU {sku} sudah ada")
    
    # Create product
    product = Product(
        sku=sku,
        name=data.name,
        brand=data.brand.upper(),
        category=data.category.upper(),
        description=data.description,
        unit=data.unit.upper(),
        specifications=data.specifications or {},
        cost_price=data.cost_price,
        sell_price=data.sell_price,
        min_stock=data.min_stock or 0,
        is_active=True
    )
    
    # Update search keywords
    product.update_search_keywords()
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return {
        "status": "success",
        "message": f"Produk {sku} berhasil dibuat",
        "data": product.to_dict()
    }


@router.put("/{product_id}")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db)
):
    """
    ✏️ Update product (SKU cannot be changed)
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Update fields
    update_dict = data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(product, field, value)
    
    product.update_search_keywords()
    db.commit()
    db.refresh(product)
    
    # Log Activity
    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=None,
            action="UPDATE",
            entity_type="Product",
            entity_id=product.id,
            entity_number=product.sku,
            details=f"Updated product {product.sku}",
            new_values=update_dict,
            module="Inventory"
        )
    except Exception as e:
        print(f"Log Error: {e}")

    return {
        "status": "success",
        "message": f"Produk {product.sku} berhasil diupdate",
        "data": product.to_dict()
    }


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    🗑️ Soft delete product
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    product.is_active = False
    db.commit()
    
    try:
        from app.services.audit_service import log_activity
        log_activity(
            db=db,
            user=None,
            action="DELETE",
            entity_type="Product",
            entity_id=product.id,
            entity_number=product.sku,
            details=f"Deleted product {product.sku}",
            module="Inventory"
        )
    except:
        pass

    return {
        "status": "success",
        "message": f"Produk {product.sku} berhasil dihapus"
    }


# ============ Unit Conversion ============

class UnitConversionSet(BaseModel):
    """Set unit conversion for a product"""
    alt_unit: str  # e.g., "ROLL", "BOX", "PCS"
    conversion_factor: float  # 1 alt_unit = X base_unit


@router.post("/{product_id}/set-conversion")
async def set_unit_conversion(
    product_id: int,
    data: UnitConversionSet,
    db: Session = Depends(get_db)
):
    """
    🔄 Set unit conversion for a product
    
    Example: 1 ROLL = 50 METER
    - alt_unit: ROLL
    - conversion_factor: 50
    """
    from decimal import Decimal
    
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    product.alt_unit = data.alt_unit.upper()
    product.conversion_factor = Decimal(str(data.conversion_factor))
    
    db.commit()
    db.refresh(product)
    
    base_unit = product.unit.value if product.unit else "unit"
    
    return {
        "status": "success",
        "message": f"Konversi diset: 1 {data.alt_unit} = {data.conversion_factor} {base_unit}",
        "data": {
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name,
            "base_unit": base_unit,
            "alt_unit": product.alt_unit,
            "conversion_factor": float(product.conversion_factor)
        }
    }


@router.get("/{product_id}/convert")
async def convert_qty(
    product_id: int,
    qty: float,
    from_unit: str = "base",  # "base" or "alt"
    db: Session = Depends(get_db)
):
    """
    🔄 Convert quantity between units
    
    - from_unit="base": Convert from base unit to alt unit
    - from_unit="alt": Convert from alt unit to base unit
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    if not product.alt_unit or not product.conversion_factor:
        return {
            "status": "success",
            "message": "Produk tidak memiliki konversi unit",
            "data": {
                "input_qty": qty,
                "output_qty": qty,
                "unit": product.unit.value if product.unit else None
            }
        }
    
    if from_unit == "alt":
        # Convert from alt to base (e.g., 2 ROLL → 100 METER)
        output_qty = product.convert_to_base_unit(qty)
        output_unit = product.unit.value if product.unit else ""
        input_unit = product.alt_unit
    else:
        # Convert from base to alt (e.g., 100 METER → 2 ROLL)
        output_qty = product.convert_to_alt_unit(qty)
        output_unit = product.alt_unit
        input_unit = product.unit.value if product.unit else ""
    
    return {
        "status": "success",
        "data": {
            "input_qty": qty,
            "input_unit": input_unit,
            "output_qty": round(output_qty, 2),
            "output_unit": output_unit,
            "conversion_factor": float(product.conversion_factor)
        }
    }


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
    
    # Get price history
    history = db.query(PriceHistory).filter(
        PriceHistory.product_id == product_id
    ).order_by(
        PriceHistory.created_at.desc()
    ).limit(limit).all()
    
    # Get unique suppliers with latest prices
    suppliers_prices = {}
    for h in history:
        if h.supplier_name and h.supplier_name not in suppliers_prices:
            suppliers_prices[h.supplier_name] = {
                "supplier_name": h.supplier_name,
                "last_price": float(h.unit_price or 0),
                "last_date": h.created_at.isoformat() if h.created_at else None
            }
    
    # Calculate stats
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
    from decimal import Decimal
    
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
    from app.models import ProductPriceLevel
    from decimal import Decimal
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Check if price level exists for this product
    existing = db.query(ProductPriceLevel).filter(
        ProductPriceLevel.product_id == product_id,
        ProductPriceLevel.price_level == price_level.upper()
    ).first()
    
    if existing:
        # Update existing
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
        # Create new
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
    from app.models import ProductPriceLevel
    
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
    from app.models import ProductPriceLevel, Customer
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    base_price = float(product.sell_price or 0)
    applied_level = None
    final_price = base_price
    
    # Determine price level
    level_to_use = None
    if customer_name:
        customer = db.query(Customer).filter(Customer.name == customer_name).first()
        if customer and customer.price_level:
            level_to_use = customer.price_level.upper()
    elif price_level:
        level_to_use = price_level.upper()
    
    # Get price for level
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


# ============ Substitute Items (Phase 9) ============

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
    
    # Validation
    if id == data.substitute_product_id:
        raise HTTPException(status_code=400, detail="Cannot substitute with self")
        
    exists = db.query(ProductSubstitute).filter(
        ProductSubstitute.product_id == id,
        ProductSubstitute.substitute_product_id == data.substitute_product_id
    ).first()
    
    if exists:
         # raise HTTPException(status_code=400, detail="Substitute already exists")
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
    
    # Join with Product to get details
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


