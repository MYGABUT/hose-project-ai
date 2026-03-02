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
import com.example.wmsenterprisescanner.data.model.RMATicket
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.RMAViewModel

private val RMA_FILTERS = listOf("all", "NEW", "INSPECTED", "APPROVED", "CLOSED")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RMAScreen(
    viewModel: RMAViewModel,
    onNavigateBack: () -> Unit
) {
    val tickets by viewModel.tickets.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var selectedFilter by remember { mutableStateOf("all") }

    LaunchedEffect(Unit) { viewModel.loadTickets() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("🔄 RMA / Return", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            // Filter Chips
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                items(RMA_FILTERS) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = {
                            selectedFilter = filter
                            viewModel.loadTickets(status = filter)
                        },
                        label = { Text(if (filter == "all") "Semua" else filter) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                            selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                        ), shape = RoundedCornerShape(8.dp)
                    )
                }
            }

            Text("${tickets.size} tiket RMA", color = YtMediumGray, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))

            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = YtRed) }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tickets) { ticket ->
                        RMACard(ticket)
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun RMACard(ticket: RMATicket) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(ticket.ticket_number, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 14.sp)
                RMAStatusBadge(ticket.status ?: "NEW")
            }
            Text("📦 ${ticket.product_name ?: "-"} (x${ticket.qty ?: 0})", color = YtLightGray, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            Text("👤 ${ticket.customer_name ?: "-"}", color = YtMediumGray, fontSize = 12.sp)
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("🧾 ${ticket.invoice_number ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                Text("📅 ${ticket.created_at?.take(10) ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
            }
            if (ticket.root_cause != null) {
                Text("🔍 ${ticket.root_cause}", color = Color(0xFFFF9800), fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
            }
            if (ticket.solution != null) {
                Text("💡 ${ticket.solution}", color = Color(0xFF4CAF50), fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun RMAStatusBadge(status: String) {
    val (color, label) = when (status.uppercase()) {
        "NEW" -> YtBlue to "🆕 Baru"
        "INSPECTED" -> Color(0xFFFF9800) to "🔍 Inspeksi"
        "APPROVED" -> Color(0xFF4CAF50) to "✅ Approved"
        "CLOSED" -> YtMediumGray to "📦 Closed"
        else -> YtMediumGray to status
    }
    Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
}
