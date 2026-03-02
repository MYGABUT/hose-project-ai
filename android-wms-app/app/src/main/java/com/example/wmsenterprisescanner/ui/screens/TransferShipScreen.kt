package com.example.wmsenterprisescanner.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.TransferViewModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransferShipScreen(
    transferId: Int,
    viewModel: TransferViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onFinishShipping: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Izin kamera diperlukan untuk scanner", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
        viewModel.selectTransferForShipping(transferId)
    }

    val state by viewModel.shipState.collectAsState()
    val toneGen = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }

    // Audio Feedback & Navigation Handle
    LaunchedEffect(state.scanSuccess, state.error, state.isSubmitSuccess) {
        if (state.scanSuccess != null) {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
            Toast.makeText(context, state.scanSuccess, Toast.LENGTH_SHORT).show()
            viewModel.dismissShipSuccess()
        } else if (state.error != null && !state.isLoading) {
            toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300)
            Toast.makeText(context, state.error, Toast.LENGTH_LONG).show()
            viewModel.dismissShipError()
        }
        
        if (state.isSubmitSuccess) {
            Toast.makeText(context, "Transfer berhasil dikirim!", Toast.LENGTH_LONG).show()
            onFinishShipping()
        }
    }

    // Camera scanner state
    var lastScannedBarcode by remember { mutableStateOf<String?>(null) }
    var lastScanTime by remember { mutableStateOf(0L) }

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
        ) {
            if (state.transfer == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                return@Scaffold
            }

            // --- CAMERA SCANNER (TOP HALF) ---
            if (hasCameraPermission) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(0.4f)
                ) {
                    AndroidView(
                        factory = { ctx ->
                            val previewView = PreviewView(ctx)
                            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                            cameraProviderFuture.addListener({
                                val cameraProvider = cameraProviderFuture.get()
                                val preview = Preview.Builder().build().also {
                                    it.setSurfaceProvider(previewView.surfaceProvider)
                                }
                                val options = BarcodeScannerOptions.Builder()
                                    .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
                                    .build()
                                val barcodeScanner = BarcodeScanning.getClient(options)
                                val cameraExecutor = Executors.newSingleThreadExecutor()

                                val imageAnalyzer = ImageAnalysis.Builder()
                                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                    .build()
                                    .also { analysis ->
                                        analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                            if (state.isLoading) {
                                                imageProxy.close()
                                                return@setAnalyzer
                                            }

                                            val mediaImage = imageProxy.image
                                            if (mediaImage != null) {
                                                val image = InputImage.fromMediaImage(
                                                    mediaImage,
                                                    imageProxy.imageInfo.rotationDegrees
                                                )
                                                barcodeScanner.process(image)
                                                    .addOnSuccessListener { barcodes ->
                                                        if (barcodes.isNotEmpty()) {
                                                            val barcodeValue = barcodes.first().rawValue
                                                            if (barcodeValue != null) {
                                                                val currentTime = System.currentTimeMillis()
                                                                if (barcodeValue != lastScannedBarcode || (currentTime - lastScanTime) > 2000) {
                                                                    lastScannedBarcode = barcodeValue
                                                                    lastScanTime = currentTime
                                                                    viewModel.handleScanForShipping(barcodeValue)
                                                                }
                                                            }
                                                        }
                                                    }
                                                    .addOnCompleteListener { imageProxy.close() }
                                            } else {
                                                imageProxy.close()
                                            }
                                        }
                                    }

                                try {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(
                                        lifecycleOwner,
                                        CameraSelector.DEFAULT_BACK_CAMERA,
                                        preview,
                                        imageAnalyzer
                                    )
                                } catch (e: Exception) {
                                    Log.e("Scanner", "Use case binding failed", e)
                                }
                            }, ContextCompat.getMainExecutor(ctx))

                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    // Reticle
                    Card(
                        modifier = Modifier
                            .fillMaxWidth(0.8f)
                            .height(120.dp)
                            .align(Alignment.Center),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        border = BorderStroke(2.dp, Color.Green)
                    ) {}
                    
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }
                }
            } else {
                Box(modifier = Modifier.weight(0.4f).fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Memerlukan akses kamera.")
                }
            }

            // --- ITEM LIST (BOTTOM HALF) ---
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.6f)
                    .padding(horizontal = 16.dp)
            ) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Dari: ${state.transfer!!.from_location_name}", style = MaterialTheme.typography.bodySmall)
                    Text("Ke: ${state.transfer!!.to_location_name}", style = MaterialTheme.typography.bodySmall)
                }
                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Daftar Barang (Scan barcode batch fisik)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                LazyColumn(modifier = Modifier.weight(1f)) {
                    val itemsToPick = state.transfer?.items ?: emptyList()
                    items(itemsToPick) { line ->
                        val pickedQty = state.pickedItems.filter { it.product_id == line.product_id }.sumOf { it.qty }
                        TransferLineShipItem(
                            sku = line.product_sku,
                            name = line.product_name,
                            requestedQty = line.qty_requested,
                            pickedQty = pickedQty,
                            unit = line.unit
                        )
                    }
                }
                
                // Submit Button
                val isFullyPicked = state.transfer!!.items.all { line ->
                    val pickedQty = state.pickedItems.filter { it.product_id == line.product_id }.sumOf { it.qty }
                    pickedQty >= line.qty_requested
                }

                Button(
                    onClick = { viewModel.submitShipment() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    enabled = isFullyPicked && !state.isLoading
                ) {
                    Text(if (isFullyPicked) "Kirim Barang (Ship)" else "Belum Lengkap")
                }
            }
        }
    }
}

@Composable
fun TransferLineShipItem(
    sku: String,
    name: String,
    requestedQty: Double,
    pickedQty: Double,
    unit: String
) {
    val isComplete = pickedQty >= requestedQty
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isComplete) MaterialTheme.colorScheme.primaryContainer.copy(alpha=0.5f) else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = sku, style = MaterialTheme.typography.labelMedium)
                Text(text = name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            }
            Text(
                text = "${pickedQty} / ${requestedQty} $unit",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (isComplete) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
