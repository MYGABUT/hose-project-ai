package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.QCViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QCInspectScreen(
    lineId: Int,
    viewModel: QCViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val state by viewModel.inspectState.collectAsState()

    LaunchedEffect(lineId) {
        viewModel.selectItemForInspection(lineId)
    }

    LaunchedEffect(state.isSubmitSuccess, state.error) {
        if (state.isSubmitSuccess) {
            Toast.makeText(context, state.successMessage ?: "QC Lolos", Toast.LENGTH_LONG).show()
            onComplete()
        }
        if (state.error != null && !state.isLoading) {
            Toast.makeText(context, state.error, Toast.LENGTH_LONG).show()
            viewModel.dismissInspectError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quality Control (QC)") },
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
            val item = state.selectedItem
            if (item == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Item data not found. Please go back and try again.")
                }
                return@Scaffold
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Detail Barang", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Divider(modifier = Modifier.padding(vertical = 8.dp))
                    Text("Asal JO: ${item.jo_number}")
                    Text("Produk: ${item.product_name}")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Menunggu QC (Kuantitas Produksi): ${item.qty_pending}")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            var qtyPassedInput by remember { mutableStateOf(item.qty_pending.toString()) }
            var qtyFailedInput by remember { mutableStateOf("0") }
            var notesInput by remember { mutableStateOf("") }

            OutlinedTextField(
                value = qtyPassedInput,
                onValueChange = { qtyPassedInput = it },
                label = { Text("Lolos QC (Passed Qty)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = qtyFailedInput,
                onValueChange = { qtyFailedInput = it },
                label = { Text("Gagal QC / Scrap (Failed Qty)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = notesInput,
                onValueChange = { notesInput = it },
                label = { Text("Catatan (Opsional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = { 
                    val passed = qtyPassedInput.toDoubleOrNull() ?: 0.0
                    val failed = qtyFailedInput.toDoubleOrNull() ?: 0.0
                    viewModel.submitInspection(passed, failed, notesInput.takeIf { it.isNotBlank() })
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = !state.isLoading
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Kirim Hasil QC", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
