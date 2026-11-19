# Republik WKWKWK — Day 2, release v1

Skenario sumber: `docs/script/005-day-2-cap-lolos-sebelum-berkas-dibuka-2026-11-17.md`.

Film vertikal berdurasi 97,5 detik. Adegan diambil dari model karakter, set distrik, dan properti jalan Day 1 dalam project game. Gufron duduk murung di dekat lubang yang masih ada. Berkas pemeriksaan ditampilkan kosong, stempel ditahan, dan kursi dibiarkan kosong sampai pemeriksaan selesai. Pilihan penonton A/B/C muncul pada akhir video.

Narator perempuan hanya terdengar sebagai suara latar. Dialog Bahlil dan Gufron memakai clone pribadi yang sudah tersedia pada akun produksi; Bu Warung dan Panitia memakai suara publik HeyGen. Semua ucapan diputar pada kecepatan 1x. Metadata suara dan waktu kata disimpan di `public/audio/produksi/episode-003/generated/voice-provenance.json` dan `release-v1/timeline.json`.

Output utama: `public/audio/produksi/episode-003/release-v1/day2-final.mp4`. Ekspor H.264/AAC, 720×1280, 12 fps, 97,5 detik. Subtitle tertanam dalam video; SRT dan VTT terpisah juga tersedia. Sampul: `day2-cover.png`. Copy publikasi: `docs/script/006-day-2-copy-publikasi-2026-11-17.md`.

Cara membuat ulang: `python3 tools/build_day2_audio.py` pada release baru, `node tools/render_day2_browser.mjs` setelah menyesuaikan nama release, kemudian `bash tools/build_day2_final.sh`. File audio sumber HeyGen tidak dimodifikasi. Produksi ini belum diunggah ke platform sosial.

Pemeriksaan teknis: seluruh 1.170 frame berhasil dirender; hasil akhir diputar oleh decoder FFmpeg tanpa galat; durasi audio dan video sama; lembar tinjau adegan ada di `release-v1/final-review-sheet.jpg`.

Integrasi situs: episode ini tersedia di `admin/?view=production` dan pada pemilih episode Balai Produksi di dalam game. Day 1 pada pemilih memakai salinan identik berkas unggahan lokal `docs/record/DAY 1. Kampung komen.mp4`; pilihan tersebut berbeda dari arsip pratinjau set animasi V16. Pemutar dan unduhan mengikuti episode yang dipilih. Integrasi situs bukan unggahan ke platform sosial.
