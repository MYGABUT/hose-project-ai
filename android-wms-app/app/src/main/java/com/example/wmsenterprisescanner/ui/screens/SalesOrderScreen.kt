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
import com.example.wmsenterprisescanner.data.model.SalesOrder
import com.example.wmsenterprisescanner.data.model.SOLine
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.SalesViewModel

private val SO_FILTERS = listOf("Semua", "DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesOrderScreen(
    viewModel: SalesViewModel,
    onNavigateBack: () -> Unit
) {
    val orders by viewModel.orders.collectAsState()
    val selectedOrder by viewModel.selectedOrder.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("Semua") }

    LaunchedEffect(Unit) { viewModel.loadOrders() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("🛒 Sales Orders", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (selectedOrder != null) viewModel.clearSelection() else onNavigateBack()
                    }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        if (selectedOrder != null) {
            SODetailView(selectedOrder!!, Modifier.padding(padding))
        } else {
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
                // Search
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        viewModel.loadOrders(search = it.ifBlank { null }, status = if (selectedFilter == "Semua") null else selectedFilter)
                    },
                    placeholder = { Text("Cari SO number, customer...", color = YtMediumGray) },
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = YtMediumGray) },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                        focusedBorderColor = YtRed, unfocusedBorderColor = YtDarkGray, cursorColor = YtRed
                    ), shape = RoundedCornerShape(12.dp)
                )

                // Filter Chips
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                    items(SO_FILTERS) { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = {
                                selectedFilter = filter
                                viewModel.loadOrders(search = searchQuery.ifBlank { null }, status = if (filter == "Semua") null else filter)
                            },
                            label = { Text(filter) },
                            colors = FilterChipDefaults.filterChipColors(
                                containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                                selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                            ), shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                Text("${orders.size} order", color = YtMediumGray, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

                if (isLoading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = YtRed) }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(orders) { so ->
                            SOCard(so, onClick = { viewModel.selectOrder(so.id) })
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun SOCard(so: SalesOrder, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(so.so_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 14.sp)
                SOStatusBadge(so.status)
            }
            Text("👤 ${so.customer_name}", color = YtLightGray, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("📅 ${so.order_date?.take(10) ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                if (so.total_amount != null) {
                    Text("Rp ${String.format("%,.0f", so.total_amount)}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
            if (so.salesman_name != null) {
                Text("🧑‍💼 ${so.salesman_name}", color = YtMediumGray, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun SODetailView(so: SalesOrder, modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(so.so_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 18.sp)
                        SOStatusBadge(so.status)
                    }
                    HorizontalDivider(color = YtDarkGray)
                    SODetailRow("Customer", so.customer_name)
                    SODetailRow("Telepon", so.customer_phone ?: "-")
                    SODetailRow("Tanggal Order", so.order_date?.take(10) ?: "-")
                    SODetailRow("Tgl Dibutuhkan", so.required_date?.take(10) ?: "-")
                    SODetailRow("Salesman", so.salesman_name ?: "-")
                    if (so.total_amount != null) SODetailRow("Total", "Rp ${String.format("%,.0f", so.total_amount)}")
                    if (so.notes != null) SODetailRow("Catatan", so.notes)
                }
            }
        }

        // SO Lines
        item {
            Text("📦 Item Pesanan (${so.lines.size})", color = YtWhite, fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleSmall)
        }
        items(so.lines) { line ->
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(8.dp)) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(line.description, color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Qty: ${line.qty}", color = YtMediumGray, fontSize = 12.sp)
                        Text("@ Rp ${String.format("%,.0f", line.unit_price)}", color = YtMediumGray, fontSize = 12.sp)
                        Text("Rp ${String.format("%,.0f", line.total_price ?: (line.qty * line.unit_price))}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                    if (line.is_assembly == true) {
                        Text("🔧 Assembly", color = YtBlue, fontSize = 10.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SOStatusBadge(status: String) {
    val (color, label) = when (status.uppercase()) {
        "DRAFT" -> YtMediumGray to "📝 Draft"
        "CONFIRMED" -> YtBlue to "✅ Confirmed"
        "IN_PROGRESS" -> Color(0xFFFF9800) to "🔄 In Progress"
        "COMPLETED" -> Color(0xFF4CAF50) to "✅ Completed"
        "CANCELLED" -> YtRed to "❌ Cancelled"
        else -> YtMediumGray to status
    }
    Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun SODetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = YtMediumGray, fontSize = 13.sp)
        Text(value, color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}
