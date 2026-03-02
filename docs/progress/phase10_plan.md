# Implementation Plan: Phase 10 - Hydraulink & Manual Control

## 1. Goal Description
The user wants to improve operations by allowing manual entries in Stock Opname (without requiring a Camera Scanner) and expanding the Manual Inbound Entry module to easily accommodate "Hydraulink" items beyond standard hoses (such as Fittings, Adaptors, Ferrules, Valves).

## 2. Proposed Changes

### Feature 1: Manual Stock Opname
#### [MODIFY] `src/pages/Inventory/StockOpname.jsx`
- Add a new "Input Manual Barcode" button next to "Scan Berikutnya" inside the active opname session view.
- Introduce a new Modal `showManualModal` that has an input text field for `barcode` and another for `Actual Qty`.
- The user can type a barcode manually, hit "Submit", and the system will process it exactly as if it was scanned by the camera.

### Feature 2: Inbound "Hydraulink" Other Goods (Non-Hose)
#### [MODIFY] `src/components/features/Scanner/HoseDataForm.jsx`
- Add `HYDRAULINK` to the list of `BRANDS`.
- Add a new "Kategori Barang" dropdown to manually switch between: `Hose`, `Fitting`, `Adaptor`, `Ferrule`, `Valve`, `Coupling`.
- Make "Panjang (Meter)" optional (or hidden) if the Kategori is *not* `Hose`. Non-hose items are usually counted in pieces (`Jumlah Roll` -> `Jumlah Item (Pcs)`).
- Hide specific hose fields (`Wire Type`, `Hose O.D.`, `Burst Pressure`) if the category is not `Hose` in order to simplify the form.

## 3. Verification Plan
### Manual Verification
1. Open the Stock Opname page, start an opname, and click "Input Manual". Type an existing barcode and submit. Verify that the table updates the status of that item.
2. Open the Inbound page, click "Entry Manual", choose the "Hydraulink" brand and "Fitting" category. Confirm that the form adapts (no length required, only Pcs) and allows saving standard components.
