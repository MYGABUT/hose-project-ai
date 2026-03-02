# Rencana Teknis Android - Fase 2: Inbound / Receiving

Fase ini akan mereplika alur kerja form penerimaan (*Inbound*) barang dari Web ke dalam form Native Android (Jetpack Compose), dioptimalkan untuk layar kecil dan pemindaian cepat.

## 1. Integrasi API (Retrofit)
Kita perlu menambahkan *endpoints* baru di `ApiService.kt` untuk melayani kebutuhan Inbound:
- `GET /api/v1/products`: Untuk memuat daftar produk (Dropdown/Autocomplete).
- `POST /api/v1/batches/inbound`: Endpoint utama untuk mengirimkan data penerimaan.

## 2. Struktur Data (Models)
Membuat atau memperbarui file model `Inventory.kt` atau `Batch.kt`:
- Model `Product` (id, name, sku, category).
- Model `BatchInboundRequest` (product_id, qty, location_code, specifications).
- Model `ApiResponseWrapper` untuk balasan sukses/gagal secara umum.

## 3. Modifikasi ScannerScreen (Reusable Component)
Saat ini `ScannerScreen` dibuat untuk berjalan mandiri. Kita harus mengubahnya menjadi *Composable* yang lebih modular sehingga ia dapat dipanggil dari form manapun.
- Mengubah fungsi `ScannerScreen` agar menerima *callback* `onScanSuccess(barcode: String)`.
- Mengatur Navigasi kembali (`popBackStack()`) setelah scan berhasil.

## 4. UI: Layar Beranda (Dashboard)
- Membuat `HomeScreen` sederhana menggantikan halaman kosong saat ini.
- Menampilkan nama pengguna yang sedang *login*.
- Menambahkan tombol besar bergaya *Grid* atau *Card*: **"Inbound (Penerimaan)"**, **"Outbound (Pengeluaran)"**, dan **"Stock Opname"**.

## 5. UI: Layar Form Inbound (InboundScreen)
Layar spesifik untuk mengisi formulir penerimaan barang.
- **Pilih Produk**: Dropdown atau menu geser (BottomSheet) untuk memilih produk dari API.
- **Form Spesifikasi Dinamis**: (Seperti di Web) Menyesuaikan input berdasar kategori produk (Selang = Panjang potong; Fitting = Thread/Seal).
- **Jumlah / Qty**: Input angka.
- **Input Lokasi (Tombol Scan)**: Membuka layar Scanner untuk menembak barcode rak (contoh: `WH1-A1-01`).
- **Simpan**: Tombol besar di bawah layar yang menembakkan request ke API `/batches/inbound` lalu menampilkan indikator *Loading* berputar.

---
**Tindakan Anda:**
Beri saya lampu hijau dan saya akan langsung masuk ke tahap EKSEKUSI (Execution Mode) untuk memprogram semua poin di atas ke dalam *source code* Android menggunakan Kotlin!
