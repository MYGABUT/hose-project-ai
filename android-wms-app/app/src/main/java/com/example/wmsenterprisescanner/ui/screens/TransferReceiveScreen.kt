package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.TransferViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransferReceiveScreen(
    transferId: Int,
    viewModel: TransferViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onFinishReceiving: () -> Unit
) {
    val context = LocalContext.current
    val state by viewModel.receiveState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.selectTransferForReceiving(transferId)
    }

    LaunchedEffect(state.error, state.isSubmitSuccess) {
        if (state.error != null && !state.isLoading) {
            Toast.makeText(context, state.error, Toast.LENGTH_LONG).show()
            viewModel.dismissReceiveError()
        }
        if (state.isSubmitSuccess) {
            Toast.makeText(context, "Transfer berhasil diterima!", Toast.LENGTH_LONG).show()
            onFinishReceiving()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.transfer?.transfer_number ?: "Loading...") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            if (state.isLoading && state.transfer == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                return@Scaffold
            }

            val transfer = state.transfer ?: return@Scaffold

            Text(
                text = "Penerimaan Barang Mutasi",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Dari:", style = MaterialTheme.typography.labelMedium)
                        Text(transfer.from_location_name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Tujuan Saya:", style = MaterialTheme.typography.labelMedium)
                        Text(transfer.to_location_name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Daftar Barang Dikirim",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(transfer.items) { item ->
                    val receivedItem = state.receivedItems.find { it.id == item.id }
                    val currentQty = receivedItem?.qty_received ?: item.qty_shipped
                    
                    ReceiveItemCard(
                        sku = item.product_sku,
                        name = item.product_name,
                        shippedQty = item.qty_shipped,
                        currentQty = currentQty,
                        unit = item.unit,
                        onQtyChange = { val str = it.toDoubleOrNull(); if (str != null) viewModel.updateReceiveQty(item.id, str) }
                    )
                }
            }

            Button(
                onClick = { viewModel.submitReceipt() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                enabled = !state.isLoading
            ) {
                Text(if (state.isLoading) "Memproses..." else "Konfirmasi Penerimaan")
            }
        }
    }
}

@Composable
fun ReceiveItemCard(
    sku: String,
    name: String,
    shippedQty: Double,
    currentQty: Double,
    unit: String,
    onQtyChange: (String) -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = sku, style = MaterialTheme.typography.labelMedium)
            Text(text = name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Dikirim", style = MaterialTheme.typography.labelSmall)
                    Text("$shippedQty $unit", style = MaterialTheme.typography.titleSmall)
                }
                
                OutlinedTextField(
                    value = currentQty.toString(),
                    onValueChange = onQtyChange,
                    label = { Text("Diterima ($unit)") },
                    modifier = Modifier.width(150.dp),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number)
                )
            }
        }
    }
}
