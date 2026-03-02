# Android App Phase 4: Outbound & Picking Flow

## 1. Goal Description
Implement the Outbound (Delivery Order Picking) flow in the Android application. Currently, the backend automatically uses FIFO to deduct inventory when a Delivery Order is completed. However, the core purpose of the Android scanner is to verify and deduct the **exact** physical batches picked by the warehouse operator. 

This phase will update the backend to support precise batch deductions and build the Android UI to facilitate scanning packages for Delivery Orders.

## 2. Proposed Changes

### 2.1 Backend Adjustments
#### [MODIFY] `backend-hose-ai/app/api/v1/endpoints/delivery_orders.py`
- Modify the `POST /api/v1/do/{do_id}/complete` endpoint to optionally accept a JSON payload: `picked_batches: List[dict]`.
- Example Payload: `[{"product_id": 1, "batch_id": 123, "qty": 5}, ...]`
- If `picked_batches` is provided, the backend must deduct inventory from those specific batches instead of relying purely on `order_by(InventoryBatch.created_at)` (FIFO).
- If no payload is provided, fallback to the existing FIFO logic to preserve Web App compatibility.

### 2.2 Android API & Models
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/api/ApiService.kt`
- Add `GET /api/v1/do?status=READY_TO_SHIP` to fetch pending DOS.
- Add `GET /api/v1/do/{id}` to fetch DO details and lines.
- Add `POST /api/v1/do/{id}/complete` with the new `picked_batches` payload.

#### [NEW] Data Models (`DeliveryOrder.kt`)
- Create DTOs: `DeliveryOrder`, `DOLine`, `DOPickRequest`, `DOPickItem`.

### 2.3 Android Repositories & ViewModels
#### [NEW] `OutboundRepository.kt`
- Wrap Retrofit calls for DOs with `Result<T>` and Coroutines.
- Expose functions to `getPendingDOs`, `getDODetails`, `completeDO`.

#### [NEW] `OutboundViewModel.kt`
- Manage state for `MVI` architecture.
- Handle picking logic: when a user scans a barcode, find the corresponding `Product`, check if it's on the `DO`, calculate remaining qty needed, and add the `Batch` to the "picked" list.

### 2.4 Android UI Composable Screens 
#### [NEW] `OutboundMenuScreen.kt`
- Display a list of DOs that have `status = READY_TO_SHIP`.
- Clicking a DO navigates to the Picking Screen.

#### [NEW] `OutboundPickingScreen.kt`
- Split view: Top shows the target items needed (`DOLine`s). Bottom contains the `ContinuousScannerScreen` view (or a custom scanner).
- As the user scans a physical item (barcode represents an `InventoryBatch`), sound a success beep, increment the "picked" counter for that product, and update the UI.
- If they scan something not on the DO, sound an error beep.
- "Finish Picking" button submits the exact batches to the backend.

### 2.5 Navigation
#### [MODIFY] `MainActivity.kt` & `HomeScreen.kt`
- Route `/outbound` to `OutboundMenuScreen`.
- Route `/outbound/{do_id}` to `OutboundPickingScreen`.

## 3. Verification Plan
- **Backend Test**: Call `complete` with specific batches and verify the stock card deducts from those exact batches rather than the oldest ones.
- **Android Test**: 
  - Login to Android App.
  - Navigate to Outbound.
  - Select a DO.
  - Scan valid and invalid barcodes using the ML Kit scanner.
  - Submit the Pick and verify the response is successful.
