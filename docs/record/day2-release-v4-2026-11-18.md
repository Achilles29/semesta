# Day 2 — rilis revisi v4 (18 November 2026)

Video final: `public/audio/produksi/episode-003/release-v4-election/day2-final-v4-20261118.mp4`  
Sampul: `public/audio/produksi/episode-003/release-v4-election/day2-cover-v4.png`  
Subtitle: `public/audio/produksi/episode-003/release-v4-election/subtitles.srt`  
Naskah: `docs/script/014-day-2-revisi-hook-suara-gerak-2026-11-18.md`

Durasi 129,709 detik, format 720×1280, H.264 24 fps, AAC stereo 44,1 kHz. Panel produksi memilih rilis ini sebagai Day 2 dan menyediakan unduhan MP4, sampul, serta subtitle.

## Perubahan

- Hook dimulai dengan penolakan Gibrun 36 tahun. Kartu penerimaan baru muncul sesudah kartu penolakan; narator langsung bertanya apa yang berubah.
- Alur memperlihatkan Gufron murung akibat dua follower baru dan jalan rusak, lalu pendaftaran, penolakan pasangan, permohonan MK, putusan tertulis, pemeriksaan ulang, pemungutan 10 suara, hasil 6–4, serta masalah jalan yang belum ditangani.
- Dialog petugas saat memeriksa pasangan dimulai setelah pasangan tiba di meja. Angka tiga adalah follower akun; sepuluh adalah penduduk terdaftar yang memilih.
- Narator memakai suara laki-laki Indonesia pada tempo dan nada asli, hanya sebagai suara latar. Gufron memakai klon HeyGen privat yang sudah ada, pada kecepatan asli. Peran lain memakai suara sintetis tetap dan berbeda.
- Musik orisinal dibagi menurut adegan dan diturunkan saat dialog. Musik berhenti sesaat pada bunyi kamera. Efek cap, surat suara, dan kamera dibuat terpisah.
- Arah badan semua tokoh yang berjalan disesuaikan dengan lintasan. Pemilih mengambil langkah pendek ke kotak suara, lalu hasil ditampilkan setelah suara masuk. Mulut tokoh yang berbicara mengikuti energi audio.
- Kursi presiden ditempatkan dekat lubang jalan sehingga dialog Gufron tentang lubang di belakang kursi sesuai dengan ruang. Adegan akhir menampilkan Bu Warung, Gufron, dan jalan rusak.

## Pemeriksaan

- `node tools/render_day2_v4_browser.mjs --verify-motion` lulus untuk Gufron, Prabowow, Gibrun, Jokowow, Bu Warung, dan pemilih.
- Video visual akhir berisi 3113 frame pada 24 fps. `ffmpeg -v error -i ... -f null -` mendecode MP4 final tanpa error.
- `node tools/test_production_video_library.mjs` dan `node tools/test_production_fullscreen_browser.mjs` lulus. `npm run build` berhasil.
- URL MP4 publik memberi HTTP 200; permintaan Range memberi HTTP 206. URL sampul dan subtitle memberi HTTP 200.

Video Day 1 yang sudah diunggah tetap tersedia. Video Day 3 tetap ditandai draf alur lama.
