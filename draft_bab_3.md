# BAB III
# PELAKSANAAN MAGANG

## 3.2 Proses Pengembangan Sistem

Sistem *Warehouse Management System* (WMS) yang dikembangkan dalam proyek magang ini dirancang sebagai platform terintegrasi untuk mengelola inventaris, operasi produksi, hingga manajemen penjualan dan pembelian. Untuk memastikan skalabilitas dan kemudahan pemeliharaan, sistem ini dibangun menggunakan arsitektur *client-server* modern yang terbagi menjadi tiga komponen utama: *Backend Application Programming Interface* (API), *Web Dashboard*, dan *Mobile Android Scanner*.

Berikut adalah penjabaran detail mengenai teknologi yang digunakan, perannya, serta alur kerja dari masing-masing komponen pembangun sistem.

### 3.2.1 Pengembangan *Backend* (API & Logika Bisnis)

Pengembangan *backend* bertindak sebagai otak dari seluruh sistem, menangani penyimpanan data, logika bisnis, keamanan, dan integrasi modul *Artificial Intelligence* (AI).

*   **Teknologi yang Digunakan:**
    *   **FastAPI (Python):** Sebuah *framework* web modern dan berkinerja tinggi yang digunakan untuk membangun *RESTful* API. FastAPI dipilih karena dukungan *asynchronous programming* bawaannya dan kemampuannya menghasilkan dokumentasi API otomatis secara *real-time*.
    *   **PostgreSQL & SQLAlchemy:** PostgreSQL bertindak sebagai basis data relasional utama. Sedangkan SQLAlchemy digunakan sebagai *Object Relational Mapper* (ORM) untuk menerjemahkan objek Python ke dalam skema tabel *database* dengan aman, melindungi dari serangan injeksi SQL.
    *   **EasyOCR & OpenCV:** Digunakan untuk mengaktifkan fitur pemindaian pintar (*Smart Scanner*), khususnya dalam ekstraksi teks (OCR) dari gambar dokumen, faktur, atau *nameplate* mesin/produk.
    *   **PyJWT & Passlib:** Digunakan untuk pengelolaan autentikasi pengguna berbasis JSON Web Token (JWT) serta enkripsi kata sandi yang kuat (Bcrypt/Argon2).

*   **Peran dan Alur Kerja:**
    *Backend* dirancang secara modular dengan memisahkan *router* (titik akhir API), *models* (skema *database*), dan *services* (logika bisnis). Setiap kali *client* (web atau aplikasi seluler) melakukan permintaan (misalnya, membuat *Sales Order* atau memindai tipe *hose*), permintaan tersebut pertama-tama melewati lapisan *middleware* untuk validasi keamanan dan *rate limiting*. Jika valid, FastAPI meneruskan data ke logika bisnis yang sesuai, berinteraksi dengan PostgreSQL menggunakan SQLAlchemy, lalu mengembalikan respons kembali ke *client* dalam format JSON. File konfigurasi utama seperti `main.py` menggunakan metode *Router Registry* untuk mendaftarkan puluhan modul (seperti modul *Inventory*, *Finance*, *Production*) agar kode tetap rapi dan terpusat.

### 3.2.2 Pengembangan Antarmuka Web (*Frontend Dashboard*)

*Web Dashboard* adalah antarmuka utama yang diperuntukkan bagi pihak manajemen, administrator, dan operator gudang yang bekerja menggunakan komputer meja (PC). 

*   **Teknologi yang Digunakan:**
    *   **React.js (versi 19) & Vite:** React digunakan untuk membangun *User Interface* (UI) yang interaktif berbasis komponen (*component-based*). Vite digunakan sebagai *build tool* dan *development server* karena kecepatannya dalam melakukan *Hot Module Replacement* (HMR).
    *   **Material UI (MUI):** Pustaka komponen antarmuka yang menyediakan *grid*, tombol, tabel, dan formulir dengan desain standar industri yang rapi dan konsisten.
    *   **React Router DOM:** Digunakan untuk mengatur navigasi antarhalaman pada aplikasi web *Single Page Application* (SPA) tanpa perlu memuat ulang peramban secara penuh.
    *   **Context API:** Digunakan sebagai pengelola *state* global (*State Management*) untuk membagikan data autentikasi, notifikasi, dan sesi keranjang tanpa perlu melakukan *prop-drilling*.

*   **Peran dan Alur Kerja:**
    Dalam pengembangannya, antarmuka web dibagi menjadi beberapa halaman modular seperti Dashboard Indikator Kinerja Utama (KPI), Manajemen Inbound/Outbound, Perakitan (*Production*), dan Tagihan (*Finance*). Saat web dibuka melalui peramban, *routing* yang terdefinisi di `App.jsx` menangani komponen apa yang harus dimuat. Fitur *lazy loading* diterapkan pada lebih dari 80 rute halaman agar aplikasi memuat hanya halaman yang dibutuhkan oleh pengguna (*code splitting*), meminimalkan waktu muat awal (*initial load time*). Proses pengambilan dan pengiriman data ke *backend* dikerjakan oleh lapisan layanan integrasi (*service layer*) berbasis `fetch` atau `axios`. 

### 3.2.3 Pengembangan Aplikasi Mobile (*Android Scanner*)

Aplikasi *mobile* dirancang khusus untuk para pekerja di lapangan (operator lantai gudang) guna memberikan mobilitas tinggi saat memeriksa inventaris, melakukan perhitungan fisik (*stock opname*), dan menempatkan barang di rak gudang (*putaway*).

*   **Teknologi yang Digunakan:**
    *   **Kotlin & Android SDK:** Bahasa pemrograman dasar dan alat pembangun (*build tools*) utama penyokong pembuatan aplikasi Android bawaan (*native*).
    *   **Jetpack Compose:** Perangkat UI deklaratif termutakhir dari Google untuk merancang antarmuka Android natively, mempercepat proses penulisan kode tampilan secara masif dibandingkan model XML lawas.
    *   **Model-View-ViewModel (MVVM) & Hilt:** Pola arsitektur MVVM memastikan pemisahan antara logika UI, *state*, dan data. Hilt (berbasis Dagger) digunakan untuk memfasilitasi *Dependency Injection* (DI), seperti injeksi layanan API Retrofit ke dalam *ViewModel*. 
    *   **Retrofit & OkHttp:** Pustaka klien HTTP untuk berkomunikasi dengan FastAPI *backend*.
    *   **CameraX & Google ML Kit:** Diimplementasikan untuk mengubah kamera ponsel pintar menjadi pemindai kode batang (*barcode*) dan pemindai teks (OCR) secara waktu nyata (*real-time*).

*   **Peran dan Alur Kerja:**
    Aplikasi dimuat dalam *theme* gelap (*dark mode*) khusus bergaya industri demi visibilitas di lingkungan gudang. Saat pengguna membuka halaman seperti "Pemindahan Rak", `ViewModel` bertugas menyimpan *state* sementara dan berkomunikasi dengan Retrofit untuk memanggil API *backend*. Jika pengguna menekan tombol "pindai", modul CameraX dengan ML Kit diaktivasi untuk memproses tangkapan layar, mengenali kode seri batang, lalu meneruskannya secara otomatis kembali ke *State Flow* milik Jetpack Compose untuk memperbarui tampilan di layar perangkat tanpa jeda visual. Data hasil kerjanya seketika dikirim ke basis data lewat *backend* asinkronus.

### 3.2.4 Arsitektur Integrasi dan Alur Kerja Ekosistem (Workflow)

Secara garis besar, ekosistem WMS yang saya bangun di atas memiliki alur pertukaran informasi terpusat (*Single Source of Truth*). 

Setiap sub-sistem (React JS di Web maupun Kotlin Compose di Android) berfungsi sebagai perantara yang bisu (*stateless*); mereka tidak menyimpan data kritikal secara lokal. Semua transaksi, penciptaan dokumen *Sales Order* baru, input hasil produksi potong/klem (*crimping*), sampai pembuatan tagihan selalu diteruskan melalui HTTP *requests* menembus FastAPI. Di sisi infrastruktur jaringan, komunikasi ini dilindungi dan di-*routing* melalui *Cloudflare Tunnels*, memastikan bahwa *backend* internal di server lokal dapat diakses secara *remote* dengan mode koneksi terenkripsi walau tanpa alamat IP statis publik, sembari mencegah masuknya ancaman lalu-lintas asing langsung ke dalam pusat data gudang perusahaan.

Seluruh elemen tersebut diselaraskan secara *real-time*; data pemindaian *stock opname* yang dimasukkan menggunakan *smartphone* dapat langsung terlihat di *Dashboard Web* para manajer dalam hitungan detik.
