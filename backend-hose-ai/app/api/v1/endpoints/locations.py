"""
WMS Enterprise - Storage Location API
CRUD and management for storage locations with Dynamic Binning
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.models import StorageLocation, LocationType
from app.services.putaway import (
    get_putaway_suggestions,
    validate_putaway_scan,
    confirm_putaway
)
from app.models import Company
from app.core.deps import get_current_company


router = APIRouter(prefix="/locations", tags=["Storage Locations"])


# ============ Schemas ============

class LocationCreate(BaseModel):
    code: str
    display_name: Optional[str] = None
    parent_id: Optional[int] = None
    warehouse: str = "MAIN"
    zone: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    bin: Optional[str] = None
    type: str = "HOSE_RACK"
    max_capacity: Optional[float] = None
    capacity: Optional[float] = None
    can_store_items: bool = True
    description: Optional[str] = None


class LocationUpdate(BaseModel):
    display_name: Optional[str] = None
    type: Optional[str] = None
    max_capacity: Optional[float] = None
    capacity: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    can_store_items: Optional[bool] = None


class RackGenerateRequest(BaseModel):
    """Request to generate multiple slots at once"""
    parent_id: Optional[int] = None  # Parent rack ID
    prefix: str  # e.g., "A1-"
    start_number: int = 1
    end_number: int = 10
    max_capacity_per_slot: Optional[float] = None
    zone: Optional[str] = None
    warehouse: str = "MAIN"
    type: str = "HOSE_RACK"


class SetFullRequest(BaseModel):
    """Request to manually set a location as FULL"""
    reason: Optional[str] = None


# Endpoints
@router.get("")
async def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    warehouse: Optional[str] = None,
    zone: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """📍 List all storage locations with filtering"""
    query = db.query(StorageLocation).filter(StorageLocation.is_active == True)
    
    if warehouse:
        query = query.filter(StorageLocation.warehouse == warehouse.upper())
    if zone:
        query = query.filter(StorageLocation.zone == zone.upper())
    if type:
        query = query.filter(StorageLocation.type == type)
    if search:
        query = query.filter(StorageLocation.code.ilike(f"%{search}%"))
    
    total = query.count()
    locations = query.order_by(StorageLocation.code).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": total,
        "data": [loc.to_dict() for loc in locations]
    }


@router.get("/zones")
async def get_zones(db: Session = Depends(get_db)):
    """📊 Get list of unique zones"""
    zones = db.query(StorageLocation.zone).distinct().all()
    return {
        "status": "success",
        "data": [z[0] for z in zones if z[0]]
    }


@router.get("/types")
async def get_location_types():
    """📋 Get available location types"""
    return {
        "status": "success",
        "data": [t.value for t in LocationType]
    }


# ============ DYNAMIC BINNING ENDPOINTS ============

@router.get("/tree")
async def get_location_tree(
    warehouse: str = "MAIN",
    db: Session = Depends(get_db)
):
    """
    🌳 Get hierarchical tree of all locations.
    
    Groups existing locations by zone for tree view UI.
    """
    # Get all active locations
    locations = db.query(StorageLocation).filter(
        StorageLocation.is_active == True
    ).order_by(StorageLocation.zone, StorageLocation.code).all()
    
    # Group by zone
    zones = {}
    for loc in locations:
        zone = loc.zone or "UNKNOWN"
        if zone not in zones:
            zones[zone] = {
                "id": f"zone-{zone}",
                "code": zone,
                "display_name": f"Zone {zone}",
                "capacity_status": "PARTIAL",
                "can_store_items": False,
                "current_qty": 0,
                "max_capacity": None,
                "is_active": True,
                "children": []
            }
        
        zones[zone]["children"].append({
            "id": loc.id,
            "code": loc.code,
            "display_name": loc.code,
            "capacity_status": "PARTIAL" if (loc.current_usage or 0) > 0 else "EMPTY",
            "can_store_items": True,
            "current_qty": loc.current_usage or 0,
            "max_capacity": loc.capacity,
            "is_active": loc.is_active,
            "children": []
        })
    
    return {
        "status": "success",
        "data": list(zones.values())
    }


@router.post("/generate")
async def generate_rack_slots(
    data: RackGenerateRequest,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company)
):
    """
    🔧 Bulk generate multiple slots for a rack.
    
    Creates slots like A1-1, A1-2, ..., A1-50 automatically.
    """
    # Validate parent if provided
    parent = None
    if data.parent_id:
        parent = db.query(StorageLocation).filter(
            StorageLocation.id == data.parent_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent rack not found")
    
    # Validate range
    if data.end_number < data.start_number:
        raise HTTPException(status_code=400, detail="End number must be >= start number")
    
    if data.end_number - data.start_number > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 slots per generation")
    
    # Check for existing codes
    existing_codes = set()
    for num in range(data.start_number, data.end_number + 1):
        code = f"{data.prefix}{num}"
        existing = db.query(StorageLocation).filter(
            StorageLocation.code == code
        ).first()
        if existing:
            existing_codes.add(code)
    
    if existing_codes:
        raise HTTPException(
            status_code=400, 
            detail=f"Codes already exist: {', '.join(list(existing_codes)[:5])}"
        )
    
    # Get location type
    try:
        loc_type = LocationType(data.type)
    except ValueError:
        loc_type = LocationType.HOSE_RACK
    
    # Generate slots
    created = []
    for num in range(data.start_number, data.end_number + 1):
        code = f"{data.prefix}{num}"
        
        # Use only columns that exist in the current model
        slot = StorageLocation(
            code=code,
            warehouse=data.warehouse.upper(),
            zone=data.zone.upper() if data.zone else "GENERAL",
            type=loc_type,
            capacity=data.max_capacity_per_slot,
            current_usage=0,
            description=f"Auto-generated slot {num}",
            is_active=True,
            company_id=current_company.id
        )
        db.add(slot)
        created.append(code)
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Created {len(created)} slots",
        "data": {
            "count": len(created),
            "codes": created[:20],  # Show first 20
            "zone": data.zone
        }
    }


@router.get("/next-empty")
async def get_next_empty_slot(
    zone_prefix: str = Query(..., description="Zone prefix to search, e.g., 'A' or 'A1-'"),
    db: Session = Depends(get_db)
):
    """
    🎯 Get next empty slot recommendation.
    
    Returns first available slot that is not FULL, ordered by code.
    """
    slots = db.query(StorageLocation).filter(
        and_(
            StorageLocation.code.ilike(f"{zone_prefix}%"),
            StorageLocation.capacity_status != CapacityStatus.FULL,
            StorageLocation.can_store_items == True,
            StorageLocation.is_active == True
        )
    ).order_by(StorageLocation.sort_order, StorageLocation.code).limit(5).all()
    
    if not slots:
        return {
            "status": "success",
            "data": None,
            "message": f"Semua slot dengan prefix '{zone_prefix}' sudah penuh"
        }
    
    return {
        "status": "success",
        "data": {
            "recommended": slots[0].to_dict(),
            "alternatives": [s.to_dict() for s in slots[1:]]
        }
    }


@router.post("/{location_id}/set-full")
async def set_location_full(
    location_id: int,
    data: SetFullRequest,
    db: Session = Depends(get_db)
):
    """
    ⛔ Manually mark a location as FULL.
    
    Used when physical rack is full even if system capacity not reached.
    """
    location = db.query(StorageLocation).filter(
        StorageLocation.id == location_id
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    location.capacity_status = CapacityStatus.FULL
    if data.reason:
        location.description = f"[FULL] {data.reason}"
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Location {location.code} marked as FULL"
    }


@router.post("/{location_id}/set-empty")
async def set_location_empty(
    location_id: int,
    db: Session = Depends(get_db)
):
    """
    ✅ Reset location status to EMPTY.
    """
    location = db.query(StorageLocation).filter(
        StorageLocation.id == location_id
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    location.capacity_status = CapacityStatus.EMPTY
    location.current_qty = 0
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Location {location.code} reset to EMPTY"
    }


@router.get("/rack-map")
async def get_rack_map(
    zone: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    🗺️ Get rack map data for visual warehouse layout.
    
    Returns locations with occupancy info for color coding.
    """
    from sqlalchemy import func
    from app.models import InventoryBatch
    
    query = db.query(StorageLocation).filter(
        StorageLocation.is_active == True
    )
    
    if zone:
        query = query.filter(StorageLocation.zone == zone.upper())
    
    locations = query.order_by(
        StorageLocation.zone,
        StorageLocation.rack,
        StorageLocation.level
    ).all()
    
    # Calculate occupancy for each location
    rack_data = []
    for loc in locations:
        # Get total qty in location
        total_qty = db.query(func.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.location_id == loc.id,
            InventoryBatch.is_deleted == False,
            InventoryBatch.current_qty > 0
        ).scalar() or 0
        
        capacity = loc.capacity or 100
        occupancy_pct = min(100, round((total_qty / capacity) * 100)) if capacity > 0 else 0
        
        # Determine color based on occupancy
        if occupancy_pct == 0:
            color = "empty"
        elif occupancy_pct < 30:
            color = "low"
        elif occupancy_pct < 70:
            color = "medium"
        elif occupancy_pct < 90:
            color = "high"
        else:
            color = "full"
        
        # Count items
        item_count = db.query(InventoryBatch).filter(
            InventoryBatch.location_id == loc.id,
            InventoryBatch.is_deleted == False,
            InventoryBatch.current_qty > 0
        ).count()
        
        rack_data.append({
            "id": loc.id,
            "code": loc.code,
            "zone": loc.zone,
            "rack": loc.rack,
            "level": loc.level,
            "bin": loc.bin,
            "data": [get_enum_value(t) for t in LocationType],
            "type": get_enum_value(loc.type) if loc.type else None,
            "capacity": capacity,
            "current_qty": round(total_qty, 2),
            "occupancy_pct": occupancy_pct,
            "color": color,
            "item_count": item_count,
            # Position for grid layout (can be overridden by frontend)
            "position": {
                "row": ord(loc.rack[0]) - ord('A') if loc.rack else 0,
                "col": int(loc.rack[1:]) if loc.rack and loc.rack[1:].isdigit() else 0,
                "level": int(loc.level) if loc.level and loc.level.isdigit() else 0
            }
        })
    
    # Group by zone
    zones_data = {}
    for item in rack_data:
        z = item["zone"] or "UNKNOWN"
        if z not in zones_data:
            zones_data[z] = []
        zones_data[z].append(item)
    
    return {
        "status": "success",
        "data": {
            "zones": zones_data,
            "total_locations": len(rack_data),
            "summary": {
                "empty": len([r for r in rack_data if r["color"] == "empty"]),
                "low": len([r for r in rack_data if r["color"] == "low"]),
                "medium": len([r for r in rack_data if r["color"] == "medium"]),
                "high": len([r for r in rack_data if r["color"] == "high"]),
                "full": len([r for r in rack_data if r["color"] == "full"]),
            }
        }
    }


@router.get("/suggestion")
async def get_putaway_suggestion(
    product_id: int,
    qty: float,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    🎯 Get intelligent put-away location suggestions.
    
    Returns recommended locations sorted by priority.
    """
    result = get_putaway_suggestions(
        db=db,
        product_id=product_id,
        qty=qty,
        product_category=category
    )
    
    return {
        "status": "success",
        "data": {
            "total_qty": result.total_qty,
            "split_required": result.split_required,
            "suggestions": result.suggestions
        }
    }


# Dynamic route MUST come after static routes

@router.get("/{code}")
async def get_location(code: str, db: Session = Depends(get_db)):
    """🔍 Get location by code"""
    location = db.query(StorageLocation).filter(
        StorageLocation.code == code.upper()
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=f"Location {code} not found")
    
    return {
        "status": "success",
        "data": location.to_dict()
    }


@router.post("")
async def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_company: Company = Depends(get_current_company)
):
    """➕ Create new storage location"""
    # Check if exists
    existing = db.query(StorageLocation).filter(
        StorageLocation.code == data.code.upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Location {data.code} already exists")
    
    # Validate type
    try:
        loc_type = LocationType(data.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid location type: {data.type}")
    
    location = StorageLocation(
        code=data.code.upper(),
        warehouse=data.warehouse.upper(),
        zone=data.zone.upper(),
        rack=data.rack.upper() if data.rack else None,
        level=data.level.upper() if data.level else None,
        bin=data.bin.upper() if data.bin else None,
        type=loc_type,
        capacity=data.capacity,
        description=data.description,
        company_id=current_company.id
    )
    
    db.add(location)
    db.commit()
    db.refresh(location)
    
    return {
        "status": "success",
        "message": f"Location {location.code} created",
        "data": location.to_dict()
    }


@router.put("/{code}")
async def update_location(
    code: str,
    data: LocationUpdate,
    db: Session = Depends(get_db)
):
    """✏️ Update storage location"""
    location = db.query(StorageLocation).filter(
        StorageLocation.code == code.upper()
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=f"Location {code} not found")
    
    if data.type:
        try:
            location.type = LocationType(data.type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid type: {data.type}")
    
    if data.capacity is not None:
        location.capacity = data.capacity
    if data.description is not None:
        location.description = data.description
    if data.is_active is not None:
        location.is_active = data.is_active
    
    db.commit()
    db.refresh(location)
    
    return {
        "status": "success",
        "message": f"Location {code} updated",
        "data": location.to_dict()
    }


@router.delete("/{code}")
async def delete_location(code: str, db: Session = Depends(get_db)):
    """🗑️ Soft delete location (deactivate)"""
    location = db.query(StorageLocation).filter(
        StorageLocation.code == code.upper()
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail=f"Location {code} not found")
    
    # Check if has items
    if location.batches and len(location.batches) > 0:
        active_batches = [b for b in location.batches if b.current_qty > 0]
        if active_batches:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete: Location has {len(active_batches)} active batches"
            )
    
    location.is_active = False
    db.commit()
    
    return {
        "status": "success",
        "message": f"Location {code} deactivated"
    }


# ========== Directed Put-away Endpoints ==========

class PutawayValidation(BaseModel):
    expected_location_code: str
    scanned_location_code: str


class PutawayConfirm(BaseModel):
    batch_id: int
    location_id: int
    qty: float
    performed_by: str = "system"


@router.get("/suggestion")
async def get_putaway_suggestion(
    product_id: int,
    qty: float,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    🎯 Get intelligent put-away location suggestions.
    
    Returns recommended locations sorted by priority.
    """
    result = get_putaway_suggestions(
        db=db,
        product_id=product_id,
        qty=qty,
        product_category=category
    )
    
    return {
        "status": "success",
        "data": {
            "total_qty": result.total_qty,
            "split_required": result.split_required,
            "suggestions": result.suggestions
        }
    }


@router.post("/validate-scan")
async def validate_location_scan(
    data: PutawayValidation,
    db: Session = Depends(get_db)
):
    """
    ✅ Validate that scanned location matches expected.
    
    Used during put-away to ensure correct placement.
    """
    result = validate_putaway_scan(
        db=db,
        expected_location_code=data.expected_location_code,
        scanned_location_code=data.scanned_location_code
    )
    
    if not result['valid']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return {
        "status": "success",
        "message": result['message']
    }


@router.post("/confirm-putaway")
async def confirm_putaway_action(
    data: PutawayConfirm,
    db: Session = Depends(get_db)
):
    """
    📦 Confirm put-away and update batch location.
    
    Records movement in history.
    """
    result = confirm_putaway(
        db=db,
        batch_id=data.batch_id,
        location_id=data.location_id,
        qty=data.qty,
        performed_by=data.performed_by
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['error'])
    
    return {
        "status": "success",
        "message": result['message'],
        "data": {
            "batch_barcode": result.get('batch_barcode'),
            "location_code": result.get('location_code')
        }
    }
