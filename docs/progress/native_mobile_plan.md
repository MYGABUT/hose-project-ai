# Inisiasi Proyek WMS Native Android (Kotlin)

Berdasarkan keputusan untuk fokus pada **Android (Kotlin)** dan target perangkat berupa **HP Layar Sentuh Biasa** (bukan *rugged scanner*), berikut adalah spesifikasi teknis dan panduan langkah demi langkah untuk memulai proyek aplikasi kita.

Karena HP biasa sangat bergantung pada Kamera Belakang untuk fungsi pemindaian, kita perlu mengandalkan library Machine Learning berbasis Vision (seperti Google ML Kit) agar respons pemindaian cepat dan akurat, bahkan di gudang yang agak gelap.

---

## Spesifikasi Teknis Proyek

*   **Bahasa Utama**: Kotlin
*   **Minimum SDK**: API 24 (Android 7.0 Nougat) - Menjangkau 95% handset saat ini.
*   **Target SDK**: API 34 (Android 14)
*   **UI Framework**: Jetpack Compose (Kompak, modern, dan sangat responsif).
*   **Architecture Pattern**: MVVM (Model-View-ViewModel) + Clean Architecture.
*   **Library Utama**:
    *   **Kamera & Scanner**: `CameraX` + `Google ML Kit Barcode Scanning`. (Kombinasi terbaik untuk fokus cepat pada HP biasa).
    *   **Networking**: `Retrofit` + `OkHttp` (Mengambil data dari FastAPI backend kita).
    *   **Dependency Injection**: `Hilt` / `Dagger`.
    *   **Asynchronous Tasks**: `Kotlin Coroutines` & `Flow`.

---

## Struktur Folder Proyek Baru

Agar tidak tercampur dengan *Web Frontend*, kita akan membuat *Workspace* Android secara terpisah. Disarankan untuk memposisikannya di sebelah *folder* web.

```text
kapanlulusoi/
├── backend-hose-ai/       (FastAPI Backend)
├── src/                   (React Web Frontend)
└── android-wms-app/       (PROYEK BARU - Native Kotlin)
    ├── app/
    │   ├── src/
    │   │   ├── main/
    │   │   │   ├── java/com/company/wms/
    │   │   │   │   ├── data/       (API, Repository, Models)
    │   │   │   │   ├── di/         (Hilt Modules)
    │   │   │   │   ├── domain/     (Use Cases)
    │   │   │   │   └── ui/         (Screens, Components, ViewModels)
    │   │   │   └── res/            (Icons, Themes, Strings)
    │   └── build.gradle.kts
    └── build.gradle.kts
```

---

## Langkah Inisiasi Pertama (Yang Harus Dilakukan Sekarang)

Karena pengembangan aplikasi Android membutuhkan IDE khusus (Android Studio) untuk konfigurasi awal yang optimal (pembentukan Gradle, manifest, dan environment path), ini tidak bisa digenerate murni dari *command-line* tanpa resiko error dependensi.

**Langkah 1: Buka Android Studio**
1. Buka Android Studio di komputer Anda.
2. Klik **New Project**.
3. Pilih **Empty Activity** (Penting: Pastikan iconnya memiliki logo *Compose*, bukan XML biasa).
4. Klik **Next**.

**Langkah 2: Konfigurasi Proyek**
1. **Name**: `WMS Enterprise Scanner` (atau nama lain yang Anda inginkan).
2. **Package name**: `com.example.wms` (ganti `example` dengan nama perusahaan Anda jika ada).
3. **Save location**: Arahkan ke folder di dalam proyek saat ini, misalnya: `C:\Users\micha\kapanlulusoi\android-wms-app`.
4. **Language**: `Kotlin`.
5. **Minimum SDK**: `API 24 ("Nougat"; Android 7.0)`.
6. **Build configuration language**: `Kotlin DSL (build.gradle.kts)`.
7. Klik **Finish**.

**Langkah 3: Sinkronisasi Gradle Awal**
Setelah proyek terbuka, tunggu beberapa menit hingga bilah progres di bawah selesai (Android Studio sedang mengunduh library awal).

---

## Langkah Selanjutnya (Oleh AI)

Begitu folder `android-wms-app` dan struktur Gradle-nya sudah terbentuk secara resmi oleh Android Studio seperti di atas, beritahu saya. 

Nanti, saya akan:
1. Membaca *repository* tersebut dan langsung mengatur dependensi (Retrofit, ML Kit Scanner).
2. Membuatkan kode otentikasi (Layar Login) agar aplikasi Android bisa login menggunakan *user* yang sama dengan Web.
3. Membuatkan modul Pemindai Kamera (*Scanner*) khusus yang responsif untuk HP biasa.

Apakah Anda mau membuat proyek kosongnya di Android Studio sekarang? Atau Anda ingin saya mencoba men-_generate_ struktur standar kerangka Gradle Android dari sini menggunakan _scripting_ (walau terkadang kurang disarankan karena versi Gradle bisa *mismatch* dengan versi Android Studio di PC Anda)?
