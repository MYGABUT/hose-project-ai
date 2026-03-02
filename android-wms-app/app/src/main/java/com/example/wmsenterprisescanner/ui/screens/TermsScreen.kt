package com.example.wmsenterprisescanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.wmsenterprisescanner.ui.theme.*

@Composable
fun TermsScreen(
    onAccepted: () -> Unit
) {
    val scrollState = rememberScrollState()
    var hasScrolledToBottom by remember { mutableStateOf(false) }
    var isChecked by remember { mutableStateOf(false) }

    // Detect scroll to bottom (within 50px tolerance)
    LaunchedEffect(scrollState.value, scrollState.maxValue) {
        if (scrollState.maxValue > 0 && scrollState.value >= scrollState.maxValue - 50) {
            hasScrolledToBottom = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(YtDarkBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Header
            Text(
                text = "📋 Syarat & Ketentuan Penggunaan",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = YtWhite,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                text = "Harap baca sampai akhir sebelum melanjutkan",
                style = MaterialTheme.typography.bodySmall,
                color = YtMediumGray,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            // Scroll progress indicator
            if (!hasScrolledToBottom) {
                LinearProgressIndicator(
                    progress = { if (scrollState.maxValue > 0) scrollState.value.toFloat() / scrollState.maxValue.toFloat() else 0f },
                    modifier = Modifier.fillMaxWidth().height(3.dp),
                    color = YtRed,
                    trackColor = YtDarkGray
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Scrollable Terms Content
            Card(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = YtDarkSurface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(16.dp)
                        .verticalScroll(scrollState),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TermsSection("1. Pendahuluan",
                        "Dengan mengunduh, menginstall, atau menggunakan aplikasi WMS Enterprise Scanner (\"Aplikasi\"), " +
                        "Anda menyetujui untuk terikat dengan Syarat & Ketentuan berikut. Jika Anda tidak menyetujui " +
                        "syarat ini, harap tidak menggunakan Aplikasi.")

                    TermsSection("2. Penggunaan Aplikasi",
                        "Aplikasi ini ditujukan khusus untuk keperluan operasional pergudangan perusahaan. " +
                        "Pengguna bertanggung jawab atas:\n" +
                        "• Menjaga keamanan akun (email/password) masing-masing\n" +
                        "• Memastikan keakuratan data yang diinput ke dalam sistem\n" +
                        "• Menggunakan aplikasi sesuai dengan tugas dan wewenang yang diberikan\n" +
                        "• Tidak menyalahgunakan akses untuk kepentingan pribadi")

                    TermsSection("3. Kerahasiaan Data",
                        "Seluruh data dalam aplikasi bersifat RAHASIA milik perusahaan. Pengguna dilarang:\n" +
                        "• Membagikan informasi stok, lokasi, atau data gudang ke pihak luar\n" +
                        "• Mengambil screenshot atau merekam layar aplikasi untuk disebarkan\n" +
                        "• Menyalin data inventaris ke perangkat atau sistem lain tanpa izin\n" +
                        "• Mengekspor atau mentransfer data tanpa persetujuan tertulis dari manajemen")

                    TermsSection("4. Keamanan Akun",
                        "Akun bersifat pribadi dan tidak boleh dipinjamkan. Kebijakan keamanan:\n" +
                        "• Setiap pengguna wajib memiliki akun sendiri\n" +
                        "• Password minimal 8 karakter dan wajib diganti secara berkala\n" +
                        "• Akun akan dikunci otomatis setelah 5x percobaan login gagal\n" +
                        "• Segera laporkan jika mencurigai akun Anda diakses pihak lain\n" +
                        "• Setiap aktivitas login tercatat dan dipantau (audit trail)")

                    TermsSection("5. Tanggung Jawab Pengguna",
                        "Pengguna bertanggung jawab penuh atas:\n" +
                        "• Keakuratan data saat proses inbound, outbound, transfer, dan opname\n" +
                        "• Verifikasi fisik barang sebelum melakukan konfirmasi di sistem\n" +
                        "• Pelaporan segera atas ketidaksesuaian (discrepancy) yang ditemukan\n" +
                        "• Kerusakan yang terjadi akibat kelalaian dalam penggunaan sistem")

                    TermsSection("6. Larangan",
                        "Pengguna dilarang keras melakukan hal-hal berikut:\n" +
                        "• Memodifikasi, reverse-engineer, atau mendekompilasi Aplikasi\n" +
                        "• Menggunakan alat otomatis (bot/script) untuk mengakses sistem\n" +
                        "• Memanipulasi data stok, barcode, atau lokasi penyimpanan\n" +
                        "• Mengakses fitur atau modul di luar kewenangan yang diberikan\n" +
                        "• Mengganggu kinerja server atau infrastruktur sistem")

                    TermsSection("7. Pemantauan & Audit",
                        "Manajemen berhak melakukan:\n" +
                        "• Pemantauan seluruh aktivitas pengguna dalam sistem\n" +
                        "• Audit berkala terhadap akurasi data dan kepatuhan pengguna\n" +
                        "• Peninjauan log aktivitas untuk keperluan investigasi\n" +
                        "• Penangguhan atau pencabutan akses tanpa pemberitahuan terlebih dahulu " +
                        "jika ditemukan pelanggaran")

                    TermsSection("8. Penggunaan Perangkat",
                        "Pengguna wajib:\n" +
                        "• Menjaga perangkat (HP/tablet scanner) dalam kondisi baik\n" +
                        "• Menggunakan perangkat hanya untuk keperluan operasional\n" +
                        "• Melaporkan kerusakan atau kehilangan perangkat segera\n" +
                        "• Tidak menginstall aplikasi tidak resmi pada perangkat kerja\n" +
                        "• Mengembalikan perangkat saat berakhirnya masa kerja")

                    TermsSection("9. Kebijakan Privasi",
                        "Aplikasi mengumpulkan data berikut untuk keperluan operasional:\n" +
                        "• Informasi login (email, waktu login, alamat IP)\n" +
                        "• Data transaksi gudang (inbound, outbound, transfer, opname)\n" +
                        "• Riwayat scanning barcode\n" +
                        "• Lokasi perangkat (jika diizinkan) untuk validasi area kerja\n\n" +
                        "Data ini disimpan sesuai kebijakan retensi perusahaan dan dilindungi " +
                        "dengan enkripsi standar industri.")

                    TermsSection("10. Sanksi Pelanggaran",
                        "Pelanggaran terhadap syarat dan ketentuan ini dapat mengakibatkan:\n" +
                        "• Peringatan tertulis\n" +
                        "• Penangguhan akses sementara\n" +
                        "• Pencabutan akses secara permanen\n" +
                        "• Tindakan disipliner sesuai peraturan perusahaan\n" +
                        "• Tuntutan hukum jika melibatkan kerugian materiil")

                    TermsSection("11. Perubahan Ketentuan",
                        "Perusahaan berhak mengubah Syarat & Ketentuan ini sewaktu-waktu. " +
                        "Perubahan akan diberitahukan melalui aplikasi. Penggunaan berkelanjutan setelah " +
                        "perubahan diberlakukan dianggap sebagai persetujuan atas perubahan tersebut.")

                    TermsSection("12. Hukum yang Berlaku",
                        "Syarat & Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. " +
                        "Segala perselisihan yang timbul akan diselesaikan secara musyawarah, dan jika tidak " +
                        "tercapai kesepakatan, akan diselesaikan melalui Pengadilan Negeri setempat yang berwenang.")

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        "Terakhir diperbarui: 27 Februari 2026",
                        style = MaterialTheme.typography.labelSmall,
                        color = YtMediumGray,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Scroll hint
            if (!hasScrolledToBottom) {
                Text(
                    "⬇️ Scroll ke bawah untuk membaca seluruh ketentuan",
                    color = YtRed,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Checkbox (only enabled after scrolling to bottom)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = isChecked,
                    onCheckedChange = { if (hasScrolledToBottom) isChecked = it },
                    enabled = hasScrolledToBottom,
                    colors = CheckboxDefaults.colors(
                        checkedColor = YtRed,
                        uncheckedColor = if (hasScrolledToBottom) YtLightGray else YtDarkGray,
                        checkmarkColor = YtWhite,
                        disabledCheckedColor = YtDarkGray,
                        disabledUncheckedColor = YtDarkGray
                    )
                )
                Text(
                    text = "Saya telah membaca dan menyetujui seluruh Syarat & Ketentuan",
                    color = if (hasScrolledToBottom) YtWhite else YtMediumGray,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = if (isChecked) FontWeight.Bold else FontWeight.Normal
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Accept Button
            Button(
                onClick = onAccepted,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = hasScrolledToBottom && isChecked,
                colors = ButtonDefaults.buttonColors(
                    containerColor = YtRed,
                    disabledContainerColor = YtDarkGray
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    if (!hasScrolledToBottom) "Baca ketentuan terlebih dahulu ↓"
                    else if (!isChecked) "Centang persetujuan di atas ☑️"
                    else "✅ Setuju & Lanjutkan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = if (hasScrolledToBottom && isChecked) YtWhite else YtMediumGray
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun TermsSection(title: String, content: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = YtRed
    )
    Text(
        text = content,
        style = MaterialTheme.typography.bodySmall,
        color = YtLightGray,
        lineHeight = 20.sp
    )
}
