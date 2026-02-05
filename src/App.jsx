import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessRequestProvider } from './contexts/AccessRequestContext';
import { UserProvider } from './contexts/UserContext';
import { ProductProvider } from './contexts/ProductContext';
import { AnalyticsProvider } from './contexts/AnalyticsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout/MainLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Production from './pages/Production/Production';
import CreateJobOrder from './pages/Production/CreateJobOrder';
import CrimpingExecution from './pages/Production/CrimpingExecution';
import BOMDetail from './pages/Production/BOMDetail';
import KioskMode from './pages/Production/KioskMode';
import SalesOrders from './pages/Production/SalesOrders';
import CuttingWizard from './pages/Production/CuttingWizard';
import JobOrders from './pages/Production/JobOrders';
import JOProfitability from './pages/Production/JOProfitability';
import Inventory from './pages/Inventory/Inventory';
import StockOpname from './pages/Inventory/StockOpname';
import RackMap from './pages/Inventory/RackMap';
import RackManager from './pages/Inventory/RackManager';
import InventoryDashboard from './pages/Inventory/InventoryDashboard';
import StockCard from './pages/Inventory/StockCard';
import Inbound from './pages/Inbound/Inbound';
import PutawayWizard from './pages/Inbound/PutawayWizard';
import QuotationList from './pages/Sales/QuotationList';
import CreateQuotation from './pages/Sales/CreateQuotation';
import SwapTransaction from './pages/Sales/SwapTransaction';

import InstantAssembly from './pages/Production/InstantAssembly';
import InventoryControlTower from './pages/Inventory/InventoryControlTower';
import PriceManagement from './pages/Admin/PriceManagement';
import SpreadsheetPriceEditor from './pages/Admin/SpreadsheetPriceEditor';
import AccessManagement from './pages/Admin/AccessManagement';
import UserManagement from './pages/Admin/UserManagement';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AssetHealth from './pages/Predictive/AssetHealth';
import AssetRegistration from './pages/Predictive/AssetRegistration';
import RMAManagement from './pages/RMA/RMAManagement';
import VendorScorecard from './pages/Vendor/VendorScorecard';
import MasterProduk from './pages/Products/MasterProduk';
import StokFitting from './pages/Fittings/StokFitting';
import QualityControl from './pages/QC/QualityControl';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';
import TraceabilityView from './pages/Analytics/TraceabilityView';
import AccessRequestModal from './components/features/AccessRequest/AccessRequestModal';
import AccessApprovalModal from './components/features/AccessRequest/AccessApprovalModal';
import ExpiryWarningModal from './components/features/AccessRequest/ExpiryWarningModal';
import SessionRecapModal from './components/features/AccessRequest/SessionRecapModal';
import {
  DispatchPage
} from './pages/Placeholders';
import DeliveryOrders from './pages/Outbound/DeliveryOrders';
import CreateDelivery from './pages/Outbound/CreateDelivery';
import Settings from './pages/Settings/Settings';
import HutangDashboard from './pages/Finance/HutangDashboard';
import PurchaseRequests from './pages/Purchasing/PurchaseRequests';
import ApprovalInbox from './pages/Purchasing/ApprovalInbox';
import AgingSchedule from './pages/Finance/AgingSchedule';
import InvoiceList from './pages/Finance/InvoiceList';
import CashFlowDashboard from './pages/Finance/CashFlowDashboard';
import ERPDashboard from './pages/ERP/ERPDashboard';
import AuditTrail from './pages/Admin/AuditTrail';
import FixedAssets from './pages/Admin/FixedAssets';
import OpeningBalancePage from './pages/Admin/OpeningBalancePage';
import WarehouseTransfer from './pages/Admin/WarehouseTransfer';
import ProjectDashboard from './pages/Project/ProjectDashboard';
import ProjectDetail from './pages/Project/ProjectDetail';
import GiroDashboard from './pages/Finance/GiroDashboard';
import PettyCashPage from './pages/Finance/PettyCashPage';
import SalesmanPerformance from './pages/Sales/SalesmanPerformance';
import QCPage from './pages/Sales/QCPage';
import DeliveryPage from './pages/Sales/DeliveryPage';

import TaxReportPage from './pages/Report/TaxReportPage';
import ProductLoanPage from './pages/Inventory/ProductLoanPage';
import StockBookingPage from './pages/Inventory/StockBookingPage';
import AntiInspect from './utils/antiInspect';
import SecurityIndicator from './components/features/Security/SecurityIndicator';


function App() {
  // Set to false during development, true for production
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
                    <Routes>
                      {/* Login - Public Route */}
                      <Route path="/login" element={<Login />} />

                      {/* Protected Routes */}
                      <Route path="/" element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }>
                        {/* Dashboard */}
                        <Route index element={<Dashboard />} />

                        {/* Inbound with Scanner */}
                        <Route path="inbound" element={<Inbound />} />
                        <Route path="inbound/putaway" element={<PutawayWizard />} />

                        {/* ERP */}
                        <Route path="erp" element={<ERPDashboard />} />

                        {/* Production */}
                        <Route path="production" element={<JobOrders />} />
                        <Route path="production/new" element={<CreateJobOrder />} />
                        <Route path="production/bom/:jobId" element={<BOMDetail />} />
                        <Route path="production/crimping/:jobId" element={<CrimpingExecution />} />

                        {/* WMS Production - Sales & Job Orders */}
                        <Route path="production/sales-orders" element={<SalesOrders />} />
                        <Route path="production/new-order" element={<CreateJobOrder />} />
                        <Route path="production/job-orders" element={<JobOrders />} />
                        <Route path="production/profitability" element={<JOProfitability />} />
                        <Route path="production/profitability" element={<JOProfitability />} />
                        <Route path="production/wizard/:joId" element={<CuttingWizard />} />
                        <Route path="production/instant-assembly" element={<InstantAssembly />} />

                        {/* Sales & Quotation */}
                        <Route path="sales" element={<QuotationList />} />
                        <Route path="sales/quotation/new" element={<CreateQuotation />} />
                        <Route path="sales/swap" element={<SwapTransaction />} />
                        <Route path="sales/qc" element={<QCPage />} />
                        <Route path="sales/delivery" element={<DeliveryPage />} />

                        {/* Quality Control (Legacy) - Keeping for reference if needed, or remove */}
                        <Route path="qc" element={<QualityControl />} />

                        {/* Quality Control */}
                        <Route path="qc" element={<QualityControl />} />

                        {/* Outbound / Dispatch */}
                        <Route path="dispatch" element={<DeliveryOrders />} />
                        <Route path="outbound" element={<DeliveryOrders />} />
                        <Route path="outbound/create" element={<CreateDelivery />} />

                        {/* Inventory */}
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="inventory/control-tower" element={<InventoryControlTower />} />
                        <Route path="inventory/dashboard" element={<InventoryDashboard />} />
                        <Route path="inventory/stock-card" element={<StockCard />} />
                        <Route path="inventory/opname" element={<StockOpname />} />
                        <Route path="inventory/detail/:itemId" element={<Inventory />} />
                        <Route path="inventory/map" element={<RackMap />} />
                        <Route path="inventory/racks" element={<RackManager />} />
                        <Route path="inventory/loans" element={<ProductLoanPage />} />
                        <Route path="inventory/bookings" element={<StockBookingPage />} />
                        <Route path="fittings" element={<StokFitting />} />
                        <Route path="products" element={<MasterProduk />} />

                        {/* Finance */}
                        <Route path="finance/hutang" element={<HutangDashboard />} />
                        <Route path="finance/aging" element={<AgingSchedule />} />
                        <Route path="finance/invoices" element={<InvoiceList />} />
                        <Route path="finance/cash-flow" element={<CashFlowDashboard />} />
                        <Route path="finance/giro" element={<GiroDashboard />} />
                        <Route path="finance/petty-cash" element={<PettyCashPage />} />
                        <Route path="finance/tax-report" element={<TaxReportPage />} />

                        {/* Sales */}
                        <Route path="sales/performance" element={<SalesmanPerformance />} />

                        {/* Purchasing */}
                        <Route path="purchasing/pr" element={<PurchaseRequests />} />
                        <Route path="purchasing/approval" element={<ApprovalInbox />} />

                        {/* Admin */}
                        <Route path="admin/prices" element={<PriceManagement />} />
                        <Route path="admin/prices/edit" element={<SpreadsheetPriceEditor />} />
                        <Route path="admin/access" element={<AccessManagement />} />
                        <Route path="admin/users" element={<UserManagement />} />
                        <Route path="admin/audit" element={<AuditTrail />} />
                        <Route path="admin/assets" element={<FixedAssets />} />
                        <Route path="admin/transfers" element={<WarehouseTransfer />} />

                        {/* Manager */}
                        <Route path="manager" element={<ManagerDashboard />} />

                        {/* Projects & Service */}
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

                      {/* Kiosk Mode - Fullscreen without layout */}
                      <Route path="production/kiosk/:jobId" element={
                        <ProtectedRoute>
                          <KioskMode />
                        </ProtectedRoute>
                      } />
                    </Routes>

                    {/* Global PAM Modals */}
                    <AccessRequestModal />
                    <AccessApprovalModal />
                    <ExpiryWarningModal />
                    <SessionRecapModal />

                    {/* Security Indicator */}
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



