# Android App Phase 5: Item Inquiry (Cek Cepat Barang)

## 1. Goal Description
Implement the **Item Inquiry (Cek Cepat Barang)** feature in the Android application. This feature allows warehouse workers to quickly scan any physical barcode in the warehouse and instantly see the item's history, product details, remaining quantity, and current rack location.

This relies entirely on existing backend endpoints (`GET /api/v1/batches/{barcode}`), so no backend changes are necessary. This is a pure Android UI and logic implementation phase.

## 2. Proposed Changes

### 2.1 Android API & Models
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/Inventory.kt`
- Ensure `Batch` and `BatchDetailResponseWrapper` DTOs contain fully mapped fields returned by `batch.to_dict()` (e.g., `location` object or string, `received_date`, `status`, `product_name`, `product_sku`).

### 2.2 Android Repositories & ViewModels
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/repository/InventoryRepository.kt`
- No changes needed. `getBatchByBarcode` is already implemented from Phase 4.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/viewmodels/InquiryViewModel.kt`
- Create `InquiryViewModel` to handle state for the Quick Scan feature.
- Expose state: `isLoading`, `scannedBatch: Batch?`, `error: String?`.
- Function `scanBarcode(barcode: String)` to trigger the repository lookup.

### 2.3 Android UI Composable Screens 
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/InquiryScreen.kt`
- Split view: Top half displays the `ContinuousScannerScreen` modular component (or similar logic).
- Bottom half displays a persistent card. When a barcode is scanned, the card populates with:
  - Product Name & SKU
  - Batch Number & Barcode
  - Current Available Qty vs Initial Qty
  - Rack Location (StorageLocation)
  - Date Received
  - Status

### 2.4 Navigation
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/MainActivity.kt`
- Inject `InquiryViewModel` and add `"inquiry"` route to the NavHost.
#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/HomeScreen.kt`
- Add a Dashboard Card for "Cek Barang (Quick Scan)" that navigates to the `"inquiry"` route.

## 3. Verification Plan
- **Android Test**: 
  - Login to Android App.
  - At the Home Screen, click the new "Cek Cepat Barang" menu.
  - Point the camera at a valid generated barcode.
  - Verify that the bottom card immediately pops up with the correct Product and Batch details from the database.
  - Point the camera at an invalid barcode and verify an error snackbar or message appears.
