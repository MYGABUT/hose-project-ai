"""
Invoice Parser Service 🧠
Extracts structured data from Invoice Images/PDFs using OCR + Regex Logic
"""
import re
import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from fuzzywuzzy import process
import logging

from app.models.invoice_inbox import InvoiceInbox, InboxStatus
from app.models.supplier import Supplier
from app.services.ocr_engine import ocr_engine

logger = logging.getLogger("invoice_parser")

class InvoiceParserService:
    def __init__(self, db: Session):
        self.db = db

    def process_inbox_item(self, inbox_id: int):
        """
        Run OCR and Extraction on an Inbox Item
        """
        item = self.db.query(InvoiceInbox).filter(InvoiceInbox.id == inbox_id).first()
        if not item:
            return {"error": "Item not found"}
            
        if not os.path.exists(item.file_path):
            item.status = InboxStatus.FAILED.value
            item.error_message = "File not found on disk"
            self.db.commit()
            return {"error": "File missing"}
            
        try:
            # 1. Update Status
            item.status = InboxStatus.PROCESSING.value
            self.db.commit()
            
            # 2. Perform OCR
            with open(item.file_path, "rb") as f:
                image_bytes = f.read()
                
            # Use multi-rotation for better accuracy
            ocr_result = ocr_engine.extract_with_details(image_bytes)
            raw_text = ocr_result.get("text", "")
            
            if not raw_text:
                raise Exception("OCR returned empty text")
                
            # 3. Extract Fields
            extracted = self._extract_fields(raw_text)
            
            # 4. Save Results
            item.extracted_data = {
                "raw_text_snippet": raw_text[:500],
                "all_text": raw_text,
                "fields": extracted
            }
            
            # Update columns for easy querying
            item.vendor_name_detected = extracted.get("vendor_name")
            item.total_amount_detected = extracted.get("total_amount")
            item.po_number_detected = extracted.get("po_number")
            item.confidence_score = 80 if extracted.get("total_amount") else 40
            
            item.status = InboxStatus.OCR_DONE.value
            self.db.commit()
            
            return {
                "status": "success",
                "data": extracted
            }
            
        except Exception as e:
            item.status = InboxStatus.FAILED.value
            item.error_message = str(e)
            self.db.commit()
            logger.error(f"Parser failed for {inbox_id}: {e}")
            return {"error": str(e)}

    def _extract_fields(self, text: str) -> dict:
        """
        Regex & Logic Extraction
        """
        text_upper = text.upper()
        
        # A. Find Vendor (Fuzzy Match)
        suppliers = self.db.query(Supplier.name).all()
        supplier_names = [s[0] for s in suppliers]
        vendor_name = None
        
        if supplier_names:
            # Check if any supplier name appears effectively in text
            best_match = process.extractOne(text_upper, supplier_names)
            if best_match and best_match[1] >= 85:
                vendor_name = best_match[0]
                
        # B. Find PO Number (Pattern: PO-YYYY-XXXX or just PO followed by digits)
        po_match = re.search(r'(PO\s*[:#-]?\s*\d+|PO-\d{4}-\d{4})', text_upper)
        po_number = po_match.group(0) if po_match else None
        
        # C. Find Total Amount (Look for largest currency-like number near 'TOTAL')
        # Simple heuristic: Find all numbers, look for phrases like "TOTAL", "AMOUNT DUE"
        total_amount = self._find_total_amount(text_upper)
        
        # D. Find Date (DD-MM-YYYY or YYYY-MM-DD)
        date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})', text)
        invoice_date = date_match.group(0) if date_match else None
        
        return {
            "vendor_name": vendor_name,
            "po_number": po_number,
            "total_amount": total_amount,
            "date": invoice_date
        }

    def _find_total_amount(self, text: str) -> float:
        """
        Heuristic to find the Total Amount
        """
        # 1. Clean text: remove non-numeric chars except . and ,
        # But keep space to separate numbers
        
        # Regex for currency: Rp 1.000.000,00 or 1,000,000.00
        # This is hard. Simplification: Find all numbers.
        
        # Keywords to locate the area
        lines = text.split('\n')
        candidates = []
        
        for i, line in enumerate(lines):
            if "TOTAL" in line or "AMOUNT" in line or "JUMP" in line: # JUMP for Jumlah?
                # Look for numbers in this line and next line
                search_area = line + " " + (lines[i+1] if i+1 < len(lines) else "")
                
                # Extract digits
                # Pattern: 1.000.000 or 1,000,000
                matches = re.findall(r'[\d,.]+', search_area)
                for m in matches:
                    # Clean punctuation
                    clean = m.replace("Rp", "").replace("$", "")
                    
                    # Try detection of thousand separator vs decimal
                    # Assume Indonesian Format: 1.000.000 (dots as thousand)
                    if clean.count('.') > 1:
                        # Likely 1.000.000
                        val_str = clean.replace(".", "")
                    elif clean.count(',') == 1 and clean.count('.') == 0:
                        # Likely 1000000,00 or 1,000,000
                        # Hard to say. Let's assume dot is thousand, comma is decimal
                        val_str = clean.replace(".", "").replace(",", ".")
                    else:
                        val_str = clean
                        
                    try:
                        val = float(val_str)
                        if val > 0: candidates.append(val)
                    except:
                        pass
                        
        if candidates:
            return max(candidates) # Usually total is the largest number? Risky but ok for MVP.
        return 0
