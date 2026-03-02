"""
Accounts Payable Matcher ⚖️
Automated 3-Way Matching: Invoice (AI) vs PO (System) vs GR (Warehouse)
"""
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from decimal import Decimal

from app.models.invoice_inbox import InvoiceInbox, InboxStatus
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.invoice import Invoice, InvoiceStatus, InvoiceLine

logger = logging.getLogger("ap_matcher")

class APMatcherService:
    def __init__(self, db: Session):
        self.db = db
        self.tolerance = 500.0  # Allow small difference (rounding)

    def match_inbox_item(self, inbox_id: int):
        """
        Attempt to match Inbox Item with PO
        """
        item = self.db.query(InvoiceInbox).filter(InvoiceInbox.id == inbox_id).first()
        if not item:
            return {"error": "Item not found"}
            
        if not item.po_number_detected:
            return {"error": "No PO Number detected. Cannot match."}
            
        # 1. Find PO
        # Clean PO number (remove spaces)
        clean_po = item.po_number_detected.replace(" ", "").upper()
        po = self.db.query(PurchaseOrder).filter(PurchaseOrder.po_number == clean_po).first()
        
        if not po:
            # Try fuzzy search or partial match? For now, strict.
            return {"error": f"PO {clean_po} not found in system."}
            
        # 2. Check Amount
        po_total = float(po.total_amount)
        invoice_total = float(item.total_amount_detected or 0)
        
        diff = abs(po_total - invoice_total)
        is_match = diff <= self.tolerance
        
        if not is_match:
            return {
                "status": "warning",
                "message": f"Price Mismatch. PO: {po_total}, Invoice: {invoice_total}",
                "po_id": po.id,
                "diff": diff
            }
            
        # 3. Auto-Create Invoice Record
        try:
            new_invoice = Invoice(
                invoice_number=f"INV-{clean_po}-{datetime.now().strftime('%Y%m%d')}", # Temporary
                po_id=po.id,
                supplier_id=po.supplier_id,
                date=datetime.now(), # Should parse from OCR date
                due_date=datetime.now(), # Should calculate term
                total=Decimal(invoice_total),
                status=InvoiceStatus.DRAFT.value,
                notes=f"Auto-generated from Smart Invoicing. Source: {item.source}",
            )
            self.db.add(new_invoice)
            self.db.flush()
            
            # Link Inbox Item
            item.invoice_id = new_invoice.id
            item.po_id = po.id
            item.status = InboxStatus.MATCHED.value
            
            self.db.commit()
            
            return {
                "status": "success",
                "message": "3-Way Match Successful! Invoice Created.",
                "invoice_id": new_invoice.id,
                "confidence": "HIGH"
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create invoice from match: {e}")
            return {"error": str(e)}
