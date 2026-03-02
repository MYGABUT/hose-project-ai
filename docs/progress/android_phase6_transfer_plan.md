# Android App Phase 6: Warehouse Transfer (Mutasi Antar Rak/Gudang)

## 1. Goal Description
Implement the **Warehouse Transfer** feature in the Android application. This feature handles the physical movement of goods between different storage locations (racks or different warehouses). 

The workers will use the Android app to do two primary actions:
1. **Ship (Outbound Mutation)**: Scan barcodes of items on the origin rack to pick them for the transfer, ensuring the exact batches are deducted.
2. **Receive (Inbound Mutation)**: Verify the arrival of the transfer at the destination rack/warehouse.

## 2. Proposed Backend Changes
Just like Phase 4 (Delivery Orders), the current backend for Warehouse Transfer (`POST /transfers/{id}/ship`) relies on FIFO deduction. We need to modify it so the Android app can specify *exactly* which batches were scanned and picked.

#### [MODIFY] `backend-hose-ai/app/api/v1/endpoints/warehouse_transfer.py`
- Add a new Pydantic schema `TransferPickItem` containing `product_id`, `batch_id`, and `qty`.
- Modify `TransferShip` schema to accept an optional `picked_batches: List[TransferPickItem] = None`.
- In `ship_transfer`, if `picked_batches` is provided, iterate and deduct those specific batches (and create `BatchMovement` records linked to them). Otherwise, fallback to the existing FIFO logic.

## 3. Proposed Android Changes

### 3.1 Data Models & API Service
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/Transfer.kt` (NEW FILE)
- Create data models: `WarehouseTransfer`, `TransferItem`, `TransferListResponseWrapper`, `TransferDetailResponseWrapper`.
- Create request payload models: `TransferShipRequest`, `TransferPickItem`, `TransferReceiveRequest`.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/api/ApiService.kt`
- Add `GET /api/v1/transfers`
- Add `GET /api/v1/transfers/{id}`
- Add `POST /api/v1/transfers/{id}/ship`
- Add `POST /api/v1/transfers/{id}/receive`

### 3.2 Repositories & ViewModels
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/repository/TransferRepository.kt`
- Network repository for interacting with Transfer endpoints.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/viewmodels/TransferViewModel.kt`
- State management for listing transfers, fetching details, accumulating scanned batches for shipping, and processing receiving. Uses `InventoryRepository` for resolving scanned barcodes.

### 3.3 UI Screens & Navigation
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/TransferMenuScreen.kt`
- A list of transfers assigned to the user's location, filtered by `APPROVED` (Ready to Ship) and `IN_TRANSIT` (Ready to Receive).

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/TransferShipScreen.kt`
- Split-screen UI (Scanner on top, Required Items on bottom) identical to Phase 4 Outbound Picking. Validates scanned barcodes against the Transfer requirements.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/TransferReceiveScreen.kt`
- UI showing the incoming items. Features a simple "Receive All" capability or individual line receiving check.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/MainActivity.kt` & `HomeScreen.kt`
- Wire the routes and inject the ViewModel. Add "Mutasi Barang (Transfer)" button to `HomeScreen`.

## 4. Verification Plan
- **Backend Test**: Call `POST /transfers/{id}/ship` with specific `picked_batches` via Swagger/Postman to ensure the exact batches are properly deducted and `BatchMovement` records are created correctly.
- **Android E2E Test**:
    1. Create a Draft Transfer via backend or web (mock). Approve it.
    2. Open Android App -> Mutasi Barang.
    3. Select the Transfer (Status: APPROVED). Click "Ship".
    4. Scan the origin item barcodes until quantity is fulfilled. Submit Shipment.
    5. Verify the Transfer status is now `IN_TRANSIT`.
    6. Select the Transfer again. Click "Receive". Submit Receipt.
    7. Verify Transfer status is `RECEIVED`.
