# Android App Phase 9: Stock Opname Refinement (Audit Scanner)

## 1. Goal Description
Implement the complete **Stock Opname (Physical Inventory Count)** flow in the Android application. 
While a basic foundation (start session, continuous scan, finalize) was laid out in Phase 3, the app currently lacks visibility into *what* needs to be scanned and the real-time status of each item. This phase bridges that gap by connecting the app to the backend's item tracking endpoints.

## 2. Proposed Changes

### Data Models & API (`Network Layer`)
1. **Extend Models (`com/example/wmsenterprisescanner/data/model/Opname.kt`)**:
   - Add `OpnameItem` data class (mirroring backend: `id`, `batch_id`, `system_qty`, `actual_qty`, `status`, `scanned_at`, `batch` details).
   - Add `OpnameItemsResponseWrapper`.
2. **Update API Service (`ApiService.kt`)**:
   - Add `GET /opname/{opname_id}/items` to fetch the list of items in the current session.
   - Add `POST /opname/{opname_id}/mark-missing` to manually mark an item as missing.

### Repository & ViewModel (`Business Logic Layer`)
1. **Repository (`OpnameRepository.kt`)**:
   - Add function `getOpnameItems(opnameId)`.
   - Add function `markItemMissing(opnameId, itemId)`.
2. **ViewModel (`OpnameViewModel.kt`)**:
   - Introduce `StateFlow` for `itemsList` to hold the list of `OpnameItem`s.
   - Add `fetchItems(opnameId)` to load items when the session screen is opened.
   - Add `markMissing(itemId)` action.

### User Interface (`Presentation Layer`)
1. **Update `OpnameSessionScreen.kt`**:
   - Instead of just a blank screen with a "Start Scan" button, display a **LazyColumn** listing all items targeted for this Opname session.
   - Items should be color-coded based on their status:
     - 🟡 PENDING (Belum discan)
     - 🟢 FOUND / MISMATCH (Sudah discan)
     - 🔴 MISSING (Dinyatakan hilang)
   - Add a swipe-to-action or button on "PENDING" items to manually mark them as "MISSING" if the worker confirms the item is physically not there.
   - Keep the floating action button (FAB) to launch the `ContinuousScannerScreen`.

## 3. Verification Plan
### Automated Build Tests
- Run `./gradlew :app:assembleDebug` to verify no compilation errors after ViewModel and UI updates.

### Manual Verification
- Deploy the app to the emulator/device.
- Log in and navigate to the **Opname** menu.
- Note: It requires an active Stock Opname session started from the web/backend. We will use the backend's `/opname` endpoint to trigger a dummy session.
- Verify the list of items appears correctly.
- Verify that scanning an item using the continuous scanner updates the item's status in the list.
- Verify that clicking "Finalize" ends the session correctly.
