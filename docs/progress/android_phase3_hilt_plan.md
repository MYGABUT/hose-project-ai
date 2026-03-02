# Rencana Teknis Android - Refactor Arsitektur & Fase 3 (Opname)

Memenuhi permintaan Anda untuk "memperbaiki arsitektur" terlebih dahulu sebelum lanjut ke fitur baru, kita akan memigrasi aplikasi ke **Dagger Hilt** untuk Dependency Injection. Saat ini kita masih menggunakan "Manual DI" yang kurang skalabel (membuat _Factory_ secara menual di `MainActivity`).

## Bagian 1: Perbaikan Arsitektur (Dagger Hilt)
Hilt adalah standar industri untuk aplikasi native Android modern, yang akan merapikan alokasi resource memori (API Client, Repositories).
1. **Gradle Dependencies**: 
   - Tambahkan Plugin `dagger.hilt.android.plugin` dan KSP (Kotlin Symbol Processing).
   - Tambahkan _library_ Hilt Android dan Hilt Navigation Compose.
2. **Setup Hilt**:
   - Buat kelas `WmsApplication` yang di-anotasi dengan `@HiltAndroidApp` dan daftarkan di `AndroidManifest.xml`.
   - Anotasi `MainActivity` dengan `@AndroidEntryPoint`.
   - Buat `NetworkModule.kt` (menganotasi Retrofit provider) dan `RepositoryModule.kt` (menganotasi penyediaan `AuthRepository` & `InventoryRepository`).
   - Ubah `AuthViewModel` dan `InventoryViewModel` menggunakan `@HiltViewModel` dan `@Inject`.
   - Di `MainActivity`, ganti inisiasi _Factory_ menjadi cukup memanggil `hiltViewModel()`.

## Bagian 2: Eksekusi Fase 3 (Stock Opname & Info Barang)

Setelah arsitektur bersih, kita akan mengerjakan fitur operasional gudang berikutnya.

### 2.1 Backend API (Retrofit Integration)
- `GET /api/v1/opname/target`: Mengambil target daftar barang yang belum di-opname (filter `is_opnamed=False`).
- `PUT /api/v1/opname/{sku}/finalize`: Mengunci dan mencatat waktu sebuah item berhasil ter-audit.

### 2.2 UI: Layar Opname Menu (`OpnameMenuScreen`)
Layar perantara yang menampilkan dua tombol besar:
1. **Cari Barang Spesifik**: Menampilkan input manual atau pemicu _scanner_ untuk mengecek barang (Detail Isi).
2. **Mulai Audit Rak**: Mengarahkan ke layar pemindaian beruntun untuk memvalidasi lokasi suatu rak.

### 2.3 UI: Layar Audit (*Continuous Scanning*)
Karena proses Audit menuntut pekerja me-scan banyak produk secara berurutan, kita akan memodifikasi `ScannerScreen` menjadi _Continuous Mode_ (Memindai berkali-kali tanpa harus menutup layar kamera).
- Menampilkan daftar checklist (TODO).
- Setiap *barcode* yang terscan dan cocok -> API *Finalize* -> Layar mencentang warna hijau (✅).
- Suara/Haptic konfirmasi "BEEP" ketika barcode valid agar pekerja tak perlu melihat layar HP terus menerus.

---
**Tindakan Anda:**
Silakan setujui dokumen ini dengan berkata "Lanjut", dan saya akan berpindah ke mode EKSEKUSI (Execution Mode) untuk memasang Hilt dan menata kerangka dasar Stock Opname.
