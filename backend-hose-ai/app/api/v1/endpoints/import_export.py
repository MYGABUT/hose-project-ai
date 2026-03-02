"""
HoseMaster WMS - Import/Export API
Handle bulk data import/export via Excel
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from datetime import datetime
from typing import List

from app.core.database import get_db
from app.core.helpers import get_enum_value
from app.models import SalesOrder, SOLine, Product, Customer, Salesman, SOStatus
from app.core.security import get_current_active_user
from app.models.enums import ProductUnit
from app.services.product_import_service import ProductImportService

router = APIRouter(prefix="/import", tags=["System - Import/Export"])

# ============ Templates ============

@router.get("/template/sales")
async def get_sales_import_template():
    """
    📄 Download Excel Template for Historical Sales Import
    """
    # Define columns
    columns = [
        "Date (YYYY-MM-DD)",
        "SO Number",
        "Customer Name",
        "Salesman",
        "SKU",
        "Qty",
        "Unit (METER/PCS)",
        "Unit Price",
        "Discount (Rp)",
        "Tax (Rp)",
        "Notes"
    ]
    
    # Create sample data
    sample_data = [
        {
            "Date (YYYY-MM-DD)": "2024-01-15",
            "SO Number": "SO-2024-001",
            "Customer Name": "PT. MAJU MUNDUR",
            "Salesman": "BUDI",
            "SKU": "EAT-R2-005",
            "Qty": 10,
            "Unit (METER/PCS)": "METER",
            "Unit Price": 150000,
            "Discount (Rp)": 0,
            "Tax (Rp)": 165000,
            "Notes": "Project A"
        }
    ]
    
    df = pd.DataFrame(sample_data, columns=columns)
    
    # Create Excel buffer
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sales Data')
        
        # Adjust column widths
        worksheet = writer.sheets['Sales Data']
        for idx, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = max_len
            
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="Sales_Import_Template.xlsx"'
    }
    
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# ============ Import Logic ============

@router.post("/sales")
async def import_sales_history(
    file: UploadFile = File(...),
    preview: bool = False,
    db: Session = Depends(get_db)
):
    """
    📥 Import Historical Sales Data from Excel
    
    Logic:
    1. Check duplicates (SO Number)
    2. Check SKU existence
    3. Auto-create unknown Customers? (Maybe yes for history)
    """
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.csv')):
        raise HTTPException(status_code=400, detail="File must be .xlsx or .csv")
        
    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
             df = pd.read_csv(io.BytesIO(content))
        else:
             df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    # Standardize columns
    required_cols = ["Date (YYYY-MM-DD)", "SO Number", "Customer Name", "SKU", "Qty", "Unit Price"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")
        
    # --- PREVIEW / VALIDATION PHASE ---
    results = []
    so_cache = {} # Track SOs within the file to group lines
    
    errors = []
    
    # Pre-fetch existing SOs for duplicate check
    so_numbers = df["SO Number"].unique().tolist()
    existing_sos = db.query(SalesOrder.so_number).filter(SalesOrder.so_number.in_(so_numbers)).all()
    existing_so_set = {so[0] for so in existing_sos}
    
    # Pre-fetch Products for SKU check
    skus = df["SKU"].unique().tolist()
    products = db.query(Product.sku, Product.id).filter(Product.sku.in_(skus)).all()
    product_map = {p.sku: p.id for p in products}
    
    processed_rows = []
    
    for index, row in df.iterrows():
        row_status = "OK"
        row_error = None
        
        # 1. Date
        try:
            date_val = pd.to_datetime(row["Date (YYYY-MM-DD)"]).date()
        except:
            row_status = "ERROR"
            row_error = "Invalid Date Format"
            
        # 2. SO Check
        so_num = str(row["SO Number"]).strip()
        if so_num in existing_so_set:
            row_status = "SKIP"
            row_error = "SO Already Exists"
            
        # 3. SKU Check
        sku = str(row["SKU"]).strip()
        product_id = product_map.get(sku)
        if not product_id:
            row_status = "ERROR" 
            row_error = f"SKU {sku} Not Found"
            
        # 4. Valid Numbers
        try:
            qty = float(row["Qty"])
            price = float(row["Unit Price"])
        except:
             row_status = "ERROR"
             row_error = "Invalid Number (Qty/Price)"
             
        processed_rows.append({
            "index": index,
            "date": str(date_val) if row_status != "ERROR" else str(row["Date (YYYY-MM-DD)"]),
            "so_number": so_num,
            "customer": str(row["Customer Name"]),
            "sku": sku,
            "qty": qty if row_status != "ERROR" else 0,
            "price": price if row_status != "ERROR" else 0,
            "status": row_status,
            "error": row_error,
            "product_id": product_id
        })
        
        if row_status == "ERROR":
            errors.append(f"Row {index+2}: {row_error}")

    if preview:
        return {
            "status": "success",
            "message": f"Parsed {len(df)} rows. Found {len(errors)} errors.",
            "data": processed_rows,
            "has_errors": len(errors) > 0
        }
        
    # --- COMMIT PHASE ---
    if errors:
        raise HTTPException(status_code=400, detail=f"Cannot import. Fix errors first: {'; '.join(errors[:5])}...")
        
    # Group by SO
    grouped = {}
    for row in processed_rows:
        if row["status"] == "SKIP":
            continue
            
        so_num = row["so_number"]
        if so_num not in grouped:
            grouped[so_num] = {
                "date": row["date"],
                "customer": row["customer"],
                "lines": []
            }
        grouped[so_num]["lines"].append(row)
        
    created_count = 0
    
    try:
        for so_num, data in grouped.items():
            # Create SO
            so = SalesOrder(
                so_number=so_num,
                customer_name=data["customer"],
                order_date=datetime.strptime(data["date"], "%Y-%m-%d"),
                status=SOStatus.COMPLETED, # Historical data is completed
                payment_status="PAID",
                notes="Imported Historical Data"
            )
            db.add(so)
            db.flush() # Get ID
            
            total = 0
            
            # Create Lines
            for i, line in enumerate(data["lines"], 1):
                item_total = line["qty"] * line["price"]
                total += item_total
                
                soline = SOLine(
                    so_id=so.id,
                    line_number=i,
                    product_id=line["product_id"],
                    description=f"Imported {line['sku']}",
                    qty=int(line["qty"]),
                    qty_produced=int(line["qty"]), # Assume produced
                    qty_shipped=int(line["qty"]), # Assume shipped
                    unit_price=line["price"],
                    line_total=item_total
                )
                db.add(soline)
                
            so.total = total
            so.subtotal = total
            created_count += 1
            
        db.commit()
        return {
            "status": "success",
            "message": f"Values Imported! Created {created_count} Sales Orders.",
            "created_count": created_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

# ============ Product Import/Export ============

@router.post("/products/preview", summary="Preview Product Import")
async def preview_product_import(
    file: UploadFile = File(...),
    current_user = Depends(get_current_active_user)
):
    """
    Step 1: Upload Excel/CSV to preview data and check columns.
    """
    try:
        return await ProductImportService.preview_import(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/products/commit", summary="Commit Product Import")
async def commit_product_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Step 2: Commit valid data to Database.
    Allowed for ANY authenticated user for demo (usually Admin only).
    """
    # Role Check - Disabled for easier testing for now
    # if current_user.role not in ["ADMIN", "SUPERADMIN"]:
    #      raise HTTPException(status_code=403, detail="Only Admins can import data")
         
    try:
        return await ProductImportService.commit_import(db, file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/products/export", summary="Export Products")
def export_products(
    format: str = "xlsx",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Download Product Master Data.
    """
    return ProductImportService.export_products(db, format)
