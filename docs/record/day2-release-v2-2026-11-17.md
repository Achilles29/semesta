# Day 2 — release v2 review

## Tersedia di panel produksi

- MP4: `public/audio/produksi/episode-003/release-v2/day2-final.mp4` (97,5 detik, 720 × 1280, H.264/AAC).
- Adegan Gufron duduk menampilkan tubuh dan kaki utuh.
- Mulut Gufron, Bahlil, Bu Warung, dan Panitia mengikuti energi rekaman dialog pada waktu bicara.
- Musik seri dinaikkan 3,2 kali dari mix v1; puncak master -4,89 dBFS.
- Tombol layar penuh membuka pemutar memenuhi viewport, dengan native fullscreen jika browser mengizinkan.
- Video, sampul, dan subtitle dapat diunduh dari pemilih satu video di panel produksi.

## Status suara karakter

Suara Gufron dan Bahlil di v2 masih memakai take clone HeyGen v1. Akun HeyGen terhubung sudah sesuai, tetapi paket yang terbaca `free` dan permintaan audio baru melalui koneksi HeyGen ditolak dengan `402 plan_upgrade_required`. Belum ada take pengganti yang dapat dinilai kesesuaiannya terhadap `docs/record/gufron.mp4` dan `docs/record/tiruan bahlil.mp4`.

Audio contoh clone HeyGen sudah diunduh ke `docs/record/heygen-gufron-preview.wav` dan `docs/record/heygen-bahlil-preview.wav`. Keduanya bukan rekaman dialog Day 2.

Untuk mengganti take, ekspor dua audio berikut dari suara karakter di HeyGen, masing-masing satu file WAV atau MP3:

**Gufron:** “Yang lolos baru mobilnya, Bu. Kemarin pita dulu, jalan belakangan. Sekarang stempel dulu, syarat belakangan? Saya cuma mau jalan itu beres. Tapi kalau kursi ini mau diisi asal cepat, saya ikut maju. Periksa berkas saya juga.”

**Bahlil:** “Diindaa... saya baru sampai. Diindaa. Kalau mau diperiksa, periksa saja. Jangan cap dulu.”

Setelah kedua file tersedia, potong sesuai `timeline.json`, bangun ulang envelope, mix, dan MP4 sebagai release baru. Jangan mengubah v1 atau v2.

## Verifikasi

- `node tools/test_production_video_library.mjs` — lulus.
- `node tools/test_production_fullscreen_browser.mjs` — lulus di Chrome headless.
- `node tools/test_production_director.mjs` — lulus.
- `php -l application/views/admin.php` dan `php -l application/views/game.php` — lulus.
- `ffprobe` — video 97,5 detik dengan audio AAC; URL MP4 publik mengembalikan HTTP 200.
