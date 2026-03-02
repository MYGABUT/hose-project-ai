package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import com.example.wmsenterprisescanner.data.model.Invoice
import com.example.wmsenterprisescanner.data.model.InvoiceSummary
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.InvoiceViewModel

private val INV_FILTERS = listOf("Semua", "UNPAID", "PARTIAL", "PAID")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceScreen(
    viewModel: InvoiceViewModel,
    onNavigateBack: () -> Unit
) {
    val invoices by viewModel.invoices.collectAsState()
    val summary by viewModel.summary.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("Semua") }

    LaunchedEffect(Unit) { viewModel.loadAll() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("💰 Invoice", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Summary Cards
            item {
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InvSummaryCard("Total", "${summary.total_invoices}", YtBlue, Modifier.weight(1f))
                    InvSummaryCard("Lunas", "Rp ${formatCompact(summary.total_paid)}", Color(0xFF4CAF50), Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InvSummaryCard("Outstanding", "Rp ${formatCompact(summary.total_outstanding)}", Color(0xFFFF9800), Modifier.weight(1f))
                    InvSummaryCard("Overdue", "${summary.overdue_count}", YtRed, Modifier.weight(1f))
                }
            }

            // Filter Chips
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                    items(INV_FILTERS) { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = {
                                selectedFilter = filter
                                viewModel.loadInvoices(paymentStatus = if (filter == "Semua") null else filter)
                            },
                            label = { Text(filter) },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                                selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                            ), shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = YtRed)
                    }
                }
            } else {
                items(invoices) { inv ->
                    InvoiceCard(inv)
                }
                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun InvSummaryCard(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(72.dp), colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(10.dp)) {
        Column(Modifier.fillMaxSize().padding(10.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Text(label, color = YtMediumGray, fontSize = 11.sp)
            Text(value, color = accent, fontSize = 18.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun InvoiceCard(inv: Invoice) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(inv.invoice_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 14.sp)
                PaymentBadge(inv.payment_status ?: "UNPAID")
            }
            Text("👤 ${inv.customer_name ?: "-"}", color = YtLightGray, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("📅 ${inv.invoice_date?.take(10) ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                Text("Rp ${String.format("%,.0f", inv.total ?: 0.0)}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
            if ((inv.amount_paid ?: 0.0) > 0) {
                Text("💵 Dibayar: Rp ${String.format("%,.0f", inv.amount_paid)}", color = Color(0xFF4CAF50), fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun PaymentBadge(status: String) {
    val (color, label) = when (status.uppercase()) {
        "PAID" -> Color(0xFF4CAF50) to "✅ Lunas"
        "PARTIAL" -> Color(0xFFFF9800) to "💳 Sebagian"
        "UNPAID" -> YtRed to "❌ Belum Bayar"
        else -> YtMediumGray to status
    }
    Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
}

private fun formatCompact(value: Double): String {
    return when {
        value >= 1_000_000_000 -> String.format("%.1fM", value / 1_000_000_000)
        value >= 1_000_000 -> String.format("%.1fJt", value / 1_000_000)
        value >= 1_000 -> String.format("%.0fRb", value / 1_000)
        else -> String.format("%.0f", value)
    }
}
