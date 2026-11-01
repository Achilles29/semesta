# Handover Semesta Nyasar untuk Server

Dokumen ini menjadi panduan memindahkan prototipe dari XAMPP lokal ke server dan melanjutkan pengembangan. Aplikasi memakai CodeIgniter 3, PHP, MySQL, serta frontend Three.js yang dibangun dengan Vite.

## Status saat diserahkan

- Peta utama menampilkan tujuan kota.
- Peta kota Kampung Sore menampilkan enam titik lokasi.
- Dapur MBG adalah satu-satunya titik dengan area 3D yang bisa dimasuki. Titik lain masih terkunci sampai punya area tersendiri.
- Area Dapur MBG punya jalan utama dan cabang, rumah, dapur, kandang, manusia, hewan, pohon, petunjuk, dan tabrakan objek.
- Navigasi cepat dari area 3D ke Peta Jalan dan Peta Utama tersedia. Jika render 3D gagal, panel diagnostik menampilkan pesan kesalahan.
- Lokasi, posisi pemain, arah kamera, dan petunjuk disimpan di localStorage browser. Data cerita dan ide warga disimpan di MySQL.
- Akun admin saat ini dibatasi hanya untuk koneksi localhost. Jangan membuka endpoint admin ke publik tanpa menambahkan pengamanan yang sesuai.

## Susunan berkas penting

- `application/` berisi CodeIgniter 3, controller, API, konfigurasi, dan tampilan.
- `game-src/` berisi sumber game, peta, UI, dan CSS.
- `assets/game/` berisi hasil build yang dipakai browser. Folder ini diabaikan Git, jadi hasil build harus dibuat dan ikut diunggah.
- `database/schema.sql` berisi struktur database.
- `tools/setup_database.php` membuat database/tabel dan mengimpor seed secara aman tanpa menghapus isi yang sudah ada.
- `application/data/cases/` dan `application/data/ideas-warga.json` adalah sumber seed/cadangan.
- `application/config/admin_credentials.php` berisi hash login lokal dan diabaikan Git. File ini tidak otomatis tersedia pada checkout server.

## Persiapan server

Pastikan server menyediakan:

- Apache dengan `mod_rewrite` aktif dan `AllowOverride All` untuk folder aplikasi.
- PHP dengan ekstensi `mysqli`, `mbstring`, dan `json`. Pastikan versi PHP kompatibel dengan CodeIgniter 3 yang ada.
- Browser pengguna dengan dukungan WebGL 2 untuk area Three.js.
- MySQL atau MariaDB.
- Node.js 20.19+ atau 22.12+ dan npm untuk membangun frontend. Node.js tidak diperlukan saat game dimainkan.
- HTTPS untuk penggunaan publik.

Jangan mengunggah `node_modules`. Pasang ulang dependensi dari `package-lock.json` di mesin build dengan `npm ci`.

## Langkah pindah dan deploy

1. Buat cadangan kode, berkas data, dan database server sebelum mengganti versi.
2. Unggah seluruh kode aplikasi, termasuk `game-src/`, `application/`, `system/`, `database/`, `tools/`, `package.json`, dan `package-lock.json`.
3. Di mesin build, jalankan:

   ```sh
   npm ci
   npm run build
   ```

   Sertakan folder hasil `assets/game/` ke paket deploy. Setiap perubahan pada `game-src/` perlu diikuti build baru.
4. Buat database `semesta_nyasar` dan user database khusus aplikasi. Hindari memakai user `root` di server.
5. Atur `application/config/database.php` dengan hostname, username, password, dan nama database server.
6. Jalankan `tools/setup_database.php` melalui CLI dengan environment `SEMESTA_DB_HOST`, `SEMESTA_DB_USER`, `SEMESTA_DB_PASSWORD`, dan bila perlu `SEMESTA_DB_PORT`. Skrip ini membuat tabel dan mengisi episode awal; akun provisioning database perlu izin membuat database/tabel. Setelah setup, gunakan user database aplikasi dengan izin seperlunya pada database `semesta_nyasar`. Jika database dibuat manual, impor `database/schema.sql` dan pastikan episode `kasus-01` juga di-seed sebelum halaman game dipakai.
7. Sesuaikan `RewriteBase` pada `.htaccess` dengan lokasi deploy. Untuk domain root, gunakan `/`; untuk subfolder, gunakan nama subfolder yang benar. Pastikan `mod_rewrite` dan `AllowOverride All` aktif.
8. Pastikan `application/cache/sessions/` dapat ditulis oleh proses PHP.
9. Atur `application/config/config.php` sebelum membuka aplikasi ke publik:
   - ganti `encryption_key` dengan nilai acak yang kuat dan simpan cadangannya;
   - gunakan HTTPS dan atur cookie secure;
   - pastikan `db_debug` nonaktif pada environment produksi;
   - periksa `base_url` jika host/proxy server membuat deteksi otomatis keliru.
10. Buat `application/config/admin_credentials.php` di server secara manual. Simpan username admin dan hash password, bukan password teks biasa. File ini tidak masuk Git.
11. Periksa aturan akses admin di `application/controllers/Admin.php` dan API admin di `application/controllers/Api.php`. Keduanya menolak koneksi non-localhost. Pertahankan aturan ini sampai mekanisme autentikasi dan pembatasan akses untuk server selesai dirancang.
12. Muat aplikasi melalui domain server dan lakukan pemeriksaan manual di bagian berikut.

Contoh bentuk file kredensial admin server:

```php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');
$config['username'] = 'ganti-dengan-user-admin';
$config['password_hash'] = 'ganti-dengan-hasil-password_hash';
```

Buat hash di komputer tepercaya dengan `password_hash()` PHP. Jangan menaruh password atau hash aktual ke dokumentasi, repository publik, atau tiket.

## Pemeriksaan setelah deploy

- Halaman awal terbuka melalui domain dan tidak meminta port Vite.
- Peta utama berpindah ke peta Kampung Sore.
- Peta kota memilih titik sesuai pin.
- Dapur MBG membuka area 3D; navigasi Peta Jalan dan Peta Utama membawa ke layar yang benar.
- Jika area 3D kosong, panel diagnostik tampil. Catat pesan di panel dan periksa Console browser serta dukungan WebGL.
- Pemain dapat berjalan, berhenti di penghalang, dan berjalan melewati jembatan.
- Muat ulang saat berada di area 3D; pemain kembali ke lokasi dan posisi terakhir pada browser yang sama.
- Episode dapat dibaca/disimpan dan ide warga dapat diakses database.
- URL admin tidak dapat diakses publik selama pembatasan localhost masih aktif.

## Batasan yang perlu diketahui

- Posisi dan progres permainan saat ini tersimpan di browser pengguna. Data itu tidak mengikuti pengguna ke perangkat/browser lain dan tidak disimpan sebagai akun di server.
- Komentar media sosial belum diambil otomatis. Inbox ide masih bergantung pada alur input yang disediakan aplikasi.
- Kota lain dan lima titik selain Dapur MBG belum memiliki area 3D unik.
- Aplikasi belum menyediakan akun pemain, multiplayer, pembayaran, atau penyimpanan cloud untuk progres.
- Vite saat build memberi peringatan ukuran bundel JavaScript di atas 500 KB karena Three.js masih berada dalam satu bundel.

## Pengembangan berikutnya

- Tinjau pesan diagnostik bila render 3D masih gagal di browser server.
- Selesaikan visual dan collision untuk Dapur MBG sebelum membuka titik lain.
- Bangun area 3D unik untuk satu titik berikutnya, lalu hubungkan pintu/jalurnya ke peta kampung.
- Sebelum panel admin dipakai dari jarak jauh, rancang akses aman berbasis HTTPS, autentikasi, dan pembatasan jaringan.
- Jika progres harus lintas perangkat, pindahkan penyimpanan pemain dari localStorage ke tabel database dan tambahkan identitas pemain.
