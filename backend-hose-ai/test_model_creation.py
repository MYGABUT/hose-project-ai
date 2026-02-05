
import sys
import os

# JURUS ANTI CRASH WINDOWS
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from app.models.inventory_batch import InventoryBatch
from app.models.enums import BatchStatus

try:
    print("Testing InventoryBatch instantiation...")
    batch = InventoryBatch(
        product_id=1,
        location_id=1,
        batch_number="TEST001",
        barcode="BARCODE001",
        serial_number="SN001",
        initial_qty=10.0,
        current_qty=10.0,
        reserved_qty=0,
        status=BatchStatus.QC_PENDING,
        cost_price=10000,
        source_type="MANUAL",
        source_reference="REF001",
        ai_confidence=95,
        ai_raw_text="Test Text",
        notes="Test Note",
        created_by="system"
    )
    print("✅ Instantiation successful!")
except TypeError as e:
    print(f"❌ TypeError Detected: {e}")
except Exception as e:
    print(f"❌ Other Error: {e}")
