# Catatan rilis Day 2 · Pagi Ditolak, Siang Lolos

Rilis: `public/audio/produksi/episode-003/release-v3-election/day2-final-20261118.mp4`  
Sampul: `day2-cover-v3-final.png`; subtitle: `subtitles.srt`; stem: `day2-dialogue.wav`, `day2-music.wav`, `day2-fx.wav`.

- Video vertikal 720 × 1280, 24 fps, 3.920 bingkai, 163,334 detik, H.264/AAC. Ukuran MP4 16.388.862 byte.
- 23 dialog, 69 subtitle. Dialog Gufron memakai clone suara privat HeyGen; peran lain memakai suara sintetis yang berbeda. Gerak mulut mengikuti energi rekaman per bingkai, dengan gerak berjalan dan gestur dari rig 3D.
- Musik orisinal dan efek cap, kertas, serta kilat kamera dicampur ke master; puncak master sebelum ekspor sekitar −5,57 dBFS.
- Sumber visual: `tools/preview-production-day2-election.html`, renderer: `tools/render_day2_election_browser.mjs`. Bingkai 255–905 dirender ulang untuk adegan duduk dan pendaftaran, lalu disambung melalui `tools/patch_day2_election_visual.sh`. Ekspor akhir melalui `tools/build_day2_election_final.sh`.
- Day 1 acuan adalah unggahan Kampung Komen 58,165 detik. Penghitung warga 1→3 merujuk dua follower baru yang dilaporkan. Lubang jalan baru diperkenalkan pada Day 2. Day 3 lama diberi label draf karena masih menyebut pita dari alur sebelumnya.

Verifikasi: decode MP4 penuh tanpa galat; `ffprobe` mengembalikan 3.920 bingkai dan durasi 163,334 detik; uji pemilih video dan layar penuh lulus; `npm run build` lulus; MP4, sampul, subtitle, dan bundle game dapat diakses lewat HTTPS dengan respons 200.
