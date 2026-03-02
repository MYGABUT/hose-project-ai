"""
Smart Invoicing Ingestion API 🧾
Manage incoming invoices from Email, WhatsApp, and Manual Uploads
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.invoice_inbox import InvoiceInbox, InboxSource, InboxStatus
from app.services.email_ingest import EmailIngestService
from app.services.invoice_parser import InvoiceParserService
from app.services.ap_matcher import APMatcherService

router = APIRouter(prefix="/invoices/ingest", tags=["Smart Invoicing"])

@router.post("/sync-email")
def sync_email_inbox(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    📧 Trigger Email Ingestion Sync
    Connects to IMAP server and fetches new invoice attachments.
    """
    service = EmailIngestService(db)
    
    # We can run this in background if we expect many emails
    # For now, synchronous to return count
    count = service.fetch_emails(mark_as_read=True)
    service.close()
    
    return {
        "status": "success",
        "message": f"Sync complete. Found {count} new invoice(s).",
        "new_count": count
    }

@router.post("/upload")
def upload_invoice_manual(
    file: UploadFile = File(...),
    sender: Optional[str] = Form("Manual Upload"),
    db: Session = Depends(get_db)
):
    """
    📤 Manual Invoice Upload
    Upload PDF/Image directly to the inbox staging area.
    """
    upload_dir = os.path.join(settings.BASE_DIR, "uploads", "invoices")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Clean filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, clean_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Create DB Record
        inbox_item = InvoiceInbox(
            source=InboxSource.UPLOAD.value,
            sender=sender,
            filename=clean_filename,
            file_path=file_path,
            status=InboxStatus.NEW.value,
            content_type=file.content_type
        )
        db.add(inbox_item)
        db.commit()
        db.refresh(inbox_item)
        
        return {
            "status": "success",
            "message": "Invoice uploaded successfully",
            "data": inbox_item.to_dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/inbox")
def list_inbox_items(
    status: Optional[str] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    📋 List Staged Invoices
    View invoices waiting for processing/matching.
    """
    query = db.query(InvoiceInbox)
    
    if status and status != 'ALL':
        query = query.filter(InvoiceInbox.status == status)
        
    if source:
        query = query.filter(InvoiceInbox.source == source)
        
    items = query.order_by(InvoiceInbox.received_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "status": "success",
        "total": len(items),
        "data": [item.to_dict() for item in items]
    }

@router.post("/{inbox_id}/process")
def process_invoice_ocr(
    inbox_id: int,
    db: Session = Depends(get_db)
):
    """
    🧠 Trigger AI Extraction (OCR + Logic)
    Reads the file, extracts Vendor/Total/Date, and updates the record.
    """
    parser = InvoiceParserService(db)
    result = parser.process_inbox_item(inbox_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.post("/{inbox_id}/match")
def match_invoice_po(
    inbox_id: int,
    db: Session = Depends(get_db)
):
    """
    ⚖️ Trigger 3-Way Match
    Compares Staged Invoice (AI Data) vs PO System.
    """
    matcher = APMatcherService(db)
    result = matcher.match_inbox_item(inbox_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result
