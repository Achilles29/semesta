# Handover lokal ke server

**Tanggal:** 24 November 2026. **Baseline sebelum pekerjaan lokal:** `61f5e9a`. Perubahan pada handover ini berada di working tree lokal sampai pemilik melakukan commit/push. Jangan menganggap dokumen ini bukti server online sudah berubah.

**Paket terbaru:** dunia/konstruksi P01 dilanjutkan dengan perbaikan HUD/LARI dan hunian awal Wisma Warga. Tugas Bu Rani, kamar per akun dan tanaman pada rak tersimpan di database. Migrasi hunian sudah dijalankan di localhost; server memerlukan migrasi tambahan di bawah. SMTP/Google **ditunda ke server**; tidak ada pengiriman audio, email, OAuth nyata atau push otomatis.

**Perbaikan antarmuka akun berikutnya:** selector `.google-sso-button>span` dahulu memberi ukuran ikon 23×23 piksel juga kepada teks. Kini ikon/label memakai class masing-masing, teks 14 piksel dapat mengalir sesuai lebar tombol, dan status tidak tersedia tetap terbaca. Pada profil akun yang sudah masuk, tombol Google/pesan pendaftaran disembunyikan; intro menjelaskan penyuntingan profil. Backend/OAuth tidak diubah. Tes `test_citizen_onboarding.mjs` memeriksa cascade CSS nyata, tampilan guest/logged-in, Google tersedia/tidak tersedia dan tombol simpan profil. Ini DOM, bukan penerimaan browser/perangkat.

Label pilihan rumah saat daftar tetap **Gaya rumah impian**. Keterangan kini membedakan preferensi rumah tapak dari kamar awal Wisma. Nilai lama tetap kompatibel; tabel hunian menyimpan kamar/progres secara terpisah. Kamar dasar disetujui pemilik; hadiah follower masih berupa arah kosmetik, belum ada verifikasi atau klaim.

## Hunian awal dan perbaikan jelajah — 24 November

Cara mencoba: masuk dengan profil lengkap → **Jakartawa → Pusat Jakartawa → Denah rinci → Tujuan di kota → Bu Rani · mulai di sini → Jelajahi**. Di dekat Bu Rani, tekan tombol tugas atau E, berjalan ke pintu Wisma mengikuti panah/jarak, serahkan paket, lalu **Masuk kamar**. Klik rak atau **Taruh tanaman**; **Keluar kamar** mengembalikan pemain ke pintu wisma. **Tujuan di kota → Wisma Warga** menyediakan pintasan kembali. Tidak perlu mengaktifkan proyek P01 untuk tugas sambutan.

- LARI kini tombol toggle untuk mouse/sentuh; Shift tetap dapat ditahan. Minimap, profil, navigasi, pekerjaan dan kontrol tidak lagi memakai posisi sama. Menu **Alat** menampung avatar, musik dan mode rekam. Pada layar kecil, rincian proyek mulai terlipat; membuka rincian sementara memakai area panel atas dengan tombol gerak tetap tersedia.
- Geometri Wisma berada di `(38,-3)`, pintu `(38,3)`, Bu Rani di `(9,6)`; tidak mengambil petak P01–P24. Vegetasi publik menghindari tapak. Set produksi Day 1/Day 2 tidak mendapat Wisma atau NPC baru secara otomatis.
- API `citizen_home` privat memberi reservasi kamar pada GET pertama akun lengkap. Satu tugas antar membuka akses dan hadiah. POST menerima aksi terbatas, requestId dan CSRF; server menentukan identitas, slot, progres serta imbalan. Paket/hadiah tidak ditentukan klien.
- Kamar ditampilkan dalam adegan 3D privat untuk penataan satu rak; belum dapat berjalan di interior, mengundang teman, membeli perabot atau memperoleh rumah tapak. Masuk mengikat mode interior ke sesi, menghentikan presence publik sesi itu; keluar aman tanpa presence. Perangkat lain harus masuk sendiri. Posisi luar tetap memakai presence klien, bukan anti-cheat gerak penuh.
- Tes backend `tools/test_citizen_home.php`: **72 pemeriksaan** pada MySQL terisolasi/HTTP adapter, dua akun, browser kedua, sesi/CSRF/profil, jarak/waktu, hadiah satu kali, slot, replay, rollback dan race. Tes `tools/test_citizen_auth_http.php` juga menjalankan **routing, loader, registrasi/login dan sesi CodeIgniter localhost asli**, lalu tugas/kamar/rak/login ulang; akun sementara `.invalid` beserta empat tabel progres/presence dibersihkan. Tidak mengirim email.
- Tes frontend `test_citizen_home.mjs`, `test_citizen_home_geometry.mjs`, `test_citizen_home_integration.mjs`, `test_republic_world_hud.mjs` lulus: replay setelah respons hilang, refresh bertumpuk, pergantian akun, kontrol/keadaan privat, disposisi, tabrakan/pintu dan delapan ukuran/mode input. Integrasi memakai mount asli dengan adapter CPU, **bukan browser/GPU**. [Review Wisma dan kamar](../docs/world/wisma-kamar-review.jpg) adalah render offline geometri runtime.
- Target waktu 5–10 menit dan penerimaan visual di HP/desktop belum diuji dengan pemain. Setelah pilot, lanjut variasi pesanan, inventaris umum dan satu kegiatan kreatif. Jangan menyatakan kunjungan, ekonomi, hadiah follower, atau tiga pekerjaan penuh sudah tersedia.

**Migrasi hunian wajib saat rilis server:** sesudah backup sesuai prosedur deploy, jalankan:

```sh
php tools/migrate_citizen_home.php
```

Menambah `citizen_homes`, `citizen_home_requests`, `citizen_home_ledger`; tidak mengubah profil, dunia, proyek P01 atau isi kamar yang sudah ada. Dua kali eksekusi localhost berhasil. Migrasi tidak membagikan kamar massal; reservasi dibuat ketika akun lengkap pertama kali membuka fitur. Tanpa migrasi, fitur memberi pesan 503 hunian belum siap. Publikasi Wisma disertakan pada paket game atas persetujuan pemilik, bukan hasil survei atau mutasi fase episode.

## Perbaikan hasil pull yang dipertahankan

| Bagian | Kontrak yang tidak boleh mundur |
|---|---|
| Distribusi frontend (`6889155`) | Build `assets/game/`, manifest dan catatan hash ikut Git. Pre-commit membangun/stage hasil yang diperlukan; pre-push memeriksa konsistensi. Server menerima hasil build melalui pull; tidak perlu Node hanya untuk menyajikan rilis. |
| Presence (`61f5e9a`) | Ruang bersama `destination: republic`, `region: world`; maksimal 12 akun nyata terdekat. Pasca dan Bu Rani adalah dua NPC yang diberi penanda, bukan akun online. Poll sekitar 1,6 detik, penemuan 55 m, chat 5 m dan interpolasi dipertahankan. Mode kamar privat menghentikan publikasi posisi sesi. Jangan memuat kembali 48 pemeran episode sebagai pemain online. |
| MP4 | `@mediabunny/aac-encoder` lazy fallback saat AAC native tidak tersedia; Mediabunny/encoder tetap 1.66.2. Tombol ekspor dapat menunggu scene selesai dibangun. Jangan mengembalikan tombol diam atau membuang fallback. |
| Public/admin | Episode, modul/chunk dan audio produksi privat dengan pemeriksaan sesi server. Geometri netral/shared tetap tersedia untuk dunia publik. |
| Dunia | ID dan anchor kota tetap. Tiga kota di daratan utama, dua di pulau lain; 25 chunk terrain sekitar pemain. Awal 24 fondasi, sesudah Day 2 hanya dua gedung program selesai. |
| Konten | Naskah/audio Day 1/Day 2, pemilihan suara, kamera dan pemeran tidak ditulis ulang pada pekerjaan ini. Angka runtime terbaru mengalahkan catatan PR lama. |

Coastline kini lebih berlekuk dan ilustrasi atlas diperbarui menggunakan sumber geometri bersama. Ini perubahan peta yang diminta, bukan pemindahan koordinat kota/jalan. Tes dunia dan navigasi memeriksa konsistensinya.

## Perubahan lokal baru

| Area | Berkas utama | Perilaku |
|---|---|---|
| Rekomendasi profesi | `game-src/citizen-professions.json`, `.js`, `citizen-accessories.js` | 23 master awal × 2 gender. Variasi tubuh/kulit/wajah/rambut, wardrobe dan alat peran. Pilihan manual bertahan; saran diterapkan ulang melalui tombol. ID profesi tetap dapat diracik dan menyimpan aksesori. |
| Aksesori koki | `citizen-accessory-designs.json`, `tools/citizen_accessories.py` | Topi koki baru mengikuti tulang kepala, tanpa membangun ulang GLB besar. Render offline dan runtime menggunakan definisi sama. |
| Form/kartu | `main.js`, `citizen-identity.js`, `citizen-auth.css`, `application/views/game.php` | Profil draft disimpan melalui tombol; kartu menggunakan data tersimpan. Nomor warga stabil, tanpa biodata privat pada kartu. Gaya modal responsif. |
| Auth | `Api.php`, `Semesta_model.php`, `citizen_identity_helper.php` | Login username/email, pilihan layanan sesuai konfigurasi, email belum diverifikasi tidak dinyatakan verified, Google subject stabil/state expired, profil wajib lengkap. |
| Navigasi/ilustrasi | `republic-map.js`, `republic-map-art.js`, `republic-map.css`, `republic-world-layout.js`, bagian peta `main.js/game.php` | Klik kota langsung membuka wilayah, kontrol reset “Lihat semua”, atlas dan wilayah lebih sederhana. |
| Keadaan resmi | `Republic_world_model.php`, `republic_world_helper.php`, rute baru `Api.php`, `republic-world-state.js` | Seed after-day2, API no-store, versi fase/proyek, sinkronisasi tiga detik. Snapshot lama tidak memundurkan progres; data privat tidak masuk store publik. Snapshot pertama wajib sebelum jelajah, dengan status/retry saat gagal. |
| Publikasi admin | `admin-world-state.js/.css`, view admin `shared-world` | Fase, aktifkan/jeda/resume proyek, alasan, konfirmasi tinjau, CSRF, expectedVersion, requestId dan riwayat. Konflik meminta muat ulang; retry jaringan memakai ID yang sama. Playback produksi tidak menulis fase. |
| Konstruksi | `republic-construction.js/.css`, `republic-construction-geometry.js`, integrasi openworld/peta | Ambil kit di depot, bawa ke P01, serahkan (+2 XP), pasang selama minimal dua detik (+5 XP). Dua belas komponen membentuk rumah. Progres, bawaan dan timer pulih setelah reload. |
| Rencana | `roadmap/`, `AGENTS.md`, pointer README/dokumen lama | Konsep game dipisah dari produksi, checklist dan kelanjutan server wajib diperbarui. |

## Migrasi database dan layanan akun

**Migrasi dunia wajib untuk paket terbaru:** enam tabel tambahan `world_state`, `world_projects`, `world_publications`, `citizen_work_state`, `world_action_requests`, `citizen_work_ledger`. Jalankan sesudah backup menggunakan konfigurasi privat aplikasi, bukan mengulang seed seluruh database:

```sh
php tools/migrate_republic_world.php
```

Migrasi telah dijalankan dua kali di localhost: seed tetap after-day2 versi 1 dan `jakartawa-home-01` draft dengan progres nol; akun/profil tidak ditulis. `CREATE TABLE IF NOT EXISTS` dan `INSERT IGNORE` mempertahankan publikasi/progres yang sudah ada. Perubahan skema selanjutnya perlu migrasi baru, jangan mengandalkan perintah ini untuk mengubah struktur tabel lama.

**Migrasi akun dari paket sebelumnya:** kolom nullable `citizens.google_sub` (ASCII, case-sensitive) dan unique index `uq_citizens_google_sub`. Schema/setup akun baru juga sudah mengenalnya. Jika belum diterapkan, gunakan migrasi sempit ini saat pengerjaan akun di server:

```sh
php tools/migrate_citizen_google.php
```

Di lokal perintah dijalankan dengan `C:\xampp\php\php.exe`, dua kali untuk memeriksa idempotensi; berhasil tanpa mengubah profil warga. Di server jalankan memakai konfigurasi database privat aplikasi yang sama setelah backup sesuai prosedur deploy. Migrasi tidak menulis kredensial ke output. Tanpa kolom itu Google dinyatakan belum tersedia, bukan memaksa query yang rusak.

Konfigurasi auth tetap dibaca dari environment atau berkas privat di luar repository. Lokasi bawaan server `/www/server/php/81/etc/semesta-auth.php`; dapat diatur melalui `SEMESTA_AUTH_CONFIG_FILE`. Variabel yang didukung meliputi `SEMESTA_SMTP_HOST`, `SEMESTA_SMTP_PORT`, `SEMESTA_SMTP_USER`, `SEMESTA_SMTP_PASSWORD`, `SEMESTA_SMTP_CRYPTO`, `SEMESTA_MAIL_FROM`, `SEMESTA_MAIL_FROM_NAME`, `SEMESTA_GOOGLE_CLIENT_ID`, `SEMESTA_GOOGLE_CLIENT_SECRET`. Jangan menyalin nilainya ke Git/dokumen.

Google redirect URI harus persis hasil `site_url('api?resource=google_sso&action=callback')` pada base URL deployment, termasuk subfolder/index.php jika konfigurasi memakainya. Jangan menyalin callback localhost ke OAuth produksi. Endpoint `api?resource=auth_options` hanya melaporkan boolean ketersediaan, tidak membuka rahasia.

**Temuan lokal:** registrasi email tersedia; verifikasi wajib mati; SMTP belum tersedia; Google belum tersedia. Akun baru yang belum menerima verifikasi tetap berstatus belum diverifikasi walaupun dapat masuk. Ini verifikasi akses email/provider, **bukan KYC dokumen resmi**. Akun legacy yang dahulu diberi `email_verified=1` ketika gate mati belum diaudit ulang massal; jangan mengubah semua akun tanpa rancangan migrasi bukti verifikasi.

Google memakai `sub` untuk identitas stabil. Email pihak ketiga tidak otomatis ditautkan tanpa pembuktian akun lama; Gmail/Workspace terverifikasi mengikuti kebijakan authority Google. Jika email provider berubah, login sub tetap dapat bekerja tetapi tidak membuat alamat tersimpan yang berbeda menjadi terverifikasi. Sumber teknis: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [email authority Google](https://developers.google.com/identity/gsi/web/reference/html-reference), [email CodeIgniter 3](https://codeigniter.com/userguide3/libraries/email.html).

## Bukti verifikasi dan batasnya

- `php tools/test_republic_world.php`: **54 pemeriksaan** dengan controller/model asli, HTTP/session adapter uji dan MySQL terisolasi. Dua akun, publikasi/fase/riwayat, CSRF, profil belum lengkap, versi konflik, timer/jarak, replay tanpa mundur, stok sisa, rollback paksa, migrasi berulang. Proses PHP independen memperebutkan unit terakhir: hanya satu kontribusi dan satu hadiah. Database/sesi uji dibersihkan; ini bukan login browser atau uji beban produksi.
- `node tools/test_republic_world_state.mjs`: dua klien/reload, penolakan versi lama, pembuangan data privat, snapshot beku, koneksi gagal/retry, satu request aktif dan dispose.
- `node tools/test_republic_world_gate.mjs` dan `--restore`: peta tetap bisa dinavigasi ketika snapshot pertama pending/gagal/rusak; jelajah menunggu server. Retry, data terakhir saat offline, back/forward cache, serta navigasi sengaja mengalahkan pemulihan posisi lama.
- `node tools/test_admin_world_state.mjs`: baca tanpa mutasi, publikasi/review, status proyek, alasan/riwayat aman, konflik, retry ID sama, 401/403 dan lifecycle. `test_admin_navigation.mjs` memeriksa view baru pada enam base URL.
- `node tools/test_republic_construction.mjs`: alur lengkap, radius/timer, presence segar, retry, akun berganti, reload, guest, rekonsiliasi versi serta collider/lantai/disposal. `test_republic_map_ui.mjs` memastikan P01 sinkron di denah/minimap dan 23 petak lain tetap fondasi.
- `node tools/test_republic_construction_pose.mjs`: 144 sampel pegangan pada enam profil GLB dan Idle/Walk/Run. Kedua tangan mencapai kit; kepala/kaki tetap, pose normal dipulihkan sebelum animasi berikut atau saat kit dilepas. Ini pemeriksaan rig CPU, belum penilaian gerak pada layar perangkat.
- HTTP CodeIgniter localhost: world_state 200, after-day2 versi 1 dengan proyek draft; tamu ditolak 401 pada world_admin/world_work. Tidak mengaktifkan atau memajukan proyek live saat pengujian.
- [Review tahap rumah](../docs/world/construction-stages-review.jpg) dirender offline dari geometri runtime yang sama. Menemukan dan memperbaiki penutup segitiga atap, collider depot setelah selesai, dan permukaan tangga. Bukan bukti frame rate/WebGL perangkat.

- `php tools/test_citizen_identity.php`: nomor stabil, proyeksi kartu terbatas, verifikasi, pelengkapan profil dan kebijakan subject/email Google.
- `php tools/test_citizen_auth.php`: fixture auth/API, state/callback/expiry/cancel sebelum network, token email dikonsumsi sekali. Tidak mengirim pesan eksternal.
- `node tools/test_citizen_onboarding.mjs`: 46 rekomendasi, pilihan manual, mengganti saran secara eksplisit, draft profil/editor asli, penyimpanan dan kartu dengan teks aman.
- `php tools/test_citizen_auth_http.php`: HTTP + database localhost untuk daftar, reload, update, logout, login email, avatar dan kartu tetap. Akun `.invalid` sementara dibersihkan; tidak memakai email orang lain.
- Tes peta/dunia/presence: lihat catatan hasil akhir di bawah. DOM, geometri dan fixture presence tidak menyatakan WebGL/GPU atau dua perangkat sungguhan telah diuji.
- Render Blender memeriksa contoh polisi, konstruksi, medis dan koki pada dua gender dari GLB yang sama. Render SVG memeriksa seni atlas/wilayah. Keduanya bukan screenshot browser.
- Browser otomatis tidak tersedia pada sesi ini karena pembatasan alat sebelumnya; tidak dicoba lewat jalur alternatif. Pemeriksaan visual/interaksi HP/desktop dan login Google/email nyata tetap tugas `A-06`, `A-07`, `A-10`.

## Melanjutkan di server

1. Tarik commit yang dipilih pemilik; cocokkan sumber, manifest dan build. Baca handover ini dan checklist, kemudian periksa `git status` agar perubahan server tidak tertimpa.
2. Terapkan migrasi sempit, termasuk `php tools/migrate_citizen_home.php` untuk tiga tabel hunian baru; migrasi ini sudah dijalankan di localhost, belum di server. Periksa konfigurasi auth secara privat dan ketersediaan boolean. Jangan menyebut Google/SMTP selesai sebelum benar-benar diuji pada domain server.
3. Smoke test: buka atlas, satu klik setiap kota, kembali ke atlas, masuk distrik/denah/jelajah, ganti avatar, login ulang, kartu warga, dua akun dekat. Coba tugas Bu Rani, antar paket, masuk kamar, taruh tanaman, keluar dan login ulang untuk memeriksa penyimpanan. Cek public tidak dapat memuat episode/chunk/audio admin; admin masih dapat memutar/ekspor.
4. Untuk mencoba konstruksi, buka `/admin/?view=shared-world` → **Rumah contoh P01** → isi alasan pilot, tinjau dan aktifkan. Di game: Jakartawa → denah rinci → Permukiman warga → Jelajahi titik ini. Masuk dengan profil lengkap, dekati depot, lalu ikuti petunjuk/tombol atau E. Rumah contoh bukan hasil survei dan belum memberi kepemilikan pribadi.
5. Uji dua akun pada browser/perangkat sasaran: bawaan bertahan setelah reload, kontribusi saling terlihat, kit sisa bisa dikembalikan, pause/resume jelas, pintu/tangga dapat dilalui, kontrol HP tidak bertabrakan, chat/presence tetap bekerja. Ukur frame time/memori/query dan catat penerimaan A-10/A-11/P-07. Rumah selesai tidak dapat direset dari UI; gunakan staging untuk pilot berulang.
6. Setelah pilot, perluas P-02/P-03 (variasi pesanan logistik dan kegiatan kreatif), inventaris umum G-03/G-04 dan hunian P-05. Konsep kamar awal sudah disetujui dan alur satu tugas/satu dekorasi sudah diterapkan; interior berjalan bebas, tamu, serta penataan bebas belum tersedia. Jadwalkan A-06/A-07 ketika pengerjaan email/Google di server dilanjutkan. Jangan menganggap konfigurasi atau build sebagai pengujian layanan nyata.
7. Setiap tugas memperbarui checklist, bukti, keputusan dan handover. Jangan otomatis push.

## Catatan rilis lokal

Transaksi proyek saat ini memakai satu kunci baris dunia, kemudian proyek/pemain, untuk menjaga urutan kunci dan atomicity. Cukup untuk prototipe satu proyek; beban serentak belum diukur. Posisi interaksi berasal dari presence klien (harus segar, di ruang yang sama, dekat target, serta memenuhi waktu minimum), **bukan anti-cheat gerakan penuh**. Ledger/request menyimpan jejak kontribusi; kebijakan retensi dan pemantauan ukuran tabel belum dibuat. Fase Day 2 boleh diganti admin namun tidak mereset kit/XP/progres rumah. Pemulihan operasional memakai backup yang sesuai, bukan menghapus tabel atau requestId secara acak.

`npm ci` menyelaraskan dependency lokal dengan lockfile hasil pull; sebelumnya folder `node_modules` belum memiliki encoder AAC. Package/lockfile dan kode fallback server tidak diubah. `npm run build` berhasil menggunakan Vite 8.3.5; `node tools/git-auto-build.mjs` menyatakan source/build sesuai. Source hash build lokal terbaru setelah hunian dan perbaikan HUD, 24 November 2026: `7feca074aed6281e4fff13dfee398cbc0d0363717f6fe28eb36a5929acb45ae5`. Tes onboarding, navigasi republik, batas entry publik/admin dan lint PHP view lulus. Peringatan chunk besar masih ada; optimasinya tugas W-01/W-02, bukan disembunyikan.

Pemeriksaan tambahan yang lulus:

```sh
node tools/test_republic_map_ui.mjs
node tools/test_republic_navigation.mjs
node tools/test_republic_world.mjs
node tools/test_republic_presence.mjs
node tools/test_citizen_roster.mjs
node tools/test_entry_boundaries.mjs
php tools/test_production_asset_access.php
node tools/test_production_asset_http.mjs
node tools/test_production_studio.mjs
node tools/test_production_ui.mjs
node tools/test_production_mp4.mjs
```

Tes HTTP aset pada build 24 November memeriksa 13 berkas privat dan 9 berkas graph public/shared, termasuk payload, MIME, Range, HEAD dan logout. Batas entry memisahkan 36 modul sumber publik dari 60 modul admin. Tes MP4 sebelumnya membuat serta mendekode fixture H.264/AAC 1 detik pada 1080×1920, 1920×1080 dan 1080×1080; **bukan** penerimaan footage Day 2 atau encoder browser. PHP lint untuk seluruh berkas PHP yang diubah dan `git diff --check` lulus.

Review akhir menemukan balapan saat halaman memulihkan jelajah sebelum request akun selesai. Event akun kini menghentikan jelajah jika profil ternyata belum lengkap dan membuka pelengkapan profil. Tes navigasi memeriksa respons terhadap hasil akun yang terlambat serta memastikan menutup modal tidak melanjutkan dunia yang sudah dihentikan.

Sumber review visual: [8 rekomendasi profesi](../docs/characters/profession-onboarding-review.jpg) dan [seni atlas tanpa overlay tombol/label HTML](../docs/world/atlas-onboarding-review.jpg). Gambar memakai model/geometri asli; tidak mengaku screenshot browser. Untuk mengulang avatar: ekspor dengan `node tools/review_citizen_professions.mjs`, kemudian jalankan Blender dengan `tools/render_avatar_v15_presets.py -- --presets-json <hasil-json> --ids <daftar-id> --output-dir <folder>`.

Hasil build harus ikut commit sumber saat pemilik memublikasikan; jangan mengirim source saja. Tidak ada staging, commit atau push otomatis dalam pekerjaan ini. Pemeriksaan eksternal dan visual perangkat tetap terbuka di checklist.
