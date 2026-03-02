# Android App Phase 8: Quality Control (QC Inspection)

## 1. Goal Description
Implement the **Quality Control** feature in the Android application. This targets QC inspectors who verify the output of the production/assembly line before it becomes Finished Goods (FG).

The Android app needs to:
1. Show a dashboard list of manufactured items that are pending QC inspection.
2. Provide an inspection screen for a specific item.
3. Allow the inspector to input the quantity that passed (OK) and failed (NG/Scrap).
4. Submit the inspection results to the backend (`POST /qc/inspect`), which automatically creates the Finished Goods inventory batch for the passed items.

## 2. Proposed Android Changes

### 2.1 Backend Note
The backend endpoints currently exist in `app/api/v1/endpoints/qc.py`:
- `GET /qc/pending`: Returns a list of `JOLine` items that have `qty_completed > 0` but haven't been fully inspected/finished.
- `POST /qc/inspect`: Submits the inspection result (`jo_line_id`, `qty_passed`, `qty_failed`, `notes`).

There is a minor bug in the backend `GET /qc/pending` endpoint logic: It currently returns lines where `qty_completed < qty_ordered`, which is meant for *Production* pending, not *QC* pending. We need to update the backend query to find JOs in `QC_PENDING` status or items that have been produced but not yet inspected.
*Correction for backend*: We need to ensure the backend logic correctly identifies items ready for QC. For now, since Phase 7 automatically moves JO to `QC_PENDING` when production is fully completed, we can rely on that status.

### 2.2 Data Models & API Service
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/QC.kt`
- Create data models: `QCPendingItem` (for the list), `QCInspectionRequest`.
- Create Response Wrappers: `QCPendingListResponseWrapper`, `QCInspectResponseWrapper`.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/api/ApiService.kt`
- Add endpoints:
  - `GET /api/v1/qc/pending`
  - `POST /api/v1/qc/inspect`

### 2.3 Repositories & ViewModels
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/repository/QCRepository.kt`
- Handle API calls related to QC. Inject into `RepositoryModule`.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/viewmodels/QCViewModel.kt`
- Manage state for listing pending QC items and handling the submission of inspection results.

### 2.4 UI Screens & Navigation
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/QCMenuScreen.kt`
- Displays a list of items pending QC inspection.
- Tapping an item opens the inspection dialog or screen.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/QCInspectScreen.kt` (or Dialog)
- A screen to input `qty_passed` and `qty_failed`.
- Includes an optional `notes` field.
- "Submit Inspection" button.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/MainActivity.kt` & `HomeScreen.kt`
- Wire the new routes (`qc_menu`, `qc_inspect/{lineId}`). Add "Quality Control (QC)" button to the Dashboard.

## 3. Verification Plan
- **Backend Fix**: First, modify the backend `qc.py` to ensure it accurately returns items whose JO status is `QC_PENDING`, since Phase 7 updates the JO to this status when production completes.
- **Android Manual Test**:
    1. Login to Android App.
    2. Ensure a Job Order has been completed in the Production phase (Phase 7), placing it in `QC_PENDING` status.
    3. Click the new "Quality Control (QC)" menu.
    4. Verify the manufactured items are listed.
    5. Select an item to inspect.
    6. Input the passed and failed quantities (ensuring validation works, e.g., total == qty_completed).
    7. Submit the inspection.
    8. Verify a success message is shown and the item disappears from the pending list.
    9. Optional: Check the backend database to confirm a new `InventoryBatch` with `status=AVAILABLE` and `source_type=PRODUCTION` was created for the passed quantity.
