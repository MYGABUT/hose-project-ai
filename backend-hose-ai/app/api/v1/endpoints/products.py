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
from app.core.helpers import get_enum_value
from app.models import Product, InventoryBatch, Supplier, ProductPriceLevel
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
                "unit": get_enum_value(product.unit) if product.unit else None
            }
        }
    
    if from_unit == "alt":
        # Convert from alt to base (e.g., 2 ROLL → 100 METER)
        output_qty = product.convert_to_base_unit(qty)
        output_unit = get_enum_value(product.unit) if product.unit else ""
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

