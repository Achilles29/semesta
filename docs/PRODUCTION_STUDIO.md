# Studio produksi baru

Acuan kreatif untuk episode berikutnya, termasuk karakter, suara, template, dan pengembangan kamera sinematik: [Prompt acuan produksi konten](PROMPT_ACUAN_PRODUKSI_KONTEN.md).

Halaman: `/admin/?view=production`. Produksi dan episode lengkap hanya tersedia di panel admin. Kunjungan baru membuka **Day 2 — Sudah Dibangun, Baru Ditanya**: 118,308 detik, 30 shot, Pasca dan seluruh 48 warga, serta 27 cue suara. Day 1 tetap tersedia melalui pilihan episode. Draf suntingan pengguna dipertahankan; draf bawaan yang belum diedit mengikuti revisi terbaru.

Naskah dan status pemeriksaan tersedia pada [Day 1](script/001-day-1-scenes.md) dan [Day 2](script/002-day-2-concept.md). Peta publik memakai lokasi dunia yang sama tanpa tombol pemutar Produksi. Konten dinyatakan final setelah video penuh dan mix ditinjau pada perangkat sasaran.

Episode lama, media `public/audio/produksi/episode-001` sampai `episode-004`, naskah `docs/script/001…014`, release/review episode, pemutar lama, dan alat khusus episode lama telah dihapus. Riwayat Git tetap menjadi tempat pemulihan bila diperlukan. Model avatar, variasi pakaian, aset dunia, dan helper pengujian rig tetap tersedia. Data akun warga, avatar tersimpan, susunan wilayah, dan database game tidak direset.

## Cara memakai

1. Buka Produksi dan pilih Day 1, Day 2, atau draf latihan. Day 2 dimuat pada kunjungan baru. **Coba latihan studio** tetap tersedia untuk latihan teknis 10 detik.
2. Pilih hingga 64 pemeran dari preset avatar dan warga yang tersedia. Atur lokasi dan properti: bangku, peti, tanaman, dan papan. Gerakan Hold membawa properti kecil yang mengikuti tangan.
3. Tambah adegan. Tentukan durasi, kamera, pemeran fokus, gerakan setiap pemeran, arah, posisi tujuan jalan/lari, dan subtitle. Posisi akhir diteruskan ke adegan berikutnya. X adalah kiri/kanan set; Z adalah kedalaman, dan arah 0 menghadap kamera dari depan.
4. Episode lengkap otomatis memuat suara dan musik bawaan saat Play/ekspor. Pilihan suara per adegan mengikuti durasi dan urutan hasil edit. Mengedit subtitle melepas suara lama; pilih klip lagi untuk mengembalikannya. Bukaan mulut mengikuti amplitudo audio, bukan sinkronisasi fonem penuh. File dialog/musik tambahan tetap bisa dipasang; matikan suara bawaan jika memakai dialog pengganti. File musik tambahan menggantikan Oke Gas bawaan.
5. Tekan **Play semua**. Semua adegan berjalan berurutan tanpa kendali karakter manual. Jeda, ulang dari awal, dan geser timeline tersedia.
6. Pilih vertikal, horizontal, atau persegi; kualitas 1080p atau 720p. Tekan **Buat MP4**, termasuk ketika pratinjau masih dimuat atau sedang berjalan: Studio segera menampilkan status, menunggu scene siap bila perlu, lalu menjeda pratinjau/audio dan mengekspor. Status menampilkan persiapan suara, pemeriksaan dukungan MP4, render beserta persentase, dan finalisasi. Tunggu selesai, kemudian tekan **Unduh MP4**. Tombol unduh hanya muncul setelah file selesai. Mengubah skenario, audio, format, atau kualitas membatalkan tautan hasil lama.
7. **Skenario kosong** mengosongkan workspace. Jika yang diganti adalah skenario episode berisi adegan, studio lebih dahulu menawarkan unduhan cadangan otomatis. Latihan teknis tidak menjadi konten final.

## Penyimpanan dan batas

- Skenario tersimpan otomatis di localStorage browser ini, memakai namespace baru. Tidak ada data episode lama yang diimpor otomatis.
- Gunakan **Simpan skenario** dan **Buka skenario** untuk cadangan JSON/pindah perangkat. Suara bawaan episode disimpan sebagai aset proyek dan dimuat kembali otomatis; JSON merujuk ID klip yang dikenal. File audio tambahan milik pengguna **hanya disimpan di memori sesi ini** dan perlu dilampirkan kembali setelah reload.
- Saat Day 1 disepakati, simpan skenario final dan aset audionya sebagai berkas proyek agar ikut Git. `push/pull` menyinkronkan berkas proyek; tidak menyinkronkan localStorage atau file audio yang dipilih di browser.
- Maksimal 64 pemeran, 80 adegan, 1–30 detik per adegan, total 300 detik. File audio maksimal 50 MB dan 10 menit per track; bagian melewati durasi skenario dipotong.
- Video saat ini dibuat dalam memori perangkat. 1080p / 3 menit dapat membutuhkan memori cukup besar; gunakan 720p atau pendekkan cerita bila perangkat terbatas.

## Kontrak pemutaran dan ekspor

- `game-src/production-scenario.js`: validasi, kompilasi timeline, sampling absolut, kelanjutan posisi, kurva percepatan/perlambatan, dan SRT.
- `game-src/production-stage.js`: scene Three.js, avatar V15 bersama, pose deterministik, transisi clip, properti tangan, kamera dan kompositor subtitle. Gerak jalan/lari mengikuti jarak tempuh dan metadata kecepatan rig.
- `game-src/production-studio.js`: editor, penyimpanan lokal, lifecycle pemutaran/ekspor, status, unduhan, pembatalan dan pembersihan sumber daya. Scene dimuat hanya saat diperlukan. Modul studio dimuat saat menu Produksi pertama dibuka.
- `game-src/production-export.js`: frame pada `n / 30`, menunggu setiap frame encoder (backpressure), lalu finalisasi MP4. Durasi dibulatkan ke frame berikutnya; tidak bergantung pada kecepatan RAF/GPU. Tidak memakai rekam layar, MediaRecorder real-time, atau mengganti ekstensi WebM.
- MP4: H.264, target 12 Mbps, 30 fps. Metadata ditulis di akhir berkas MP4 biasa agar muxer tidak menahan seluruh paket video sekali lagi untuk fast start; buffer file akhir tetap memakai memori perangkat. Ukuran utama 1080×1920, 1920×1080, atau 1080×1080; kualitas ringan 720×1280, 1280×720, atau 720×720.
- Audio: klip suara bawaan dijadwalkan pada timeline, lalu dimix bersama track tambahan menggunakan OfflineAudioContext, stereo 48 kHz, AAC target 192 kbps, fade pendek dan pembatasan puncak. Bila browser tidak menyediakan encoder AAC bawaan, ekstensi `@mediabunny/aac-encoder` dimuat saat ekspor. Buffer mix yang sama dipakai untuk pratinjau dan ekspor. Tanpa audio aktif, MP4 mempunyai track video saja.
- Subtitle digambar ke canvas video pada area aman; panduan garis hanya muncul di pratinjau. SRT terpisah juga dapat diunduh.
- Halaman harus berada di **HTTPS atau localhost**, dengan dukungan WebGL dan encoder WebCodecs H.264. AAC bawaan dipakai jika tersedia; bila tidak, encoder AAC WebAssembly yang dibundel dimuat saat diperlukan. Kemampuan codec diperiksa sebelum render. Pada browser yang tidak mendukung H.264, studio memberi pesan kegagalan dengan langkah perbaikan; tidak menawarkan berkas MP4 palsu. Tidak ada fallback FFmpeg server yang harus dipasang.
- Mediabunny 1.66.2 dipin di package-lock, MPL-2.0. Rujukan resmi: [writing media files](https://mediabunny.dev/guide/writing-media-files), [media sources](https://mediabunny.dev/guide/media-sources), [codec availability](https://mediabunny.dev/guide/supported-formats-and-codecs). Dependensi dipasang oleh alur build Git yang sudah ada.

## Verifikasi

`npm run test:production` memeriksa Day 1 kosong, skenario invalid, seek/replay pada rig V15 asli, perubahan adegan, attachment tangan, backpressure dan timestamp frame, guard codec, pembatalan, serta interaksi editor melalui DOM emulasi. Pengujian integrasi avatar tetap tersedia melalui `node tools/test_avatar_v15_integration.mjs`.

`npm run test:production:mp4` memakai FFmpeg untuk menyediakan paket H.264/AAC fixture lalu menjalankannya melalui pipeline MP4 aplikasi. Ketiga rasio diperiksa codec, dimensi, jumlah frame, durasi, letak metadata setelah media, dan decode ulang FFmpeg. `node tools/test_production_mp4.mjs --day2` menambah fixture sepanjang durasi aktual Day 2 (3.550 frame pada revisi r4), bukan rekaman visual episode. Atur `FFMPEG_PATH`, atau pasang Python `imageio_ffmpeg` untuk **pengujian pengembang ini saja**. FFmpeg tidak diperlukan oleh aplikasi.

Build Vite dan lint PHP juga harus lulus. Tes CPU/DOM/container **tidak menguji render WebGL atau encoder native pada browser pengguna**. Sebelum publikasi konten final, tonton latihan dan ekspor satu MP4 pada browser target untuk memeriksa tampilan, audio, dan kemampuan perangkat. Pada lingkungan otomatis saat ini, inspeksi browser Windows terhalang kebijakan URL alat computer-use; tes tidak dianggap bukti keberhasilan encoder pada browser pengguna.

## Jika tombol MP4 atau peta tidak bereaksi

- Tombol **Buat MP4** dapat ditekan saat scene masih dimuat; Studio menampilkan status dan otomatis melanjutkan setelah scene siap. Selama pemrosesan audio atau ekspor aktif, tombol dinonaktifkan dan status menunjukkan tahapnya.
- Jika gagal, catat teks status dan persentase. Penyebab kehilangan konteks grafis dipertahankan, bukan diganti menjadi pembatalan biasa. Muat ulang dan pilih 720p bila beban perangkat terlalu tinggi. Dukungan encoder H.264/AAC mengikuti browser/perangkat.
- Jika server masih memakai bundle lama setelah pull, ikuti [panduan deploy](HANDOVER_PENGEMBANGAN_DI_SERVER.md). Rilis `assets/game` kini ikut Git; sumber JavaScript dan rilis hasil build harus masuk commit yang sama. Jangan menganggap perubahan lokal sudah tersedia di server sebelum commit/push/pull rilis tersebut.
