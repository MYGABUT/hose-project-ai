package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.AuthViewModel

data class ModuleItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val accentColor: Color,
    val tag: String,
    val onClick: () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    authViewModel: AuthViewModel,
    onNavigateToInbound: () -> Unit,
    onNavigateToOutbound: () -> Unit,
    onNavigateToOpname: () -> Unit,
    onNavigateToInquiry: () -> Unit,
    onNavigateToTransfer: () -> Unit,
    onNavigateToProduction: () -> Unit,
    onNavigateToQC: () -> Unit,
    onNavigateToDashboard: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToRackMap: () -> Unit,
    onNavigateToPutaway: () -> Unit,
    onNavigateToSalesOrders: () -> Unit,
    onNavigateToPurchaseOrders: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToRMA: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onLogoutRequest: () -> Unit
) {
    val modules = listOf(
        ModuleItem("Dashboard", "Ringkasan KPI gudang: stok, inbound, outbound hari ini", Icons.Default.List, YtOrange, "OVERVIEW", onNavigateToDashboard),
        ModuleItem("Inventaris", "Browse semua batch stok — cari, filter, lihat detail", Icons.Default.Search, YtGreen, "OVERVIEW", onNavigateToInventory),
        ModuleItem("Peta Rak Gudang", "Visualisasi grid rak — tap untuk lihat isi lokasi", Icons.Default.List, YtTeal, "OVERVIEW", onNavigateToRackMap),
        ModuleItem("Putaway / Simpan", "Wizard: scan batch → pilih rak → konfirmasi penempatan", Icons.Default.AddCircle, YtPurple, "GUDANG", onNavigateToPutaway),
        ModuleItem("Inbound / Penerimaan", "Terima & simpan barang masuk dari supplier ke rak gudang", Icons.Default.AddCircle, YtRed, "GUDANG", onNavigateToInbound),
        ModuleItem("Outbound & Surat Jalan", "Picking barang pesanan, konfirmasi & dispatch pengiriman", Icons.Default.ShoppingCart, YtBlue, "GUDANG", onNavigateToOutbound),
        ModuleItem("Stock Opname", "Audit fisik stok gudang — scan barcode & hitung aktual", Icons.Default.List, YtOrange, "AUDIT", onNavigateToOpname),
        ModuleItem("Cek Cepat Barang", "Scan barcode apapun untuk lihat info batch secara instan", Icons.Default.Search, YtGreen, "INQUIRY", onNavigateToInquiry),
        ModuleItem("Mutasi Antar Rak", "Pindahkan stok antar lokasi/gudang dengan validasi scanner", Icons.Default.ShoppingCart, YtTeal, "GUDANG", onNavigateToTransfer),
        ModuleItem("Produksi / Perakitan", "Tracking Job Order, cutting wizard, pemakaian bahan", Icons.Default.Build, YtPurple, "PRODUKSI", onNavigateToProduction),
        ModuleItem("Quality Control", "Inspeksi QC: input qty lolos & gagal per batch", Icons.Default.CheckCircle, YtPink, "QC", onNavigateToQC),
        ModuleItem("Sales Orders", "List SO: draft, confirmed, in progress, completed", Icons.Default.ShoppingCart, YtRed, "SALES", onNavigateToSalesOrders),
        ModuleItem("Purchase Requests", "List PR: draft, pending, approved, ordered", Icons.Default.ShoppingCart, YtBlue, "SALES", onNavigateToPurchaseOrders),
        ModuleItem("Invoice", "Daftar invoice & status pembayaran", Icons.Default.List, YtOrange, "FINANCE", onNavigateToInvoices),
        ModuleItem("RMA / Return", "Kelola tiket return & klaim pelanggan", Icons.Default.Build, YtPink, "FINANCE", onNavigateToRMA)
    )

    var selectedChip by remember { mutableStateOf("Semua") }
    val chips = listOf("Semua", "OVERVIEW", "GUDANG", "SALES", "FINANCE", "AUDIT", "INQUIRY", "PRODUKSI", "QC")
    val filteredModules = if (selectedChip == "Semua") modules else modules.filter { it.tag == selectedChip }

    Scaffold(
        containerColor = YtDarkBackground
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            // YouTube-style Top Bar
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // App Logo / Name
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(YtRed),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("W", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "WMS Enterprise",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = YtWhite
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(Icons.Default.Notifications, "Notifications", tint = YtWhite)
                    }
                    IconButton(onClick = {
                        authViewModel.logout()
                        onLogoutRequest()
                    }) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(YtMediumGray),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.ExitToApp,
                                "Logout",
                                tint = YtWhite,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // YouTube-style Category Chips
            item {
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(chips) { chip ->
                        FilterChip(
                            selected = selectedChip == chip,
                            onClick = { selectedChip = chip },
                            label = {
                                Text(
                                    chip,
                                    fontWeight = if (selectedChip == chip) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = YtDarkSurfaceVariant,
                                labelColor = YtWhite,
                                selectedContainerColor = YtWhite,
                                selectedLabelColor = YtDarkBackground
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                borderColor = Color.Transparent,
                                enabled = true,
                                selected = selectedChip == chip
                            ),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Module Cards (YouTube video card style)
            items(filteredModules) { module ->
                YtModuleCard(module = module)
            }
        }
    }
}

@Composable
fun YtModuleCard(module: ModuleItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable { module.onClick() },
        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column {
            // "Thumbnail" area — gradient banner with icon
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                module.accentColor.copy(alpha = 0.8f),
                                module.accentColor.copy(alpha = 0.3f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = module.icon,
                    contentDescription = module.title,
                    modifier = Modifier.size(56.dp),
                    tint = Color.White.copy(alpha = 0.9f)
                )
                // Tag pill
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(8.dp),
                    color = YtDarkBackground.copy(alpha = 0.85f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = module.tag,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = YtWhite,
                        fontSize = 10.sp
                    )
                }
            }

            // Title + Description (like video title + channel name)
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = module.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = YtWhite,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = module.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = YtLightGray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
            }
        }
    }
}
