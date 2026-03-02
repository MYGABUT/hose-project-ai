# Implementation Plan: Phase 12 - Opname Status Tracking

## 1. Goal Description
The user wants to bridge the gap between "Barang Masuk" (Inbound) and "Stock Opname". When an item is received, it should initially be marked as "Not Opnamed" (❌). 
When the item is processed in the Stock Opname module, it should dynamically turn into "Opnamed" (✅) in the Batch Details log, and it should automatically disappear from the "remaining items to scan" list in the Stock Opname UI.

## 2. Proposed Changes

### Database Changes
#### [MODIFY] `app/models/inventory_batch.py`
- Add a new Boolean column: `is_opnamed = Column(Boolean, default=False)`
- Add a new DateTime column: `last_opname_date = Column(DateTime(timezone=True))`
- Update the `to_dict()` JSON serializer to expose these boolean and date properties.

### API Changes
#### [MODIFY] `app/api/v1/endpoints/opname.py`
- In the `finalize_opname` function (or anywhere a batch is successfully scanned/adjusted), we will update the database state for that `batch.barcode` to set `is_opnamed = True` and `last_opname_date = func.now()`.

### Frontend Changes
#### [MODIFY] `src/components/features/Inventory/BatchDetailModal.jsx`
- Add a new table column: **Status Opname**.
- If `b.is_opnamed` is true, display a ✅ .
- If false, display ❌.

#### [MODIFY] `src/pages/Inventory/StockOpname.jsx`
- When fetching the list of expected batches for a Location, filter out `is_opnamed === true` from the list of pending items so they disappear from the scope of what needs to be scanned.

## 3. Verification Plan
1. Create a new Inbound receipt. Verify it shows up in Inventory -> Detail Isi with a ❌ under "Status Opname".
2. Go to Stock Opname, select the location of the receipt. The barcode should be in the list.
3. Type / scan the barcode manually to finalize Opname.
4. Verify the barcode disappears from the Stock Opname list.
5. Go back to Inventory -> Detail Isi. Verify the mark has changed to ✅.
