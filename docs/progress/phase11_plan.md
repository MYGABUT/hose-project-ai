# Implementation Plan: Phase 11 - Visual Warehouse Map & Batch-Level Logs

## 1. Goal Description
The user wants two major enhancements for the inventory system:
1. **Interactive Warehouse Map (Peta Rak):** A visual UI allowing users to see the warehouse layout (racks, shelves, bins) to quickly locate items. 
2. **Item Batch History log (Detail Isi):** When clicking on a summarized product item, users want to see exactly which individual items (batches/barcodes) make up that product's stock, what time they were inputted, and what their individual quantities are. 

## 2. Proposed Changes

### Feature 1: Detailed Batch Logs (Detail Isi)
#### [NEW] `src/components/features/Inventory/BatchDetailModal.jsx`
- Creates a Modal component triggered from the main Inventory/Stock list.
- Fetches from `/api/v1/batches` by passing `product_id`.
- Displays a Table with:
  - **Barcode** / Tracking ID
  - **Waktu Input** (`received_date`)
  - **Sisa Qty** (`current_qty`)
  - **Lokasi Rack**
  - **Source** (e.g. MANUAL vs PO)

#### [MODIFY] `src/pages/Inventory/StockCard.jsx`
- Add an "ℹ️ Info Detail" button on each product row that opens the `BatchDetailModal`.

### Feature 2: Visual Warehouse Map
#### [NEW] `src/pages/Inventory/WarehouseMap.jsx`
- Create a new interactive interactive page under Inventory.
- Fetch all Storage Locations via `/api/v1/inventory/locations`.
- Map the data into a hierarchical CSS Grid layout grouping by `zone` -> `rack` -> `level`.
- Each Bin/Level acts as a card showing capacity. Clicking a card fetches batches currently sitting in that specific `location_id`.

#### [MODIFY] `src/components/layout/Sidebar.jsx`
- Add "Peta Gudang" to the navigation menu under Inventory navigation group.

#### [MODIFY] `src/App.jsx`
- Register the `/inventory/map` route pointing to `WarehouseMap`.

## 3. Verification Plan
### Manual Verification
1. Navigate to the regular Inventory list, click "Info Detail" on an item, and verify a list of every single barcode with its exact input date appears.
2. Navigate to "Peta Gudang" and verify that a visual grid of the storage spots renders correctly based on DB locations.
3. Click a rack on the map, verify it conditionally loads products currently stored on that rack.
