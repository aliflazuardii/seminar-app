# Manajemen Peserta Seminar — Frontend (GitHub Pages)

Frontend statis (HTML/CSS/JS murni) untuk aplikasi manajemen peserta seminar.
Backend: Google Apps Script sebagai REST API (JSON). Data: Google Sheets & Drive milik Anda.

## Struktur
```
index.html          ← halaman utama (SPA)
css/style.css       ← tampilan
js/config.js        ← SATU-SATUNYA yang perlu diedit: GAS_URL
js/app.js           ← inti + halaman publik (daftar, tiket, evaluasi, login)
js/admin.js         ← panel Admin & Panitia (termasuk pemindai QR)
js/jsqr.min.js      ← pembaca QR (jsQR, Apache-2.0)
```

## Tautan penting setelah online
- Pendaftaran seminar: `https://USERNAME.github.io/NAMA-REPO/?s=ID_SEMINAR`
- Tiket peserta (dari email): `https://USERNAME.github.io/NAMA-REPO/?t=TOKEN`
- Panel Admin/Panitia: buka alamat utama → tautan "Masuk Admin / Panitia" di bawah halaman.

Panduan lengkap: lihat `PANDUAN-INSTALASI.md`.
