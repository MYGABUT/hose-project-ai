"""
Invoice Inbox Model
Staging area for Multi-Source Invoice Ingestion (Email, WhatsApp, Upload)
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base

class InboxSource(str, enum.Enum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"
    UPLOAD = "UPLOAD"

class InboxStatus(str, enum.Enum):
    NEW = "NEW"
    PROCESSING = "PROCESSING"
    OCR_DONE = "OCR_DONE"
    MATCHED = "MATCHED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"

class InvoiceInbox(Base):
    __tablename__ = "invoice_inbox"

    id = Column(Integer, primary_key=True, index=True)
    
    # Metadata
    source = Column(String, default=InboxSource.UPLOAD.value)  # EMAIL, WHATSAPP, UPLOAD
    sender = Column(String, nullable=True)  # Email address or Phone number
    received_at = Column(DateTime, server_default=func.now())
    
    # File Info
    file_path = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)  # application/pdf, image/jpeg
    
    # Processing Status
    status = Column(String, default=InboxStatus.NEW.value)
    error_message = Column(Text, nullable=True)
    
    # AI Extraction Results
    extracted_data = Column(JSON, nullable=True)  # JSON blob of extracted header/lines
    confidence_score = Column(Integer, default=0)
    
    # 3-Way Matching Links
    po_number_detected = Column(String, nullable=True)
    vendor_name_detected = Column(String, nullable=True)
    total_amount_detected = Column(Integer, nullable=True)
    
    # Final Links (if matched)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "sender": self.sender,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "filename": self.filename,
            "status": self.status,
            "error_message": self.error_message,
            "extracted_data": self.extracted_data,
            "confidence_score": self.confidence_score,
            "po_number_detected": self.po_number_detected,
            "vendor_name_detected": self.vendor_name_detected,
            "total_amount_detected": self.total_amount_detected
        }
