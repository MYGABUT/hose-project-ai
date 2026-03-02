package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.model.DashboardSummary
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateBack: () -> Unit
) {
    val summary by viewModel.summary.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadDashboard() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("📊 Dashboard", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = YtRed)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // KPI Row 1
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiCard("📦 Total Batch", "${summary.total_batches}", YtRed, Modifier.weight(1f))
                        KpiCard("🏷️ Produk", "${summary.total_products}", YtBlue, Modifier.weight(1f))
                    }
                }
                // KPI Row 2
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiCard("📥 Inbound Hari Ini", "${summary.today_inbound}", Color(0xFF4CAF50), Modifier.weight(1f))
                        KpiCard("📤 Outbound Hari Ini", "${summary.today_outbound}", Color(0xFFFF9800), Modifier.weight(1f))
                    }
                }
                // KPI Row 3
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiCard("⚠️ Stok Menipis", "${summary.low_stock_count}", Color(0xFFF44336), Modifier.weight(1f))
                        KpiCard("🔄 Transfer Pending", "${summary.pending_transfers}", Color(0xFF9C27B0), Modifier.weight(1f))
                    }
                }
                // KPI Row 4
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KpiCard("🔧 JO Outstanding", "${summary.outstanding_jo}", Color(0xFF2196F3), Modifier.weight(1f))
                        KpiCard("🔍 Pending QC", "${summary.pending_qc}", Color(0xFF00BCD4), Modifier.weight(1f))
                    }
                }

                // Quick Actions
                item {
                    Spacer(Modifier.height(8.dp))
                    Text("⚡ Quick Actions", color = YtWhite, fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium)
                    HorizontalDivider(color = YtDarkGray, modifier = Modifier.padding(vertical = 4.dp))
                }
                item {
                    Text(
                        "Data diperbarui secara real-time dari backend server",
                        color = YtMediumGray, style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Composable
private fun KpiCard(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.height(100.dp),
        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(label, color = YtLightGray, fontSize = 12.sp)
            Text(value, color = accent, fontSize = 28.sp, fontWeight = FontWeight.Black)
        }
    }
}
