# Android Full Feature Parity — Phased Plan

## Gap Analysis

### ✅ Sudah Ada di Android (18 Screen)
| Modul | Screen | Status |
|-------|--------|--------|
| Auth | Login, Terms | ✅ |
| Home | HomeScreen | ✅ |
| Inbound | InboundScreen (Scan + Manual) | ✅ |
| Outbound | OutboundMenuScreen, OutboundPickingScreen | ✅ |
| Inquiry | InquiryScreen (Detail + Galeri) | ✅ |
| Transfer | TransferMenu, Ship, Receive | ✅ |
| Production | ProductionMenu, WizardScreen | ✅ |
| QC | QCMenu, QCInspect | ✅ |
| Opname | OpnameMenu, OpnameSession, ContinuousScanner | ✅ |

### ❌ Belum Ada di Android (Web punya, Android belum)
| Web Module | Pages | Prioritas Mobile |
|------------|-------|-------------------|
| **Dashboard** | Dashboard, Operational, Executive, InventoryControl | ⭐⭐⭐ Tinggi |
| **Inventory** | Inventory list, StockCard, RackMap, ProductLoan, StockBooking, ProductImport | ⭐⭐⭐ Tinggi |
| **Sales** | SalesOrders, SODetail, QuotationBuilder, CustomerList | ⭐⭐ Sedang |
| **Purchasing** | PurchaseOrders, PODetail, ReceivingPage | ⭐⭐ Sedang |
| **Finance** | InvoiceList, GeneralLedger, CashFlow, Aging, PettyCash, Giro | ⭐ Rendah |
| **Admin** | UserManagement, AccessManagement, AuditTrail, PriceManagement | ⭐ Rendah |
| **Analytics** | AnalyticsDashboard, TraceabilityView | ⭐⭐ Sedang |
| **RMA** | Return/Claim tracking | ⭐⭐ Sedang |
| **Predictive** | AssetHealth, AssetRegistration | ⭐ Rendah |
| **Project** | ProjectDashboard, ProjectDetail | ⭐ Rendah |
| **Settings** | Company settings, Notifications | ⭐ Rendah |

---

## Implementasi Bertahap (Batch)

### Batch A — Operasional Gudang (Prioritas Tertinggi)
> Fitur yang paling dibutuhkan operator gudang setiap hari

#### A1. Dashboard Screen
- Summary widget: total stok, nilai, inbound hari ini, outbound hari ini
- Chart sederhana (bar/pie) untuk distribusi stok per lokasi
- Quick shortcuts ke modul utama
- Backend: `GET /api/v1/dashboard/summary`

#### A2. Inventory Browser Screen
- List semua batch aktif (search, filter brand/kategori/lokasi)
- Stock Card view (history per batch)
- Barcode scanner untuk cepat cari batch
- Backend: `GET /api/v1/batches`, `GET /api/v1/batches/{barcode}/movements`

#### A3. Rack Map Screen  
- Visual grid rak gudang (mirip web WarehouseMap)
- Tap rak → lihat isi batch
- Backend: `GET /api/v1/locations`

#### A4. Putaway Wizard Screen
- Setelah inbound, wizard untuk assign lokasi rak
- Scan barcode batch → pilih lokasi → konfirmasi
- Backend: `POST /api/v1/batches/{barcode}/transfer`

---

### Batch B — Sales & Purchasing
> Fitur order management yang sering di-cek warehouse staff

#### B1. Sales Order List Screen
- List SO (filter status: Draft/Confirmed/Completed)
- Detail SO: customer, items, qty
- Backend: `GET /api/v1/so`, `GET /api/v1/so/{id}`

#### B2. Purchase Order List Screen
- List PO (filter status)
- Detail PO: supplier, items, qty
- Backend: `GET /api/v1/po`, `GET /api/v1/po/{id}`

#### B3. Receiving Screen (PO Receive)
- Terima barang dari PO → scan & verify
- Backend: `POST /api/v1/po/{id}/receive`

---

### Batch C — Finance & Reporting (View Only)
> Readonly monitoring, karena input finance lebih cocok di desktop

#### C1. Invoice List Screen
- List invoice (filter status: Unpaid/Paid/Overdue)
- Detail invoice: items, total, due date
- Backend: `GET /api/v1/invoices`

#### C2. Simple Analytics Screen
- Stok trend chart (7 hari)
- Top products by movement
- Backend: `GET /api/v1/analytics/summary`

#### C3. RMA Screen
- List return/claim tickets
- Update status claim
- Backend: `GET /api/v1/rma`, `POST /api/v1/rma`

---

### Batch D — Admin & Settings (Minimal)

#### D1. Profile & Settings Screen
- View/edit profil user sendiri
- Ganti password
- Lihat versi app/server info

#### D2. Notification Center
- List notifikasi (stok rendah, PO overdue, dll)
- Backend: via existing endpoints

---

## Proposed Changes — Batch A (akan dikerjakan sekarang)

### [NEW] Model files
#### [NEW] [Dashboard.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/Dashboard.kt)
- `DashboardSummary`: totalBatches, totalProducts, lowStockCount, todayInbound, todayOutbound

#### [NEW] [Location.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/data/model/Location.kt)
- `Location`: id, code, zone, type, capacity, currentLoad

### [NEW] Screen files
#### [NEW] [DashboardScreen.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/DashboardScreen.kt)
- Summary cards (4 KPI cards)
- Quick action buttons
- Recent activity list

#### [NEW] [InventoryBrowserScreen.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/InventoryBrowserScreen.kt)
- Search/filter/sort batches list
- Batch detail bottom sheet
- Barcode scanner shortcut

#### [NEW] [RackMapScreen.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/RackMapScreen.kt)
- Grid visual rak per zona
- Tap-to-inspect rak contents

#### [NEW] [PutawayScreen.kt](file:///c:/Users/micha/kapanlulusoi/android-wms-app/app/src/main/java/com/example/wmsenterprisescanner/ui/screens/PutawayScreen.kt)
- Step-by-step putaway wizard (scan batch → pick location → confirm)

### [MODIFY] ApiService.kt
- Add endpoints: `GET dashboard/summary`, `GET batches` (with filters), `GET locations`

### [MODIFY] MainActivity.kt
- Add navigation routes for 4 new screens
- Add HomeScreen links to new screens

### [NEW] ViewModel files
#### [NEW] DashboardViewModel.kt, InventoryBrowserViewModel.kt

## Verification Plan

### Automated Build Test
```
cd android-wms-app && .\gradlew :app:assembleDebug --no-daemon
```

### Manual Verification
- Install APK → verify new screens accessible from Home
- Check Dashboard shows data (or graceful empty state)
- Test Inventory browser search and filter
- Test barcode scan from Inventory browser
