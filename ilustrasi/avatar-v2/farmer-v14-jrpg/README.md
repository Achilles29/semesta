# Arka V14 — kandidat karakter dewasa

Buka [review.html](review.html), lalu pilih **V14 · Arka dewasa** di
[Studio Avatar](../../../admin/?view=avatars). Video demonstrasi:
[arka-demo.mp4](arka-demo.mp4). Sumber editable: [arka-v14.blend](arka-v14.blend).

V14 membangun fondasi baru dari anatomi MakeHuman CC0. Ini bukan perubahan skala
kepala V13. Wajah, tubuh, tangan, kaki, UV, tekstur, rest pose skeleton, serta
kostum berbeda. V11 tetap default; V12/V13 dan konfigurasi tersimpan dipertahankan.

## Hasil dan penilaian visual

Satu pria dewasa dengan tinggi anatomis 1,78 m sebelum tambahan sepatu/rambut,
proporsi kepala manusia dewasa, rambut pendek gelap, kemeja gading, rompi indigo,
sabuk/harness kulit, pouch dan sepatu bot. Bentuk tubuh dan kostum sengaja tetap
satu desain untuk menjadi patokan sebelum variasi berikutnya.

Perubahan terbesar terhadap V13: wajah dengan kelopak, hidung, bibir, telinga dan
rahang anatomis; anatomi tangan utuh; proporsi badan dewasa; tekstur kulit/rambut;
material PBR kain, kulit, dan logam. Kemeja memiliki topology pakaian tersendiri;
memperbesar permukaan tubuh telanjang menimbulkan detail anatomis yang tidak
tepat pada kain, sehingga pendekatan itu tidak dipakai pada kandidat final.
Tali harness dipasang terhadap permukaan kostum, bukan radius perkiraan tubuh.

**Belum setara kualitas artistik Final Fantasy.** Rambut masih memakai aset
dasar dan detail permukaan terbatas. Siluet kostum, kerutan di sendi, ekspresi
ekstrem, serta pose tangan masih bisa ditingkatkan melalui sculpt, koreksi
deformasi, dan pengerjaan artistik khusus. Ini kandidat yang dapat ditinjau dan
dipakai untuk menguji pipeline, belum patokan kualitas produksi AAA.

## Rig dan runtime

- Kontrak baru `semesta-arka-v14`; 49 tulang dengan rest matrix baru, termasuk
  tiga tulang per jari. Jumlahnya sama dengan V13, tetapi rig tidak kompatibel
  hanya dengan menyalin klip V13.
- Bobot dari data anatomi dikonsolidasikan ke skeleton ringkas, dinormalisasi,
  dan dibatasi empat pengaruh. Pakaian memakai bobot tubuh dan aturan torso
  tersendiri agar hem/trim tidak tertarik tulang paha atau lengan.
- `avatar-arka-v14.js` mengklon skeleton, material, dan bobot morph per instance.
  Geometry serta tekstur milik cache dibagi tanpa dibuang saat preview ditutup.
- Controller ekspresi dan tangan digunakan ulang melalui metadata. Skeleton,
  identitas, dan wardrobe V11 tidak dipalsukan sebagai dukungan V14.
- Studio menyediakan kamera tubuh/wajah/tangan/kaki, pencahayaan netral dan
  presentasi, tujuh animasi, ekspresi, viseme, arah pandang, jari, dan properti.
  Kontrol wardrobe, acak dan simpan racikan dinonaktifkan pada kandidat V14.
- Impor GLB lokal V14 masuk ke cache kandidat, tidak mengganti asset game.
- Adapter menerima controller yang sama dengan production performance. Episode
  produksi dan game tetap memakai asset yang sebelumnya dipilih; tidak ada
  migrasi actor massal.

Klip: **Idle, Walk, Run, Wave, Sit, Point, Hold**. Tiga klip terakhir adalah pose
bertahan, belum transisi masuk/keluar. Tidak tersedia Hoe/Watering/Harvest pada
V14. Viseme `AA/EE/OH/MBP` adalah bentuk mulut dasar dan demo waktu, bukan ekstraksi
fonem dari audio.

Walk/Run memakai IK dua ruas yang dibakukan ke keyframe. Pada fase menapak,
ankle bergerak mundur dengan laju konstan dan kaki tetap datar. Consumer yang
memindahkan actor harus mengikuti `avatarLocomotion.recommendedForwardSpeed`:
Walk **0,6333 m/detik**, Run **2,0233 m/detik**, dikalikan skala dan playback rate.
Belum ada runtime IK untuk tanah miring atau simulasi kain.

## Ukuran dan verifikasi

Lihat [runtime-test.json](runtime-test.json) untuk angka dari GLB final.
Sekitar **19,14 MB**, **109.060 segitiga**, **12 primitive/material**, 49 tulang,
7 klip, dan 18 gambar tekstur tertanam. Jumlah primitive adalah perkiraan biaya
dasar gambar, bukan draw call GPU terukur; shadow pass menambah pekerjaan.

V13 memiliki sekitar 44 ribu segitiga aktif pada karakter acuannya. V14 lebih
berat per karakter walaupun primitive lebih sedikit. Belum ada LOD, atlas
gabungan, kompresi mesh/tekstur, atau optimasi kerumunan. Kandidat ini ditujukan
untuk mengevaluasi satu karakter dan close-up terlebih dahulu.

Pemeriksaan meliputi normalisasi bobot, vertex hasil skinning seluruh klip,
isolasi instance, ekspresi/reset, gestur jari, attachment, dan lintasan pijakan.
Pengujian Node memuat geometri/rig/morph GLB asli, tetapi memakai placeholder
tekstur untuk audit CPU; pengujian ini tidak mengklaim unggah tekstur ke GPU.
[Audit tekstur](texture-audit.json) mendekode gambar tertanam secara terpisah.

Render `v14-*.png` berasal dari Blender sumber. Render `export-*.png` berasal dari
impor ulang GLB; keduanya diperiksa secara visual. Perbandingan V13 menggunakan
kamera, lantai, skala tampilan dan pencahayaan yang sama, dengan idle masing-masing.
Video 14 detik/12 fps berasal dari Blender sumber dan tidak memiliki audio.

Regresi playback Studio, navigasi admin, konfigurasi/asset V11, production
director, PHP lint, dan build frontend diperiksa. Interaksi UI dan FPS GPU
browser **belum diverifikasi**. Tidak ada klaim bahwa tes numerik membuktikan
semua pose bebas clipping atau bahwa tampilan Blender identik dengan browser.

## Membangun ulang

Jalankan dari root project. Memerlukan Blender 4.5 LTS, dependency Node project,
Python dengan Pillow dan imageio-ffmpeg. Ganti `blender` dengan executable lokal.
Input CC0 asli sudah disertakan beserta manifest hash; tidak perlu unduhan ulang.

```powershell
blender -b -t 6 --python tools/build_avatar_v14.py -- --views none
node tools/test_avatar_v14.mjs
blender -b -t 6 --python tools/render_avatar_v14_review.py
blender -b -t 6 --python tools/render_avatar_v14_review.py -- --baseline --only front,side,back,face,hand,feet
blender -b -t 6 --python tools/render_avatar_v14_review.py -- --export --only front,face,hand-grip,pose-hold,pose-sit,feet
blender -b -t 6 --python tools/render_avatar_v14_review.py -- --demo
python tools/package_avatar_v14_review.py
Copy-Item ilustrasi/avatar-v2/farmer-v14-jrpg/arka-v14.glb public/models/characters/semesta-farmer-v14.glb
npm run build -- --emptyOutDir false
python tools/verify_avatar_v14_release.py
```

Source helper: `avatar_v14_common.py`, `avatar_v14_materials.py`, dan
`avatar_v14_animation.py`. Untuk memulihkan file system pack yang hilang, gunakan
`fetch_avatar_v14_assets.py`; unduhan byte-range hanya mengambil file yang
diperlukan dari mirror resmi. Lisensi dan provenance:
[SOURCE-LICENSES.md](SOURCE-LICENSES.md).
