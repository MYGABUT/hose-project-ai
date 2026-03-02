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
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.data.model.WizardLine
import com.example.wmsenterprisescanner.data.model.WizardStep
import com.example.wmsenterprisescanner.ui.viewmodels.ProductionViewModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductionWizardScreen(
    joId: Int,
    viewModel: ProductionViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onComplete: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val state by viewModel.wizardState.collectAsState()

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
            Toast.makeText(context, "Izin kamera diperlukan", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
        viewModel.loadWizard(joId)
    }

    val toneGen = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }

    // Feedback side effects
    LaunchedEffect(state.isScanSuccess, state.error, state.isCutSuccess, state.isSubmitSuccess) {
        if (state.isScanSuccess) {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
            Toast.makeText(context, state.scanMessage, Toast.LENGTH_SHORT).show()
            viewModel.dismissScanSuccess()
        }
        if (state.error != null && !state.isLoading) {
            toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300)
            Toast.makeText(context, state.error, Toast.LENGTH_LONG).show()
            viewModel.dismissError()
        }
        if (state.isCutSuccess) {
            Toast.makeText(context, "Potongan berhasil direkam.", Toast.LENGTH_SHORT).show()
            viewModel.dismissCutSuccess()
        }
        if (state.isSubmitSuccess) {
            Toast.makeText(context, "Job Order Selesai!", Toast.LENGTH_LONG).show()
            onComplete()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.wizardData?.jo_number ?: "Loading Wizard...") },
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
            if (state.isLoading && state.wizardData == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                return@Scaffold
            }

            val wizard = state.wizardData ?: return@Scaffold

            // Display Top Status Bar
            Surface(color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Status: ${wizard.status}", fontWeight = FontWeight.Bold)
                    Text("Langkah: ${wizard.current_step}/${wizard.total_steps}")
                }
            }

            if (wizard.status == "DRAFT" || wizard.status == "MATERIALS_RESERVED") {
                Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Button(onClick = { viewModel.startJobOrder(joId) }) {
                        Text("Mulai Perakitan (Start JO)")
                    }
                }
                return@Scaffold
            }

            if (wizard.lines.all { it.progress.completed >= it.target.qty }) {
                Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Semua item telah dirakit!", style = MaterialTheme.typography.titleLarge)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.completeJobOrder(joId) }) {
                            Text("Selesaikan Job Order (Complete)")
                        }
                    }
                }
                return@Scaffold
            }

            // Find currently active line
            val activeLine = wizard.lines.find { it.id == state.activeLineId } 
                ?: wizard.lines.firstOrNull { it.progress.completed < it.target.qty }

            if (activeLine != null) {
                WizardLineView(
                    line = activeLine,
                    hasCameraPermission = hasCameraPermission,
                    lifecycleOwner = lifecycleOwner,
                    isLoading = state.isLoading,
                    onScanMaterial = { barcode, materialId ->
                        viewModel.scanMaterial(materialId, barcode, joId)
                    },
                    onCompleteCut = { materialId, qty ->
                        viewModel.completeCut(materialId, qty, joId)
                    },
                    onUpdateProgress = { qty, notes ->
                        viewModel.updateLineProgress(joId, activeLine.id, qty, notes)
                    }
                )
            }
        }
    }
}

@Composable
fun WizardLineView(
    line: WizardLine,
    hasCameraPermission: Boolean,
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    isLoading: Boolean,
    onScanMaterial: (String, Int) -> Unit,
    onCompleteCut: (Int, Double) -> Unit,
    onUpdateProgress: (Int, String?) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("Line ${line.line_number}: ${line.description}", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Target: ${line.target.qty} pcs @ ${line.target.cut_length}m", style = MaterialTheme.typography.bodyMedium)
                    Text("Selesai: ${line.progress.completed}/${line.target.qty}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
        }

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        // Steps Configuration
        LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
            items(line.steps) { step ->
                WizardStepCard(
                    step = step,
                    hasCameraPermission = hasCameraPermission,
                    lifecycleOwner = lifecycleOwner,
                    isLoading = isLoading,
                    onScanMaterial = onScanMaterial,
                    onCompleteCut = onCompleteCut,
                    onProgressClick = { notes ->
                        // Advance 1 assembly unit. If it's a bulk operation, we can modify this.
                        onUpdateProgress(1, notes)
                    }
                )
            }
        }
    }
}

@Composable
fun WizardStepCard(
    step: WizardStep,
    hasCameraPermission: Boolean,
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    isLoading: Boolean,
    onScanMaterial: (String, Int) -> Unit,
    onCompleteCut: (Int, Double) -> Unit,
    onProgressClick: (String?) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Langkah ${step.step_number}", style = MaterialTheme.typography.labelMedium)
            Text(step.instruction, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(12.dp))

            when (step.action_type) {
                "SCAN_MATERIAL" -> {
                    if (step.material != null) {
                        Text("Bahan: ${step.material.product_name}")
                        Text("Harus menscan barcode batch untuk melanjutkan.")
                        
                        if (hasCameraPermission) {
                            Box(modifier = Modifier.fillMaxWidth().height(150.dp).padding(top = 8.dp)) {
                                AndroidView(
                                    factory = { ctx ->
                                        val previewView = PreviewView(ctx)
                                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                                        cameraProviderFuture.addListener({
                                            val cameraProvider = cameraProviderFuture.get()
                                            val preview = Preview.Builder().build().also { it.setSurfaceProvider(previewView.surfaceProvider) }
                                            val options = BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS).build()
                                            val barcodeScanner = BarcodeScanning.getClient(options)
                                            val cameraExecutor = Executors.newSingleThreadExecutor()

                                            val imageAnalyzer = ImageAnalysis.Builder()
                                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                                .build().also { analysis ->
                                                    analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                                        if (isLoading) { imageProxy.close(); return@setAnalyzer }
                                                        val mediaImage = imageProxy.image
                                                        if (mediaImage != null) {
                                                            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                                            barcodeScanner.process(image)
                                                                .addOnSuccessListener { barcodes ->
                                                                    if (barcodes.isNotEmpty()) {
                                                                        val barcodeValue = barcodes.first().rawValue
                                                                        if (barcodeValue != null) {
                                                                             onScanMaterial(barcodeValue, step.material.material_id)
                                                                        }
                                                                    }
                                                                }.addOnCompleteListener { imageProxy.close() }
                                                        } else { imageProxy.close() }
                                                    }
                                                }
                                            try {
                                                cameraProvider.unbindAll()
                                                cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageAnalyzer)
                                            } catch (e: Exception) { Log.e("Scanner", "Binding failed", e) }
                                        }, ContextCompat.getMainExecutor(ctx))
                                        previewView
                                    }, modifier = Modifier.fillMaxSize()
                                )
                            }
                        }
                    }
                }
                "CUTTING" -> {
                    if (step.material != null) {
                       Text("Target Potong: ${step.material.target_qty}m")
                       var actualCut by remember { mutableStateOf(step.material.target_qty.toString()) }
                       
                       OutlinedTextField(
                           value = actualCut,
                           onValueChange = { actualCut = it },
                           label = { Text("Riil Pemotongan (Total meter)") },
                           keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                           modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                       )
                       
                       Button(
                           onClick = { 
                               val qty = actualCut.toDoubleOrNull()
                               if(qty != null) onCompleteCut(step.material.material_id, qty) 
                           },
                           modifier = Modifier.align(Alignment.End),
                           enabled = !isLoading
                       ) {
                           Text("Konfirmasi Potong")
                       }
                    }
                }
                "ASSEMBLY" -> {
                    Button(
                        onClick = { onProgressClick(null) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading
                    ) {
                        Text("Selesai 1 Rakitan / Crimping")
                    }
                }
            }
        }
    }
}
