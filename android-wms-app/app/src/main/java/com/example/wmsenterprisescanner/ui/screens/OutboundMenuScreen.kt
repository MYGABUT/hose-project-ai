package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.data.model.DeliveryOrder
import com.example.wmsenterprisescanner.ui.viewmodels.OutboundViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OutboundMenuScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPicking: (Int) -> Unit,
    viewModel: OutboundViewModel = hiltViewModel()
) {
    val state by viewModel.menuState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.loadPendingDOs()
    }

    LaunchedEffect(state.actionMessage) {
        if (state.actionMessage != null) {
            Toast.makeText(context, state.actionMessage, Toast.LENGTH_SHORT).show()
            viewModel.dismissActionMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Outbound & Surat Jalan") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadPendingDOs(state.activeFilter) }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                }
            )
        },
        snackbarHost = {
            if (state.error != null) {
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { viewModel.dismissError() }) {
                            Text("Dismiss")
                        }
                    }
                ) {
                    Text(state.error!!)
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Status Filter Chips
            val filters = listOf(
                null to "Semua",
                "DRAFT" to "Draft",
                "READY_TO_SHIP" to "Siap Kirim",
                "SHIPPED" to "Terkirim",
                "DELIVERED" to "Selesai"
            )
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filters) { (filterVal, label) ->
                    FilterChip(
                        selected = state.activeFilter == filterVal,
                        onClick = { viewModel.loadPendingDOs(filterVal) },
                        label = { Text(label) }
                    )
                }
            }

            // Content
            Box(modifier = Modifier.fillMaxSize()) {
                if (state.isLoading && state.dos.isEmpty()) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                } else if (state.dos.isEmpty() && !state.isLoading) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("Tidak ada Delivery Order", style = MaterialTheme.typography.bodyLarge)
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(state.dos) { doItem ->
                            DOCard(
                                deliveryOrder = doItem,
                                onClick = {
                                    if (doItem.status == "READY_TO_SHIP") {
                                        onNavigateToPicking(doItem.id)
                                    }
                                },
                                onConfirm = { viewModel.confirmDO(doItem.id) },
                                onDispatch = { viewModel.dispatchDO(doItem.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DOCard(
    deliveryOrder: DeliveryOrder,
    onClick: () -> Unit,
    onConfirm: () -> Unit,
    onDispatch: () -> Unit
) {
    val statusColor = when(deliveryOrder.status) {
        "DRAFT" -> Color(0xFF757575)
        "READY_TO_SHIP" -> Color(0xFF1976D2)
        "SHIPPED" -> Color(0xFFF57C00)
        "DELIVERED" -> Color(0xFF388E3C)
        else -> MaterialTheme.colorScheme.secondary
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = deliveryOrder.do_number,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Surface(
                    color = statusColor.copy(alpha = 0.15f),
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = deliveryOrder.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Kepada: ${deliveryOrder.recipient_name ?: "-"}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                "Total Items: ${deliveryOrder.lines.size}",
                style = MaterialTheme.typography.bodySmall
            )

            // Action buttons based on status
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                when (deliveryOrder.status) {
                    "DRAFT" -> {
                        Button(
                            onClick = onConfirm,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1976D2))
                        ) {
                            Text("Konfirmasi")
                        }
                    }
                    "READY_TO_SHIP" -> {
                        OutlinedButton(onClick = onClick) {
                            Text("Picking")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = onDispatch,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF57C00))
                        ) {
                            Text("Kirim")
                        }
                    }
                    "SHIPPED" -> {
                        Text("🚚 Dalam Perjalanan", style = MaterialTheme.typography.labelMedium, color = Color(0xFFF57C00))
                    }
                    "DELIVERED" -> {
                        Text("✅ Selesai", style = MaterialTheme.typography.labelMedium, color = Color(0xFF388E3C))
                    }
                }
            }
        }
    }
}
