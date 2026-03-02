package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.BuildConfig
import com.example.wmsenterprisescanner.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    username: String,
    serverUrl: String,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        containerColor = YtDarkBackground,
        topBar = {
            TopAppBar(
                title = { Text("👤 Profil & Pengaturan", color = YtWhite) },
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
            // Avatar & Name
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier.size(56.dp).clip(CircleShape).background(YtRed),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            username.take(1).uppercase(),
                            color = YtWhite, fontSize = 24.sp, fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text(username, color = YtWhite, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Text("Warehouse Operator", color = YtMediumGray, fontSize = 13.sp)
                    }
                }
            }

            // App Info
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("📱 Informasi Aplikasi", color = YtWhite, fontWeight = FontWeight.Bold)
                    HorizontalDivider(color = YtDarkGray)
                    ProfileRow("Versi App", BuildConfig.VERSION_NAME)
                    ProfileRow("Build Type", BuildConfig.BUILD_TYPE)
                    ProfileRow("Server URL", serverUrl)
                }
            }

            // Feature Modules
            Card(colors = CardDefaults.cardColors(containerColor = YtDarkSurface), shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("📋 Modul Tersedia", color = YtWhite, fontWeight = FontWeight.Bold)
                    HorizontalDivider(color = YtDarkGray)
                    ModuleRow("Dashboard & KPI", true)
                    ModuleRow("Inbound / Penerimaan", true)
                    ModuleRow("Outbound & Surat Jalan", true)
                    ModuleRow("Stock Opname", true)
                    ModuleRow("Inventaris Browser", true)
                    ModuleRow("Peta Rak Gudang", true)
                    ModuleRow("Putaway Wizard", true)
                    ModuleRow("Mutasi Antar Rak", true)
                    ModuleRow("Produksi / Perakitan", true)
                    ModuleRow("Quality Control", true)
                    ModuleRow("Sales Orders", true)
                    ModuleRow("Purchase Requests", true)
                    ModuleRow("Invoice", true)
                    ModuleRow("RMA / Return", true)
                }
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = YtMediumGray, fontSize = 13.sp)
        Text(value, color = YtWhite, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ModuleRow(name: String, active: Boolean) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(name, color = YtLightGray, fontSize = 12.sp)
        Text(if (active) "✅" else "❌", fontSize = 12.sp)
    }
}
