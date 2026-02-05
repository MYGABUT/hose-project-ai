"""
HoseMaster WMS - Stock Booking API
Manage stock reservations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.models import StockBooking, InventoryBatch, Product

router = APIRouter(prefix="/bookings", tags=["Inventory - Booking"])

class BookingCreate(BaseModel):
    product_id: int
    batch_id: int
    qty: float
    booked_by_name: str
    customer_name: str
    notes: Optional[str] = None
    days_valid: int = 3 # Auto expire in 3 days

@router.post("")
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db)
):
    """
    🔒 Keep Stock (Booking)
    Validates physical availability first.
    """
    # Check physical stock
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == data.batch_id).first()
    if not batch: raise HTTPException(status_code=404, detail="Batch not found")
    
    # Check existing bookings
    existing_bookings = db.query(sqlfunc.sum(StockBooking.qty)).filter(
        StockBooking.batch_id == data.batch_id,
        StockBooking.is_active == True
    ).scalar() or 0
    
    available = float(batch.current_qty) - float(existing_bookings)
    
    if data.qty > available:
        raise HTTPException(
            status_code=400, 
            detail=f"Stok tidak cukup! Fisik: {batch.current_qty}, Booked: {existing_bookings}, Available: {available}"
        )
        
    booking = StockBooking(
        product_id=data.product_id,
        batch_id=data.batch_id,
        qty=Decimal(str(data.qty)),
        booked_by_name=data.booked_by_name,
        customer_name=data.customer_name,
        notes=data.notes,
        expiry_date=datetime.now() + timedelta(days=data.days_valid),
        is_active=True
    )
    db.add(booking)
    
    # CRITICAL: Reserve the stock so Sales B cannot take it!
    batch.reserved_qty = (batch.reserved_qty or 0) + Decimal(str(data.qty))
    
    db.commit()
    db.refresh(booking)
    return {"status": "success", "message": "Stok berhasil dibooking dan diamankan (Reserved)", "data": booking.to_dict()}

@router.post("/{booking_id}/release")
def release_booking(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """🔓 Release booking (Cancel reservation)"""
    booking = db.query(StockBooking).filter(StockBooking.id == booking_id).first()
    if not booking: raise HTTPException(status_code=404, detail="Booking not found")
    
    booking.is_active = False
    
    # Restore reserved stock
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == booking.batch_id).first()
    if batch:
        batch.reserved_qty = max(0, (batch.reserved_qty or 0) - float(booking.qty))
        
    db.commit()
    return {"status": "success", "message": "Booking dilepas, stok kembali available"}

@router.get("/active")
def list_active_bookings(db: Session = Depends(get_db)):
    bookings = db.query(StockBooking).filter(
        StockBooking.is_active == True,
        StockBooking.expiry_date > datetime.now()
    ).all()
    return {"status": "success", "data": [b.to_dict() for b in bookings]}
