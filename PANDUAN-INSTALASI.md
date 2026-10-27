# Panduan Instalasi — Manajemen Peserta Seminar (GAS API + GitHub Pages)

Arsitektur: **frontend** (folder ini) di GitHub Pages ⇄ **backend** Google Apps Script (REST API JSON) ⇄ Google Sheets/Drive/Gmail.
Kamera pemindai QR **bekerja** karena frontend dibuka langsung sebagai halaman (bukan di dalam iframe Google).

---
## BAGIAN 1 — Backend (Google Apps Script)

### A. Anda SUDAH punya proyek Apps Script lama (data tetap aman)
1. Buka proyek Apps Script Anda.
2. Buka `Kode.gs` → hapus semua isi → tempel seluruh isi **`Kode-gs.txt`** (versi baru). Ctrl+S.
3. `QRLib.gs` dan `appsscript.json` **tidak berubah** (boleh dilewati).
4. Berkas **`Index`** (HTML) sudah tidak dipakai. Boleh dihapus (klik ⋮ di sampingnya → Hapus) atau dibiarkan.
5. **Terapkan → Kelola deployment → ikon pensil → Versi: "Versi baru" → Terapkan.**
   Alamat `/exec` TIDAK berubah. Spreadsheet, peserta, dan seminar lama tetap utuh.
6. Cek: buka alamat `/exec` di browser. Harus tampil teks seperti
   `{"ok":true,"app":"Manajemen Peserta Seminar","layanan":"aktif",...}`.
   (Jika masih muncul halaman aplikasi lama, langkah 5 belum dilakukan.)

### B. Instalasi baru dari nol
1. script.google.com → Proyek baru. Tempel `Kode-gs.txt` ke `Kode.gs`; tambah berkas Skrip `QRLib` (isi `QRLib-gs.txt`); tampilkan dan isi `appsscript.json` (isi `appsscript-json.txt`).
2. Jalankan fungsi **`setupAplikasi`** sekali → izinkan akses → lihat **Log eksekusi** untuk email + kata sandi admin pertama.
3. Terapkan → Deployment baru → Aplikasi web → Jalankan sebagai **Saya**, akses **Siapa saja** → salin URL `/exec`.

---
## BAGIAN 2 — Frontend (GitHub Pages)

### 1. Isi alamat backend
Buka `js/config.js` dan pastikan `GAS_URL` berisi alamat `/exec` Anda (berkas ini sudah diisi dengan alamat yang Anda berikan; ganti jika berbeda).

### 2. Folder yang di-push
Ekstrak ZIP. Folder hasil ekstraksi (`manajemen-seminar`) **adalah** folder yang di-`git init`.
Sebelum `git init`, `dir` (Windows) / `ls` (Mac/Linux) harus menampilkan **`index.html` langsung di daftar teratas**, bersama folder `css` dan `js`. Jika yang terlihat hanya satu folder lagi, masuk dulu ke dalamnya.

### 3. Perintah (satu per satu)
```bash
cd "C:\lokasi\manajemen-seminar"
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
Saat diminta password, tempel **Personal Access Token** (GitHub → Settings → Developer settings → Tokens (classic) → centang `repo`). Layar tidak menampilkan apa pun saat Anda menempel — itu normal.

### 4. Aktifkan Pages
Repo → Settings → Pages → Source: *Deploy from a branch* → Branch **main** / **(root)** → Save. Centang **Enforce HTTPS** (wajib untuk kamera). Tunggu 1–2 menit; alamat situs muncul di halaman itu.

### 5. Pertama kali dipakai
1. Buka alamat situs → **Masuk Admin / Panitia** → login.
2. Saat Admin login dari situs ini, alamat situs otomatis disimpan sebagai dasar tautan di email peserta.
3. Menu **Manajemen Seminar** → klik ikon tautan → bagikan tautan pendaftaran.

### Update situs di kemudian hari
```bash
git add .
git commit -m "Perubahan"
git push
```
Tekan Ctrl+Shift+R di browser jika masih tampil versi lama.

---
## Kamera pemindai
- Buka situs langsung di Chrome/Safari HP panitia (bukan di dalam iframe/Blogger), izinkan kamera.
- Cadangan: tombol **Foto QR**, kode manual, atau cari nama.

## Pemecahan masalah
| Gejala | Penyebab | Solusi |
|---|---|---|
| "Tidak dapat menghubungi server" | `GAS_URL` salah / deployment bukan "Siapa saja" | Periksa `js/config.js`; deploy ulang Versi baru |
| Alamat `/exec` menampilkan halaman aplikasi lama | Deployment belum diperbarui | Kelola deployment → Versi baru |
| Halaman 404 di GitHub Pages | `index.html` tidak di root repo | Lihat repo di browser; push ulang dari folder yang benar |
| Tampil tanpa styling | Folder `css/` tidak ikut ter-push | Push ulang dari folder yang benar (jangan upload manual lewat web) |
| Email berisi tautan lama | Alamat situs belum tersimpan | Login sebagai Admin dari situs ini, atau isi di menu Pengaturan |
