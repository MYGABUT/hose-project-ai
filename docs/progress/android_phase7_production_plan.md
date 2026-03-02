# Android App Phase 7: Production / Assembly Tracking

## 1. Goal Description
Implement the **Production Tracking** feature in the Android application. This targets workers in the assembly line (e.g., hose cutting and crimping stations). 

Unlike simple outbound picking, hose assembly involves following a "Cutting Wizard" (a step-by-step BOM recipe) directed by a Job Order (JO). The Android app needs to:
1. Show a list of active Job Orders designated to the worker's station.
2. Provide a "Wizard" UI for a specific JO to guide the worker.
3. Allow the worker to scan a material's barcode to confirm they grabbed the right raw material roll (`POST /jo/scan-material`).
4. Allow the worker to input the quantity they successfully cut/consumed (`POST /jo/complete-cut`).
5. Update the progress of the JO line (`POST /jo/{id}/lines/{id}/update-progress`).
6. Complete the Job Order.

## 2. Proposed Android Changes

### 2.1 Data Models & API Service
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/JobOrder.kt`
- Create data models for `JobOrder`, `JOLine`, `JOMaterial`.
- Create Response Wrappers: `JOListResponseWrapper`, `JODetailResponseWrapper`, `JOWizardResponseWrapper`.
- Create Request Models: `MaterialScanConfirm`, `MaterialCutComplete`, `JOLineProgress`.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/api/ApiService.kt`
- Add endpoints:
  - `GET /api/v1/jo/tracking/outstanding` (To show a dashboard of pending JOs)
  - `GET /api/v1/jo/{jo_id}`
  - `GET /api/v1/jo/{jo_id}/wizard`
  - `POST /api/v1/jo/{jo_id}/start`
  - `POST /api/v1/jo/scan-material`
  - `POST /api/v1/jo/complete-cut`
  - `POST /api/v1/jo/{jo_id}/lines/{line_id}/update-progress`
  - `POST /api/v1/jo/{jo_id}/complete`

### 2.2 Repositories & ViewModels
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/repository/ProductionRepository.kt`
- Handle API calls related to Job Orders. Inject into `RepositoryModule`.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/viewmodels/ProductionViewModel.kt`
- Manage state for listing outstanding JOs, tracking active Job Order details, and iterating through the Wizard steps (scanning material -> cutting -> progress update).

### 2.3 UI Screens & Navigation
#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/ProductionMenuScreen.kt`
- Displays a list of outstanding Job Orders categorized by priority.

#### [NEW] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/ProductionWizardScreen.kt`
- The core screen. A step-by-step wizard layout.
- Provides a barcode scanner view to verify raw materials before cutting.
- Provides input fields to report successfully cut quantities and waste.
- "Selesai Perakitan" button to finish the JO line.

#### [MODIFY] `android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/MainActivity.kt` & `HomeScreen.kt`
- Wire the new routes (`production_menu`, `production_wizard/{id}`). Add "Produksi (Perakitan)" button to the Dashboard.

## 3. Verification Plan
- **Backend Setup (Test Data)**: Ensure there is at least one active Job Order with `status = DRAFT` or `MATERIALS_RESERVED` requiring assembly in the backend database.
- **Android Manual Test**:
    1. Login to Android App.
    2. Click the new "Produksi (Perakitan)" menu.
    3. Verify the outstanding JO is listed.
    4. Click the JO to enter the Wizard.
    5. Test "Start JO" to change status to `IN_PROGRESS`.
    6. Scan a wrong barcode -> Verify error validation pops up.
    7. Scan the correct expected raw material barcode -> Verify success beep and UI unlock.
    8. Input cut quantity and submit.
    9. Complete the JO and ensure the API returns success and calculates HPP.
