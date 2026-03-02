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
import androidx.compose.material.icons.filled.Check
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
import com.example.wmsenterprisescanner.ui.viewmodels.OutboundViewModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OutboundPickingScreen(
    doId: Int,
    onNavigateBack: () -> Unit,
    onFinishPicking: () -> Unit,
    viewModel: OutboundViewModel = hiltViewModel()
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

    val state by viewModel.pickState.collectAsState()

    // ToneGenerator for beeps
    val toneGen = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }

    // Debounce state
    var lastScannedBarcode by remember { mutableStateOf<String?>(null) }
    var lastScanTime by remember { mutableStateOf(0L) }
    var continuousMessage by remember { mutableStateOf("Mulai Memindai Batch Barang...") }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Izin kamera diperlukan untuk mode ini", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(Unit) {
        viewModel.selectDO(doId)
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    LaunchedEffect(state.isSubmitSuccess) {
        if (state.isSubmitSuccess) {
            Toast.makeText(context, "DO berhasil diselesaikan!", Toast.LENGTH_LONG).show()
            onFinishPicking()
        }
    }

    LaunchedEffect(state.scanSuccess, state.error) {
        if (state.scanSuccess != null) {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150) // SUCCESS BEEP
            continuousMessage = "✅ ${state.scanSuccess}"
            viewModel.dismissSuccess()
        } else if (state.error != null && !state.isLoading) {
            toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300) // ERROR BEEP
            continuousMessage = "❌ ${state.error}"
            viewModel.dismissError()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            toneGen.release()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Picking DO: ${state.deliveryOrder?.do_number ?: "..."}") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (state.deliveryOrder != null) {
                        Button(
                            onClick = { viewModel.submitPick() },
                            enabled = !state.isLoading,
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text("Selesai & Kirim")
                        }
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
            // == TOP HALF: REQUIRED ITEMS ==
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.4f)
                    .padding(8.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    Text("Daftar Barang (Target DO)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Divider(modifier = Modifier.padding(vertical = 4.dp))
                    
                    if (state.deliveryOrder == null) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                    } else {
                        LazyColumn(modifier = Modifier.fillMaxSize()) {
                            items(state.deliveryOrder!!.lines) { line ->
                                // Calculate how much was picked
                                val pickedQty = state.pickedItems
                                    .filter { it.product_id == line.product_id }
                                    .sumOf { it.qty }
                                
                                val isComplete = pickedQty >= line.qty_shipped

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(line.description, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                        Text("Target: ${line.qty_shipped}", style = MaterialTheme.typography.bodySmall)
                                    }
                                    
                                    Surface(
                                        color = if (isComplete) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
                                        shape = MaterialTheme.shapes.small
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = "Pick: $pickedQty",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = if (isComplete) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSecondaryContainer
                                            )
                                            if (isComplete) {
                                                Icon(
                                                    Icons.Default.Check, 
                                                    contentDescription = "Complete", 
                                                    modifier = Modifier.size(16.dp).padding(start = 4.dp),
                                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                                )
                                            }
                                        }
                                    }
                                }
                                Divider()
                            }
                        }
                    }
                }
            }

            // == BOTTOM HALF: SCANNER ==
            if (hasCameraPermission) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(0.6f)
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
                                                                // Debounce: 2.5 seconds block for exactly the same barcode
                                                                if (barcodeValue != lastScannedBarcode || (currentTime - lastScanTime) > 2500) {
                                                                    lastScannedBarcode = barcodeValue
                                                                    lastScanTime = currentTime
                                                                    viewModel.handleScan(barcodeValue)
                                                                }
                                                            }
                                                        }
                                                    }
                                                    .addOnFailureListener {
                                                        Log.e("ContinuousScanner", "Barcode scanning failed", it)
                                                    }
                                                    .addOnCompleteListener {
                                                        imageProxy.close()
                                                    }
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
                                    Log.e("ContinuousScanner", "Use case binding failed", e)
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
                            .height(150.dp)
                            .align(Alignment.Center),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        border = BorderStroke(2.dp, Color.Yellow)
                    ) {}
                    
                    // Feedback Card overlay at bottom of scanner
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                            .align(Alignment.BottomCenter),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(continuousMessage, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            if (state.isLoading) {
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
            } else {
                Box(modifier = Modifier.weight(0.6f).fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Requesting Camera Permission...", modifier = Modifier.padding(16.dp))
                }
            }
        }
    }
}
