import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AccessRequestProvider } from './contexts/AccessRequestContext';
import { UserProvider } from './contexts/UserContext';
import { ProductProvider } from './contexts/ProductContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout/MainLayout';
import AntiInspect from './utils/antiInspect';

// ============ Non-lazy (critical path) ============
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';

// ============ Global modals & indicators (always mounted) ============
import AccessRequestModal from './components/features/AccessRequest/AccessRequestModal';
import AccessApprovalModal from './components/features/AccessRequest/AccessApprovalModal';
import ExpiryWarningModal from './components/features/AccessRequest/ExpiryWarningModal';
import SessionRecapModal from './components/features/AccessRequest/SessionRecapModal';
import SecurityIndicator from './components/features/Security/SecurityIndicator';

// ============ Lazy-loaded pages — Inbound ============
const Inbound = lazy(() => import('./pages/Inbound/Inbound'));
const InboundScan = lazy(() => import('./pages/Inbound/InboundScan'));
const PutawayWizard = lazy(() => import('./pages/Inbound/PutawayWizard'));

// ============ Lazy-loaded pages — Production ============
const JobOrders = lazy(() => import('./pages/Production/JobOrders'));
const CreateJobOrder = lazy(() => import('./pages/Production/CreateJobOrder'));
const BOMDetail = lazy(() => import('./pages/Production/BOMDetail'));
const CrimpingExecution = lazy(() => import('./pages/Production/CrimpingExecution'));
const SalesOrders = lazy(() => import('./pages/Production/SalesOrders'));
const CuttingWizard = lazy(() => import('./pages/Production/CuttingWizard'));
const JOProfitability = lazy(() => import('./pages/Production/JOProfitability'));
const KioskMode = lazy(() => import('./pages/Production/KioskMode'));
const InstantAssembly = lazy(() => import('./pages/Production/InstantAssembly'));
const BlanketOrderPage = lazy(() => import('./pages/Production/BlanketOrderPage'));

// ============ Lazy-loaded pages — Inventory ============
const Inventory = lazy(() => import('./pages/Inventory/Inventory'));
const StockOpname = lazy(() => import('./pages/Inventory/StockOpname'));
const WarehouseMap = lazy(() => import('./pages/Inventory/WarehouseMap'));
const RackManager = lazy(() => import('./pages/Inventory/RackManager'));
const StockCard = lazy(() => import('./pages/Inventory/StockCard'));
const InventoryControlTower = lazy(() => import('./pages/Inventory/InventoryControlTower'));
const ProductImportPage = lazy(() => import('./pages/Inventory/ProductImportPage'));
const ProductLoanPage = lazy(() => import('./pages/Inventory/ProductLoanPage'));
const InterCompanyLoanPage = lazy(() => import('./pages/Inventory/InterCompanyLoanPage'));
const StockBookingPage = lazy(() => import('./pages/Inventory/StockBookingPage'));
const OpnameVarianceReport = lazy(() => import('./pages/Inventory/OpnameVarianceReport'));

// ============ Lazy-loaded pages — Sales & CRM ============
const QuotationList = lazy(() => import('./pages/Sales/QuotationList'));
const CreateQuotation = lazy(() => import('./pages/Sales/CreateQuotation'));
const SwapTransaction = lazy(() => import('./pages/Sales/SwapTransaction'));
const SalesmanPerformance = lazy(() => import('./pages/Sales/SalesmanPerformance'));
const QCPage = lazy(() => import('./pages/Sales/QCPage'));
const DeliveryPage = lazy(() => import('./pages/Sales/DeliveryPage'));
const SalesImportPage = lazy(() => import('./pages/Sales/SalesImportPage'));
const CustomerManagement = lazy(() => import('./pages/Sales/CustomerManagement'));
const CRMKanban = lazy(() => import('./pages/Sales/CRMKanban'));

// ============ Lazy-loaded pages — Outbound ============
const DeliveryOrders = lazy(() => import('./pages/Outbound/DeliveryOrders'));
const CreateDelivery = lazy(() => import('./pages/Outbound/CreateDelivery'));

// ============ Lazy-loaded pages — Purchasing ============
const PurchaseRequests = lazy(() => import('./pages/Purchasing/PurchaseRequests'));
const SuggestedPO = lazy(() => import('./pages/Purchasing/SuggestedPO'));
const ApprovalInbox = lazy(() => import('./pages/Purchasing/ApprovalInbox'));
const Suppliers = lazy(() => import('./pages/Purchasing/Suppliers'));

// ============ Lazy-loaded pages — Finance ============
const HutangDashboard = lazy(() => import('./pages/Finance/HutangDashboard'));
const GeneralLedger = lazy(() => import('./pages/Finance/GeneralLedger'));
const AgingSchedule = lazy(() => import('./pages/Finance/AgingSchedule'));
const InvoiceList = lazy(() => import('./pages/Finance/InvoiceList'));
const InvoiceIngestion = lazy(() => import('./pages/Finance/InvoiceIngestion'));
const CashFlowDashboard = lazy(() => import('./pages/Finance/CashFlowDashboard'));
const GiroDashboard = lazy(() => import('./pages/Finance/GiroDashboard'));
const PettyCashPage = lazy(() => import('./pages/Finance/PettyCashPage'));
const TaxReportPage = lazy(() => import('./pages/Report/TaxReportPage'));

// ============ Lazy-loaded pages — Admin ============
const PriceManagement = lazy(() => import('./pages/Admin/PriceManagement'));
const SpreadsheetPriceEditor = lazy(() => import('./pages/Admin/SpreadsheetPriceEditor'));
const AccessManagement = lazy(() => import('./pages/Admin/AccessManagement'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const AuditTrail = lazy(() => import('./pages/Admin/AuditTrail'));
const FixedAssets = lazy(() => import('./pages/Admin/FixedAssets'));
const OpeningBalancePage = lazy(() => import('./pages/Admin/OpeningBalancePage'));
const WarehouseTransfer = lazy(() => import('./pages/Admin/WarehouseTransfer'));

// ============ Lazy-loaded pages — Other ============
const ERPDashboard = lazy(() => import('./pages/ERP/ERPDashboard'));
const ManagerDashboard = lazy(() => import('./pages/Manager/ManagerDashboard'));
const AssetHealth = lazy(() => import('./pages/Predictive/AssetHealth'));
const AssetRegistration = lazy(() => import('./pages/Predictive/AssetRegistration'));
const RMAManagement = lazy(() => import('./pages/RMA/RMAManagement'));
const VendorScorecard = lazy(() => import('./pages/Vendor/VendorScorecard'));
const MasterProduk = lazy(() => import('./pages/Products/MasterProduk'));
const StokFitting = lazy(() => import('./pages/Fittings/StokFitting'));
const QualityControl = lazy(() => import('./pages/QC/QualityControl'));
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'));
const TraceabilityView = lazy(() => import('./pages/Analytics/TraceabilityView'));
const ProjectDashboard = lazy(() => import('./pages/Project/ProjectDashboard'));
const ProjectDetail = lazy(() => import('./pages/Project/ProjectDetail'));
const Settings = lazy(() => import('./pages/Settings/Settings'));


// ============ Loading Fallback ============
const PageLoader = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', background: '#0f0f0f', color: '#fff', fontSize: '14px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #333', borderTop: '3px solid #ff0000',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
      }} />
      Memuat halaman...
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);


function App() {
  const isProduction = false;

  return (
    <AntiInspect enabled={isProduction}>
      <AuthProvider>
        <UserProvider>
          <ProductProvider>
            <AnalyticsProvider>
              <AccessRequestProvider>
                <NotificationProvider>
                  <Router>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Public */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected — MainLayout wrapper */}
                        <Route path="/" element={
                          <ProtectedRoute><MainLayout /></ProtectedRoute>
                        }>
                          {/* Dashboard */}
                          <Route index element={<Dashboard />} />

                          {/* Inbound */}
                          <Route path="inbound" element={<Inbound />} />
                          <Route path="inbound/scan" element={<InboundScan />} />
                          <Route path="inbound/putaway" element={<PutawayWizard />} />

                          {/* ERP */}
                          <Route path="erp" element={<ERPDashboard />} />

                          {/* Production */}
                          <Route path="production" element={<JobOrders />} />
                          <Route path="production/new" element={<CreateJobOrder />} />
                          <Route path="production/bom/:jobId" element={<BOMDetail />} />
                          <Route path="production/crimping/:jobId" element={<CrimpingExecution />} />
                          <Route path="production/sales-orders" element={<SalesOrders />} />
                          <Route path="production/new-order" element={<CreateJobOrder />} />
                          <Route path="production/job-orders" element={<JobOrders />} />
                          <Route path="production/profitability" element={<JOProfitability />} />
                          <Route path="production/wizard/:joId" element={<CuttingWizard />} />
                          <Route path="production/instant-assembly" element={<InstantAssembly />} />
                          <Route path="production/blanket-orders" element={<BlanketOrderPage />} />

                          {/* Sales & CRM */}
                          <Route path="sales" element={<QuotationList />} />
                          <Route path="sales/quotation/new" element={<CreateQuotation />} />
                          <Route path="sales/swap" element={<SwapTransaction />} />
                          <Route path="sales/qc" element={<QCPage />} />
                          <Route path="sales/delivery" element={<DeliveryPage />} />
                          <Route path="sales/import" element={<SalesImportPage />} />
                          <Route path="sales/customers" element={<CustomerManagement />} />
                          <Route path="sales/crm" element={<CRMKanban />} />
                          <Route path="sales/performance" element={<SalesmanPerformance />} />

                          {/* Quality Control */}
                          <Route path="qc" element={<QualityControl />} />

                          {/* Outbound / Dispatch */}
                          <Route path="outbound" element={<DeliveryOrders />} />
                          <Route path="outbound/create" element={<CreateDelivery />} />
                          <Route path="dispatch" element={<DeliveryOrders />} />

                          {/* Inventory */}
                          <Route path="inventory" element={<Inventory />} />
                          <Route path="inventory/import" element={<ProductImportPage />} />
                          <Route path="inventory/control-tower" element={<InventoryControlTower />} />
                          <Route path="inventory/stock-card" element={<StockCard />} />
                          <Route path="inventory/opname" element={<StockOpname />} />
                          <Route path="inventory/opname-report/:id" element={<OpnameVarianceReport />} />
                          <Route path="inventory/detail/:itemId" element={<Inventory />} />
                          <Route path="inventory/map" element={<WarehouseMap />} />
                          <Route path="inventory/racks" element={<RackManager />} />
                          <Route path="inventory/loans" element={<ProductLoanPage />} />
                          <Route path="inventory/inter-company-loans" element={<InterCompanyLoanPage />} />
                          <Route path="inventory/bookings" element={<StockBookingPage />} />
                          <Route path="fittings" element={<StokFitting />} />
                          <Route path="products" element={<MasterProduk />} />

                          {/* Finance */}
                          <Route path="finance/hutang" element={<HutangDashboard />} />
                          <Route path="finance/general-ledger" element={<GeneralLedger />} />
                          <Route path="finance/aging" element={<AgingSchedule />} />
                          <Route path="finance/invoices" element={<InvoiceList />} />
                          <Route path="finance/ingestion" element={<InvoiceIngestion />} />
                          <Route path="finance/cash-flow" element={<CashFlowDashboard />} />
                          <Route path="finance/giro" element={<GiroDashboard />} />
                          <Route path="finance/petty-cash" element={<PettyCashPage />} />
                          <Route path="finance/tax-report" element={<TaxReportPage />} />

                          {/* Purchasing */}
                          <Route path="purchasing/pr" element={<PurchaseRequests />} />
                          <Route path="purchasing/suggestions" element={<SuggestedPO />} />
                          <Route path="purchasing/approval" element={<ApprovalInbox />} />
                          <Route path="purchasing/suppliers" element={<Suppliers />} />

                          {/* Admin */}
                          <Route path="admin/prices" element={<PriceManagement />} />
                          <Route path="admin/prices/edit" element={<SpreadsheetPriceEditor />} />
                          <Route path="admin/access" element={<AccessManagement />} />
                          <Route path="admin/users" element={<UserManagement />} />
                          <Route path="admin/audit" element={<AuditTrail />} />
                          <Route path="admin/assets" element={<FixedAssets />} />
                          <Route path="admin/opening-balance" element={<OpeningBalancePage />} />
                          <Route path="admin/transfers" element={<WarehouseTransfer />} />

                          {/* Manager */}
                          <Route path="manager" element={<ManagerDashboard />} />

                          {/* Projects */}
                          <Route path="projects" element={<ProjectDashboard />} />
                          <Route path="project/:id" element={<ProjectDetail />} />

                          {/* Predictive Maintenance */}
                          <Route path="predictive" element={<AssetHealth />} />
                          <Route path="predictive/new" element={<AssetRegistration />} />

                          {/* RMA & Vendor */}
                          <Route path="rma" element={<RMAManagement />} />
                          <Route path="vendor-scorecard" element={<VendorScorecard />} />

                          {/* Analytics */}
                          <Route path="analytics" element={<AnalyticsDashboard />} />
                          <Route path="analytics/traceability" element={<TraceabilityView />} />
                          <Route path="analytics/traceability/:soId" element={<TraceabilityView />} />

                          {/* Settings */}
                          <Route path="settings" element={<Settings />} />
                        </Route>

                        {/* Kiosk Mode — fullscreen, no layout */}
                        <Route path="production/kiosk/:jobId" element={
                          <ProtectedRoute><KioskMode /></ProtectedRoute>
                        } />
                      </Routes>
                    </Suspense>

                    {/* Global PAM Modals */}
                    <AccessRequestModal />
                    <AccessApprovalModal />
                    <ExpiryWarningModal />
                    <SessionRecapModal />
                    <SecurityIndicator />
                  </Router>
                </NotificationProvider>
              </AccessRequestProvider>
            </AnalyticsProvider>
          </ProductProvider>
        </UserProvider>
      </AuthProvider>
    </AntiInspect>
  );
}

export default App;
