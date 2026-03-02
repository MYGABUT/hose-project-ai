# Phase 6: Enterprise Traceability - SAP-Style Visual Relationship Map

## 6.1: Component Development
- [x] Create `RelationshipMapModal.jsx` or a dedicated view in `src/components/features/`.
- [x] Implement a node-based visual graph (using `react-flow-renderer` or custom CSS Flexbox trees) to display the document lineage.

## 6.2: Data Flow Mapping (Backend)
- [x] Ensure the backend can aggregate the lineage for a given Sales Order (SO): `Quotation -> Sales Order -> Delivery Order (DO) -> Surat Jalan / FPP -> Invoice -> Payment`.
- [x] Create a consolidated endpoint `/api/v1/traceability/document-flow/{entity_type}/{entity_id}` to fetch this graph structure.

## 6.3: UI Integration
- [x] Add a "🌐 Relationship Map" action button on the Sales Orders, Delivery Orders, and Invoice detail cards.
- [x] When clicked, render the visual tree showing the current document's exact position in the transaction lifecycle.

## 6.4: Verification
- [x] Test the backend routing to ensure correct lineage is mapped without missing links.
- [x] Verify the UI renders the visual map smoothly and responsively.

---

# Phase 7: Dynamic Order Entry & Batch Tracking Foundation

## 7.1: Frontend - Dynamic Sales Entry (Retail vs Assembly)
- [x] Modify `InlineDataGrid.jsx` to include a "Tipe" toggle (Assembly / Retail).
- [x] If Retail: Disable/Hide Fitting A, Fitting B, and Cut Length columns to speed up entry for items like Adaptors and Oils.
- [x] Update JSON payload builder in `CreateJobOrder.jsx` to handle these mixed row types seamlessly.

## 7.2: Backend - Batch Tracking Foundation
- [x] Add `batch_number` and `serial_number` fields to `InventoryBatch` SQLAlchemy model.
- [x] Ensure `InventoryTransaction` explicitly logs the movement of these batches to ensure full traceability.
- [x] Update inbound endpoints (Receiving) to record these fields when goods enter the warehouse.

## 7.3: Verification
- [x] Ensure validation logic drops assembly checks for retail rows.
- [x] Test End-to-End inbound receiving with explicit Batch Numbers and verify stock cards record it.

---

# Phase 8: Core Financials (General Ledger)

## 8.1: Backend - Journal API
- [x] Create `journals.py` endpoint in `/api/v1/endpoints/`.
- [x] Implement `GET /api/v1/journals` to list general ledger entries.
- [x] Implement `GET /api/v1/journals/coa` to return the Chart of Accounts.
- [x] Implement `GET /api/v1/journals/balance-sheet` to calculate real-time asset/liability balances.
- [x] Register the new router in the main API hub.

## 8.2: Frontend - General Ledger Dashboard
- [x] Create `GeneralLedger.jsx` in `src/pages/Finance/`.
- [x] Build a data grid to display `JournalEntry` records with expandable Debit/Credit splits.
- [x] Add a summary header showing Net Income and Total Assets.
- [x] Update `Sidebar.jsx` and `App.jsx` to route `/finance/general-ledger`.

## 8.3: Verification
- [x] Test the backend routing to ensure the GL equations balance (Debits = Credits).
- [x] Verify the UI component renders cleanly within the ERP framework.

---

# Phase 9: CRM Kanban, Order Cancellation & Print Flows

## 9.1: Fix Stock Opname
- [x] Update `opname.py` (`finalize_opname`) to adjust `InventoryBatch.current_qty`.
- [x] Create `InventoryTransaction` records for variance (Adjustment IN/OUT).

## 9.2: Implement CRM Lead Kanban
- [x] Create `CRMLead` backend model and API router (`crm.py`).
- [x] Build `CRMKanban.jsx` frontend page with draggable/clickable Kanban columns.
- [x] Wire CRM Kanban to the Sidebar.

## 9.3: Order Cancellation
- [x] Add `cancel` endpoint for Sales Orders (and cascade to Job Orders).
- [x] Update `SalesOrders.jsx` UI to include a "Cancel" action button.

## 9.4: Physical Print Capabilities
- [x] Add `@media print` CSS utility classes.
- [x] Add "Print" buttons across all transactional documents (SO, JO, DO, Invoices).

---

# Phase 10: Hydraulink Integration & Manual Operations

## 10.1: Internet Research & Data Model (Hydraulink)
- [x] Research Hydraulink product categories (Hoses, Adaptors, Ferrules, Valves, Couplings).
- [ ] Determine best way to seed or provide these options in the UI drop-downs.

## 10.2: Manual Inbound Entry (Goods Receipt)
- [x] Update `Inbound.jsx` (or related Inbound forms) to support a "Manual Entry" mode.
- [x] Populate the manual entry categorization with specific Hydraulink items (e.g., Braided Hose, Multi-spiral Hose, 90-deg Adaptors, Ferrules).

## 10.3: Manual Stock Opname for All Items
- [x] Update `StockOpname.jsx` or `StockCard.jsx` to allow a "Manual Option" for opname across all inventory items, not just specific filtered ones.
- [x] Ensure backend `/api/v1/opname` endpoints support this manual, broad submission.

---

# Phase 11: Visual Warehouse Map & Batch-Level Inventory Logs

## 11.1: Backend - Batch Level Item Details API
- [ ] Create or update an endpoint `/api/v1/inventory/batches/{sku}` to retrieve all individual batches/barcodes associated with a specific item.
- [ ] Ensure this endpoint returns the barcode, initial qty, current qty, location, and the `created_at` timestamp (when it was inputted).

## 11.2: Frontend - Batch Log UI (Detail Isi)
- [x] Update `StockCard.jsx` (or create a new Modal) to show the "Detail Isi" when a user clicks on an aggregated inventory item.
- [x] Display a chronological table of all inputted batches for that item.

## 11.3: Frontend - Interactive Warehouse Map (Peta Rak)
- [x] Create `WarehouseMap.jsx` as a new component or Page.
- [x] Build a CSS Grid representing the warehouse layout (`WH1-HOSE-A01`, etc.).
- [x] Allow clicking a location to see what items are stored there, OR clicking an item in the inventory to highlight its location on the map.

## 11.4: Verification
- [x] Ensure the warehouse map accurately reflects locations pulled from the DB.
- [x] Verify the batch log correctly shows the exact barcode and inputted date for every component.

---

# Phase 12: Opname Verification Tracking

## 12.1: Backend - DB Model
- [x] Update `InventoryBatch` model to include `is_opnamed` (boolean) and `last_opname_date` (datetime).
- [x] Add `is_opnamed` to `to_dict()` output.

## 12.2: Backend - API Logic
- [x] Update `finalize_opname` endpoint to flip `is_opnamed = True` and timestamp it when successfully scanned/reconciled.

## 12.3: Frontend - Detail Isi
- [x] Update `BatchDetailModal.jsx` to include an "Opname" Status column displaying ✅ or ❌.

## 12.4: Frontend - Opname Target Filtration
- [x] Update `StockOpname.jsx` so that the scope of barcodes to scan excludes any where `is_opnamed` is true.

## 12.5: Verification
- [x] Verify an inbound item shows ❌.
- [x] Scan it in opname.
- [x] Verify it disappears from target list and shows ✅ in detail isi.

---

# Phase 13: Auto-create Storage Locations

## 13.1: Backend API Update
- [ ] Modify `receive_batch` in `batches.py`.
- [ ] If location does not exist, auto-create it with `zone='AUTO'` and `type=LocationType.FLOOR`.

## 13.2: Verification
- [x] Send inbound item with new location.
- [x] Verify location is created in DB and item is placed there.

---

# Phase 14: Dynamic Component Specifications

## 14.1: Frontend Forms
- [x] Add `isCutPiece` toggle for Hose category.
- [x] Render Thread Type, Size, Seal, Config fields for non-hose categories.
- [x] Hide Wire Type, Pressure, OD/ID for non-hose categories.

## 14.2: Backend Schema Update
- [x] Add optional `specifications` or dynamic fields to `BatchInbound`.
- [x] Modify `receive_batch` to store these new fields into the `Product.specifications` JSON.

## 14.3: Verification
- [x] Render component and input Adaptor to verify correct labels.

---

# Phase 15: Backend Stock Opname Fix (Verified)
- [x] Modify `backend-hose-ai/app/api/v1/endpoints/opname.py` `finalize_opname` endpoint.
- [x] Implement `InventoryBatch.current_qty` updates based on `actual_qty`.
- [x] Generate `InventoryTransaction` records for adjustments.
- [x] Test the finalize endpoint.

---

# Android App (Native)

## Phase 1: Foundation & Authentication (Completed)
- [x] Setup Project & Gradle Dependencies (Retrofit, CameraX, ML Kit).
- [x] Create Login UI and API Integration.
- [x] Implement ML Kit Barcode Scanner.

## Phase 2: Inbound / Receiving
- [x] Implement `GET /api/v1/products` parsing in Retrofit (`ApiService` + Models).
- [x] Implement `POST /api/v1/batches/inbound` parsing in Retrofit.
- [x] Refactor `ScannerScreen` to be a reusable composable returning a scanned string.
- [x] Create `HomeScreen` Dashboard with navigation to Inbound.
- [x] Create `InboundScreen` UI (Product Search Dropdown, Dynamic Specs Form, QTY, Location Scanner hook).
- [x] Form Validation and API Submit logic.
- [ ] Verify End-to-End inbound submission from the Android app to the Database.

## Phase 3: Architecture Refactor & Stock Opname (Completed)
- [x] Add Dagger Hilt dependencies into `libs.versions.toml` and Gradle scripts.
- [x] Implement `@HiltAndroidApp` Application class and `@AndroidEntryPoint` in UI.
- [x] Create `NetworkModule` and `RepositoryModule` for Dependency Injection.
- [x] Migrate `AuthViewModel` and `InventoryViewModel` to use `@HiltViewModel`.
- [x] Implement `GET /api/v1/opname/current` and `/api/v1/opname/{opname_id}/...` parsing in Retrofit.
- [x] Create `OpnameMenuScreen` UI.
- [x] Refactor `ScannerScreen` to support Continuous Scanning mode.
- [x] Link components in NavHost and verify Hilt DI compilation.

## Phase 4: Outbound / Picking (Completed)
- [x] Modify Backend `complete` endpoint to accept exact `picked_batches`.
- [x] Add Retrofit Endpoints for DO (`GET /do`, `POST /do/{id}/complete`).
- [x] Create `DeliveryOrder` data models.
- [x] Create `OutboundRepository` and `OutboundViewModel`.
- [x] Create `OutboundMenuScreen` (List of DOs).
- [x] Create `OutboundPickingScreen` (Specific DO with scanner integration).
- [x] Create success/error beep sounds for scan feedback.
- [x] Connect routes to NavHost.

## Phase 5: Item Inquiry (Cek Cepat Barang) (Completed)
- [x] Add `location` to `Batch` DTO model.
- [x] Create `InquiryViewModel` to handle barcode lookup state.
- [x] Create `InquiryScreen` (Scanner component + Detail Card).
- [x] Add "Cek Cepat Barang" menu to `HomeScreen`.
- [x] Connect `inquiry` route to NavHost.

## Phase 6: Warehouse Transfer (Mutasi Antar Rak) (Completed)
- [x] Modify Backend `ship` endpoint to accept exact `picked_batches`.
- [x] Add Retrofit Endpoints for Transfer.
- [x] Create Transfer models, `TransferRepository`, and `TransferViewModel`.
- [x] Create `TransferMenuScreen` (List out `APPROVED` and `IN_TRANSIT` transfers).
- [x] Create `TransferShipScreen` (Outbound scanner logic).
- [x] Create `TransferReceiveScreen` (Inbound receiving logic).
- [x] Connect routes to NavHost.

## Phase 7: Production / Assembly Tracking (Completed)
- [x] Create `JobOrder`, `JOLine`, `JOMaterial` models.
- [x] Add Retrofit Endpoints for JO and Wizard tracking in `ApiService`.
- [x] Create `ProductionRepository` and `ProductionViewModel`.
- [x] Create `ProductionMenuScreen` (List of outstanding/assigned JOs).
- [x] Create `ProductionWizardScreen` (Wizard UI with scanning, cutting, and progress submission).
- [x] Connect routes to NavHost.

## Phase 8: Quality Control (QC Inspection) (Completed)
- [x] Backend: Fix `GET /qc/pending` to filter correctly (Done as part of plan).
- [x] Create `QCPendingItem` and `QCInspectionRequest` models.
- [x] Add Retrofit Endpoints for QC in `ApiService`.
- [x] Create `QCRepository` and `QCViewModel`.
- [x] Create `QCMenuScreen` (List items pending inspection).
- [x] Create `QCInspectScreen` (Input passed/failed quantities).
- [x] Connect routes to NavHost.

## Phase 9: Stock Opname Refinement (Completed)
- [x] Extend `Opname.kt` with `OpnameItem` model.
- [x] Add `GET /opname/{id}/items` and `POST /opname/{id}/mark-missing` to `ApiService`.
- [x] Update `OpnameRepository` with `getOpnameItems` and `markItemMissing`.
- [x] Rebuild `OpnameViewModel` with items state.
- [x] Rebuild `OpnameSessionScreen` with item list, summary stats, and mark-missing.

## Phase 10: Delivery Order Dispatching (Completed)
- [x] Add `confirmDO` and `dispatchDO` endpoints to `ApiService`.
- [x] Update `OutboundRepository` with confirm/dispatch methods.
- [x] Update `OutboundViewModel` with confirm/dispatch actions and status filtering.
- [x] Rebuild `OutboundMenuScreen` with filter chips and action buttons.

## Phase 11: Enhanced Inbound (Scan + Manual Entry) (Completed)
- [x] Expand `BatchInboundRequest` model with all backend fields.
- [x] Rebuild `InboundScreen` with dual-mode (Quick Scan + Manual Entry).
- [x] Add YouTube dark theme styling.

## Phase 12: Login Fixes & Security (Completed)
- [x] Fix unauthorized error message parsing in `AuthRepository`.
- [x] Add password visibility toggle to `LoginScreen`.
- [x] Make server URL configurable via BuildConfig (debug vs release).
- [x] Add Terms & Conditions screen with scroll-gate + checkbox.

## Phase 13: Feature Parity Batch A — Warehouse Ops (Completed)
- [x] Create `Dashboard.kt` and `Location.kt` models.
- [x] Create `DashboardScreen.kt` with KPI cards and quick actions.
- [x] Create `InventoryBrowserScreen.kt` with batch list, search, and filter.
- [x] Create `RackMapScreen.kt` with visual grid layout.
- [x] Create `PutawayScreen.kt` with scan-and-assign wizard.
- [x] Add API endpoints to `ApiService.kt`.
- [x] Create ViewModels for new screens.
- [x] Wire navigation in `MainActivity.kt` and `HomeScreen.kt`.
- [x] Build and verify.

## Phase 14: Feature Parity Batch B — Sales & Purchasing (Completed)
- [x] Create `SalesOrder.kt` model (SO + PR + Lines).
- [x] Create `SalesOrderScreen.kt` with master-detail, search, filter, pricing.
- [x] Create `PurchaseOrderScreen.kt` with PR list/detail and priority badges.
- [x] Create `SalesViewModel.kt` and `PurchaseViewModel.kt`.
- [x] Add SO/PR API endpoints.
- [x] Wire navigation + SALES chip.
- [x] Build and verify.

## Phase 15: Feature Parity Batch C — Finance & Reporting (Completed)
- [x] Create `Finance.kt` model (Invoice + RMA).
- [x] Create `InvoiceScreen.kt` (summary KPIs, payment filter, invoice list).
- [x] Create `RMAScreen.kt` (status filter, ticket cards).
- [x] Create `InvoiceViewModel.kt` and `RMAViewModel.kt`.
- [x] Add API endpoints and wire navigation + FINANCE chip.
- [x] Build and verify.

## Phase 16: Feature Parity Batch D — Admin & Settings (Completed)
- [x] Create `ProfileScreen.kt` (avatar, app info, module listing).
- [x] Wire notification icon → profile navigation.
- [x] Build and verify.

## Phase 17: Architecture Cleanup — Backend & Web (Completed)
- [x] Refactor `main.py`: consolidate 40+ routers into ROUTER_REGISTRY (527→200 lines).
- [x] Remove duplicate registrations (`assets` x2, `activity_log` x2).
- [x] Clean up `App.jsx`: lazy loading 85+ pages, remove 3 duplicate routes, Suspense.
- [x] Verify: `vite build` exit 0, no errors.
