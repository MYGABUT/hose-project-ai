"""
HoseMaster WMS - Stock Card API (Kartu Stok)
Riwayat In/Out seperti Excel dengan saldo berjalan
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Product, InventoryBatch, JobOrder, JOLine, DeliveryOrder, DOLine, SalesOrder


router = APIRouter(prefix="/stock-card", tags=["Stock Card"])


# ============ Endpoints ============

@router.get("/{product_id}")
async def get_stock_card(
    product_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    📋 Get Stock Card (Kartu Stok) for a product
    
    Returns chronological list of all movements with running balance.
    Format mirip kartu stok Excel:
    - TANGGAL
    - NO. BUKTI
    - KETERANGAN
    - MASUK
    - KELUAR
    - SALDO
    """
    # Get product info
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    movements = []
    
    # 1. Get incoming batches (MASUK)
    batch_query = db.query(InventoryBatch).filter(
        InventoryBatch.product_id == product_id
    )
    if start_date:
        batch_query = batch_query.filter(InventoryBatch.created_at >= start_date)
    if end_date:
        batch_query = batch_query.filter(InventoryBatch.created_at <= end_date)
    
    for batch in batch_query.all():
        movements.append({
            "tanggal": batch.created_at.isoformat() if batch.created_at else None,
            "timestamp": batch.created_at,
            "tipe": "MASUK",
            "no_bukti": batch.source_reference or batch.batch_number,
            "customer_vendor": batch.source or "RECEIVING",
            "masuk": batch.initial_qty,
            "keluar": 0,
            "keterangan": f"Terima {batch.source or 'Receiving'}"
        })
    
    # 2. Get outgoing from JO lines (KELUAR - Produksi)
    jo_query = db.query(JOLine, JobOrder).join(
        JobOrder, JobOrder.id == JOLine.job_order_id
    ).filter(
        JOLine.product_id == product_id,
        JOLine.qty_completed > 0
    )
    if start_date:
        jo_query = jo_query.filter(JobOrder.created_at >= start_date)
    if end_date:
        jo_query = jo_query.filter(JobOrder.created_at <= end_date)
    
    for jo_line, jo in jo_query.all():
        customer_name = "-"
        if jo.sales_order:
            customer_name = jo.sales_order.customer_name
            if customer and customer.upper() not in customer_name.upper():
                continue
        
        movements.append({
            "tanggal": jo.completed_at.isoformat() if jo.completed_at else jo.created_at.isoformat() if jo.created_at else None,
            "timestamp": jo.completed_at or jo.created_at,
            "tipe": "KELUAR",
            "no_bukti": jo.jo_number,
            "customer_vendor": customer_name,
            "masuk": 0,
            "keluar": jo_line.qty_completed,
            "keterangan": f"Produksi JO #{jo.jo_number}"
        })
    
    # 3. Get outgoing from DO lines (KELUAR - Pengiriman)
    do_query = db.query(DOLine, DeliveryOrder).join(
        DeliveryOrder, DeliveryOrder.id == DOLine.delivery_order_id
    ).join(
        SalesOrder, SalesOrder.id == DeliveryOrder.so_id
    ).filter(
        DOLine.so_line.has(product_id=product_id),
        DeliveryOrder.status == "DELIVERED"
    )
    if start_date:
        do_query = do_query.filter(DeliveryOrder.created_at >= start_date)
    if end_date:
        do_query = do_query.filter(DeliveryOrder.created_at <= end_date)
    
    for do_line, do in do_query.all():
        customer_name = do.sales_order.customer_name if do.sales_order else "-"
        if customer and customer.upper() not in customer_name.upper():
            continue
        
        movements.append({
            "tanggal": do.delivered_at.isoformat() if do.delivered_at else do.created_at.isoformat() if do.created_at else None,
            "timestamp": do.delivered_at or do.created_at,
            "tipe": "KELUAR",
            "no_bukti": do.do_number,
            "customer_vendor": customer_name,
            "masuk": 0,
            "keluar": do_line.qty,
            "keterangan": f"Kirim DO #{do.do_number}"
        })
    
    # Sort by timestamp
    movements.sort(key=lambda x: x["timestamp"] or datetime.min)
    
    # Calculate running balance
    saldo = 0
    for m in movements:
        saldo = saldo + m["masuk"] - m["keluar"]
        m["saldo"] = saldo
        # Remove timestamp (internal use only)
        del m["timestamp"]
    
    # Get current stock
    current_stock = db.query(func.sum(InventoryBatch.current_qty)).filter(
        InventoryBatch.product_id == product_id,
        InventoryBatch.status == "AVAILABLE"
    ).scalar() or 0
    
    return {
        "status": "success",
        "product": {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "brand": product.brand,
            "unit": product.unit.value if product.unit else "pcs"
        },
        "current_stock": current_stock,
        "total_movements": len(movements),
        "data": movements
    }


@router.get("/summary/{product_id}")
async def get_stock_summary(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    📊 Get stock summary for a product
    
    Returns:
    - Total masuk
    - Total keluar
    - Saldo akhir
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    
    # Total incoming
    total_masuk = db.query(func.sum(InventoryBatch.initial_qty)).filter(
        InventoryBatch.product_id == product_id
    ).scalar() or 0
    
    # Current stock
    current_stock = db.query(func.sum(InventoryBatch.current_qty)).filter(
        InventoryBatch.product_id == product_id,
        InventoryBatch.status == "AVAILABLE"
    ).scalar() or 0
    
    # Total keluar = masuk - sisa
    total_keluar = total_masuk - current_stock
    
    return {
        "status": "success",
        "data": {
            "product_id": product_id,
            "sku": product.sku,
            "name": product.name,
            "total_masuk": total_masuk,
            "total_keluar": total_keluar,
            "saldo_akhir": current_stock
        }
    }
