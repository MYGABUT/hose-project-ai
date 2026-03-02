package com.example.wmsenterprisescanner.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.data.api.ApiClient
import com.example.wmsenterprisescanner.ui.theme.*
import com.example.wmsenterprisescanner.ui.viewmodels.AuthState
import com.example.wmsenterprisescanner.ui.viewmodels.AuthViewModel
import com.example.wmsenterprisescanner.utils.SessionManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }

    var email by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var showServerConfig by remember { mutableStateOf(false) }
    var serverUrl by remember { mutableStateOf(sessionManager.fetchServerUrl()) }
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onLoginSuccess()
        } else if (authState is AuthState.Error) {
            val msg = (authState as AuthState.Error).message
            Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(YtDarkBackground),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Logo
                Text("W", fontSize = 48.sp, fontWeight = FontWeight.Black, color = YtRed)
                Text("WMS Enterprise", style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold, color = YtWhite)
                Text("Login untuk akses gudang", style = MaterialTheme.typography.bodySmall,
                    color = YtMediumGray, textAlign = TextAlign.Center)

                Spacer(modifier = Modifier.height(4.dp))

                // Server Config Toggle (only in debug builds)
                if (SessionManager.isServerConfigAllowed()) {
                    TextButton(onClick = { showServerConfig = !showServerConfig }) {
                        Icon(Icons.Default.Settings, "Server", tint = YtMediumGray, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (showServerConfig) "Tutup Pengaturan Server" else "⚙️ Pengaturan Server",
                            color = YtMediumGray, fontSize = 12.sp
                        )
                    }
                }

                // Server URL Input (collapsible)
                AnimatedVisibility(visible = showServerConfig) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            label = { Text("Server URL") },
                            placeholder = { Text("http://192.168.1.100:8000/api/v1/", color = YtMediumGray) },
                            leadingIcon = { Icon(Icons.Default.Settings, "Server", tint = YtMediumGray) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                                focusedBorderColor = YtBlue, unfocusedBorderColor = YtDarkGray,
                                cursorColor = YtBlue, focusedLabelColor = YtBlue, unfocusedLabelColor = YtMediumGray
                            )
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    // Ensure URL ends with /
                                    val finalUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
                                    sessionManager.saveServerUrl(finalUrl)
                                    ApiClient.invalidate() // Force rebuild Retrofit
                                    Toast.makeText(context, "✅ Server URL tersimpan", Toast.LENGTH_SHORT).show()
                                    showServerConfig = false
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("💾 Simpan", color = YtBlue) }
                            OutlinedButton(
                                onClick = {
                                    serverUrl = SessionManager.getDefaultUrl()
                                    sessionManager.saveServerUrl(SessionManager.getDefaultUrl())
                                    ApiClient.invalidate()
                                    Toast.makeText(context, "Reset ke default", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f)
                            ) { Text("🔄 Reset", color = YtMediumGray) }
                        }
                        Text(
                            "Masukkan IP server backend gudang.\nContoh: http://192.168.1.100:8000/api/v1/",
                            style = MaterialTheme.typography.labelSmall,
                            color = YtMediumGray,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Email Field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    placeholder = { Text("user@example.com", color = YtMediumGray) },
                    leadingIcon = { Icon(Icons.Default.Email, "Email", tint = YtMediumGray) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                        focusedBorderColor = YtRed, unfocusedBorderColor = YtDarkGray,
                        cursorColor = YtRed, focusedLabelColor = YtRed, unfocusedLabelColor = YtMediumGray
                    )
                )

                // Password Field with visibility toggle
                OutlinedTextField(
                    value = pin,
                    onValueChange = { pin = it },
                    label = { Text("Password") },
                    placeholder = { Text("Masukkan password", color = YtMediumGray) },
                    leadingIcon = { Icon(Icons.Default.Lock, "Password", tint = YtMediumGray) },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Text(if (passwordVisible) "🙈" else "👁️", fontSize = 18.sp)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = YtWhite, unfocusedTextColor = YtLightGray,
                        focusedBorderColor = YtRed, unfocusedBorderColor = YtDarkGray,
                        cursorColor = YtRed, focusedLabelColor = YtRed, unfocusedLabelColor = YtMediumGray
                    )
                )

                // Error display
                if (authState is AuthState.Error) {
                    Text(
                        (authState as AuthState.Error).message,
                        color = YtRed, style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Login Button
                Button(
                    onClick = { viewModel.login(email, pin) },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = authState !is AuthState.Loading && email.isNotBlank() && pin.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = YtRed, disabledContainerColor = YtRed.copy(alpha = 0.3f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (authState is AuthState.Loading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = YtWhite)
                    } else {
                        Text("Login", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}
