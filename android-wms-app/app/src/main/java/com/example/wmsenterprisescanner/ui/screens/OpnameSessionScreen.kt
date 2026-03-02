package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.wmsenterprisescanner.data.model.OpnameItem
import com.example.wmsenterprisescanner.ui.viewmodels.FinalizeState
import com.example.wmsenterprisescanner.ui.viewmodels.OpnameViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OpnameSessionScreen(
    opnameId: Int,
    viewModel: OpnameViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToContinuousScanner: () -> Unit
) {
    val context = LocalContext.current
    val finalizeState by viewModel.finalizeState.collectAsState()
    val itemsState by viewModel.itemsState.collectAsState()
    var showFinalizeDialog by remember { mutableStateOf(false) }

    LaunchedEffect(opnameId) {
        viewModel.loadItems(opnameId)
    }

    LaunchedEffect(finalizeState) {
        if (finalizeState is FinalizeState.Success) {
            Toast.makeText(context, "Sesi berhasil difinalisasi!", Toast.LENGTH_SHORT).show()
            onNavigateBack()
        } else if (finalizeState is FinalizeState.Error) {
            Toast.makeText(context, (finalizeState as FinalizeState.Error).message, Toast.LENGTH_LONG).show()
        }
    }

    if (showFinalizeDialog) {
        AlertDialog(
            onDismissRequest = { showFinalizeDialog = false },
            title = { Text("Finalisasi Opname?") },
            text = {
                val pending = itemsState.items.count { it.status == "PENDING" }
                Text("$pending item masih PENDING dan akan otomatis ditandai MISSING. Lanjutkan?")
            },
            confirmButton = {
                TextButton(onClick = {
                    showFinalizeDialog = false
                    viewModel.finalizeSession(opnameId)
                }) { Text("Ya, Finalisasi") }
            },
            dismissButton = {
                TextButton(onClick = { showFinalizeDialog = false }) { Text("Batal") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Audit Sesi #$opnameId") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadItems(opnameId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToContinuousScanner,
                icon = { Icon(Icons.Default.Search, contentDescription = "Scan") },
                text = { Text("MULAI SCAN") },
                containerColor = MaterialTheme.colorScheme.primary
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 3.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = { showFinalizeDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    enabled = finalizeState !is FinalizeState.Processing
                ) {
                    if (finalizeState is FinalizeState.Processing) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.onError, modifier = Modifier.size(24.dp))
                    } else {
                        Text("SELESAI & FINALISASI OPNAME")
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Summary bar
            val totalItems = itemsState.items.size
            val scannedItems = itemsState.items.count { it.status == "FOUND" || it.status == "MISMATCH" }
            val missingItems = itemsState.items.count { it.status == "MISSING" }
            val pendingItems = itemsState.items.count { it.status == "PENDING" }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    SummaryChip("Total", totalItems.toString(), MaterialTheme.colorScheme.onPrimaryContainer)
                    SummaryChip("Discan", scannedItems.toString(), Color(0xFF388E3C))
                    SummaryChip("Pending", pendingItems.toString(), Color(0xFFF57C00))
                    SummaryChip("Hilang", missingItems.toString(), Color(0xFFD32F2F))
                }
            }

            // Items List
            if (itemsState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (itemsState.error != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error: ${itemsState.error}", color = MaterialTheme.colorScheme.error)
                }
            } else if (itemsState.items.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada item dalam sesi ini.")
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp)
                ) {
                    items(itemsState.items) { item ->
                        OpnameItemCard(
                            item = item,
                            onMarkMissing = { viewModel.markItemMissing(opnameId, item.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryChip(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
fun OpnameItemCard(item: OpnameItem, onMarkMissing: () -> Unit) {
    val (statusColor, statusLabel) = when (item.status) {
        "FOUND" -> Color(0xFF388E3C) to "✅ Sesuai"
        "MISMATCH" -> Color(0xFFF57C00) to "⚠️ Selisih"
        "MISSING" -> Color(0xFFD32F2F) to "❌ Hilang"
        else -> Color(0xFF757575) to "🟡 Pending"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status color indicator
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(48.dp)
                    .background(statusColor)
            )
            Spacer(modifier = Modifier.width(12.dp))

            // Item details
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.barcode ?: "No Barcode",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = item.name ?: "Produk Tidak Diketahui",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row {
                    Text(
                        text = "Sistem: ${item.system_qty}",
                        style = MaterialTheme.typography.labelSmall
                    )
                    if (item.actual_qty != null) {
                        Text(
                            text = " | Aktual: ${item.actual_qty}",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }

            // Status label
            Text(
                text = statusLabel,
                style = MaterialTheme.typography.labelMedium,
                color = statusColor,
                fontWeight = FontWeight.SemiBold
            )

            // Mark missing button (only for PENDING items)
            if (item.status == "PENDING") {
                IconButton(onClick = onMarkMissing) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Mark Missing",
                        tint = Color(0xFFD32F2F)
                    )
                }
            }
        }
    }
}
