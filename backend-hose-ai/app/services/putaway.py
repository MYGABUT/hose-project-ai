"""
HoseMaster WMS - Directed Put-away Service
Intelligent rack suggestion for incoming goods
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models import (
    StorageLocation, 
    InventoryBatch, 
    Product,
    LocationType,
    BatchStatus
)


class PutawayResult:
    """Result from put-away suggestion"""
    def __init__(self):
        self.suggestions = []
        self.total_qty = 0
        self.split_required = False


def get_putaway_suggestions(
    db: Session,
    product_id: int,
    qty: float,
    product_category: str = None
) -> PutawayResult:
    """
    Get intelligent put-away location suggestions.
    
    Strategy:
    1. Check if product already exists in picking area (fast-moving) - top up
    2. Find partially empty locations with same product
    3. Suggest empty locations nearest to picking area
    4. For large qty, split between picking and buffer
    
    Args:
        db: Database session
        product_id: Product to store
        qty: Quantity to put away
        product_category: HOSE or FITTING
    
    Returns:
        PutawayResult with location suggestions
    """
    result = PutawayResult()
    result.total_qty = qty
    remaining_qty = qty
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return result
    
    # Determine location type based on product
    if product_category == 'FITTING' or (product.category and 'FITTING' in product.category.value):
        location_type = LocationType.FITTING_BIN
    else:
        location_type = LocationType.HOSE_RACK
    
    # ========== Strategy 1: Find existing locations with same product ==========
    existing_batches = db.query(InventoryBatch).filter(
        and_(
            InventoryBatch.product_id == product_id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.is_deleted == False,
            InventoryBatch.current_qty > 0
        )
    ).all()
    
    if existing_batches:
        # Group by location
        locations_with_product = {}
        for batch in existing_batches:
            if batch.location_id not in locations_with_product:
                locations_with_product[batch.location_id] = {
                    'location': batch.location,
                    'current_qty': 0,
                    'batches': []
                }
            locations_with_product[batch.location_id]['current_qty'] += batch.current_qty
            locations_with_product[batch.location_id]['batches'].append(batch)
        
        # Suggest top-up at existing location (up to capacity)
        for loc_id, loc_data in locations_with_product.items():
            location = loc_data['location']
            if not location:
                continue
            
            capacity = location.capacity or 100  # Default capacity
            used = loc_data['current_qty']
            available_space = capacity - used
            
            if available_space > 0 and remaining_qty > 0:
                take = min(available_space, remaining_qty)
                result.suggestions.append({
                    'priority': 1,
                    'action': 'TOP_UP',
                    'location_code': location.code,
                    'location_id': location.id,
                    'location_type': location.type.value if location.type else None,
                    'current_qty': used,
                    'capacity': capacity,
                    'suggested_qty': take,
                    'reason': f'Barang sudah ada di lokasi ini ({used:.1f}/{capacity})',
                    'is_picking_area': location.is_picking_area if hasattr(location, 'is_picking_area') else False
                })
                remaining_qty -= take
    
    # ========== Strategy 2: Find empty locations ==========
    if remaining_qty > 0:
        # Get empty or low-usage locations
        empty_locations = db.query(StorageLocation).filter(
            and_(
                StorageLocation.type == location_type,
                StorageLocation.is_active == True,
                StorageLocation.is_deleted == False
            )
        ).all()
        
        # Calculate usage for each location
        location_usage = {}
        for loc in empty_locations:
            batches_in_loc = db.query(func.sum(InventoryBatch.current_qty)).filter(
                and_(
                    InventoryBatch.location_id == loc.id,
                    InventoryBatch.is_deleted == False,
                    InventoryBatch.current_qty > 0
                )
            ).scalar() or 0
            
            location_usage[loc.id] = {
                'location': loc,
                'used': batches_in_loc,
                'available': (loc.capacity or 100) - batches_in_loc
            }
        
        # Sort by available space (most empty first)
        sorted_locs = sorted(
            location_usage.values(), 
            key=lambda x: x['available'], 
            reverse=True
        )
        
        for loc_data in sorted_locs:
            if remaining_qty <= 0:
                break
            
            loc = loc_data['location']
            available = loc_data['available']
            
            if available <= 0:
                continue
            
            take = min(available, remaining_qty)
            
            # Determine if this is empty (new location) or partial
            action = 'NEW_LOCATION' if loc_data['used'] == 0 else 'ADD_TO_LOCATION'
            
            result.suggestions.append({
                'priority': 2 if loc_data['used'] == 0 else 3,
                'action': action,
                'location_code': loc.code,
                'location_id': loc.id,
                'location_type': loc.type.value if loc.type else None,
                'current_qty': loc_data['used'],
                'capacity': loc.capacity or 100,
                'suggested_qty': take,
                'reason': 'Lokasi kosong tersedia' if loc_data['used'] == 0 else f'Masih ada ruang ({loc_data["used"]:.1f}/{loc.capacity or 100})',
                'is_picking_area': getattr(loc, 'is_picking_area', False)
            })
            remaining_qty -= take
    
    # ========== Check if split required ==========
    if len(result.suggestions) > 1:
        result.split_required = True
    
    # Sort by priority
    result.suggestions.sort(key=lambda x: x['priority'])
    
    return result


def validate_putaway_scan(
    db: Session,
    expected_location_code: str,
    scanned_location_code: str
) -> Dict:
    """
    Validate that the scanned location matches expected.
    
    Args:
        db: Database session
        expected_location_code: Where system said to put
        scanned_location_code: What user scanned
    
    Returns:
        Dict with validation result
    """
    if expected_location_code.upper() == scanned_location_code.upper():
        return {
            'valid': True,
            'message': '✅ Lokasi benar! Silahkan taruh barang.'
        }
    
    # Check if scanned location exists
    scanned_loc = db.query(StorageLocation).filter(
        StorageLocation.code == scanned_location_code.upper()
    ).first()
    
    if not scanned_loc:
        return {
            'valid': False,
            'error': 'LOCATION_NOT_FOUND',
            'message': f'❌ Lokasi {scanned_location_code} tidak ditemukan di sistem!'
        }
    
    return {
        'valid': False,
        'error': 'WRONG_LOCATION',
        'message': f'❌ Salah lokasi! Seharusnya: {expected_location_code}, Anda scan: {scanned_location_code}',
        'expected': expected_location_code,
        'scanned': scanned_location_code
    }


def confirm_putaway(
    db: Session,
    batch_id: int,
    location_id: int,
    qty: float,
    performed_by: str = 'system'
) -> Dict:
    """
    Confirm put-away and move batch to location.
    
    Args:
        db: Database session
        batch_id: Batch being put away
        location_id: Target location
        qty: Quantity being placed
        performed_by: User performing action
    
    Returns:
        Dict with result
    """
    from app.models import log_movement, MovementType
    
    batch = db.query(InventoryBatch).filter(
        InventoryBatch.id == batch_id
    ).first()
    
    if not batch:
        return {'success': False, 'error': 'Batch tidak ditemukan'}
    
    location = db.query(StorageLocation).filter(
        StorageLocation.id == location_id
    ).first()
    
    if not location:
        return {'success': False, 'error': 'Lokasi tidak ditemukan'}
    
    # Update batch location
    old_location_id = batch.location_id
    batch.location_id = location_id
    
    # Log movement
    log_movement(
        db=db,
        batch_id=batch_id,
        movement_type=MovementType.TRANSFER,
        qty=qty,
        qty_before=batch.current_qty,
        qty_after=batch.current_qty,
        from_location_id=old_location_id,
        to_location_id=location_id,
        performed_by=performed_by,
        notes=f"Put-away to {location.code}"
    )
    
    db.commit()
    
    return {
        'success': True,
        'message': f'Barang berhasil ditaruh di {location.code}',
        'batch_barcode': batch.barcode,
        'location_code': location.code
    }
