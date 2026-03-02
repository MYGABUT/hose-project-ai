package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.model.PurchaseRequest
import com.example.wmsenterprisescanner.data.model.PRLine
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.PurchaseViewModel

private val PR_FILTERS = listOf("Semua", "DRAFT", "PENDING", "APPROVED", "ORDERED", "RECEIVED", "REJECTED")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseOrderScreen(
    viewModel: PurchaseViewModel,
    onNavigateBack: () -> Unit
) {
    val requests by viewModel.requests.collectAsState()
    val selectedPR by viewModel.selectedPR.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("Semua") }

    LaunchedEffect(Unit) { viewModel.loadRequests() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("📋 Purchase Requests", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (selectedPR != null) viewModel.clearSelection() else onNavigateBack()
                    }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        if (selectedPR != null) {
            PRDetailView(selectedPR!!, Modifier.padding(padding))
        } else {
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
                // Filter Chips
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                    items(PR_FILTERS) { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = {
                                selectedFilter = filter
                                viewModel.loadRequests(status = if (filter == "Semua") null else filter)
                            },
                            label = { Text(filter) },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                                selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                            ), shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                Text("${requests.size} permintaan pembelian", color = YtMediumGray, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

                if (isLoading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = YtRed) }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(requests) { pr ->
                            PRCard(pr, onClick = { viewModel.selectPR(pr.id) })
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun PRCard(pr: PurchaseRequest, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(pr.pr_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 14.sp)
                PRStatusBadge(pr.status)
            }
            if (pr.supplier_name != null) {
                Text("🏢 ${pr.supplier_name}", color = YtLightGray, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("📅 ${pr.request_date?.take(10) ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                PriorityBadge(pr.priority ?: "NORMAL")
            }
            Row(Modifier.fillMaxWidth().padding(top = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("👤 ${pr.requested_by ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                if (pr.total_estimated != null && pr.total_estimated > 0) {
                    Text("Rp ${String.format("%,.0f", pr.total_estimated)}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun PRDetailView(pr: PurchaseRequest, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(pr.pr_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 18.sp)
                        PRStatusBadge(pr.status)
                    }
                    HorizontalDivider(color = YtDarkGray)
                    PRDetailRow("Supplier", pr.supplier_name ?: "-")
                    PRDetailRow("Diminta oleh", pr.requested_by ?: "-")
                    PRDetailRow("Tanggal", pr.request_date?.take(10) ?: "-")
                    PRDetailRow("Dibutuhkan", pr.required_date?.take(10) ?: "-")
                    PRDetailRow("Prioritas", pr.priority ?: "NORMAL")
                    if (pr.notes != null) PRDetailRow("Catatan", pr.notes)
                }
            }
        }

        item {
            Text("📦 Item (${pr.lines.size})", color = YtWhite, fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleSmall)
        }
        items(pr.lines) { line ->
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(8.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(line.product_name, color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("SKU: ${line.product_sku ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                        Text("Qty: ${line.qty_requested} ${line.unit ?: ""}", color = YtWhite, fontSize = 12.sp)
                    }
                    if (line.estimated_price > 0) {
                        Text("Est: Rp ${String.format("%,.0f", line.estimated_price)}", color = YtMediumGray, fontSize = 11.sp)
                    }
                    if (line.reason != null) {
                        Text("💬 ${line.reason}", color = YtMediumGray, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun PRStatusBadge(status: String) {
    val (color, label) = when (status.uppercase()) {
        "DRAFT" -> YtMediumGray to "📝 Draft"
        "PENDING" -> Color(0xFFFF9800) to "⏳ Pending"
        "APPROVED" -> Color(0xFF4CAF50) to "✅ Approved"
        "REJECTED" -> YtRed to "❌ Rejected"
        "ORDERED" -> YtBlue to "📦 Ordered"
        "RECEIVED" -> Color(0xFF4CAF50) to "✅ Received"
        else -> YtMediumGray to status
    }
    Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun PriorityBadge(priority: String) {
    val (color, emoji) = when (priority.uppercase()) {
        "URGENT" -> YtRed to "🔴"
        "HIGH" -> Color(0xFFFF9800) to "🟠"
        "NORMAL" -> YtBlue to "🔵"
        "LOW" -> YtMediumGray to "⚪"
        else -> YtMediumGray to "⚪"
    }
    Text("$emoji $priority", color = color, fontSize = 10.sp)
}

@Composable
private fun PRDetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = YtMediumGray, fontSize = 13.sp)
        Text(value, color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}
