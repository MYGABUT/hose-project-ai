# Rencana Evaluasi & Perombakan UI/UX ERP (HoseMaster vs Accurate & Jubelio)

Berdasarkan riset terhadap produk Hydraulink dan perbandingan UI/UX dengan ERP ternama di Indonesia (Accurate Online & Jubelio), berikut adalah analisis kritis dan menyakitkan mengenai kekurangan HoseMaster WMS saat ini, beserta rencana perbaikannya.

## 1. Analisis Produk Hydraulink (Kekurangan Input Barang)

**Kritik Keras:** 
Saat ini fitur `CreateJobOrder.jsx` dan `AddItemModal.jsx` sangat sempit pemikirannya. Sistem hanya berasumsi pengguna menjual "Hose" + "Fitting A" + "Fitting B" (Assembly). Padahal, distributor Hydraulink menjual jauh lebih banyak dari itu! Sistem Anda saat ini "buta" terhadap penjualan barang retail biasa.

**Spesifikasi Produk Hydraulink yang Diabaikan:**
Selain Hose dan Fitting, Hydraulink menjual komponen yang tidak perlu di-assembly (jual putus/retail), seperti:
- **Adaptors** (Ribuan SKU untuk konversi drat)
- **Quick Release Couplings**
- **Valves** (Ball valves, check valves)
- **Clamps & Accessories** (Tube clamps)
- **Hose Protection** (Sleeve anti api/gesekan, spiral guard)
- **Steel Pipe & Tube**
- **Oils, Lubricants & Safety Equipment**

**Rencana Perubahan Sistem Input:**
1. **Pemisahan Tipe Line-Item:** Di Sales Order, line-item tidak boleh kaku hanya "Hose Assembly". Harus ada 2 mode entry:
   - **Mode Assembly (JO):** Memilih Hose + Fitting A + Fitting B + Cut Length.
   - **Mode Retail / Sparepart:** Memilih barang jadi (Adaptor, Quick Coupling, Oli) dengan input Qty saja tanpa form fitting/potong.
2. **Kategori Multi-Dimensi:** Master Product harus diperluas kategorinya dan form input harus dinamis beradaptasi berdasarkan kategori barang yang dipilih.

---

## 2. Perbandingan UI/UX dengan Accurate Online & Jubelio

### Accurate Online
- **UI Style:** Klasik, sangat padat informasi (dense), modular, dan fungsional. Mirip Excel.
- **Kelebihan:** Entry data super cepat. Sales Order dengan 50 baris item bisa diinput tanpa menyentuh mouse (full keyboard navigation).
- **Kekurangan:** Learning curve tajam, UI terlihat membosankan dan kaku.

### Jubelio
- **UI Style:** Modern, clean, banyak whitespace, card-based, dashboard sangat visual.
- **Kelebihan:** Sangat intuitif untuk pengguna baru. Flow proses (Order -> Pick -> Pack -> Ship) dibuat seperti wizard yang step-by-step.
- **Kekurangan:** Kadang terlalu banyak whitespace sehingga butuh banyak scrolling untuk melihat data tabel yang banyak.

### HoseMaster WMS (ERP Buatan Kita)
**Kritik Super Pedas & Menyakitkan:**
1. **UI Terlalu "Programmer-sentris" & Kekanak-kanakan:** Tampilan kita masih seperti "Tugas Akhir Mahasiswa", bukan kelas Enterprise. Terlalu banyak menggunakan form standar HTML tanpa grid system yang padat.
2. **Kelelahan Modal (Modal Fatigue):** Menggunakan `AddItemModal` untuk menambah barang di SO adalah **kesalahan UI UX yang fatal untuk ERP**. Bayangkan kasir atau admin sales harus input 30 barang untuk 1 order; mereka harus klik tombol "Tambah Item" -> Muncul Modal -> Ketik -> Save -> Modal Tutup... diulang 30 kali! Ini membuang waktu. Accurate menggunakan *Inline Grid Editing* (ketik langsung di tabel baris terakhir, otomatis nambah baris baru).
3. **Pemborosan Ruang Luar Biasa:** Card di `Settings` atau `CreateJobOrder` memakan setengah layar hanya untuk beberapa text box. Di ERP komersial, data harus padat (high information density) agar user tidak capek scroll.
4. **Hierarki Tabrak Lari:** Flow Job Order dan Sales Order digabung paksa. Di Jubelio/Accurate, jalurnya sangat jelas: *Quotation -> Sales Order -> (Jika butuh produksi: Work Order/Job Order) -> Delivery Order -> Sales Invoice*. Di sistem kita, SO dan JO bercampur aduk membuat bingung divisi akuntansi dan divisi bengkel.

---

## 3. Rencana Perombakan UI (Action Plan)

Jika kita ingin ERP ini bersaing atau setidaknya layak dipakai di operasional yang sibuk, ini yang HARUS diubah:

### A. Rombak Total UI Entry Sales/Job Order (Urgent)
> **Hapus `AddItemModal.jsx`! Beralih ke Data Grid Inline.**
- **Solusi:** Gunakan library data grid yang mendukung editing langsung di sel tabel (seperti AG-Grid atau implementasi tabel `contenteditable` custom). 
- **Flow Baru:** Admin cukup klik ke baris tabel kosong, ketik SKU/Nama barang, Enter, geser ke kanan (Tab) isi Qty, Enter -> baris baru otomatis tercipta di bawahnya. 
- *Ini akan meningkatkan kecepatan input admin sales hingga 10x lipat.*

### B. Dinamisasi Jenis Barang
- Tambahkan kolom `Tipe Baris` di tabel (Pilihan: "Assembly" atau "Retail"). 
- Jika pilih "Retail", kolom-kolom seperti "Fitting A", "Fitting B", dan "Potongan/Cut Length" akan otomatis di-disable (greyed out). Ini mengakomodasi penjualan Adaptor, Oli, Clamp yang murni ritel.

### C. Revamp Desktop Layout & Density
- Kurangi padding/margin. Ubah font size base dari 16px menjadi 14px atau 13px untuk tabel dan form (Standar UI Enterprise/Accurate).
- Ubah form layout dari vertikal memanjang menjadi multi-kolom yang ringkas di bagian Header (Informasi Customer, Tanggal, Notes ditaruh bersebelahan sangat rapat).

### D. Workflow yang Diperjelas
- Pisahkan halaman Sales Order dan Job Order.
- **Sales Order:** Murni uang dan janji ke customer (Apa yang dibeli, diskon, harga, termin pembayaran).
- **Job Order:** Murni dokumen produksi bengkel (Instruksi potong hose, pasang fitting, assembly). Tidak ada urusan harga di Job Order. Bengkel tidak perlu / tidak boleh melihat harga jual. 

### Kesimpulan Review
Sistem saat ini sudah jalan fungsinya secara teknis (React + Node + DB jalan), **TAPI** secara UX masih belum *production-ready* untuk perusahaan distributor besar sekelas agen Hydraulink. Kita harus mengubah mindset dari "Bikin Form Web" menjadi "Bikin Software Productivity Akuntansi/Gudang" yang mementingkan kecepatan pencet tuts keyboard di atas estetika klik mouse.
