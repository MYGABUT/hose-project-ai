# Implementation Plan: Phase 13 - Auto Create Storage Locations

## 1. Goal Description
The user wants the system to automatically generate new `StorageLocations` (if they do not already exist) when a user types in a new location string during the Inbound process (Manual Entry or AI Scanner). Currently, the system throws a "404 Not Found" error if the typed location code doesn't exactly match an existing database record.

## 2. Proposed Changes

### Backend Updates
#### [MODIFY] `app/api/v1/endpoints/batches.py`
In the `receive_batch` (POST `/api/v1/batches/inbound`) endpoint:
- Replace the strict 404 check: `if not location: raise HTTPException...`
- Inject auto-creation logic:
  - Extract the zone (and optionally the rack/level) from the provided string (e.g., if user inputs `RACK-NEW`, the code is `RACK-NEW` and `zone` could default to something like `AUTO-CREATED`).
  - Create the `StorageLocation` record dynamically, saving it to the database.
  - Continue saving the `InventoryBatch` by linking its `location_id` to this newly created `StorageLocation` instance.

## 3. Verification Plan
- Go to the Manual Inbound form.
- Input a random, never-before-used location string (e.g. `TESTLOKASI-001`).
- Submit the form.
- Verify the form succeeds (no red 404 API error).
- Open the Batch Dashboard / Storage Layout map and verify `TESTLOKASI-001` now exists as a valid place to store inventory.
