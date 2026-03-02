# Implementation Plan: Phase 14 - Dynamic Component Specifications & Cut Hose Input

## 1. Goal Description
The user noticed that when inputting components like Fittings, Adaptors, Ferrules, Valves, and Couplings via the Inbound Form, the input fields are currently customized only for Hoses (e.g., Working Pressure, Wire Type, Bend Radius). These non-hose components require different technical specification fields like Thread Type (JIC, BSP, NPT), Thread Size, Sealing Type, and Configurations (Straight, 90-deg, 45-deg).
Additionally, the user requested the ability to input "potongan" (cut hoses) instead of full rolls.

## 2. Proposed Changes

### Frontend Update
#### [MODIFY] `src/components/features/Scanner/HoseDataForm.jsx`
- **Dynamic Fields per Category**:
    - **Hose**: Keep current fields (Standard, Wire Type, Hose OD/ID, Pressures, Bend Radius). Add a new toggle to specify if this is a "Full Roll" or a "Cut Piece" (Hose Potongan).
    - **Fitting / Adaptor / Coupling**: 
        - Hide Hose specific fields (Wire type, Hose ID/OD, Burst pressure, Bend radius).
        - Add `Tipe Ulir / Thread Type` (e.g., `JIC`, `BSP`, `NPT`, `ORFS`, `Metric`, `JIS`).
        - Add `Ukuran Ulir / Thread Size` (e.g., `1/4"`, `3/8"`, `M12x1.5`).
        - Add `Tipe Seal` (e.g., `O-Ring`, `Tapered`, `Flat Face`).
        - Add `Konfigurasi` (e.g., `Straight`, `90° Elbow`, `45° Elbow`, `Tee`).
    - **Ferrule / Valve / Lainnya**:
        - Hide Hose specific fields.
        - Show standard generic identifiers (Brand, SKU, Ukuran Inch, Ukuran DN, Jumlah Item). 
        - Show appropriate Thread/Configuration fields if applicable (e.g. for Valves).
- **Hose Potongan Support**:
    - Add a toggle `[ ] Ini adalah Hose Potongan` when the Category is `Hose`.
    - If checked, allow inputting `Panjang Potongan (cm/meter)` without enforcing a large standard roll length.
    - Adjust the "Kuantitas & Lokasi" label from "Jumlah Roll" to "Jumlah Potongan" depending on this toggle.

### Backend Update
#### [MODIFY] `app/api/v1/endpoints/batches.py` (if necessary)
- Ensure that the JSON schema for `specifications` in the `Product` model accepts these new dynamic fields (Thread Type, Configuration, etc.). Since `specifications` is currently a JSONB/JSON blob, it should handle dynamic keys structurally fine without DB migration.
- Add logic in `receive_batch` to parse `thread_type`, `thread_size`, `configuration` into the product's `specifications` JSON body dynamically based on what the frontend passes inside `data`.

#### [MODIFY] `app/schemas/batch.py` or equivalent schema in `batches.py`
- Add optional fields in the Pydantic `BatchInbound` model to receive `thread_type`, `thread_size`, `configuration`, `seal_type`, and `is_cut_piece`.

## 3. Verification Plan
1. Open the Manual Entry form.
2. Select Category **Adaptor**. Verify that Wire Type and Bend Radius disappear, and Thread Type/Configuration appear.
3. Select Category **Hose**. Verify that a "Hose Potongan" toggle appears. Check it and enter a length.
4. Save both test batches and verify they render correctly in the Inventory list.
