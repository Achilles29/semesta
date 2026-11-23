# Republik WkWkWk

## Studio produksi

Buka **Produksi** di panel admin (`/admin/?view=production`). Day 1 dan Day 2
tersedia pada katalog produksi. Episode, audio dan pemutarnya hanya untuk admin;
peta publik tidak menampilkan studio atau kerumunan pemeran episode.
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
- `roadmap/README.md` menjadi pintu masuk konsep game, checklist dan handover terbaru.
- `docs/PROMPT_ACUAN_PRODUKSI_KONTEN.md` menjadi acuan produksi episode.
- `roadmap/03-HANDOVER-SERVER.md` menjelaskan kelanjutan pekerjaan; `docs/HANDOVER_PENGEMBANGAN_DI_SERVER.md` menyimpan panduan operasional terdahulu.

## Alur produk saat ini

Pengguna membuat akun warga, memilih profesi dan karakter, menerima saran avatar yang dapat diedit, lalu mempunyai kartu warga virtual. Satu klik kota di atlas Republik membuka wilayahnya. Wilayah memuat kawasan kota, desa, pedesaan, hutan dan pegunungan; denah rinci Jakartawa terpisah. Jelajah memakai satu ruang dunia bersama dengan akun online terdekat.

Pengembangan menuju **simulasi kehidupan warga dengan pembangunan kota bersama**. Fase dunia dan proyek kini tersimpan di server; prototipe konstruksi rumah P01 menyediakan alur ambil–antar–pasang beserta kit/XP per akun. Admin mengaktifkannya melalui **Dunia bersama**. Jalankan migrasi tambahan `php tools/migrate_republic_world.php` pada database yang sudah ada, jangan mengulang seed database. Inventaris umum, kepemilikan rumah dan pekerjaan lain masih mengikuti [checklist](roadmap/02-TAHAP-DAN-CHECKLIST.md). Konten mengikuti kanon, komentar warga dan fitur yang siap; playback tidak menerbitkan dunia. Email/Google ditunda ke pengerjaan server.
