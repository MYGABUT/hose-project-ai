package com.example.wmsenterprisescanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.wmsenterprisescanner.data.api.ApiClient
import com.example.wmsenterprisescanner.data.repository.AuthRepository
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import com.example.wmsenterprisescanner.ui.screens.HomeScreen
import com.example.wmsenterprisescanner.ui.screens.InboundScreen
import com.example.wmsenterprisescanner.ui.screens.LoginScreen
import com.example.wmsenterprisescanner.ui.screens.ScannerScreen
import com.example.wmsenterprisescanner.ui.screens.OpnameMenuScreen
import com.example.wmsenterprisescanner.ui.screens.OpnameSessionScreen
import com.example.wmsenterprisescanner.ui.screens.ContinuousScannerScreen
import com.example.wmsenterprisescanner.ui.screens.InquiryScreen
import com.example.wmsenterprisescanner.ui.screens.OutboundMenuScreen
import com.example.wmsenterprisescanner.ui.screens.OutboundPickingScreen
import com.example.wmsenterprisescanner.ui.screens.TransferMenuScreen
import com.example.wmsenterprisescanner.ui.screens.TransferShipScreen
import com.example.wmsenterprisescanner.ui.screens.TransferReceiveScreen
import com.example.wmsenterprisescanner.ui.screens.ProductionMenuScreen
import com.example.wmsenterprisescanner.ui.screens.ProductionWizardScreen
import com.example.wmsenterprisescanner.ui.screens.QCMenuScreen
import com.example.wmsenterprisescanner.ui.screens.QCInspectScreen
import com.example.wmsenterprisescanner.ui.screens.TermsScreen
import com.example.wmsenterprisescanner.ui.screens.DashboardScreen
import com.example.wmsenterprisescanner.ui.screens.InventoryBrowserScreen
import com.example.wmsenterprisescanner.ui.screens.RackMapScreen
import com.example.wmsenterprisescanner.ui.screens.PutawayScreen
import com.example.wmsenterprisescanner.ui.screens.SalesOrderScreen
import com.example.wmsenterprisescanner.ui.screens.PurchaseOrderScreen
import com.example.wmsenterprisescanner.ui.screens.InvoiceScreen
import com.example.wmsenterprisescanner.ui.screens.RMAScreen
import com.example.wmsenterprisescanner.ui.screens.ProfileScreen
import com.example.wmsenterprisescanner.ui.theme.WMSEnterpriseScannerTheme
import com.example.wmsenterprisescanner.ui.viewmodels.AuthViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.InventoryViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.InquiryViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.OpnameViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.OutboundViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.TransferViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.ProductionViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.QCViewModel
import com.example.wmsenterprisescanner.utils.SessionManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import dagger.hilt.android.AndroidEntryPoint
import androidx.hilt.navigation.compose.hiltViewModel

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WMSEnterpriseScannerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WmsApp()
                }
            }
        }
    }
}

@Composable
fun WmsApp() {
    val navController = rememberNavController()
    val context = LocalContext.current
    
    // Manual Dependency Injection for ViewModels
    val sessionManager = remember { SessionManager(context) }
    
    val authViewModel: AuthViewModel = hiltViewModel()
    val inventoryViewModel: InventoryViewModel = hiltViewModel()
    val opnameViewModel: OpnameViewModel = hiltViewModel()
    val outboundViewModel: OutboundViewModel = hiltViewModel()
    val inquiryViewModel: InquiryViewModel = hiltViewModel()
    val transferViewModel: TransferViewModel = hiltViewModel()
    val productionViewModel: ProductionViewModel = hiltViewModel()
    val qcViewModel: QCViewModel = hiltViewModel()
    val dashboardViewModel: com.example.wmsenterprisescanner.ui.viewmodels.DashboardViewModel = hiltViewModel()
    val inventoryBrowserViewModel: com.example.wmsenterprisescanner.ui.viewmodels.InventoryBrowserViewModel = hiltViewModel()
    val rackMapViewModel: com.example.wmsenterprisescanner.ui.viewmodels.RackMapViewModel = hiltViewModel()
    val putawayViewModel: com.example.wmsenterprisescanner.ui.viewmodels.PutawayViewModel = hiltViewModel()
    val salesViewModel: com.example.wmsenterprisescanner.ui.viewmodels.SalesViewModel = hiltViewModel()
    val purchaseViewModel: com.example.wmsenterprisescanner.ui.viewmodels.PurchaseViewModel = hiltViewModel()
    val invoiceViewModel: com.example.wmsenterprisescanner.ui.viewmodels.InvoiceViewModel = hiltViewModel()
    val rmaViewModel: com.example.wmsenterprisescanner.ui.viewmodels.RMAViewModel = hiltViewModel()
    
    // Check initial destination: terms → login → home
    val startDestination = when {
        !sessionManager.hasAcceptedTerms() -> "terms"
        sessionManager.fetchAuthToken().isNullOrEmpty() -> "login"
        else -> "home"
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable("terms") {
            TermsScreen(
                onAccepted = {
                    sessionManager.setTermsAccepted()
                    navController.navigate("login") {
                        popUpTo("terms") { inclusive = true }
                    }
                }
            )
        }
        composable("login") {
            LoginScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }
        composable("home") {
            HomeScreen(
                authViewModel = authViewModel,
                onNavigateToInbound = { navController.navigate("inbound") },
                onLogoutRequest = {
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                },
                onNavigateToOutbound = { navController.navigate("outbound_menu") },
                onNavigateToOpname = { navController.navigate("opname_menu") },
                onNavigateToInquiry = { navController.navigate("inquiry") },
                onNavigateToTransfer = { navController.navigate("transfer_menu") },
                onNavigateToProduction = { navController.navigate("production_menu") },
                onNavigateToQC = { navController.navigate("qc_menu") },
                onNavigateToDashboard = { navController.navigate("dashboard") },
                onNavigateToInventory = { navController.navigate("inventory_browser") },
                onNavigateToRackMap = { navController.navigate("rack_map") },
                onNavigateToPutaway = { navController.navigate("putaway") },
                onNavigateToSalesOrders = { navController.navigate("sales_orders") },
                onNavigateToPurchaseOrders = { navController.navigate("purchase_orders") },
                onNavigateToInvoices = { navController.navigate("invoices") },
                onNavigateToRMA = { navController.navigate("rma") },
                onNavigateToProfile = { navController.navigate("profile") }
            )
        }
        composable("dashboard") {
            DashboardScreen(
                viewModel = dashboardViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("inventory_browser") {
            InventoryBrowserScreen(
                viewModel = inventoryBrowserViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToScanner = { navController.navigate("scanner") }
            )
        }
        composable("rack_map") {
            RackMapScreen(
                viewModel = rackMapViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("putaway") { backStackEntry ->
            val scannedBarcode = backStackEntry.savedStateHandle.get<String>("scanned_barcode")
            PutawayScreen(
                viewModel = putawayViewModel,
                scannedBarcode = scannedBarcode,
                onNavigateToScanner = { navController.navigate("scanner") },
                onNavigateBack = { navController.popBackStack() },
                onScanConsumed = { backStackEntry.savedStateHandle.remove<String>("scanned_barcode") }
            )
        }
        composable("sales_orders") {
            SalesOrderScreen(
                viewModel = salesViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("purchase_orders") {
            PurchaseOrderScreen(
                viewModel = purchaseViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("invoices") {
            InvoiceScreen(
                viewModel = invoiceViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("rma") {
            RMAScreen(
                viewModel = rmaViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("profile") {
            ProfileScreen(
                username = sessionManager.fetchAuthToken()?.take(20) ?: "User",
                serverUrl = sessionManager.fetchServerUrl(),
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("inbound") { backStackEntry ->
            val scannedBarcode = backStackEntry.savedStateHandle.get<String>("scanned_barcode")
            InboundScreen(
                viewModel = inventoryViewModel,
                scannedLocation = scannedBarcode,
                onNavigateToScanner = { navController.navigate("scanner") },
                onNavigateBack = { navController.popBackStack() },
                onScanConsumed = { backStackEntry.savedStateHandle.remove<String>("scanned_barcode") }
            )
        }
        composable("scanner") {
            ScannerScreen(
                onScanSuccess = { barcode ->
                    // Return barcode to previous screen
                    navController.previousBackStackEntry?.savedStateHandle?.set("scanned_barcode", barcode)
                    navController.popBackStack()
                },
                onCancel = {
                    navController.popBackStack()
                }
            )
        }
        composable("opname_menu") {
            OpnameMenuScreen(
                viewModel = opnameViewModel,
                onNavigateToSession = { id -> navController.navigate("opname_session/$id") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("opname_session/{opnameId}") { backStackEntry ->
            val opnameIdStr = backStackEntry.arguments?.getString("opnameId")
            val opnameId = opnameIdStr?.toIntOrNull() ?: 0
            OpnameSessionScreen(
                opnameId = opnameId,
                viewModel = opnameViewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToContinuousScanner = { navController.navigate("continuous_scanner/$opnameId") }
            )
        }
        composable("continuous_scanner/{opnameId}") { backStackEntry ->
            val opnameIdStr = backStackEntry.arguments?.getString("opnameId")
            val opnameId = opnameIdStr?.toIntOrNull() ?: 0
            ContinuousScannerScreen(
                opnameId = opnameId,
                viewModel = opnameViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("outbound_menu") {
            OutboundMenuScreen(
                viewModel = outboundViewModel,
                onNavigateToPicking = { id -> navController.navigate("outbound_picking/$id") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("outbound_picking/{doId}") { backStackEntry ->
            val doIdStr = backStackEntry.arguments?.getString("doId")
            val doId = doIdStr?.toIntOrNull() ?: 0
            OutboundPickingScreen(
                doId = doId,
                viewModel = outboundViewModel,
                onNavigateBack = { navController.popBackStack() },
                onFinishPicking = { navController.popBackStack() }
            )
        }
        composable("inquiry") {
            InquiryScreen(
                viewModel = inquiryViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("transfer_menu") {
            TransferMenuScreen(
                viewModel = transferViewModel,
                onNavigateToShip = { id -> navController.navigate("transfer_ship/$id") },
                onNavigateToReceive = { id -> navController.navigate("transfer_receive/$id") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("transfer_ship/{transferId}") { backStackEntry ->
            val idStr = backStackEntry.arguments?.getString("transferId")
            val transferId = idStr?.toIntOrNull() ?: 0
            TransferShipScreen(
                transferId = transferId,
                viewModel = transferViewModel,
                onNavigateBack = { navController.popBackStack() },
                onFinishShipping = { navController.popBackStack() }
            )
        }
        composable("transfer_receive/{transferId}") { backStackEntry ->
            val idStr = backStackEntry.arguments?.getString("transferId")
            val transferId = idStr?.toIntOrNull() ?: 0
            TransferReceiveScreen(
                transferId = transferId,
                viewModel = transferViewModel,
                onNavigateBack = { navController.popBackStack() },
                onFinishReceiving = { navController.popBackStack() }
            )
        }
        composable("production_menu") {
            ProductionMenuScreen(
                viewModel = productionViewModel,
                onNavigateToWizard = { id -> navController.navigate("production_wizard/$id") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("production_wizard/{joId}") { backStackEntry ->
            val idStr = backStackEntry.arguments?.getString("joId")
            val joId = idStr?.toIntOrNull() ?: 0
            ProductionWizardScreen(
                joId = joId,
                viewModel = productionViewModel,
                onNavigateBack = { navController.popBackStack() },
                onComplete = { navController.popBackStack() }
            )
        }
        composable("qc_menu") {
            QCMenuScreen(
                viewModel = qcViewModel,
                onNavigateToInspect = { id -> navController.navigate("qc_inspect/$id") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("qc_inspect/{lineId}") { backStackEntry ->
            val idStr = backStackEntry.arguments?.getString("lineId")
            val lineId = idStr?.toIntOrNull() ?: 0
            QCInspectScreen(
                lineId = lineId,
                viewModel = qcViewModel,
                onNavigateBack = { navController.popBackStack() },
                onComplete = { navController.popBackStack() }
            )
        }
    }
}