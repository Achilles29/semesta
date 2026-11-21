# Studio produksi baru

Halaman: `/admin/?view=production`. Reset dilakukan pada 21 November 2026. Workspace awal tetap kosong; konsep dan pembuka Day 1 kini tersedia sebagai draf, **belum menjadi episode dengan audio dan video final**.

Pembaruan: [konsep Day 1 Prabowow](script/001-day-1-prabowow-draft.md) sudah direvisi menjadi naskah dan rencana latar sekitar 80 detik; warga menentukan pembangunan, acara, aturan, dan kegiatan republik. Tombol **Pembuka Prabowow** masih memuat pembuka lama sekitar 8,49 detik dengan aksi joget parodi dan label fiksi, tanpa audio; belum menerapkan skenario revisi lengkap. Aksi joget mempunyai tempo yang dapat diatur; 130 BPM adalah acuan animasi, bukan hasil pengukuran lagu.

Episode lama, media `public/audio/produksi/episode-001` sampai `episode-004`, naskah `docs/script/001…014`, release/review episode, pemutar lama, dan alat khusus episode lama telah dihapus. Riwayat Git tetap menjadi tempat pemulihan bila diperlukan. Model avatar, variasi pakaian, aset dunia, dan helper pengujian rig tetap tersedia. Data akun warga, avatar tersimpan, susunan wilayah, dan database game tidak direset.

## Cara memakai

1. Buka Produksi. Workspace awal adalah Day 1 kosong. **Coba latihan studio** membuka latihan teknis 10 detik, bukan episode Day 1.
2. Pilih 1–4 pemeran dari 32 preset avatar. Atur lokasi dan properti: bangku, peti, tanaman, dan papan. Gerakan Hold membawa properti kecil yang mengikuti tangan.
3. Tambah adegan. Tentukan durasi, kamera, pemeran fokus, gerakan setiap pemeran, arah, posisi tujuan jalan/lari, dan subtitle. Posisi akhir diteruskan ke adegan berikutnya. X adalah kiri/kanan set; Z adalah kedalaman, dan arah 0 menghadap kamera dari depan.
4. Bila diperlukan, pasang file audio dialog/narasi dan musik/suasana. Volume dan waktu mulai dapat diatur. Studio tidak menghasilkan suara atau lip sync otomatis.
5. Tekan **Play semua**. Semua adegan berjalan berurutan tanpa kendali karakter manual. Jeda, ulang dari awal, dan geser timeline tersedia.
6. Pilih vertikal, horizontal, atau persegi; kualitas 1080p atau 720p. Tekan **Buat MP4**, tunggu proses, kemudian **Unduh MP4**. Tombol unduh hanya muncul setelah file selesai. Mengubah skenario, audio, format, atau kualitas membatalkan tautan hasil lama.
7. **Day 1 kosong** mengosongkan workspace. Jika yang diganti adalah skenario episode berisi adegan, studio lebih dahulu menawarkan unduhan cadangan otomatis. Latihan teknis tidak menjadi konten final.

## Penyimpanan dan batas

- Skenario tersimpan otomatis di localStorage browser ini, memakai namespace baru. Tidak ada data episode lama yang diimpor otomatis.
- Gunakan **Simpan skenario** dan **Buka skenario** untuk cadangan JSON/pindah perangkat. Audio **hanya disimpan di memori sesi ini** dan perlu dilampirkan kembali setelah reload. JSON tidak menyertakan audio. UI menjelaskan batas ini.
- Saat Day 1 disepakati, simpan skenario final dan aset audionya sebagai berkas proyek agar ikut Git. `push/pull` menyinkronkan berkas proyek; tidak menyinkronkan localStorage atau file audio yang dipilih di browser.
- Maksimal 4 pemeran, 40 adegan, 1–30 detik per adegan, total 180 detik. File audio maksimal 50 MB dan 10 menit per track; bagian melewati durasi skenario dipotong.
- Video saat ini dibuat dalam memori perangkat. 1080p / 3 menit dapat membutuhkan memori cukup besar; gunakan 720p atau pendekkan cerita bila perangkat terbatas.

## Kontrak pemutaran dan ekspor

- `game-src/production-scenario.js`: validasi, kompilasi timeline, sampling absolut, kelanjutan posisi, kurva percepatan/perlambatan, dan SRT.
- `game-src/production-stage.js`: scene Three.js, avatar V15 bersama, pose deterministik, transisi clip, properti tangan, kamera dan kompositor subtitle. Gerak jalan/lari mengikuti jarak tempuh dan metadata kecepatan rig.
- `game-src/production-studio.js`: editor, penyimpanan lokal, lifecycle pemutaran/ekspor, status, unduhan, pembatalan dan pembersihan sumber daya. Scene dimuat hanya saat diperlukan. Modul studio dimuat saat menu Produksi pertama dibuka.
- `game-src/production-export.js`: frame pada `n / 30`, menunggu setiap frame encoder (backpressure), lalu finalisasi MP4. Durasi dibulatkan ke frame berikutnya; tidak bergantung pada kecepatan RAF/GPU. Tidak memakai rekam layar, MediaRecorder real-time, atau mengganti ekstensi WebM.
- MP4: H.264, target 12 Mbps, 30 fps, metadata fast start. Ukuran utama 1080×1920, 1920×1080, atau 1080×1080; kualitas ringan 720×1280, 1280×720, atau 720×720.
- Audio jika dipasang: kedua track dimix dengan OfflineAudioContext, stereo 48 kHz, AAC target 192 kbps, fade pendek dan pembatasan puncak untuk mengurangi clipping. Buffer mix yang sama dipakai untuk pratinjau dan ekspor. Tanpa audio, MP4 mempunyai track video saja.
- Subtitle digambar ke canvas video pada area aman; panduan garis hanya muncul di pratinjau. SRT terpisah juga dapat diunduh.
- Halaman harus berada di **HTTPS atau localhost**, dengan dukungan WebGL dan encoder WebCodecs H.264 (serta AAC jika ada audio). Kemampuan codec diperiksa sebelum render. Pada browser yang tidak mendukung, studio memberi pesan kegagalan dengan langkah perbaikan; tidak menawarkan berkas MP4 palsu. Tidak ada fallback FFmpeg server yang harus dipasang.
- Mediabunny 1.66.2 dipin di package-lock, MPL-2.0. Rujukan resmi: [writing media files](https://mediabunny.dev/guide/writing-media-files), [media sources](https://mediabunny.dev/guide/media-sources), [codec availability](https://mediabunny.dev/guide/supported-formats-and-codecs). Dependensi dipasang oleh alur build Git yang sudah ada.

## Verifikasi

`npm run test:production` memeriksa Day 1 kosong, skenario invalid, seek/replay pada rig V15 asli, perubahan adegan, attachment tangan, backpressure dan timestamp frame, guard codec, pembatalan, serta interaksi editor melalui DOM emulasi. Pengujian integrasi avatar tetap tersedia melalui `node tools/test_avatar_v15_integration.mjs`.

`npm run test:production:mp4` memakai FFmpeg untuk menyediakan paket H.264/AAC fixture lalu menjalankannya melalui pipeline MP4 aplikasi. Ketiga rasio diperiksa codec, dimensi, jumlah frame, durasi, letak fast-start metadata, dan decode ulang FFmpeg. Atur `FFMPEG_PATH`, atau pasang Python `imageio_ffmpeg` untuk **pengujian pengembang ini saja**. FFmpeg tidak diperlukan oleh aplikasi.

Build Vite dan lint PHP juga harus lulus. Tes CPU/DOM/container **tidak menguji render WebGL atau encoder native pada browser pengguna**. Sebelum publikasi konten final, tonton latihan dan ekspor satu MP4 pada browser target untuk memeriksa tampilan, audio, dan kemampuan perangkat. Ide dan hasil final Day 1 disusun setelah fondasi ini.
