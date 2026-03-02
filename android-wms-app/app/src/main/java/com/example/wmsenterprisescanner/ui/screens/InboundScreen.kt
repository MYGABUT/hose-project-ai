package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.wmsenterprisescanner.data.model.BatchInboundRequest
import com.example.wmsenterprisescanner.data.model.Product
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.InboundState
import com.example.wmsenterprisescanner.ui.viewmodels.InventoryViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.ProductsState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Constants matching web HoseDataForm
private val BRANDS = listOf(
    "EATON", "YOKOHAMA", "PARKER", "MANULI", "GATES", "OLWEG",
    "BRIDGESTONE", "CENTAUR", "CONTITECH", "DUNLOP", "FLEXTRAL",
    "KURIYAMA", "MOELLER", "RYCO", "SEMPERIT", "ALFAGOMMA", "AEROQUIP", "HYDRAULINK"
)
private val CATEGORIES = listOf("Hose", "Fitting", "Adaptor", "Ferrule", "Valve", "Coupling", "Lainnya")
private val STANDARDS = listOf("R1", "R2", "R12", "R13", "R15", "1SN", "2SN", "4SP", "4SH")
private val SIZES_INCH = listOf("1/4", "3/8", "1/2", "5/8", "3/4", "1", "1-1/4", "1-1/2", "2")
private val DN_SIZES = listOf("DN6", "DN8", "DN10", "DN12", "DN16", "DN19", "DN25", "DN32", "DN38", "DN50")
private val WIRE_TYPES = listOf("1 Wire Braid", "2 Wire Braid", "4 Wire Spiral", "6 Wire Spiral")
private val THREAD_TYPES = listOf("JIC 37°", "BSPP", "BSPT", "NPT", "ORFS", "Metric", "SAE ORB", "JIS")
private val SEAL_TYPES = listOf("O-Ring", "Tapered", "Flat Face", "Metal to Metal", "Bonded Seal")
private val CONFIGURATIONS = listOf("Straight (Lurus)", "45° Elbow", "90° Elbow", "Tee", "Cross", "Plug/Cap")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboundScreen(
    viewModel: InventoryViewModel,
    scannedLocation: String?,
    onNavigateToScanner: () -> Unit,
    onNavigateBack: () -> Unit,
    onScanConsumed: () -> Unit
) {
    val context = LocalContext.current
    val productsState by viewModel.productsState.collectAsState()
    val inboundState by viewModel.inboundState.collectAsState()

    // Mode: 0 = Quick Scan (existing), 1 = Manual Entry (new)
    var selectedMode by remember { mutableIntStateOf(1) }

    // Form State
    var searchQuery by remember { mutableStateOf("") }
    var selectedProduct by remember { mutableStateOf<Product?>(null) }
    var selectedCategory by remember { mutableStateOf("Hose") }
    var brand by remember { mutableStateOf("") }
    var useManualBrand by remember { mutableStateOf(false) }
    var sku by remember { mutableStateOf("") }
    var standard by remember { mutableStateOf("") }
    var wireType by remember { mutableStateOf("") }
    var sizeInch by remember { mutableStateOf("") }
    var sizeDN by remember { mutableStateOf("") }
    var workingPressureBar by remember { mutableStateOf("") }
    var workingPressurePsi by remember { mutableStateOf("") }
    var threadType by remember { mutableStateOf("") }
    var threadSize by remember { mutableStateOf("") }
    var sealType by remember { mutableStateOf("") }
    var configuration by remember { mutableStateOf("") }
    var isCutPiece by remember { mutableStateOf(false) }
    var cutLength by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1") }
    var locationCode by remember { mutableStateOf(scannedLocation ?: "") }
    var notes by remember { mutableStateOf("") }

    // Auto-convert Bar→PSI
    LaunchedEffect(workingPressureBar) {
        if (workingPressureBar.isNotEmpty() && workingPressurePsi.isEmpty()) {
            val bar = workingPressureBar.toDoubleOrNull()
            if (bar != null) {
                workingPressurePsi = (bar * 14.5038).toInt().toString()
            }
        }
    }

    LaunchedEffect(Unit) { viewModel.fetchProducts() }

    LaunchedEffect(scannedLocation) {
        if (scannedLocation != null) { locationCode = scannedLocation; onScanConsumed() }
    }

    LaunchedEffect(inboundState) {
        if (inboundState is InboundState.Success) {
            Toast.makeText(context, "✅ Inbound Berhasil!", Toast.LENGTH_SHORT).show()
            // Reset form
            selectedProduct = null; searchQuery = ""; brand = ""; sku = ""
            standard = ""; wireType = ""; sizeInch = ""; sizeDN = ""
            workingPressureBar = ""; workingPressurePsi = ""
            threadType = ""; threadSize = ""; sealType = ""; configuration = ""
            isCutPiece = false; cutLength = ""; quantity = "1"
            locationCode = ""; notes = ""
            viewModel.resetInboundState()
        } else if (inboundState is InboundState.Error) {
            Toast.makeText(context, "Error: ${(inboundState as InboundState.Error).message}", Toast.LENGTH_LONG).show()
        }
    }

    val isHose = selectedCategory.uppercase() == "HOSE"
    val isFitting = selectedCategory.uppercase() in listOf("FITTING", "ADAPTOR", "COUPLING", "FERRULE", "VALVE")

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("Terima Barang (Inbound)", color = YtWhite) },
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
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Mode Tabs
            TabRow(
                selectedTabIndex = selectedMode,
                containerColor = YtDarkSurface,
                contentColor = YtWhite,
                divider = { HorizontalDivider(color = YtDarkGray) }
            ) {
                Tab(selected = selectedMode == 0, onClick = { selectedMode = 0 },
                    text = { Text("📦 Scan Cepat", fontWeight = if (selectedMode == 0) FontWeight.Bold else FontWeight.Normal, color = if (selectedMode == 0) YtWhite else YtMediumGray) })
                Tab(selected = selectedMode == 1, onClick = { selectedMode = 1 },
                    text = { Text("✏️ Entry Manual", fontWeight = if (selectedMode == 1) FontWeight.Bold else FontWeight.Normal, color = if (selectedMode == 1) YtWhite else YtMediumGray) })
            }

            when (selectedMode) {
                0 -> QuickScanMode(viewModel, productsState, inboundState, searchQuery, selectedProduct, quantity, locationCode,
                    onSearchChange = { searchQuery = it; viewModel.fetchProducts(if (it.length > 1) it else null) },
                    onProductSelect = { selectedProduct = it; searchQuery = it.name },
                    onClearProduct = { selectedProduct = null; searchQuery = "" },
                    onQtyChange = { quantity = it },
                    onLocationChange = { locationCode = it },
                    onScan = onNavigateToScanner,
                    onSubmit = {
                        val request = BatchInboundRequest(
                            product_id = selectedProduct!!.id,
                            quantity = quantity.toDoubleOrNull() ?: 1.0,
                            location_code = locationCode.ifBlank { null },
                            source_type = "MANUAL"
                        )
                        viewModel.submitInbound(request)
                    }
                )
                1 -> ManualEntryMode(
                    selectedCategory = selectedCategory, onCategoryChange = { selectedCategory = it },
                    brand = brand, onBrandChange = { brand = it }, useManualBrand = useManualBrand, onToggleManualBrand = { useManualBrand = !useManualBrand },
                    sku = sku, onSkuChange = { sku = it },
                    standard = standard, onStandardChange = { standard = it },
                    wireType = wireType, onWireTypeChange = { wireType = it },
                    sizeInch = sizeInch, onSizeInchChange = { sizeInch = it },
                    sizeDN = sizeDN, onSizeDNChange = { sizeDN = it },
                    workingPressureBar = workingPressureBar, onPressureBarChange = { workingPressureBar = it; workingPressurePsi = "" },
                    workingPressurePsi = workingPressurePsi, onPressurePsiChange = { workingPressurePsi = it },
                    threadType = threadType, onThreadTypeChange = { threadType = it },
                    threadSize = threadSize, onThreadSizeChange = { threadSize = it },
                    sealType = sealType, onSealTypeChange = { sealType = it },
                    configuration = configuration, onConfigChange = { configuration = it },
                    isCutPiece = isCutPiece, onCutPieceChange = { isCutPiece = it },
                    cutLength = cutLength, onCutLengthChange = { cutLength = it },
                    quantity = quantity, onQtyChange = { quantity = it },
                    locationCode = locationCode, onLocationChange = { locationCode = it },
                    notes = notes, onNotesChange = { notes = it },
                    onScanLocation = onNavigateToScanner,
                    isHose = isHose, isFitting = isFitting,
                    isSubmitting = inboundState is InboundState.Submitting,
                    onSubmit = {
                        val ts = SimpleDateFormat("yyyyMMddHHmmss", Locale.getDefault()).format(Date())
                        val request = BatchInboundRequest(
                            brand = brand.ifBlank { null },
                            category = selectedCategory,
                            product_sku = sku.ifBlank { null },
                            standard = standard.ifBlank { null },
                            wire_type = wireType.ifBlank { null },
                            size_inch = sizeInch.ifBlank { null },
                            size_dn = sizeDN.ifBlank { null },
                            working_pressure_bar = workingPressureBar.toDoubleOrNull(),
                            working_pressure_psi = workingPressurePsi.toDoubleOrNull(),
                            thread_type = threadType.ifBlank { null },
                            thread_size = threadSize.ifBlank { null },
                            seal_type = sealType.ifBlank { null },
                            configuration = configuration.ifBlank { null },
                            is_cut_piece = isCutPiece,
                            cut_length_cm = cutLength.toDoubleOrNull(),
                            location_code = locationCode.ifBlank { null },
                            barcode = "BATCH-$ts",
                            quantity = quantity.toDoubleOrNull() ?: 1.0,
                            source_type = "MANUAL",
                            notes = notes.ifBlank { null }
                        )
                        viewModel.submitInbound(request)
                    }
                )
            }
        }
    }
}

// ==================== Quick Scan Mode (existing behavior) ====================
@Composable
fun QuickScanMode(
    viewModel: InventoryViewModel, productsState: ProductsState, inboundState: InboundState,
    searchQuery: String, selectedProduct: Product?, quantity: String, locationCode: String,
    onSearchChange: (String) -> Unit, onProductSelect: (Product) -> Unit, onClearProduct: () -> Unit,
    onQtyChange: (String) -> Unit, onLocationChange: (String) -> Unit,
    onScan: () -> Unit, onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        SectionHeader("🔍 Cari Produk")
        OutlinedTextField(
            value = searchQuery, onValueChange = onSearchChange,
            label = { Text("Cari Produk (SKU / Nama)") },
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = { Icon(Icons.Default.Search, null, tint = YtLightGray) },
            colors = ytTextFieldColors()
        )

        if (productsState is ProductsState.Success && selectedProduct == null) {
            val list = (productsState as ProductsState.Success).products
            Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = YtDarkSurfaceVariant)) {
                Column(modifier = Modifier.padding(8.dp)) {
                    list.take(5).forEach { product ->
                        Text(
                            "${product.sku} - ${product.name}", color = YtWhite,
                            modifier = Modifier.fillMaxWidth().clickable { onProductSelect(product) }.padding(8.dp)
                        )
                        HorizontalDivider(color = YtDarkGray)
                    }
                }
            }
        }

        if (selectedProduct != null) {
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurfaceVariant), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Terpilih: ${selectedProduct.sku}", fontWeight = FontWeight.Bold, color = YtWhite)
                    Text(selectedProduct.name, color = YtLightGray)
                    Text("Kategori: ${selectedProduct.category}", color = YtMediumGray)
                    OutlinedButton(onClick = onClearProduct, modifier = Modifier.padding(top = 8.dp)) { Text("Ganti Produk") }
                }
            }

            OutlinedTextField(
                value = quantity, onValueChange = onQtyChange,
                label = { Text("Jumlah (Qty)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                colors = ytTextFieldColors()
            )

            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = locationCode, onValueChange = onLocationChange,
                    label = { Text("Kode Rak / Lokasi") },
                    modifier = Modifier.weight(1f),
                    colors = ytTextFieldColors()
                )
                Spacer(modifier = Modifier.width(8.dp))
                Button(onClick = onScan, colors = ButtonDefaults.buttonColors(containerColor = YtRed)) { Text("SCAN") }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = YtRed),
                enabled = selectedProduct != null && quantity.toIntOrNull() != null && inboundState !is InboundState.Submitting
            ) {
                if (inboundState is InboundState.Submitting) {
                    CircularProgressIndicator(color = YtWhite, modifier = Modifier.size(24.dp))
                } else {
                    Text("Simpan Batch Inbound")
                }
            }
        }
    }
}

// ==================== Manual Entry Mode (web-equivalent) ====================
@Composable
fun ManualEntryMode(
    selectedCategory: String, onCategoryChange: (String) -> Unit,
    brand: String, onBrandChange: (String) -> Unit, useManualBrand: Boolean, onToggleManualBrand: () -> Unit,
    sku: String, onSkuChange: (String) -> Unit,
    standard: String, onStandardChange: (String) -> Unit,
    wireType: String, onWireTypeChange: (String) -> Unit,
    sizeInch: String, onSizeInchChange: (String) -> Unit,
    sizeDN: String, onSizeDNChange: (String) -> Unit,
    workingPressureBar: String, onPressureBarChange: (String) -> Unit,
    workingPressurePsi: String, onPressurePsiChange: (String) -> Unit,
    threadType: String, onThreadTypeChange: (String) -> Unit,
    threadSize: String, onThreadSizeChange: (String) -> Unit,
    sealType: String, onSealTypeChange: (String) -> Unit,
    configuration: String, onConfigChange: (String) -> Unit,
    isCutPiece: Boolean, onCutPieceChange: (Boolean) -> Unit,
    cutLength: String, onCutLengthChange: (String) -> Unit,
    quantity: String, onQtyChange: (String) -> Unit,
    locationCode: String, onLocationChange: (String) -> Unit,
    notes: String, onNotesChange: (String) -> Unit,
    onScanLocation: () -> Unit,
    isHose: Boolean, isFitting: Boolean,
    isSubmitting: Boolean, onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Section 1: Identitas Barang
        SectionHeader("🏷️ Identitas Barang")

        // Category Chips
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(CATEGORIES) { cat ->
                FilterChip(
                    selected = selectedCategory == cat,
                    onClick = { onCategoryChange(cat) },
                    label = { Text(cat, fontWeight = if (selectedCategory == cat) FontWeight.Bold else FontWeight.Normal) },
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = YtDarkSurfaceVariant, labelColor = YtWhite,
                        selectedContainerColor = YtRed, selectedLabelColor = YtWhite
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        }

        // Brand
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Brand *", color = YtWhite, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.width(8.dp))
            TextButton(onClick = onToggleManualBrand) {
                Text(if (useManualBrand) "📋 Pilih daftar" else "✏️ Ketik manual", color = YtBlue)
            }
        }
        if (useManualBrand) {
            OutlinedTextField(
                value = brand, onValueChange = { onBrandChange(it.uppercase()) },
                placeholder = { Text("Ketik nama brand...", color = YtMediumGray) },
                modifier = Modifier.fillMaxWidth(), colors = ytTextFieldColors()
            )
        } else {
            DropdownField("Pilih Brand", BRANDS, brand) { onBrandChange(it) }
        }

        // SKU / Part Number
        OutlinedTextField(
            value = sku, onValueChange = { onSkuChange(it.uppercase()) },
            label = { Text("Tipe / SKU / Part Number") },
            placeholder = { Text("EC110-16, GH493-8, dll", color = YtMediumGray) },
            modifier = Modifier.fillMaxWidth(), colors = ytTextFieldColors()
        )

        // Section 2: Dynamic Specs
        if (isHose) {
            SectionHeader("⚙️ Spesifikasi Hose")

            // Cut Piece toggle
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = isCutPiece, onCheckedChange = onCutPieceChange,
                    colors = CheckboxDefaults.colors(checkedColor = YtRed, uncheckedColor = YtMediumGray))
                Text("✂️ Ini adalah Hose Potongan", color = YtWhite)
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) { DropdownField("Standard", STANDARDS, standard) { onStandardChange(it) } }
                Box(modifier = Modifier.weight(1f)) { DropdownField("Wire Type", WIRE_TYPES, wireType) { onWireTypeChange(it) } }
            }

            SectionHeader("📏 Ukuran")
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) { DropdownField("Size (Inch)", SIZES_INCH, sizeInch) { onSizeInchChange(it) } }
                Box(modifier = Modifier.weight(1f)) { DropdownField("Size DN", DN_SIZES, sizeDN) { onSizeDNChange(it) } }
            }

            SectionHeader("💪 Tekanan")
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = workingPressureBar, onValueChange = onPressureBarChange,
                    label = { Text("WP (Bar)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f), colors = ytTextFieldColors()
                )
                OutlinedTextField(
                    value = workingPressurePsi, onValueChange = onPressurePsiChange,
                    label = { Text("WP (PSI)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f), colors = ytTextFieldColors()
                )
            }
        }

        if (isFitting) {
            SectionHeader("⚙️ Spesifikasi Ulir & Konfigurasi")
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) { DropdownField("Thread Type", THREAD_TYPES, threadType) { onThreadTypeChange(it) } }
                OutlinedTextField(
                    value = threadSize, onValueChange = onThreadSizeChange,
                    label = { Text("Ukuran Ulir") },
                    placeholder = { Text("1/4\", M12x1.5", color = YtMediumGray) },
                    modifier = Modifier.weight(1f), colors = ytTextFieldColors()
                )
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) { DropdownField("Konfigurasi", CONFIGURATIONS, configuration) { onConfigChange(it) } }
                Box(modifier = Modifier.weight(1f)) { DropdownField("Seal Type", SEAL_TYPES, sealType) { onSealTypeChange(it) } }
            }

            SectionHeader("📏 Ukuran")
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(modifier = Modifier.weight(1f)) { DropdownField("Size (Inch)", SIZES_INCH, sizeInch) { onSizeInchChange(it) } }
                Box(modifier = Modifier.weight(1f)) { DropdownField("Size DN", DN_SIZES, sizeDN) { onSizeDNChange(it) } }
            }
        }

        // Section 3: Kuantitas & Lokasi
        SectionHeader("📦 Kuantitas & Lokasi")
        if (isHose && isCutPiece) {
            OutlinedTextField(
                value = cutLength, onValueChange = onCutLengthChange,
                label = { Text("Panjang Potongan (cm)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(), colors = ytTextFieldColors()
            )
        }
        OutlinedTextField(
            value = quantity, onValueChange = onQtyChange,
            label = { Text(if (isHose) (if (isCutPiece) "Jumlah Potongan" else "Jumlah Roll / Panjang (m)") else "Jumlah Item (Pcs)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(), colors = ytTextFieldColors()
        )

        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = locationCode, onValueChange = onLocationChange,
                label = { Text("Kode Rak / Lokasi") },
                modifier = Modifier.weight(1f), colors = ytTextFieldColors()
            )
            Spacer(modifier = Modifier.width(8.dp))
            Button(onClick = onScanLocation, colors = ButtonDefaults.buttonColors(containerColor = YtBlue)) { Text("📷 SCAN") }
        }

        // Section 4: Notes
        SectionHeader("📝 Catatan")
        OutlinedTextField(
            value = notes, onValueChange = onNotesChange,
            label = { Text("Catatan tambahan (opsional)") },
            modifier = Modifier.fillMaxWidth().height(80.dp),
            maxLines = 3, colors = ytTextFieldColors()
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Submit Button
        Button(
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            colors = ButtonDefaults.buttonColors(containerColor = YtRed),
            enabled = brand.isNotBlank() && quantity.toDoubleOrNull() != null && !isSubmitting,
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(color = YtWhite, modifier = Modifier.size(24.dp))
            } else {
                Text("✅ Simpan & Generate Barcode", fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

// ==================== Reusable Components ====================
@Composable
fun SectionHeader(title: String) {
    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = YtWhite,
        modifier = Modifier.padding(top = 8.dp))
    HorizontalDivider(color = YtDarkGray, modifier = Modifier.padding(bottom = 4.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownField(label: String, options: List<String>, selected: String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
        OutlinedTextField(
            value = selected.ifBlank { "-- Pilih --" },
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor().fillMaxWidth(),
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            colors = ytTextFieldColors()
        )
        ExposedDropdownMenu(
            expanded = expanded, onDismissRequest = { expanded = false },
            modifier = Modifier.background(YtDarkSurfaceVariant)
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option, color = YtWhite) },
                    onClick = { onSelect(option); expanded = false }
                )
            }
        }
    }
}

@Composable
fun ytTextFieldColors(): TextFieldColors {
    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = YtWhite,
        unfocusedTextColor = YtLightGray,
        focusedBorderColor = YtRed,
        unfocusedBorderColor = YtDarkGray,
        cursorColor = YtRed,
        focusedLabelColor = YtRed,
        unfocusedLabelColor = YtMediumGray
    )
}
