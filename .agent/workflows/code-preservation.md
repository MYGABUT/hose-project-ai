---
description: Guidelines untuk memastikan code reuse dan tidak menghapus fitur yang sudah ada
---

# Code Preservation & Reuse Guidelines

## ⚠️ ATURAN WAJIB

### 1. Sebelum Edit File
- **SELALU view file terlebih dahulu** untuk memahami struktur yang sudah ada
- **CARI pattern yang sudah ada** (komponen, fungsi, style) sebelum buat baru
- **JANGAN replace seluruh file** - gunakan edit targeted pada bagian yang perlu diubah saja

### 2. Saat Menambah Route di App.jsx
- View range sekitar target edit untuk hindari replace route lain
- Tambahkan route baru, JANGAN replace route yang sudah ada
- Verifikasi route sebelumnya masih ada setelah edit

### 3. Saat Menambah Menu di Sidebar.jsx
- Tambahkan group/item BARU, jangan replace existing
- Gunakan insert pattern: cari closing bracket `]` dari group sebelumnya

### 4. Saat Edit CSS
- **Append** style baru di akhir file
- Jangan replace existing class yang mungkin masih dipakai

### 5. Reuse Existing Components
Cek dulu komponen yang sudah ada sebelum buat baru:
- `Card` → `src/components/common/Card/Card`
- `Button` → `src/components/common/Button/Button`
- `Modal` → `src/components/common/Modal/Modal`
- `StatusBadge` → `src/components/common/Badge/StatusBadge`
- `Input` → `src/components/common/Input/Input`

### 6. Reuse CSS Variables
Gunakan variabel CSS dari `src/styles/variables.css`:
```css
--color-primary, --color-success, --color-danger
--spacing-1 through --spacing-8
--font-size-xs through --font-size-2xl
--radius-sm, --radius-md, --radius-lg
```

### 7. API Pattern
Ikuti pattern yang sudah ada:
```javascript
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';
```

## 📋 Checklist Sebelum Submit Code

- [ ] Tidak ada route yang terhapus di App.jsx
- [ ] Tidak ada menu yang hilang di Sidebar.jsx
- [ ] Komponen yang sudah ada di-reuse
- [ ] Style menggunakan CSS variables
- [ ] Import menggunakan path yang benar
- [ ] Tidak ada duplicate style class
