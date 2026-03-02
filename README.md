# 🚀 HOSE PRO — Deployment Guide

## 🏠 Development (Local)

```powershell
# Start semua services
docker compose up -d

# Frontend dev server (hot reload)
npm run dev
# Akses: http://localhost:5173
```

---

## 🌐 Share Sementara (Cloudflare Tunnel - Tanpa Domain)

> Cocok untuk: demo client, testing tim, akses remote sementara.
> URL berubah setiap kali restart tunnel.

```powershell
# Pastikan Docker sudah running
docker compose up -d

# Jalankan tunnel (URL muncul otomatis)
cloudflared tunnel --url http://localhost:80
```

Akan muncul URL seperti: `https://random-abc.trycloudflare.com` — bagikan ke siapa saja.

---

## 🏭 Production (Cloudflare Tunnel + Domain `mutishamiyamizu.com`)

### Prasyarat
- Login ke registrar domain → Ganti **Nameserver** ke Cloudflare:
  - `vida.ns.cloudflare.com`
  - `zeus.ns.cloudflare.com`
- Akun Cloudflare Free (https://cloudflare.com)

### Step 1 — Install cloudflared (sudah ada di folder project)
```powershell
# Sudah ada: .\cloudflared.exe
```

### Step 2 — Login
```powershell
.\cloudflared.exe tunnel login
```

### Step 3 — Buat Named Tunnel
```powershell
.\cloudflared.exe tunnel create hose-pro
# Simpan Tunnel ID yang muncul
```

### Step 4 — Routing DNS
```powershell
.\cloudflared.exe tunnel route dns hose-pro mutishamiyamizu.com
# Atau untuk subdomain:
.\cloudflared.exe tunnel route dns hose-pro app.mutishamiyamizu.com
```

### Step 5 — Buat Config File
Buat `C:\Users\micha\.cloudflared\config.yml`:
```yaml
tunnel: hose-pro
credentials-file: C:\Users\micha\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: mutishamiyamizu.com
    service: http://localhost:80
  - service: http_status:404
```

### Step 6 — Jalankan sebagai Windows Service (auto-start)
```powershell
.\cloudflared.exe service install
```

### Step 7 — Atau pakai Docker (uncomment di docker-compose.yml)
1. Dapatkan tunnel token dari [Cloudflare Dashboard](https://dash.cloudflare.com) → Zero Trust → Tunnels
2. Tambahkan ke `.env`:
```
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoixxxxxxx...
```
3. Uncomment bagian `tunnel:` di `docker-compose.yml`
4. Jalankan: `docker compose up -d`

---

## 🔒 Security Layers yang Aktif

| Layer | Status |
|-------|--------|
| HTTPS / SSL | ✅ (self-signed dev, Cloudflare prod) |
| Database RLS | ✅ Multi-tenant isolation |
| Settings Encryption (Fernet) | ✅ |
| Brute-Force Protection | ✅ Block 10 failures/15min |
| Security Headers (HSTS, CSP, dll) | ✅ |
| Rate Limiting (slowapi) | ✅ |

---

## 📋 Environment Variables
Lihat `backend-hose-ai/.env` dan sesuaikan untuk production:

| Variable | Keterangan |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key (ganti di production!) |
| `ENCRYPTION_KEY` | Fernet key untuk encrypt settings |
| `DEBUG` | Set `False` di production |
