"""
WMS Enterprise - Batch API
Inventory batch management with per-roll tracking
"""
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
import os
import shutil
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.models import (
    InventoryBatch, 
    Product, 
    StorageLocation, 
    BatchMovement,
    BatchStatus,
    MovementType,
    log_movement,
    Company
)
from app.core.deps import get_current_company


router = APIRouter(prefix="/batches", tags=["Inventory Batches"])


# Schemas
class BatchInbound(BaseModel):
    """Schema for receiving new batch"""
    # Product identification (optional if creating new)
    product_id: Optional[int] = None
    product_sku: Optional[str] = None
    
    # For auto-creating product if not found
    brand: Optional[str] = None
    standard: Optional[str] = None
    size_inch: Optional[str] = None
    size_dn: Optional[str] = None
    wire_type: Optional[str] = None
    working_pressure_bar: Optional[float] = None
    working_pressure_psi: Optional[float] = None
    
    # Phase 14: Dynamic component specs
    category: Optional[str] = None
    thread_type: Optional[str] = None
    thread_size: Optional[str] = None
    seal_type: Optional[str] = None
    configuration: Optional[str] = None
    is_cut_piece: Optional[bool] = False
    cut_length_cm: Optional[float] = None
    
    # Location & quantity
    location_code: str
    batch_number: Optional[str] = None
    barcode: Optional[str] = None # Added to support client-side generation
    serial_number: Optional[str] = None # Added for Phase 8
    quantity: float
    cost_price: Optional[float] = None
    
    # Source tracking
    source_type: str = "MANUAL"  # MANUAL, PO, AI_SCANNER
    source_reference: Optional[str] = None
    notes: Optional[str] = None
    received_by: str = "system"
    status: Optional[str] = None # Allow override (e.g. AVAILABLE for trusted sources)
    
    # AI Scanner data
    ai_confidence: Optional[int] = None
    ai_raw_text: Optional[str] = None


class BatchTransfer(BaseModel):
    """Schema for batch transfer between locations"""
    to_location_code: str
    quantity: Optional[float] = None  # If None, transfer entire batch
    transferred_by: str = "system"
    reason: Optional[str] = None


class BatchConsume(BaseModel):
    """Schema for consuming batch quantity"""
    quantity: float
    reference_type: Optional[str] = None  # JO, SO
    reference_id: Optional[int] = None
    reference_number: Optional[str] = None
    consumed_by: str = "system"
    notes: Optional[str] = None


class BatchAdjust(BaseModel):
    """Schema for stock adjustment"""
    new_quantity: float
    reason: str
    adjusted_by: str = "system"


# Endpoints

@router.get("")
async def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    product_id: Optional[int] = None,
    location_code: Optional[str] = None,
    status: Optional[str] = None,
    brand: Optional[str] = None,
    owner_id: Optional[int] = None,
    company_id: Optional[int] = None,
    search: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company)
):
    """📦 List inventory batches with filtering (Scoped by Company)"""
    query = db.query(InventoryBatch).filter(InventoryBatch.is_deleted == False)
    
    # --- Multi-Entity Scoping ---
    if not current_company.is_parent:
        # Anak Perusahaan Restriction:
        # 1. Show Stock in My Warehouse (Custody - regardless of owner)
        # 2. OR Show Stock I Own (Assets - regardless of location)
        # For performance/simplicity in this view, we primarily focus on "Stock I can see/manage".
        # Let's use a UNION logic or just filter based on intent.
        
        # If user explicitly asks for "My Assets at other locations" (Consignment Out tracking)
        if owner_id == current_company.id:
             query = query.filter(InventoryBatch.owner_id == current_company.id)
        
        # Default View: Stock in My Warehouse (including Consignment In)
        # If no specific filters, we default to "What is in my custody?"
        elif not company_id and not owner_id:
             query = query.join(StorageLocation).filter(StorageLocation.company_id == current_company.id)
             
        # If they try to filter by another company's warehouse -> FORBID/OVERRIDE
        elif company_id and company_id != current_company.id:
             # They are trying to peek at another warehouse
             # Only allow if they are looking for THEIR OWN assets there
             if owner_id != current_company.id:
                 return {"status": "success", "total": 0, "data": []}
    
    # Induk (Parent) sees all, but we respect filters if provided.
    
    # --- End Scoping ---
    
    if product_id:
        query = query.filter(InventoryBatch.product_id == product_id)
    
    if location_code:
        location = db.query(StorageLocation).filter(
            StorageLocation.code == location_code.upper()
        ).first()
        if location:
            query = query.filter(InventoryBatch.location_id == location.id)
    
    if status:
        try:
            batch_status = BatchStatus(status)
            query = query.filter(InventoryBatch.status == batch_status)
        except ValueError:
            pass
    
    if available_only:
        query = query.filter(
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0
        )
    
    if search:
        query = query.filter(
            or_(
                InventoryBatch.barcode.ilike(f"%{search}%"),
                InventoryBatch.batch_number.ilike(f"%{search}%"),
            )
        )
    
    if brand:
        query = query.join(Product).filter(Product.brand == brand.upper())

    if owner_id:
        query = query.filter(InventoryBatch.owner_id == owner_id)
        
    if company_id:
        # Filter by Location's Company (Stock in specific company's warehouse)
        query = query.join(StorageLocation).filter(StorageLocation.company_id == company_id)
    
    total = query.count()
    batches = query.order_by(InventoryBatch.received_date.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [b.to_dict_simple() for b in batches]
    }


@router.get("/available")
async def get_available_batches(
    product_id: Optional[int] = None,
    min_qty: float = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """✅ Get available batches for picking (Best-Fit algorithm)"""
    query = db.query(InventoryBatch).filter(
        InventoryBatch.is_deleted == False,
        InventoryBatch.status == BatchStatus.AVAILABLE,
        InventoryBatch.current_qty > InventoryBatch.reserved_qty
    )
    
    if product_id:
        query = query.filter(InventoryBatch.product_id == product_id)
    
    # Order by smallest available first (Best-Fit)
    batches = query.order_by(
        (InventoryBatch.current_qty - InventoryBatch.reserved_qty).asc()
    ).all()
    
    # Filter by min_qty
    result = []
    for batch in batches:
        if batch.available_qty >= min_qty:
            result.append({
                "id": batch.id,
                "barcode": batch.barcode,
                "batch_number": batch.batch_number,
                "available_qty": batch.available_qty,
                "location": batch.location.code if batch.location else None,
                "product_sku": batch.product.sku if batch.product else None,
            })
    
    return {
        "status": "success",
        "total": len(result),
        "data": result
    }


@router.get("/{barcode}")
async def get_batch(barcode: str, db: Session = Depends(get_db)):
    """🔍 Get batch by barcode"""
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode,
        InventoryBatch.is_deleted == False
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    return {
        "status": "success",
        "data": batch.to_dict()
    }


@router.post("/inbound")
async def receive_batch(
    data: BatchInbound,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company)
):
    """📥 Receive new batch (Barang Masuk)"""
    try:
        print(f"DEBUG: HIT INBOUND ENDPOINT with data: {data}", flush=True)
        from app.models import ProductCategory, ProductUnit
        
        # Find or create product
        product = None
        if data.product_id:
            product = db.query(Product).filter(Product.id == data.product_id).first()
        elif data.product_sku:
            product = db.query(Product).filter(Product.sku == data.product_sku.upper()).first()
            
        # Auto-create product if not found and we have enough data
        if not product and data.brand:
            # Generate SKU
            parts = ['HOSE']
            if data.brand:
                parts.append(data.brand[:3].upper())
            if data.standard:
                parts.append(data.standard.upper())
            if data.size_inch:
                size_map = {
                    '1/4': '025', '3/8': '038', '1/2': '050', '5/8': '063',
                    '3/4': '075', '1': '100', '1-1/4': '125', '1-1/2': '150', '2': '200'
                }
                parts.append(size_map.get(data.size_inch, data.size_inch.replace('/', '')))
            
            new_sku = '-'.join(parts)
            
            # Check if this SKU exists
            product = db.query(Product).filter(Product.sku == new_sku).first()
            
            if not product:
                # Create new product
                category_val = data.category.upper() if data.category else ProductCategory.HOSE.value
                
                # Base spec
                specs = {
                    "standard": data.standard,
                    "size_inch": data.size_inch,
                    "size_dn": data.size_dn,
                    "wire_type": data.wire_type,
                    "working_pressure_bar": data.working_pressure_bar,
                    "working_pressure_psi": data.working_pressure_psi,
                    "thread_type": data.thread_type,
                    "thread_size": data.thread_size,
                    "seal_type": data.seal_type,
                    "configuration": data.configuration
                }
                
                # Remove none
                specs = {k: v for k, v in specs.items() if v is not None}
                
                # Product Name Logic
                if category_val == "HOSE":
                    prod_name = f"Hydraulic Hose {data.standard or ''} {data.size_inch or ''} {data.brand or ''}".strip()
                elif category_val in ["FITTING", "ADAPTOR", "COUPLING", "VALVE"]:
                    prod_name = f"{category_val.title()} {data.thread_type or ''} {data.configuration or ''} {data.thread_size or ''} {data.brand or ''}".strip()
                else:
                    prod_name = f"{category_val.title()} {data.size_inch or ''} {data.brand or ''}".strip()
                
                product = Product(
                    sku=new_sku,
                    name=prod_name,
                    brand=data.brand.upper() if data.brand else None,
                    category=category_val,
                    unit=ProductUnit.PCS.value if category_val != "HOSE" else ProductUnit.METER.value,
                    specifications=specs,
                    search_keywords=f"{new_sku} {data.brand} {data.standard} {data.size_inch} {data.thread_type} {data.thread_size}".upper()
                )
                db.add(product)
                db.flush()
        
        if not product:
            raise HTTPException(
                status_code=400, 
                detail="Product not found and insufficient data to auto-create. Please provide brand, standard, and size."
            )
        
        # Serial Number Enforcement (Phase 8)
        if product.is_serialized:
            if not data.serial_number:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Produk {product.name} mewajibkan Serial Number!"
                )
            
            # Check unique SN
            exists = db.query(InventoryBatch).filter(
                InventoryBatch.product_id == product.id,
                InventoryBatch.serial_number == data.serial_number
            ).first()
            if exists:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Serial Number {data.serial_number} sudah ada di sistem!"
                )

        # Find location
        location_code_upper = data.location_code.upper()
        location = db.query(StorageLocation).filter(
            StorageLocation.code == location_code_upper,
            StorageLocation.is_active == True
        ).first()
        
        # Phase 13: Auto-create Storage Location if it doesn't exist
        if not location:
            from app.models.enums import LocationType
            
            # Simple heuristic for parsing zones and racks from code
            parts = location_code_upper.split('-')
            
            zone_name = "AUTO-GENERATED"
            rack_name = None
            level_name = None
            bin_name = None
            
            if len(parts) >= 1:
                zone_name = parts[0]
            if len(parts) >= 2:
                rack_name = parts[1]
            if len(parts) >= 3:
                level_name = parts[2]
            if len(parts) >= 4:
                bin_name = parts[3]
                
            location = StorageLocation(
                code=location_code_upper,
                warehouse="MAIN",
                zone=zone_name,
                rack=rack_name,
                level=level_name,
                bin=bin_name,
                type=LocationType.HOSE_RACK,
                capacity=1000,
                description="Auto-generated during Inbound",
                company_id=current_company.id
            )
            db.add(location)
            db.flush()
        
        # Generate barcode if not provided
        barcode = data.barcode 
        if not barcode and data.batch_number:
             pass 
        
        if not barcode:
            barcode = f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        # Create batch
        batch = InventoryBatch(
            product_id=product.id,
            location_id=location.id,
            batch_number=data.batch_number,
            barcode=barcode,
            serial_number=data.serial_number,
            initial_qty=data.quantity,
            current_qty=data.quantity,
            reserved_qty=0,
            status=data.status if data.status else BatchStatus.QC_PENDING,
            cost_price=data.cost_price,
            source_type=data.source_type,
            source_reference=data.source_reference,
            ai_confidence=data.ai_confidence,
            ai_raw_text=data.ai_raw_text,
            notes=data.notes,
            created_by=data.received_by
        )
        
        db.add(batch)
        db.flush()
        
        # Log movement
        log_movement(
            db=db,
            batch_id=batch.id,
            movement_type=MovementType.INBOUND,
            qty=data.quantity,
            qty_before=0,
            qty_after=data.quantity,
            to_location_id=location.id,
            reference_type=data.source_type,
            reference_number=data.source_reference,
            performed_by=data.received_by,
            notes=data.notes
        )
        
        # Update location usage
        location.current_usage = (location.current_usage or 0) + data.quantity
        
        db.commit()
        db.refresh(batch)
        
        return {
            "status": "success",
            "message": f"Batch {barcode} received: {data.quantity} {get_enum_value(product.unit)}",
            "data": batch.to_dict()
        }
    except Exception as e:
        print(f"❌ INTERNAL SERVER ERROR: {e}", flush=True)
        # Log purely to console, assuming stdout works now or user can check uvicorn log
        # Re-raise as HTTPException for Client
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/{barcode}/transfer")
async def transfer_batch(
    barcode: str,
    data: BatchTransfer,
    db: Session = Depends(get_db)
):
    """🔄 Transfer batch to another location"""
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode,
        InventoryBatch.is_deleted == False
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    # Find target location
    to_location = db.query(StorageLocation).filter(
        StorageLocation.code == data.to_location_code.upper(),
        StorageLocation.is_active == True
    ).first()
    
    if not to_location:
        raise HTTPException(status_code=404, detail=f"Location {data.to_location_code} not found")
    
    qty_to_transfer = data.quantity or batch.current_qty
    
    if qty_to_transfer > batch.available_qty:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot transfer {qty_to_transfer}: only {batch.available_qty} available"
        )
    
    from_location_id = batch.location_id
    
    # Update batch location
    batch.location_id = to_location.id
    
    # Log movement
    log_movement(
        db=db,
        batch_id=batch.id,
        movement_type=MovementType.TRANSFER,
        qty=qty_to_transfer,
        qty_before=batch.current_qty,
        qty_after=batch.current_qty,
        from_location_id=from_location_id,
        to_location_id=to_location.id,
        performed_by=data.transferred_by,
        reason=data.reason
    )
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Batch {barcode} transferred to {data.to_location_code}",
        "data": batch.to_dict_simple()
    }


@router.post("/{barcode}/consume")
async def consume_batch(
    barcode: str,
    data: BatchConsume,
    db: Session = Depends(get_db)
):
    """⚡ Consume quantity from batch (for production/sales)"""
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode,
        InventoryBatch.is_deleted == False
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    if data.quantity > batch.current_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot consume {data.quantity}: only {batch.current_qty} available"
        )
    
    qty_before = batch.current_qty
    
    # Consume
    batch.consume(data.quantity)
    
    # Log movement
    log_movement(
        db=db,
        batch_id=batch.id,
        movement_type=MovementType.CONSUME,
        qty=data.quantity,
        qty_before=qty_before,
        qty_after=batch.current_qty,
        from_location_id=batch.location_id,
        reference_type=data.reference_type,
        reference_id=data.reference_id,
        reference_number=data.reference_number,
        performed_by=data.consumed_by,
        notes=data.notes
    )
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Consumed {data.quantity} from batch {barcode}. Remaining: {batch.current_qty}",
        "data": {
            "barcode": batch.barcode,
            "consumed": data.quantity,
            "remaining": batch.current_qty,
            "status": batch.status.value
        }
    }


@router.post("/{barcode}/adjust")
async def adjust_batch(
    barcode: str,
    data: BatchAdjust,
    db: Session = Depends(get_db)
):
    """⚖️ Adjust batch quantity (stock opname)"""
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode,
        InventoryBatch.is_deleted == False
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    qty_before = batch.current_qty
    difference = data.new_quantity - qty_before
    
    batch.current_qty = data.new_quantity
    
    # Determine movement type
    movement_type = MovementType.ADJUST_PLUS if difference > 0 else MovementType.ADJUST_MINUS
    
    # Log movement
    log_movement(
        db=db,
        batch_id=batch.id,
        movement_type=movement_type,
        qty=abs(difference),
        qty_before=qty_before,
        qty_after=data.new_quantity,
        from_location_id=batch.location_id,
        performed_by=data.adjusted_by,
        reason=data.reason
    )
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Batch {barcode} adjusted: {qty_before} → {data.new_quantity}",
        "data": {
            "barcode": batch.barcode,
            "previous_qty": qty_before,
            "new_qty": data.new_quantity,
            "difference": difference
        }
    }


@router.get("/{barcode}/movements")
async def get_batch_movements(
    barcode: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """📜 Get movement history for batch"""
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    movements = db.query(BatchMovement).filter(
        BatchMovement.batch_id == batch.id
    ).order_by(BatchMovement.performed_at.desc()).limit(limit).all()
    
    return {
        "status": "success",
        "data": [m.to_dict() for m in movements]
    }


@router.post("/{barcode}/image")
async def upload_batch_image(
    barcode: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """📸 Upload image for batch"""
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.barcode == barcode
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {barcode} not found")
    
    # Create upload directory
    upload_dir = Path("static/uploads/batches")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{barcode}{file_ext}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update batch
    batch.image_path = f"uploads/batches/{filename}"
    db.commit()
    
    return {
        "status": "success",
        "message": "Image uploaded successfully",
        "data": {
            "image_path": f"/static/uploads/batches/{filename}"
        }
    }
