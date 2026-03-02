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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.model.Batch
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.InventoryBrowserViewModel

private val STATUS_FILTERS = listOf("Semua", "AVAILABLE", "RESERVED", "QUARANTINE", "DEPLETED")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryBrowserScreen(
    viewModel: InventoryBrowserViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToScanner: () -> Unit
) {
    val batches by viewModel.batches.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("Semua") }

    LaunchedEffect(Unit) { viewModel.loadBatches() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("📋 Inventaris", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = {
                    searchQuery = it
                    viewModel.loadBatches(search = it.ifBlank { null }, status = if (selectedFilter == "Semua") null else selectedFilter)
                },
                placeholder = { Text("Cari barcode, SKU, atau nama...", color = YtMediumGray) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = YtMediumGray) },
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                    focusedBorderColor = YtRed, unfocusedBorderColor = YtDarkGray,
                    cursorColor = YtRed
                ),
                shape = RoundedCornerShape(12.dp)
            )

            // Status Filter Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                items(STATUS_FILTERS) { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = {
                            selectedFilter = filter
                            viewModel.loadBatches(
                                search = searchQuery.ifBlank { null },
                                status = if (filter == "Semua") null else filter
                            )
                        },
                        label = { Text(filter, fontWeight = if (selectedFilter == filter) FontWeight.Bold else FontWeight.Normal) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                            selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }

            // Count
            Text("${batches.size} batch ditemukan", color = YtMediumGray, fontSize = 12.sp,
                modifier = Modifier.padding(bottom = 8.dp))

            // Batch List
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = YtRed)
                }
            } else if (batches.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada batch ditemukan", color = YtMediumGray)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(batches) { batch ->
                        BatchCard(batch)
                    }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun BatchCard(batch: Batch) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(batch.barcode, fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 14.sp)
                StatusBadge(batch.status)
            }
            Spacer(Modifier.height(4.dp))
            if (batch.product_name != null) {
                Text(batch.product_name, color = YtLightGray, fontSize = 13.sp)
            }
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("SKU: ${batch.product_sku ?: "-"}", color = YtMediumGray, fontSize = 11.sp)
                Text("Qty: ${batch.current_qty}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
            if (batch.location != null) {
                Text("📍 ${batch.location}", color = YtMediumGray, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (color, label) = when (status.uppercase()) {
        "AVAILABLE" -> YtGreen to "✅ Available"
        "RESERVED" -> YtBlue to "🔒 Reserved"
        "QUARANTINE" -> YtRed to "⚠️ Quarantine"
        "DEPLETED" -> YtMediumGray to "❌ Depleted"
        else -> YtMediumGray to status
    }
    Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
}

private val YtGreen = androidx.compose.ui.graphics.Color(0xFF4CAF50)
