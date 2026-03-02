package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.data.model.JobOrder
import com.example.wmsenterprisescanner.ui.viewmodels.ProductionViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductionMenuScreen(
    onNavigateToWizard: (Int) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: ProductionViewModel = hiltViewModel()
) {
    val state by viewModel.menuState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadOutstandingJobOrders()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Daftar Job Order (JO)") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadOutstandingJobOrders() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (state.error != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error: ${state.error}", color = MaterialTheme.colorScheme.error)
                }
            } else if (state.jobOrders.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada Job Order yang mengantri.")
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    items(state.jobOrders) { jo ->
                        JobOrderCard(
                            jo = jo,
                            onClick = { onNavigateToWizard(jo.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun JobOrderCard(jo: JobOrder, onClick: () -> Unit) {
    val statusColor = when (jo.status) {
        "DRAFT" -> MaterialTheme.colorScheme.surfaceVariant
        "MATERIALS_RESERVED" -> MaterialTheme.colorScheme.primaryContainer
        "IN_PROGRESS" -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.secondaryContainer
    }
    
    val statusTextColor = when (jo.status) {
        "DRAFT" -> MaterialTheme.colorScheme.onSurfaceVariant
        "MATERIALS_RESERVED" -> MaterialTheme.colorScheme.onPrimaryContainer
        "IN_PROGRESS" -> MaterialTheme.colorScheme.onTertiaryContainer
        else -> MaterialTheme.colorScheme.onSecondaryContainer
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
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
                    text = jo.jo_number,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Surface(
                    color = statusColor,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = jo.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = statusTextColor
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Pelanggan: ${jo.customer_name ?: "-"}",
                style = MaterialTheme.typography.bodyMedium
            )
            
            Text(
                text = "Tenggat Waktu: ${jo.due_date?.split("T")?.get(0) ?: "-"}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error.copy(alpha=if(jo.priority <= 2) 1f else 0f) // Highlight urgent ones
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Progress Bar
            val progressProgress = (jo.progress_pct / 100).toFloat()
            LinearProgressIndicator(
                progress = { progressProgress },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "${jo.total_completed} / ${jo.total_ordered} selesai (${jo.progress_pct}%)",
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.align(Alignment.End)
            )
        }
    }
}
