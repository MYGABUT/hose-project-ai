# Tutorial Setup Cloudflare Tunnel di Windows

Karena container `tunnel` di Docker gagal berjalan atau tidak memiliki *token* yang valid, cara paling stabil dan direkomendasikan adalah menginstall **Cloudflare Tunnel (cloudflared)** langsung di sistem operasi Windows Anda.

Ikuti langkah-langkah berikut untuk menghubungkan domain `mutishamiyamizu.com` ke server lokal Anda (Docker `localhost:80`).

---

## Tahap 1: Buat Tunnel di Dashboard Cloudflare

1. Buka browser dan login ke **[Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)**.
2. Di menu sidebar sebelah kiri, klik **Networks** ➔ **Tunnels**.
3. Klik tombol biru **Create a tunnel**.
4. Pilih **Cloudflared** (opsi default), lalu klik **Next**.
5. Beri nama tunnel-nya, misalnya `HoseMaster-App`, lalu klik **Save tunnel**.

## Tahap 2: Install Cloudflared di Server Windows (PC Anda)

Setelah tunnel berhasil dibuat, Cloudflare akan menampilkan halaman **Install and run a connector**.

1. Di halaman tersebut, pada bagian *Choose an OS*, klik logo **Windows**.
2. Cloudflare akan menampilkan sebuah **Command** panjang di dalam kotak hitam yang terlihat seperti ini:
   ```cmd
   cloudflared.exe service install eyJhIjoiY2I... (token sangat panjang)
   ```
3. **Copy** command tersebut (klik icon copy di sudut kanan atas kotak).
4. Sekarang, di PC server Anda, buka **PowerShell** sebagai Administrator:
   - Klik Start menu Windows.
   - Ketik `PowerShell`.
   - Di hasil pencariannya, klik kanan pada *Windows PowerShell* lalu pilih **Run as Administrator**.
5. **Paste** command yang sudah Anda copy tadi ke dalam jendela PowerShell, lalu tekan **Enter**.
6. Cloudflared akan didownload dan diinstall sebagai service Windows secara otomatis.
7. Kembali ke browser (Dashboard Cloudflare), perhatikan layar bagian bawah (*Connectors*). Tunggu beberapa saat sampai statusnya berubah menjadi **Connected**. Jika sudah, klik **Next**.

## Tahap 3: Konfigurasi Routing (Hubungkan Domain ke Aplikasi)

Sekarang kita akan mengarahkan domain `mutishamiyamizu.com` ke aplikasi ERP yang berjalan di Docker Anda.

Di halaman **Route traffic**, isi data berikut:

| Field | Isi / Penjelasan |
|---|---|
| **Subdomain** | Kosongkan saja (biarkan kosong jika ingin aplikasi diakses di domain utama) |
| **Domain** | Pilih `mutishamiyamizu.com` dari dropdown menu. |
| **Path** | Kosongkan saja |
| | |
| **Type** | Pilih `HTTP` |
| **URL** | Ketik `localhost:80` |

### * (Opsional tapi Direkomendasikan)*
Jika Aplikasi berjalan butuh HTTPS local atau mengalami error "Too many redirects", buka bagian **Additional application settings** ➔ **TLS** di bawah URL.
- Centang / aktifkan **No TLS Verify**.

Jika sudah diisi semua dengan benar, klik tombol **Save tunnel** di kanan bawah.

---

## Tahap 4: Selesai!

Sekarang coba buka tab baru di browser dan akses **`https://mutishamiyamizu.com`**. Halaman default Hostinger seharusnya sudah menghilang dan digantikan oleh halaman login ERP HoseMaster Anda.

*(Catatan: Kadang perlu menunggu 1-2 menit hingga DNS Cloudflare tersinkronisasi sempurna setelah Anda menekan Save.)*
