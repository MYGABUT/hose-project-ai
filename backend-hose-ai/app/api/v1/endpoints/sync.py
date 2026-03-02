from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.services.google_sheet_service import GoogleSheetService
from app.models.product import Product

router = APIRouter(prefix="/sync", tags=["System - Google Sheets Sync"])

@router.post("/push/inventory", summary="Push Live Inventory to Google Sheet")
async def push_inventory_to_sheet(
    sheet_id: str = Body(..., embed=True, description="Target Google Sheet ID"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Trigger Manual Sync: Push current inventory (SKU, Name, Stock) to Google Sheets.
    Requires 'credentials.json' on server.
    """
    # 1. Fetch Data
    products = db.query(Product).all()
    
    data = []
    for p in products:
        # Calculate stock (This is a simplified example. Real stock is complex)
        # Assuming we just show defined fields for now. 
        # In real WMS, stock = sum(batches) - reserved.
        # Check if product has batches relationship loaded
        stock_qty = 0
        if p.batches:
             stock_qty = sum(b.quantity for b in p.batches)
             
        data.append({
            "SKU": p.sku,
            "Name": p.name,
            "Category": p.category.value if hasattr(p.category, 'value') else str(p.category),
            "Brand": p.brand,
            "Stock": stock_qty,
            "Unit": p.unit.value if hasattr(p.unit, 'value') else str(p.unit),
            "Sell Price": p.sell_price,
            "Last Updated": p.updated_at.strftime("%Y-m-d %H:%M") if p.updated_at else ""
        })
        
    if not data:
         raise HTTPException(status_code=404, detail="No products found to sync")

    # 2. Push to Sheet
    service = GoogleSheetService()
    result = service.push_inventory_report(sheet_id, data)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
        
    return result

@router.post("/pull/prices", summary="Pull Prices from Google Sheet")
async def pull_prices_from_sheet(
    sheet_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Update Product Prices from Google Sheet 'Price_List'.
    """
    if current_user.role not in ["ADMIN", "SUPERADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    service = GoogleSheetService()
    try:
        # Get data: [{SKU: '...', 'Sell Price': 1000}, ...]
        sheet_data = service.pull_prices(sheet_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    updated_count = 0
    errors = []
    
    for row in sheet_data:
        sku = str(row.get("SKU", "")).strip()
        new_price = row.get("Sell Price")
        
        if not sku or not new_price:
            continue
            
        product = db.query(Product).filter(Product.sku == sku).first()
        if product:
             try:
                 product.sell_price = float(new_price)
                 updated_count += 1
             except:
                 errors.append(f"Invalid price for {sku}")
                 
    db.commit()
    
    return {
        "status": "success", 
        "updated": updated_count,
        "errors": errors[:10]
    }
