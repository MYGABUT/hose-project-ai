package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.model.Batch
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.PutawayViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.PutawayStep

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PutawayScreen(
    viewModel: PutawayViewModel,
    scannedBarcode: String?,
    onNavigateToScanner: () -> Unit,
    onNavigateBack: () -> Unit,
    onScanConsumed: () -> Unit
) {
    val currentStep by viewModel.currentStep.collectAsState()
    val scannedBatch by viewModel.scannedBatch.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSuccess by viewModel.isSuccess.collectAsState()
    val context = LocalContext.current
    var locationCode by remember { mutableStateOf("") }

    LaunchedEffect(scannedBarcode) {
        if (scannedBarcode != null) {
            when (currentStep) {
                PutawayStep.SCAN_BATCH -> viewModel.lookupBatch(scannedBarcode)
                PutawayStep.PICK_LOCATION -> locationCode = scannedBarcode
                PutawayStep.CONFIRM -> {}
            }
            onScanConsumed()
        }
    }

    LaunchedEffect(isSuccess) {
        if (isSuccess) {
            Toast.makeText(context, "✅ Putaway berhasil!", Toast.LENGTH_SHORT).show()
            viewModel.reset()
            locationCode = ""
        }
    }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("📥 Putaway Wizard", color = YtWhite) },
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
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Stepper
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                StepIndicator("1", "Scan Batch", currentStep.ordinal >= 0, currentStep == PutawayStep.SCAN_BATCH)
                StepIndicator("2", "Pilih Lokasi", currentStep.ordinal >= 1, currentStep == PutawayStep.PICK_LOCATION)
                StepIndicator("3", "Konfirmasi", currentStep.ordinal >= 2, currentStep == PutawayStep.CONFIRM)
            }

            HorizontalDivider(color = YtDarkGray)

            when (currentStep) {
                PutawayStep.SCAN_BATCH -> {
                    Text("📦 Scan barcode batch yang akan disimpan", color = YtWhite,
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Button(
                        onClick = onNavigateToScanner,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = YtRed),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("📷 Scan Barcode Batch", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }

                    if (isLoading) {
                        CircularProgressIndicator(color = YtRed, modifier = Modifier.align(Alignment.CenterHorizontally))
                    }
                }

                PutawayStep.PICK_LOCATION -> {
                    // Show scanned batch info
                    if (scannedBatch != null) {
                        val batch = scannedBatch!!
                        Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                            Column(Modifier.padding(16.dp)) {
                                Text("✅ Batch ditemukan", color = androidx.compose.ui.graphics.Color(0xFF4CAF50), fontWeight = FontWeight.Bold)
                                Text("Barcode: ${batch.barcode}", color = YtWhite)
                                Text("Produk: ${batch.product_name ?: batch.product_sku ?: "-"}", color = YtLightGray)
                                Text("Qty: ${batch.current_qty} | Lokasi saat ini: ${batch.location ?: "Belum ditempatkan"}", color = YtMediumGray)
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Text("📍 Pilih lokasi penyimpanan", color = YtWhite,
                        style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = locationCode, onValueChange = { locationCode = it },
                            label = { Text("Kode Rak") },
                            placeholder = { Text("WH1-HOSE-A01", color = YtMediumGray) },
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                                focusedBorderColor = YtRed, unfocusedBorderColor = YtDarkGray,
                                cursorColor = YtRed, focusedLabelColor = YtRed, unfocusedLabelColor = YtMediumGray
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        Button(
                            onClick = onNavigateToScanner,
                            colors = ButtonDefaults.buttonColors(containerColor = YtBlue)
                        ) { Text("📷 SCAN") }
                    }

                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { viewModel.setLocation(locationCode) },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = locationCode.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = YtRed),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Lanjut ke Konfirmasi →", fontWeight = FontWeight.Bold) }
                }

                PutawayStep.CONFIRM -> {
                    val batch = scannedBatch!!
                    Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("📋 Konfirmasi Putaway", fontWeight = FontWeight.Bold, color = YtWhite,
                                style = MaterialTheme.typography.titleMedium)
                            HorizontalDivider(color = YtDarkGray)
                            ConfirmRow("Barcode", batch.barcode)
                            ConfirmRow("Produk", batch.product_name ?: batch.product_sku ?: "-")
                            ConfirmRow("Qty", "${batch.current_qty}")
                            ConfirmRow("Dari", batch.location ?: "Staging")
                            ConfirmRow("Ke", locationCode)
                        }
                    }

                    Spacer(Modifier.height(16.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = { viewModel.reset(); locationCode = "" },
                            modifier = Modifier.weight(1f).height(50.dp)
                        ) { Text("← Kembali", color = YtMediumGray) }

                        Button(
                            onClick = { viewModel.confirmPutaway(locationCode) },
                            modifier = Modifier.weight(1f).height(50.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = YtRed),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isLoading
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(color = YtWhite, modifier = Modifier.size(24.dp))
                            } else {
                                Text("✅ Konfirmasi", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StepIndicator(number: String, label: String, reached: Boolean, active: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier.size(32.dp)
                .background(
                    if (active) YtRed else if (reached) YtDarkSurfaceVariant else YtDarkGray,
                    RoundedCornerShape(16.dp)
                ),
            contentAlignment = Alignment.Center
        ) { Text(number, color = YtWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp) }
        Spacer(Modifier.height(4.dp))
        Text(label, color = if (active) YtWhite else YtMediumGray, fontSize = 10.sp)
    }
}

@Composable
private fun ConfirmRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = YtMediumGray, fontSize = 13.sp)
        Text(value, color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}
