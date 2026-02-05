"""
HoseMaster WMS - Warehouse Transfer API
Inter-warehouse mutation workflow
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.core.database import get_db
from app.models import (
    WarehouseTransfer, TransferItem, InventoryBatch, 
    StorageLocation, Product, BatchMovement, MovementType,
    BatchStatus
)


router = APIRouter(prefix="/transfers", tags=["Warehouse Transfer"])

# ============ Schemas ============

class TransferItemRequest(BaseModel):
    product_id: int
    qty: float
    unit: str = "PCS"

class TransferRequest(BaseModel):
    from_location_id: int
    to_location_id: int
    items: List[TransferItemRequest]
    notes: Optional[str] = None
    requested_by: str

class TransferReceive(BaseModel):
    received_by: str
    items_received: Optional[List[dict]] = None # Optional for Auto-Receive


# ============ Endpoints ============

def generate_transfer_number(db: Session, date_obj: date) -> str:
    """Generate WT-YYYYMM-XXX"""
    prefix = f"WT-{date_obj.strftime('%Y%m')}"
    count = db.query(WarehouseTransfer).filter(
        WarehouseTransfer.transfer_number.like(f"{prefix}%")
    ).count()
    return f"{prefix}-{count + 1:03d}"



@router.get("")
def list_transfers(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    📜 List Warehouse Transfers
    Optional filter by status (DRAFT, APPROVED, IN_TRANSIT, RECEIVED)
    """
    query = db.query(WarehouseTransfer)
    
    if status and status != 'ALL':
        query = query.filter(WarehouseTransfer.status == status)
        
    transfers = query.order_by(WarehouseTransfer.created_at.desc()).limit(limit).all()
    
    return {
        "status": "success",
        "data": [t.to_dict() for t in transfers]
    }


@router.get("/{transfer_id}")
def get_transfer_detail(
    transfer_id: int,
    db: Session = Depends(get_db)
):
    """🔍 Get Transfer Detail with Items"""
    transfer = db.query(WarehouseTransfer).get(transfer_id)
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer tidak ditemukan")
        
    result = transfer.to_dict()
    
    # Manually attach items since to_dict doesn't include them
    items = []
    transfer_items = db.query(TransferItem).filter_by(transfer_id=transfer.id).all()
    for item in transfer_items:
        items.append(item.to_dict())
        
    result["items"] = items
    
    return {"status": "success", "data": result}


@router.post("/request")
def request_transfer(
    data: TransferRequest,
    db: Session = Depends(get_db)
):
    """
    📝 Create draft transfer request
    """
    if data.from_location_id == data.to_location_id:
        raise HTTPException(status_code=400, detail="Lokasi asal dan tujuan tidak boleh sama")
        
    src_loc = db.query(StorageLocation).get(data.from_location_id)
    dest_loc = db.query(StorageLocation).get(data.to_location_id)
    
    if not src_loc or not dest_loc:
        raise HTTPException(status_code=404, detail="Lokasi tidak ditemukan")

    # Generate Number
    transfer_number = generate_transfer_number(db, date.today())
    
    transfer = WarehouseTransfer(
        transfer_number=transfer_number,
        from_location_id=src_loc.id,
        from_location_name=src_loc.code,
        to_location_id=dest_loc.id,
        to_location_name=dest_loc.code,
        request_date=date.today(),
        status='DRAFT',
        requested_by=data.requested_by,
        notes=data.notes
    )
    db.add(transfer)
    db.flush()
    
    # Add Items
    for item in data.items:
        # Validate Product
        prod = db.query(Product).get(item.product_id)
        if not prod:
            continue
            
        t_item = TransferItem(
            transfer_id=transfer.id,
            product_id=prod.id,
            product_sku=prod.sku,
            product_name=prod.name,
            qty_requested=item.qty,
            unit=item.unit,
            line_status='PENDING'
        )
        db.add(t_item)
    
    db.commit()
    db.refresh(transfer)
    
    return {
        "status": "success",
        "message": f"Transfer Request {transfer_number} dibuat",
        "data": transfer.to_dict()
    }


@router.post("/{transfer_id}/approve")
def approve_transfer(
    transfer_id: int,
    data: dict, # Hack to accept generic body
    db: Session = Depends(get_db)
):
    """
    ✅ Approve Transfer Request
    Checks stock availability but DOES NOT move it yet.
    """
    transfer = db.query(WarehouseTransfer).get(transfer_id)
    if not transfer or transfer.status != 'DRAFT':
        raise HTTPException(status_code=400, detail="Transfer tidak valid untuk diapprove")
        
    # Check availability for each item (simple check)
    errors = []
    for item in db.query(TransferItem).filter_by(transfer_id=transfer.id).all():
        total_avail = db.query(sqlfunc.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.product_id == item.product_id,
            InventoryBatch.location_id == transfer.from_location_id,
            InventoryBatch.status == 'AVAILABLE'
        ).scalar() or 0
        
        if total_avail < item.qty_requested:
            errors.append(f"Stock kurang untuk {item.product_sku}. Req: {item.qty_requested}, Ada: {total_avail}")
    
    if errors:
        raise HTTPException(status_code=400, detail="Stock tidak cukup: " + "; ".join(errors))
        
    transfer.status = 'APPROVED'
    transfer.approved_by = data.get("approved_by", "system")
    db.commit()
    
    return {"status": "success", "message": "Transfer disetujui, siap dikirim"}


@router.post("/{transfer_id}/ship")
def ship_transfer(
    transfer_id: int,
    data: TransferShip,
    db: Session = Depends(get_db)
):
    """
    🚚 Ship Transfer (Outbound)
    Moves stock from Source Loc to 'IN_TRANSIT' (virtual location or logic).
    Actually, we deduct from source batch and keep track of shipped qty.
    """
    transfer = db.query(WarehouseTransfer).get(transfer_id)
    if not transfer or transfer.status != 'APPROVED':
        raise HTTPException(status_code=400, detail="Transfer belum diapprove")

    # Process items FIFO
    items = db.query(TransferItem).filter_by(transfer_id=transfer.id).all()
    
    for item in items:
        remaining_qty = float(item.qty_requested)
        
        # Get multiple batches FIFO
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.product_id == item.product_id,
            InventoryBatch.location_id == transfer.from_location_id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0
        ).order_by(InventoryBatch.received_date.asc()).all()
        
        for batch in batches:
            if remaining_qty <= 0:
                break
                
            qty_take = min(batch.current_qty, remaining_qty)
            
            # Log Movement (OUTBOUND TRANSFER)
            # Create a "Phantom" or "In-Transit" batch logic later?
            # For now, we deduct source and treat as "in flight" attached to the TransferItem
            
            batch.current_qty -= qty_take
            remaining_qty -= qty_take
            
            # Record what exact batch was used? 
            # Ideally TransferItem should split if multiple batches used.
            # Simplified: We just note it's shipped.
            
            # Log Movement
            move = BatchMovement(
                batch_id=batch.id,
                movement_type=MovementType.TRANSFER,
                qty=qty_take,
                qty_before=batch.current_qty + qty_take,
                qty_after=batch.current_qty,
                from_location_id=batch.location_id,
                to_location_id=None, # In Transit
                reference_id=transfer.id,
                reference_type="WAREHOUSE_TRANSFER",
                performed_by=data.shipped_by,
                notes=f"Shipped via {transfer.transfer_number}"
            )
            db.add(move)
            
            if batch.current_qty == 0:
                batch.status = BatchStatus.CONSUMED
        
        if remaining_qty > 0:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Stock fisik berubah/kurang saat shipping {item.product_sku}")

        # Update item status
        item.qty_shipped = item.qty_requested
        item.line_status = 'SHIPPED'

    transfer.status = 'IN_TRANSIT'
    transfer.shipped_date = date.today()
    transfer.shipped_by = data.shipped_by
    db.commit()
    
    return {"status": "success", "message": "Barang dalam pengiriman (In Transit)"}


@router.post("/{transfer_id}/receive")
def receive_transfer(
    transfer_id: int,
    data: TransferReceive,
    db: Session = Depends(get_db)
):
    """
    📥 Receive Transfer (Inbound)
    Creates NEW batches in Destination Loc.
    Supports Auto-Receive if items_received is not provided.
    """
    transfer = db.query(WarehouseTransfer).get(transfer_id)
    if not transfer or transfer.status != 'IN_TRANSIT':
        raise HTTPException(status_code=400, detail="Transfer tidak dalam status pengiriman")

    total_variance = 0
    
    # Auto-Receive Logic
    items_to_process = data.items_received
    if not items_to_process:
        items_to_process = []
        # Fetch all pending items from DB
        db_items = db.query(TransferItem).filter_by(transfer_id=transfer.id).all()
        for t_item in db_items:
            items_to_process.append({
                "id": t_item.id,
                "qty_received": float(t_item.qty_shipped) # Assume full receipt
            })
    
    for r_item in items_to_process:
        item_id = r_item.get("id")
        qty_received = float(r_item.get("qty_received", 0))
        
        t_item = db.query(TransferItem).get(item_id)
        if not t_item:
            continue
            
        # Create new batch at destination
        # Simplification: Create one batch per item line
        new_batch = InventoryBatch(
            product_id=t_item.product_id,
            location_id=transfer.to_location_id,
            batch_number=t_item.batch_number or f"TRFx{transfer.transfer_number}",
            barcode=f"{t_item.product_sku}-{datetime.now().timestamp()}", # Generate new barcode
            initial_qty=qty_received,
            current_qty=qty_received,
            status=BatchStatus.AVAILABLE,
            received_date=datetime.now(),
            source_type="TRANSFER",
            source_reference=transfer.transfer_number
        )
        db.add(new_batch)
        db.flush() # get ID
        
        # Log Inbound
        move = BatchMovement(
            batch_id=new_batch.id,
            movement_type=MovementType.TRANSFER,
            qty=qty_received,
            qty_before=0,
            qty_after=qty_received,
            from_location_id=None, # From Transit
            to_location_id=transfer.to_location_id,
            reference_id=transfer.id,
            reference_type="WAREHOUSE_TRANSFER",
            performed_by=data.received_by,
            notes=f"Received via {transfer.transfer_number}"
        )
        db.add(move)

        # Update Transfer Item
        t_item.qty_received = qty_received
        t_item.qty_variance = qty_received - float(t_item.qty_shipped)
        t_item.line_status = 'RECEIVED' if t_item.qty_variance == 0 else 'VARIANCE'
        
        if t_item.qty_variance != 0:
            total_variance += 1

    transfer.status = 'RECEIVED' if total_variance == 0 else 'RECEIVED_PARTIAL'
    transfer.received_date = date.today()
    transfer.received_by = data.received_by
    
    db.commit()
    return {"status": "success", "message": "Transfer diterima di gudang tujuan"}
