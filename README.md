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

**Rilis frontend sekarang ikut Git**, sehingga server cukup menjalankan `git pull`.
Yang disertakan hanya bundle JS/CSS/gambar hasil Vite, manifest, dan catatan hash
build di `assets/game/` (sekitar 3 MB). Model, audio, dan ilustrasi besar tetap
berasal dari `public/`; salinan lama di `assets/game/map-assets/` tidak digunakan.
Server PHP tidak membutuhkan Node.js, npm, atau pemasangan hook untuk menerima rilis.

Pada **komputer pengembang**, aktifkan sekali melalui `npm run setup:git`.
`npm ci` juga memasang hook melalui lifecycle `prepare`. Node.js dan npm diperlukan
di komputer ini. Alur selanjutnya tetap:

```sh
git add .
git commit -m "Perbarui peta dan produksi"
git push
# Di server:
git pull
```

Hook `pre-commit` membangun perubahan frontend dan memasukkan **hanya hasil build**
ke staging. Jika sumber frontend baru sebagian di-stage, commit dihentikan agar
perubahan lain tidak ikut rilis tanpa sengaja. Dokumen/PHP saja tidak perlu build.
Hook `pre-push` memeriksa sumber, manifest, dan seluruh chunk dalam commit yang
dikirim; rilis kedaluwarsa atau tidak lengkap menahan push, tanpa mengubah commit.
Hook kustom tidak ditimpa otomatis oleh installer.

Tanpa hook, jalankan `npm ci`, `npm run build`, lalu sertakan `assets/game/` ketika
`git add` dan commit. Jangan hanya mem-build sesudah commit: hasilnya harus masuk
commit yang dikirim. Buka ulang halaman setelah pull agar HTML memuat nama bundle
berhash yang baru. Jika ada cache halaman/CDN, bersihkan cache HTML tersebut.

Pada rilis sebelum perubahan ini, seluruh `assets/game/` diabaikan Git. Push bisa
sukses tetapi server masih memakai build lama, sekalipun sumber sudah terbaru.
Perbaikannya adalah menarik commit yang **sudah menyertakan rilis frontend**.
Untuk checkout lama sebelum rilis itu tersedia, jalankan `npm ci` dan
`npm run build` sekali di server. `git pull` yang sudah up to date tidak mengulang
hook build yang sebelumnya gagal.

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
