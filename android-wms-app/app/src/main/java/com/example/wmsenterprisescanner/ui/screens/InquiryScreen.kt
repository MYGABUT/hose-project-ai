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
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.wmsenterprisescanner.data.model.Batch
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.InquiryViewModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InquiryScreen(
    onNavigateBack: () -> Unit,
    viewModel: InquiryViewModel = hiltViewModel()
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

    val state by viewModel.uiState.collectAsState()
    val toneGen = remember { ToneGenerator(AudioManager.STREAM_MUSIC, 100) }
    var lastScannedBarcode by remember { mutableStateOf<String?>(null) }
    var lastScanTime by remember { mutableStateOf(0L) }

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

    LaunchedEffect(state.scannedBatch, state.error) {
        if (state.scannedBatch != null) {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        } else if (state.error != null && !state.isLoading) {
            toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300)
            Toast.makeText(context, state.error, Toast.LENGTH_SHORT).show()
            viewModel.dismissError()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            toneGen.release()
            viewModel.resetScan()
        }
    }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Cek Cepat Barang", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // == TOP: SCANNER ==
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
                                            if (state.isLoading) { imageProxy.close(); return@setAnalyzer }
                                            val mediaImage = imageProxy.image
                                            if (mediaImage != null) {
                                                val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                                                barcodeScanner.process(image)
                                                    .addOnSuccessListener { barcodes ->
                                                        if (barcodes.isNotEmpty()) {
                                                            val barcodeValue = barcodes.first().rawValue
                                                            if (barcodeValue != null) {
                                                                val currentTime = System.currentTimeMillis()
                                                                if (barcodeValue != lastScannedBarcode || (currentTime - lastScanTime) > 2000) {
                                                                    lastScannedBarcode = barcodeValue
                                                                    lastScanTime = currentTime
                                                                    viewModel.scanBarcode(barcodeValue)
                                                                }
                                                            }
                                                        }
                                                    }
                                                    .addOnFailureListener { Log.e("Scanner", "Failed", it) }
                                                    .addOnCompleteListener { imageProxy.close() }
                                            } else { imageProxy.close() }
                                        }
                                    }
                                try {
                                    cameraProvider.unbindAll()
                                    cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageAnalyzer)
                                } catch (e: Exception) { Log.e("Scanner", "Bind failed", e) }
                            }, ContextCompat.getMainExecutor(ctx))
                            previewView
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                    Card(
                        modifier = Modifier.fillMaxWidth(0.8f).height(120.dp).align(Alignment.Center),
                        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                        border = BorderStroke(2.dp, YtRed)
                    ) {}
                    if (state.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = YtRed)
                    }
                }
            } else {
                Box(modifier = Modifier.weight(0.4f).fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Requesting Camera Permission...", modifier = Modifier.padding(16.dp), color = YtWhite)
                }
            }

            // == BOTTOM: DETAIL ==
            if (state.scannedBatch == null) {
                Box(
                    modifier = Modifier.fillMaxWidth().weight(0.6f).background(YtDarkSurface),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Arahkan kamera ke barcode batch\nuntuk melihat detail produk",
                        style = MaterialTheme.typography.bodyMedium,
                        color = YtMediumGray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(32.dp)
                    )
                }
            } else {
                ProductDetailWithGallery(
                    batch = state.scannedBatch!!,
                    modifier = Modifier.fillMaxWidth().weight(0.6f)
                )
            }
        }
    }
}

// ========== YouTube-Styled Product Detail with Instagram Gallery ==========

@Composable
fun ProductDetailWithGallery(batch: Batch, modifier: Modifier = Modifier) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Info", "Galeri")

    Column(modifier = modifier.background(YtDarkSurface)) {
        // Product Header
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                batch.product_name ?: "Unknown Product",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = YtWhite
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${batch.barcode} • ${batch.location ?: "No Location"}",
                style = MaterialTheme.typography.bodySmall,
                color = YtMediumGray
            )
        }

        // Tab Row (Instagram-style)
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = YtDarkSurface,
            contentColor = YtWhite,
            divider = { HorizontalDivider(color = YtDarkGray) }
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            title,
                            fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                            color = if (selectedTab == index) YtWhite else YtMediumGray
                        )
                    }
                )
            }
        }

        when (selectedTab) {
            0 -> InfoTab(batch)
            1 -> InstagramPhotoGrid(productName = batch.product_name ?: "Product")
        }
    }
}

@Composable
fun InfoTab(batch: Batch) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            StatBox("Tersedia", "${batch.available_qty}", YtGreen)
            StatBox("Awal", "${batch.initial_qty ?: "-"}", YtBlue)
        }
        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider(color = YtDarkGray)
        Spacer(modifier = Modifier.height(12.dp))
        DetailRow("SKU", batch.product_sku ?: "-")
        DetailRow("Batch Barcode", batch.barcode)
        DetailRow("Lokasi Rak", batch.location ?: "Unassigned")
        DetailRow("Status", batch.status)
        DetailRow("Tanggal Masuk", formatIsoDate(batch.received_date))
    }
}

@Composable
fun StatBox(label: String, value: String, color: Color) {
    Card(
        modifier = Modifier.width(120.dp),
        colors = CardDefaults.cardColors(containerColor = YtDarkSurfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = color)
            Spacer(modifier = Modifier.height(4.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = YtLightGray)
        }
    }
}

@Composable
fun InstagramPhotoGrid(productName: String) {
    val galleryColors = listOf(YtRed, YtBlue, YtGreen, YtOrange, YtPurple, YtTeal, YtPink, YtAmber, YtRed.copy(alpha = 0.6f))
    val labels = listOf("Front", "Side", "Back", "Label", "Detail", "Packaging", "Spec", "Serial", "QC")

    LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(1.dp),
        horizontalArrangement = Arrangement.spacedBy(1.dp),
        verticalArrangement = Arrangement.spacedBy(1.dp)
    ) {
        items(galleryColors.size) { index ->
            Box(
                modifier = Modifier
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(0.dp))
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                galleryColors[index].copy(alpha = 0.7f),
                                galleryColors[index].copy(alpha = 0.3f)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = productName.take(2).uppercase(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 24.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = labels[index],
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 10.sp
                    )
                }
            }
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = YtMediumGray)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = YtWhite)
    }
}

fun formatIsoDate(isoString: String?): String {
    if (isoString.isNullOrEmpty()) return "-"
    try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        parser.timeZone = TimeZone.getTimeZone("UTC")
        val date = parser.parse(isoString) ?: return isoString
        val formatter = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
        formatter.timeZone = TimeZone.getDefault()
        return formatter.format(date)
    } catch (e: Exception) {
        return isoString
    }
}
