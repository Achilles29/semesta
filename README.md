# Republik WkWkWk

## Studio produksi

Buka **Produksi** di panel admin (`/admin/?view=production`). Episode lama telah
direset; Day 1 baru masih kosong. Tombol **Coba latihan studio** memuat adegan
teknis untuk menguji Play otomatis dan ekspor MP4, terpisah dari cerita Day 1.
Studio mendukung pemeran V15, gerakan, properti, kamera, subtitle, audio, dan
ekspor H.264 1080p/30 fps. Panduan dan batas dukungan browser tersedia di
[Studio produksi](docs/PRODUCTION_STUDIO.md).

## Panduan lokal di XAMPP

1. Letakkan proyek di `C:\xampp\htdocs\project`.
2. Jalankan Apache dan MySQL dari XAMPP.
3. Jika database belum disiapkan, jalankan dari PowerShell:

   ```powershell
   C:\xampp\php\php.exe tools/setup_database.php
   ```

4. Buka `http://localhost/project/`.
5. Masuk ke panel admin melalui **Ruang Editor** dengan kredensial lokal yang disimpan di konfigurasi admin. Jangan menaruh kata sandi langsung ke repository.

Aplikasi mendeteksi alamat lokal beserta subfolder secara otomatis. Untuk server, tetapkan `SEMESTA_BASE_URL` ke alamat publik aplikasi, misalnya `https://contoh.id/`, lalu siapkan konfigurasi database, admin, sesi, dan SMTP sesuai panduan handover.

## Push dan pull dengan build otomatis

Aktifkan **sekali pada setiap checkout**, termasuk server, dari folder project:

```sh
git pull
npm run setup:git
```

Setelah itu cukup `git push` dan `git pull` biasa. Hook akan membangun frontend
jika sumber, aset publik, konfigurasi build, atau dependensinya berubah. Pull
merge/fast-forward dan `git pull --rebase` didukung. Perubahan dokumentasi atau
PHP saja tidak memicu build. Dependensi dipasang ulang dengan `npm ci --include=dev`
jika `package.json`/`package-lock.json` berubah atau paket yang diperlukan hilang.

Node.js dan npm harus tersedia di PATH terminal Git, termasuk di server. Pengaturan
hook bersifat lokal tiap checkout; pull pertama yang membawa skrip ini belum dapat
mengaktifkannya sendiri. `npm ci`/`npm install` berikutnya juga memasang hook melalui
script `prepare`. Hook kustom yang sudah ada tidak ditimpa; gabungkan manual jika
installer melaporkan konflik.

Build gagal akan terlihat di terminal. Kegagalan sebelum push membatalkan push;
kegagalan setelah pull tidak membatalkan perubahan Git. Setelah memperbaiki error,
jalankan `npm run build` untuk mencoba kembali, termasuk jika pull berikutnya
mengatakan `Already up to date`. Build manual tetap tersedia dan statusnya dicatat.
Untuk menonaktifkan hook project: `git config --local --unset core.hooksPath`.

Hasil `assets/game/` tetap tidak masuk Git dan dibuat pada mesin masing-masing.
Buka ulang halaman setelah build; browser memuat bundle dengan nama hash terbaru.
Server Node.js tidak diperlukan saat bermain.

Referensi mekanisme: [Git hooks](https://git-scm.com/docs/githooks) dan
[npm lifecycle scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/).

## Bagian aplikasi

- `application/` berisi CodeIgniter 3, controller, endpoint, konfigurasi, dan tampilan.
- `game-src/` berisi antarmuka, peta, dan area Three.js.
- `assets/game/` berisi hasil build frontend.
- `database/schema.sql` dan `tools/setup_database.php` menyiapkan struktur serta data awal MySQL.
- `docs/KONSEP_REPUBLIK_WKWKWK.md` menjadi acuan konsep produk saat ini.
- `docs/HANDOVER_PENGEMBANGAN_DI_SERVER.md` menjelaskan status teknis dan proses deploy.

## Alur produk saat ini

Pengguna dapat membuat akun warga dan memilih avatar. Kunjungan pertama membuka Peta Utama Indonesia; pemain memilih kota, lalu wilayah Kota Warga, Desa Tumbuh, atau Hutan Warga sebelum masuk ke area 3D. Fasilitas seperti sekolah, MBG, Kopdes, pasar, dan permukiman menjadi bahan cerita di dalam kawasan.

Republik WkWkWk adalah dunia cerita interaktif untuk membahas kehidupan dan isu publik dengan humor. Cerita boleh fiktif dan absurd; klaim faktual harus bersumber. Game saat ini adalah prototipe produksi dan eksplorasi, bukan layanan untuk menentukan kebijakan atau tempat transaksi warga.
