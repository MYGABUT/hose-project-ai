# Android App Phase 10: Delivery Order Dispatching

## 1. Goal Description
Implement the **Delivery Order (Surat Jalan) Dispatching** module in the Android application. This is the final step in the outbound flow: after goods have been picked and packed, the driver/supervisor uses the app to confirm and dispatch shipments.

The backend already supports the full DO lifecycle: `DRAFT → READY_TO_SHIP → SHIPPED → DELIVERED`.

## 2. Proposed Changes

### Data Models (`Network Layer`)
- Reuse existing `DeliveryOrder` model from Phase 4.
- Add `DOConfirmResponse` and `DODispatchResponse` wrappers.

### API (`ApiService.kt`)
- Add `POST /do/{do_id}/confirm` (Confirm DO → Ready to Ship).
- Add `POST /do/{do_id}/dispatch` (Mark as Shipped / dispatched).

### ViewModel (`OutboundViewModel.kt`)
- Add `confirmDO(doId)` and `dispatchDO(doId)` actions.
- Extend `loadDOs()` to support filtering by multiple statuses (DRAFT, READY_TO_SHIP, SHIPPED).

### User Interface (`Presentation Layer`)
- **Update `OutboundMenuScreen`**: Add tab/filter chips for status (Semua, Draft, Siap Kirim, Terkirim).
- Show action buttons on each DO card:
  - DRAFT: "Konfirmasi" button.
  - READY_TO_SHIP: "Dispatch / Kirim" button.
  - SHIPPED: Info badge only (already dispatched).

## 3. Verification Plan
- Run `./gradlew :app:assembleDebug`.
