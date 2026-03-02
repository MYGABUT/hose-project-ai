# Phase 11: Enhanced Inbound — Scan + Manual Entry (Mirip Web)

## Goal
Upgrade the Android Inbound screen to match the web's `HoseDataForm` capabilities, supporting:
- **Dual-mode**: Quick Scan (existing) vs Full Manual Entry (new, like web)
- **Category selection**: Hose, Fitting, Adaptor, Ferrule, Valve, Coupling, Lainnya
- **Dynamic fields per category** (mirroring web):
  - Hose → Standard, Wire Type, Size Inch/DN, Pressure, Cut Piece
  - Fitting/Adaptor → Thread Type, Thread Size, Seal Type, Configuration
- **Brand picker** (dropdown + manual input toggle, like web)
- **Expanded request model** mapping to backend `BatchInbound` schema
- **YouTube dark theme** styling

## Proposed Changes

### Model: [MODIFY] [Inventory.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/Inventory.kt)
- Expand `BatchInboundRequest` to include all backend fields: `brand`, `standard`, `size_inch`, `size_dn`, `wire_type`, `working_pressure_bar`, `working_pressure_psi`, `category`, `thread_type`, `thread_size`, `seal_type`, `configuration`, `is_cut_piece`, `cut_length_cm`, `notes`, `source_type`, `barcode` (client-generated).

### Screen: [MODIFY] [InboundScreen.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/InboundScreen.kt)
- Add **mode toggle** (Tab Row): "Scan Cepat" vs "Entry Manual"
- **Entry Manual** mode: Full form with sections mirroring web `HoseDataForm`:
  1. **Identitas** — Category chips, brand picker, SKU/part number
  2. **Spesifikasi** — Dynamic: Standard/Wire (Hose), Thread/Seal/Config (Fitting)
  3. **Ukuran** — Size Inch, Size DN dropdowns
  4. **Tekanan** (Hose only) — Working Pressure Bar/PSI, auto-convert
  5. **Kuantitas & Lokasi** — Qty, length (hose), location (scan or manual)
  6. **Catatan** — Notes field
- Apply YouTube dark theme (`YtDarkBackground`, `YtDarkSurface`, etc.)
- Client-side barcode generation (`BATCH-YYYYMMDDHHmmss`)

### API/Repository — No changes needed
Existing `submitBatchInbound` endpoint already accepts the full `BatchInbound` schema; we just need to send more fields.

## Verification Plan

### Automated Build Test
```
cd android-wms-app && .\gradlew :app:assembleDebug --no-daemon
```
