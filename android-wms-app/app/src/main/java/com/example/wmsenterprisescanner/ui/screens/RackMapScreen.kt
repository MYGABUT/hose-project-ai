package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.model.Location
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.RackMapViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RackMapScreen(
    viewModel: RackMapViewModel,
    onNavigateBack: () -> Unit
) {
    val locations by viewModel.locations.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedLocation by viewModel.selectedLocation.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadLocations() }

    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("🗺️ Peta Rak Gudang", color = YtWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = YtWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = YtDarkBackground)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Legend
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                LegendItem("Kosong", Color(0xFF2E2E2E))
                LegendItem("Isi < 50%", Color(0xFF1B5E20))
                LegendItem("Isi > 50%", Color(0xFFFF8F00))
                LegendItem("Penuh", Color(0xFFD32F2F))
            }

            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = YtRed)
                }
            } else {
                // Rack Grid
                LazyVerticalGrid(
                    columns = GridCells.Fixed(4),
                    contentPadding = PaddingValues(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(locations) { loc ->
                        RackCell(
                            location = loc,
                            isSelected = selectedLocation?.id == loc.id,
                            onClick = { viewModel.selectLocation(loc) }
                        )
                    }
                }

                // Selected Location Detail
                if (selectedLocation != null) {
                    val loc = selectedLocation!!
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("📍 ${loc.code}", fontWeight = FontWeight.Bold, color = YtWhite, fontSize = 16.sp)
                            HorizontalDivider(color = YtDarkGray, modifier = Modifier.padding(vertical = 8.dp))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Zona: ${loc.zone ?: "-"}", color = YtLightGray, fontSize = 13.sp)
                                Text("Tipe: ${loc.type ?: "-"}", color = YtLightGray, fontSize = 13.sp)
                            }
                            Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Kapasitas: ${loc.capacity ?: "∞"}", color = YtMediumGray, fontSize = 12.sp)
                                Text("Terisi: ${loc.current_load ?: 0}", color = YtWhite, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RackCell(location: Location, isSelected: Boolean, onClick: () -> Unit) {
    val load = location.current_load ?: 0
    val cap = location.capacity ?: 100
    val ratio = if (cap > 0) load.toFloat() / cap else 0f

    val bgColor = when {
        load == 0 -> Color(0xFF2E2E2E)
        ratio < 0.5f -> Color(0xFF1B5E20)
        ratio < 1f -> Color(0xFFFF8F00)
        else -> Color(0xFFD32F2F)
    }

    val borderColor = if (isSelected) YtRed else Color.Transparent

    Box(
        modifier = Modifier
            .aspectRatio(1f)
            .background(bgColor, RoundedCornerShape(6.dp))
            .border(2.dp, borderColor, RoundedCornerShape(6.dp))
            .clickable { onClick() }
            .padding(4.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                location.code.takeLast(6),
                color = YtWhite, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center
            )
            Text("$load", color = YtWhite.copy(alpha = 0.8f), fontSize = 11.sp)
        }
    }
}

@Composable
private fun LegendItem(label: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(12.dp).background(color, RoundedCornerShape(2.dp)))
        Spacer(Modifier.width(4.dp))
        Text(label, color = YtMediumGray, fontSize = 10.sp)
    }
}
