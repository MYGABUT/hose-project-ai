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
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.wmsenterprisescanner.ui.viewmodels.OpnameViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.ScanActionState
import com.example.wmsenterprisescanner.ui.viewmodels.FinalizeState
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContinuousScannerScreen(
    opnameId: Int,
    viewModel: OpnameViewModel,
    onNavigateBack: () -> Unit
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

    val scanState by viewModel.scanState.collectAsState()

    // ToneGenerator for beeps
    val toneGen = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }

    // Debounce state
    var lastScannedBarcode by remember { mutableStateOf<String?>(null) }
    var lastScanTime by remember { mutableStateOf(0L) }
    var continuousMessage by remember { mutableStateOf("Mulai Memindai...") }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Izin kamera diperlukan untuk mode ini", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    LaunchedEffect(scanState) {
        if (scanState is ScanActionState.Success) {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150) // SUCCESS BEEP
            val msg = (scanState as ScanActionState.Success).response.message
            continuousMessage = "✅ $msg"
            viewModel.resetScanState() // Ready for next
        } else if (scanState is ScanActionState.Error) {
            toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300) // ERROR BEEP
            val msg = (scanState as ScanActionState.Error).message
            continuousMessage = "❌ $msg"
            viewModel.resetScanState() // Ready for next
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            toneGen.release()
            viewModel.resetScanState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scanner Audit Beruntun") },
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
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (hasCameraPermission) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
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
                                            if (scanState is ScanActionState.Processing) {
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
                                                                // Debounce: 2.5 seconds block for the exactly same barcode
                                                                if (barcodeValue != lastScannedBarcode || (currentTime - lastScanTime) > 2500) {
                                                                    lastScannedBarcode = barcodeValue
                                                                    lastScanTime = currentTime
                                                                    viewModel.scanItem(opnameId, barcodeValue)
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
                        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.Transparent),
                        border = androidx.compose.foundation.BorderStroke(2.dp, androidx.compose.ui.graphics.Color.Yellow)
                    ) {}
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(continuousMessage, style = MaterialTheme.typography.titleMedium)
                        if (scanState is ScanActionState.Processing) {
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
            } else {
                Text(
                    text = "Requesting Camera Permission...",
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    }
}
