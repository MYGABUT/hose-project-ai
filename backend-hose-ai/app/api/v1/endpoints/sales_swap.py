"""
HoseMaster WMS - Swap / Tukar Guling API
Handle "Tukar Barang" transactions (Return item A, Take item B, Pay Difference)
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models import Product, InventoryBatch, BatchMovement, MovementType, BatchStatus, Customer, Invoice, InvoiceLine
from app.api.v1.endpoints.invoices import generate_invoice_number

router = APIRouter(prefix="/sales/swap", tags=["Sales - Swap (Tukar Guling)"])

class SwapRequest(BaseModel):
    customer_id: int
    return_product_id: int
    return_qty: float
    return_reason: Optional[str] = "Salah Beli"
    
    out_product_id: int
    out_qty: float
    out_batch_id: Optional[int] = None
    
    notes: Optional[str] = None

@router.post("")
def create_swap_transaction(
    data: SwapRequest,
    db: Session = Depends(get_db)
):
    """
    🔄 Tukar Guling (Swap Asset)
    1. INBOUND Return Item (Stock +)
    2. OUTBOUND New Item (Stock -)
    3. Calculate Financial Delta & Create Invoice if needed
    """
    
    # 0. Validate Data
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    prod_in = db.query(Product).filter(Product.id == data.return_product_id).first()
    prod_out = db.query(Product).filter(Product.id == data.out_product_id).first()
    
    if not prod_in or not prod_out:
        raise HTTPException(status_code=404, detail="Product not found")

    # 1. Process RETURN (IN)
    # Put into a generic 'RETUR' location or Main Warehouse?
    # For now, put in Main Warehouse (Location ID 1) but mark as Return
    # We create a NEW Batch for the returned item to separate it (or merge if policy allows, let's create new for safety)
    
    # Estimate value of returned item (use current cost price or selling price?)
    # "Tukar Guling" usually values item at Selling Price for the Customer credit
    value_in = prod_in.price * Decimal(str(data.return_qty))
    
    batch_in = InventoryBatch(
        product_id=prod_in.id,
        sku=prod_in.sku,
        product_name=prod_in.name,
        initial_qty=Decimal(str(data.return_qty)),
        current_qty=Decimal(str(data.return_qty)),
        received_date=datetime.now(),
        status=BatchStatus.AVAILABLE, # Or INSPECTION? User said "Masuk stok lagi", so Available.
        location_id=1,
        location_name="MAIN_WAREHOUSE",
        source_type="SWAP_RETURN",
        cost_price=prod_in.cost_price # Restore at cost
    )
    
    # Resolve correct location for Return
    from app.models import StorageLocation
    # Try to find specific RETURN location, else Main
    loc_return = db.query(StorageLocation).filter(StorageLocation.code == "RETURN").first()
    if not loc_return:
         loc_return = db.query(StorageLocation).filter(StorageLocation.code == "RECEIVING").first()
    if not loc_return:
         loc_return = db.query(StorageLocation).first()
         
    if loc_return:
        batch_in.location_id = loc_return.id
        batch_in.location_name = loc_return.code
        
    db.add(batch_in)
    db.flush()
    
    BatchMovement(
        batch_id=batch_in.id,
        movement_type=MovementType.SWAP_IN,
        qty=float(data.return_qty),
        qty_before=0,
        qty_after=float(data.return_qty),
        notes=f"Swap Return from {customer.name}: {data.return_reason}"
    )

    # 2. Process OUTBOUND (New Item)
    qty_out_needed = Decimal(str(data.out_qty))
    value_out = prod_out.price * qty_out_needed
    
    # FIFO or Specific Batch
    if data.out_batch_id:
        batch_out = db.query(InventoryBatch).filter(InventoryBatch.id == data.out_batch_id).first()
        if not batch_out or batch_out.current_qty < qty_out_needed:
            raise HTTPException(status_code=400, detail="Insufficient stock for Out Item")
        # Deduct
        batch_out.current_qty -= qty_out_needed
        mov_out = BatchMovement(
            batch_id=batch_out.id,
            movement_type=MovementType.SWAP_OUT,
            qty=float(qty_out_needed),
            qty_before=float(batch_out.current_qty + qty_out_needed),
            qty_after=float(batch_out.current_qty),
            notes=f"Swap Out to {customer.name}"
        )
        db.add(mov_out)
    else:
        # FIFO
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.product_id == prod_out.id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0
        ).order_by(InventoryBatch.received_date.asc()).all()
        
        remaining = qty_out_needed
        for b in batches:
            if remaining <= 0: break
            take = min(b.current_qty, remaining)
            b.current_qty -= take
            remaining -= take
            
            db.add(BatchMovement(
                batch_id=b.id,
                movement_type=MovementType.SWAP_OUT,
                qty=float(take),
                qty_before=float(b.current_qty + take),
                qty_after=float(b.current_qty),
                notes=f"Swap Out to {customer.name}"
            ))
            
        if remaining > 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod_out.name}")

    # 3. Financial Calculation
    delta = value_out - value_in
    
    invoice_data = None
    if delta > 0:
        # Customer must pay detail
        inv_no = generate_invoice_number(db)
        inv = Invoice(
            invoice_number=inv_no,
            date=datetime.now().date(),
            due_date=datetime.now().date(),
            customer_name=customer.name,
            payment_status='UNPAID',
            notes=f"Swap Difference: In {prod_in.sku} vs Out {prod_out.sku}"
        )
        db.add(inv)
        db.flush()
        
        # Line Item for Difference
        # We can list both or just the diff? 
        # Better: List Out Item (Full Price) AND Return Item (Negative Price)
        
        # Line 1: New Item
        line_out = InvoiceLine(
            invoice_id=inv.id,
            product_id=prod_out.id,
            product_sku=prod_out.sku,
            description=f"SWAP OUT: {prod_out.name}",
            qty=qty_out_needed,
            unit_price=prod_out.price,
            subtotal=value_out
        )
        db.add(line_out)
        
        # Line 2: Return Item (Credit)
        line_in = InvoiceLine(
            invoice_id=inv.id,
            product_id=prod_in.id,
            product_sku=prod_in.sku,
            description=f"SWAP RETURN: {prod_in.name}",
            qty=Decimal(str(data.return_qty)),
            unit_price=-prod_in.price, # Negative Price
            subtotal=-value_in
        )
        db.add(line_in)
        
        invoice_data = {"id": inv.id, "number": inv_no, "amount": float(delta)}

    db.commit()
    
    return {
        "status": "success",
        "message": "Swap successful",
        "financial_summary": {
            "value_in": float(value_in),
            "value_out": float(value_out),
            "delta": float(delta),
            "action": "INVOICE_CREATED" if delta > 0 else "NO_PAYMENT_NEEDED"
        },
        "invoice": invoice_data
    }
