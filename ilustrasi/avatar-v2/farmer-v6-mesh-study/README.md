# Farmer V6 — studi mesh, belum karakter final

Folder ini sengaja terpisah dari avatar aktif. Tidak ada GLB di `public/models/characters` yang diganti.

## Kandidat yang perlu diperiksa

- Sumber edit: `farmer-v6-cc0-base-study.blend`
- Ekspor uji: `farmer-v6-cc0-base-study.glb`
- Render: `farmer-v6-cc0-base-study-front.png`, `farmer-v6-cc0-base-study-left.png`, `farmer-v6-cc0-base-study-back.png`
- Uji deformasi: `farmer-v6-cc0-base-study-pose-walk.png`, `farmer-v6-cc0-base-study-pose-hoe.png`
- Audit format: `validation.md`

Dasarnya adalah **Human Base Meshes v1.4.1** karya Blender Studio/kontributor, berlisensi **CC0** menurut [halaman demo resmi Blender](https://www.blender.org/download/demo-files/). Ini adalah mesh manusia bergaya dengan topologi yang disiapkan untuk sculpt, bukan bentuk kepala/lengan/kaki dari generator V5. `build_cc0_base_study.py` mengubah proporsi dan memasang mesh itu pada rig uji dari V5. File `.blend` sudah menyimpan geometrinya sehingga tetap bisa dibuka tanpa mengunduh bundle sumber.

## Keputusan visual saat ini: **belum lulus**

Kepala dan kontur anatomi lebih terdefinisi daripada percobaan V6 pertama, tetapi hasilnya masih jauh dari [referensi empat sudut](../../karakter-gameplay/harvest-moon/ps2-save-the-homeland-hero-turnaround.png):

- [Depan](farmer-v6-cc0-base-study-front.png): wajah masih realistis, bukan karakter kartun dengan pipi dan mata besar; proporsi kepala–bahu belum pas.
- [Kiri](farmer-v6-cc0-base-study-left.png): hidung, bibir, dan dagu terlalu menonjol; profil target lebih ringkas dan lembut.
- [Belakang](farmer-v6-cc0-base-study-back.png): belum ada massa rambut, topi, kantong overall, ataupun tas.
- [Jalan](farmer-v6-cc0-base-study-pose-walk.png): bobot tangan/jari dan pinggul belum benar; distorsi terlihat jelas.

Rambut/topi/overall/tas/sepatu belum dibuat. Kualitas visual tidak boleh disimpulkan dari GLB yang valid atau delapan klip animasi yang berhasil ikut diekspor. **Jangan pakai kandidat ini sebagai avatar gameplay.**

Percobaan `farmer-v6-anatomy-study.*` dan render bernama `front.png`, `left.png`, `back.png`, `pose-*.png` adalah pendekatan permukaan implisit yang ditolak karena hasilnya masih terlalu bulat. Disimpan hanya sebagai pembanding kegagalan, bukan kandidat utama.

Langkah produksi berikutnya membutuhkan sculpt kepala yang spesifik terhadap referensi, penyesuaian proporsi tubuh/pakaian, rig dan weight painting yang ditujukan untuk mesh baru, lalu kurasi render tiga arah serta pose sendi. Proses itu belum selesai dalam studi ini.
