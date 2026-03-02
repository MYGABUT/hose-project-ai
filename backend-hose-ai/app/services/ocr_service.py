import re
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class OCRService:
    """
    OCR Service acting as a bridge to Tesseract (or EasyOCR in future).
    Handles:
    1. File Conversion (PDF -> Image)
    2. Text Extraction (OCR)
    3. Basic Parsing (Regex)
    """
    
    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        """
        Extract raw text from PDF or Image bytes.
        """
        try:
            images = []
            if filename.lower().endswith('.pdf'):
                # Convert PDF to images
                images = convert_from_bytes(file_bytes)
            else:
                # Load image directly
                images = [Image.open(io.BytesIO(file_bytes))]
            
            full_text = ""
            for img in images:
                # Tesseract OCR
                text = pytesseract.image_to_string(img)
                full_text += text + "\n\f"
                
            return full_text
            
        except Exception as e:
            logger.error(f"OCR Failed: {str(e)}")
            raise e

    def parse_invoice(self, text: str) -> dict:
        """
        Parse raw text into structured data using Regex.
        """
        data = {
            "invoice_number": None,
            "date": None,
            "total_amount": None,
            "vendor_name": None
        }
        
        # 1. Invoice Number
        # Look for "Invoice No: INV-123" or similar
        inv_match = re.search(r'(?i)invoice\s*(?:no|number|#)?\s*[:.]?\s*([A-Z0-9-/]+)', text)
        if inv_match:
            data["invoice_number"] = inv_match.group(1)
            
        # 2. Date
        # DD/MM/YYYY or YYYY-MM-DD
        date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})', text)
        if date_match:
            data["date"] = date_match.group(1)
            
        # 3. Total Amount
        # Look for "Total: 1,000,000" or similar
        # Regex handles commas and dots 
        total_match = re.search(r'(?i)total\s*(?:amount)?\s*[:.]?\s*(?:Rp)?\s*([\d,.]+)', text)
        if total_match:
            raw_amount = total_match.group(1).replace(',', '').replace('.', '')
            # Heuristic: sometimes . is decimal. Simple approach: remove non-digits.
            # Only keep digits.
            clean_amount = re.sub(r'\D', '', raw_amount)
            if clean_amount:
                data["total_amount"] = int(clean_amount)
        
        # 4. Vendor (Naive approach: First line or specific keywords)
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        if lines:
            data["vendor_name"] = lines[0] # Often the top line is company name
            
        return data

ocr_service = OCRService()
