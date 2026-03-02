package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.wmsenterprisescanner.ui.viewmodels.OpnameViewModel
import com.example.wmsenterprisescanner.ui.viewmodels.SessionState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OpnameMenuScreen(
    viewModel: OpnameViewModel,
    onNavigateToSession: (Int) -> Unit,
    onNavigateBack: () -> Unit
) {
    val sessionState by viewModel.sessionState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.checkCurrentSession()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Opname") },
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            when (sessionState) {
                is SessionState.Loading -> {
                    CircularProgressIndicator()
                    Text("Mengecek sesi aktif...")
                }
                is SessionState.Error -> {
                    val msg = (sessionState as SessionState.Error).message
                    Text("Error: $msg", color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { viewModel.checkCurrentSession() }) {
                        Text("Coba Lagi")
                    }
                }
                is SessionState.Success -> {
                    val opname = (sessionState as SessionState.Success).opname
                    if (opname != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("Sesi Opname Aktif", style = MaterialTheme.typography.titleLarge)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(opname.opname_number, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.headlineSmall)
                                Text("Keterangan: ${opname.description}")
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("Target Total: ${opname.total_items} item")
                                Text("Terscan: ${opname.scanned_items} item")
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = { onNavigateToSession(opname.id) },
                                    modifier = Modifier.fillMaxWidth().height(50.dp)
                                ) {
                                    Text("Lanjutkan Audit (Scan)", style = MaterialTheme.typography.titleMedium)
                                }
                            }
                        }
                    } else {
                        // No active session
                        Icon(
                            imageVector = Icons.Default.Info, // Needs import or change
                            contentDescription = "No session",
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Tidak ada sesi Opname yang berjalan.",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Silakan mulai sesi baru melalui aplikasi Web Panel Admin terlebih dahulu.")
                        Spacer(modifier = Modifier.height(24.dp))
                        Button(onClick = { viewModel.checkCurrentSession() }) {
                            Text("Refresh")
                        }
                    }
                }
                else -> {}
            }
        }
    }
}
