"""
HoseMaster WMS - E-Faktur Export
Generate CSV for DJP Online E-Faktur application
"""
import csv
import io
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from datetime import date
from typing import Optional

from app.core.database import get_db
from app.models import Invoice, InvoiceLine, Customer

router = APIRouter(prefix="/reports/efaktur", tags=["Reports - Tax"])

@router.get("/csv")
def export_efaktur_csv(
    year: int = Query(..., description="Tahun Pajak"),
    month: int = Query(..., description="Masa Pajak (1-12)"),
    db: Session = Depends(get_db)
):
    """
    📤 Export CSV E-Faktur (Pajak Keluaran)
    
    Format sesuai standar DJP:
    FK, KD_JENIS_TRANSAKSI, FG_PENGGANTI, NOMOR_FAKTUR, MASA_PAJAK, TAHUN_PAJAK, ...
    OF, KODE_OBJEK, NAMA, HARGA_SATUAN, JUMLAH_BARANG, HARGA_TOTAL, DISKON, DPP, PPN, ...
    """
    
    # Get invoices for the period that have tax invoice number
    invoices = db.query(Invoice).filter(
        sqlfunc.extract('year', Invoice.date) == year,
        sqlfunc.extract('month', Invoice.date) == month,
        Invoice.tax_invoice_number.isnot(None),
        Invoice.tax_invoice_number != ""
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    
    # Header logic skipped as E-Faktur usually expects raw data rows, 
    # but sometimes requires header. We will follow common practice of just data rows 
    # or the standard header if needed. Let's use standard header for clarity.
    
    # Standard Header is NOT usually included in the import file for E-Faktur Desktop,
    # but let's stick to the data structure.
    # Structure:
    # FK (Faktur Keluaran Header)
    # OF (Objek Faktur / Detail Barang)
    
    # Header Line (Optional, often omitted in bulk import, but good for reference)
    # writer.writerow(["FK", "KD_JENIS_TRANSAKSI", ...]) 
    
    if not invoices:
        return Response(content="No data found", media_type="text/csv")

    for inv in invoices:
        # FK ROW
        # FK, KD_JENIS, FG_PENGGANTI, NO_FAKTUR, MASA, TAHUN, TGL, NPWP, NAMA, ALAMAT, DPP, PPN, PPNBM, ID_KET, ...
        
        # Parse Tax Number: 010.000-23.12345678 -> KD_JENIS=01, FG=0, NOMOR=0002312345678
        # Simplification: User inputs full number. We try to split or just output as is if clean.
        # Assuming tax_invoice_number format: 010.000-23.12345678
        # Clean format for CSV: 0100002312345678
        
        clean_tax_no = inv.tax_invoice_number.replace('.', '').replace('-', '')
        if len(clean_tax_no) >= 16:
            kd_jenis = clean_tax_no[:2]
            fg_pengganti = clean_tax_no[2:3]
            nomor_faktur = clean_tax_no[3:]
        else:
            # Fallback
            kd_jenis = "01" 
            fg_pengganti = "0"
            nomor_faktur = clean_tax_no
            
        masa_pajak = month
        tahun_pajak = year
        tanggal_faktur = inv.date.strftime("%d/%m/%Y")
        
        # Customer Data
        # We need NPWP. Assuming stored in Invoice 'customer_npwp' or related Customer
        npwp = inv.customer_npwp.replace('.', '').replace('-', '') if inv.customer_npwp else "000000000000000"
        cust_name = inv.customer_name
        
        # Get address from customer relation if not in invoice
        customer = db.query(Customer).filter(Customer.name == inv.customer_name).first()
        address = customer.address if customer else "ALAMAT TIDAK DITEMUKAN"
        
        dpp = int(inv.dpp or 0)
        ppn = int(inv.tax_amount or 0)
        ppnbm = 0
        
        writer.writerow([
            "FK", 
            kd_jenis, 
            fg_pengganti, 
            nomor_faktur, 
            masa_pajak, 
            tahun_pajak, 
            tanggal_faktur, 
            npwp, 
            cust_name, 
            address, 
            dpp, 
            ppn, 
            ppnbm, 
            "", # ID KETERANGAN TAMBAHAN
            0, # FG_UANG_MUKA
            0, # UANG_MUKA_DPP
            0, # UANG_MUKA_PPN
            0, # UANG_MUKA_PPNBM
            inv.invoice_number # REFERENSI
        ])
        
        # OF ROWS (Items)
        # OF, KODE, NAMA, HARGA_SAT, JUMLAH, TOTAL, DISKON, DPP, PPN, PPNBM, TARIFF_PPNBM
        for item in inv.items:
            price = int(item.unit_price)
            qty = float(item.qty)
            total_price = int(price * qty)
            # Row discount? Assuming invoice discount is strictly header level for now or 0
            # If item has no discount field, we assume 0 for line item
            disc = 0 
            
            # Recalculate DPP per item
            # DPP Item = Total Price - Disc
            dpp_item = total_price - disc
            ppn_item = int(dpp_item * 0.11)
            
            writer.writerow([
                "OF",
                item.product_sku,
                item.product_name,
                price,
                qty,
                total_price,
                disc,
                dpp_item,
                ppn_item,
                0, # PPNBM
                0  # TARIF PPNBM
            ])

    filename = f"EFaktur_Export_{year}_{month:02d}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
