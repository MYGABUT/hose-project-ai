"""
HosePro WMS - Rack Management API
Bulk Location Generator + Zone-based rack operations.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.storage_location import StorageLocation
from app.models.enums import LocationType


router = APIRouter(prefix="/racks", tags=["Warehouse - Rack Management"])


# ============ Schemas ============

class BulkRackRequest(BaseModel):
    """Request to generate racks in bulk"""
    warehouse: str = "MAIN"
    zone: str                      # e.g., "HYDRAULIC", "FITTING"
    rack_prefix: str               # e.g., "A" → A01, A02...
    rack_count: int                # Number of racks (e.g., 5 → A01-A05)
    levels_per_rack: int           # Number of levels (e.g., 4 → L1-L4)
    bins_per_level: int = 1        # Bins per level (fitting racks may have 10+)
    location_type: str = "HOSE_RACK"
    capacity_per_bin: Optional[float] = None
    description: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "warehouse": "MAIN",
                "zone": "HYDRAULIC",
                "rack_prefix": "A",
                "rack_count": 5,
                "levels_per_rack": 4,
                "bins_per_level": 1,
                "location_type": "HOSE_RACK",
                "capacity_per_bin": 100,
                "description": "Rak slang hydraulic braided"
            }
        }


class ZoneTemplateRequest(BaseModel):
    """Generate an entire zone from a template"""
    warehouse: str = "MAIN"
    template: str  # "hydraulic", "fitting", "assembly", "receiving"


# ============ Endpoints ============

@router.get("")
def list_rack_locations(
    warehouse: Optional[str] = None,
    zone: Optional[str] = None,
    rack: Optional[str] = None,
    location_type: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """📍 List all storage locations with filters"""
    query = db.query(StorageLocation).filter(
        StorageLocation.is_active == is_active
    )
    
    if warehouse:
        query = query.filter(StorageLocation.warehouse == warehouse.upper())
    if zone:
        query = query.filter(StorageLocation.zone == zone.upper())
    if rack:
        query = query.filter(StorageLocation.rack == rack.upper())
    if location_type:
        query = query.filter(StorageLocation.type == location_type)
    
    locations = query.order_by(
        StorageLocation.warehouse,
        StorageLocation.zone,
        StorageLocation.rack,
        StorageLocation.level,
        StorageLocation.bin
    ).all()
    
    return {
        "status": "success",
        "total": len(locations),
        "data": [loc.to_dict() for loc in locations]
    }


@router.get("/summary")
def get_rack_summary(db: Session = Depends(get_db)):
    """📊 Warehouse layout summary — zones, racks, utilization"""
    zones = db.query(
        StorageLocation.zone,
        StorageLocation.type,
        func.count(StorageLocation.id).label("total_locations"),
        func.sum(StorageLocation.capacity).label("total_capacity"),
        func.sum(StorageLocation.current_usage).label("total_usage"),
    ).filter(
        StorageLocation.is_active == True
    ).group_by(
        StorageLocation.zone,
        StorageLocation.type
    ).all()
    
    summary = []
    for z in zones:
        cap = float(z.total_capacity or 0)
        usage = float(z.total_usage or 0)
        summary.append({
            "zone": z.zone,
            "type": z.type.value if hasattr(z.type, 'value') else z.type,
            "total_locations": z.total_locations,
            "total_capacity": cap,
            "total_usage": usage,
            "utilization_pct": round((usage / cap * 100) if cap > 0 else 0, 1),
        })
    
    return {
        "status": "success",
        "data": summary
    }


@router.post("/generate")
def generate_racks_bulk(
    data: BulkRackRequest,
    db: Session = Depends(get_db)
):
    """
    🏗️ Bulk Rack Generator
    
    Generate multiple rack locations at once.
    Example: zone=HYDRAULIC, prefix=A, count=5, levels=4, bins=1
    Result: 20 locations (A01-L1 through A05-L4)
    """
    # Validate location type
    try:
        loc_type = LocationType(data.location_type)
    except ValueError:
        valid = [e.value for e in LocationType]
        raise HTTPException(400, f"Invalid location_type. Valid: {valid}")
    
    created = []
    skipped = []
    
    for rack_num in range(1, data.rack_count + 1):
        rack_code = f"{data.rack_prefix}{rack_num:02d}"
        
        for level_num in range(1, data.levels_per_rack + 1):
            level_code = f"L{level_num}"
            
            for bin_num in range(1, data.bins_per_level + 1):
                bin_code = f"B{bin_num:02d}" if data.bins_per_level > 1 else None
                
                # Generate location code
                code = StorageLocation.generate_code(
                    data.warehouse.upper(),
                    data.zone.upper(),
                    rack_code,
                    level_code,
                    bin_code
                )
                
                # Skip if exists
                existing = db.query(StorageLocation).filter(
                    StorageLocation.code == code
                ).first()
                
                if existing:
                    skipped.append(code)
                    continue
                
                location = StorageLocation(
                    code=code,
                    warehouse=data.warehouse.upper(),
                    zone=data.zone.upper(),
                    rack=rack_code,
                    level=level_code,
                    bin=bin_code,
                    type=loc_type,
                    capacity=data.capacity_per_bin,
                    current_usage=0,
                    description=data.description or f"{data.zone} - {rack_code} {level_code}",
                    is_active=True,
                )
                db.add(location)
                created.append(code)
    
    db.commit()
    
    return {
        "status": "success",
        "message": f"Generated {len(created)} locations, skipped {len(skipped)} existing",
        "created": created,
        "skipped": skipped,
        "total_created": len(created),
        "total_skipped": len(skipped),
    }


@router.post("/generate-template")
def generate_from_template(
    data: ZoneTemplateRequest,
    db: Session = Depends(get_db)
):
    """
    🏭 Generate entire zone from pre-defined template
    
    Templates:
    - hydraulic: 5 racks (A01-A05), 4 levels, HOSE_RACK
    - industrial: 3 racks (B01-B03), 3 levels, HOSE_REEL
    - fitting: 4 racks (F01-F04), 5 levels, 10 bins each, FITTING_BIN
    - adapter: 2 racks (D01-D02), 4 levels, 8 bins, ADAPTER_SHELF
    - assembly: 4 benches, ASSEMBLY_BENCH
    - receiving: 3 areas, RECEIVING
    """
    templates = {
        "hydraulic": BulkRackRequest(
            warehouse=data.warehouse, zone="HYDRAULIC", rack_prefix="A",
            rack_count=5, levels_per_rack=4, bins_per_level=1,
            location_type="HOSE_RACK", capacity_per_bin=100,
            description="Rak slang hydraulic braided/multispiral"
        ),
        "industrial": BulkRackRequest(
            warehouse=data.warehouse, zone="INDUSTRIAL", rack_prefix="B",
            rack_count=3, levels_per_rack=3, bins_per_level=1,
            location_type="HOSE_REEL", capacity_per_bin=200,
            description="Rak slang industrial besar"
        ),
        "fitting": BulkRackRequest(
            warehouse=data.warehouse, zone="FITTING", rack_prefix="F",
            rack_count=4, levels_per_rack=5, bins_per_level=10,
            location_type="FITTING_BIN", capacity_per_bin=50,
            description="Rak bin fitting & coupling"
        ),
        "adapter": BulkRackRequest(
            warehouse=data.warehouse, zone="ADAPTER", rack_prefix="D",
            rack_count=2, levels_per_rack=4, bins_per_level=8,
            location_type="ADAPTER_SHELF", capacity_per_bin=30,
            description="Rak adapter BSP/JIC/ORFS"
        ),
        "assembly": BulkRackRequest(
            warehouse=data.warehouse, zone="ASSEMBLY", rack_prefix="W",
            rack_count=4, levels_per_rack=1, bins_per_level=1,
            location_type="ASSEMBLY_BENCH", capacity_per_bin=None,
            description="Meja kerja crimping/assembly"
        ),
        "receiving": BulkRackRequest(
            warehouse=data.warehouse, zone="RECEIVING", rack_prefix="R",
            rack_count=3, levels_per_rack=1, bins_per_level=1,
            location_type="RECEIVING", capacity_per_bin=None,
            description="Area penerimaan barang"
        ),
    }
    
    template_key = data.template.lower()
    if template_key not in templates:
        raise HTTPException(400, f"Unknown template. Valid: {list(templates.keys())}")
    
    # Delegate to the bulk generator
    return generate_racks_bulk(templates[template_key], db)


@router.get("/enums")
def get_rack_enums():
    """📋 Get available enum values for rack creation"""
    return {
        "location_types": [e.value for e in LocationType],
        "templates": ["hydraulic", "industrial", "fitting", "adapter", "assembly", "receiving"],
        "example_zones": ["HYDRAULIC", "INDUSTRIAL", "FITTING", "ADAPTER", "ASSEMBLY", "RECEIVING", "QRC", "STAGING"],
    }
