from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
from pathlib import Path
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.invoice_inbox import InvoiceInbox, InboxStatus, InboxSource
from app.services.ocr_service import ocr_service

router = APIRouter()

UPLOAD_DIR = Path("uploads/invoices")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload Invoice (PDF/Image) for AI Extraction.
    1. Save file.
    2. Create Inbox record.
    3. Run OCR (Tesseract).
    4. Return extracted data.
    """
    try:
        # 1. Save File
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Create Record
        inbox_item = InvoiceInbox(
            source=InboxSource.UPLOAD.value,
            sender=current_user.email,
            filename=file.filename,
            file_path=str(file_path),
            content_type=file.content_type,
            status=InboxStatus.PROCESSING.value
        )
        db.add(inbox_item)
        db.commit()
        db.refresh(inbox_item)
        
        # 3. Read file content for OCR
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            
        # 4. Run OCR
        raw_text = ocr_service.extract_text(file_bytes, file.filename)
        parsed_data = ocr_service.parse_invoice(raw_text)
        
        # 5. Update Record
        inbox_item.extracted_data = parsed_data
        inbox_item.status = InboxStatus.OCR_DONE.value
        inbox_item.confidence_score = 80 if parsed_data.get("total_amount") else 40 # Simple heuristic
        
        # Update matching fields
        inbox_item.vendor_name_detected = parsed_data.get("vendor_name")
        inbox_item.total_amount_detected = parsed_data.get("total_amount")
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Invoice processed successfully",
            "data": {
                "inbox_id": inbox_item.id,
                "extracted": parsed_data,
                "raw_text_preview": raw_text[:200] + "..."
            }
        }
        
    except Exception as e:
        # Log error
        if 'inbox_item' in locals():
            inbox_item.status = InboxStatus.FAILED.value
            inbox_item.error_message = str(e)
            db.commit()
            
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("/")
def get_inbox(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List Invoice Inbox items"""
    items = db.query(InvoiceInbox).order_by(InvoiceInbox.received_at.desc()).offset(skip).limit(limit).all()
    return [item.to_dict() for item in items]

