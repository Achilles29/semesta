# Avatar V2: petani chibi orisinal

Status 9 November 2026: model V2 sudah menjadi aset karakter situs untuk dunia permainan dan pratinjau Avatar Studio. GLB lama (`warga-chibi-base.glb`) tidak ditimpa dan tetap tersedia untuk pemulihan.

- Sumber yang bisa diedit: `assets/avatar-v2/source/semesta_farmer_male_v2-authored.blend`.
- Pembangun sumber: `tools/build_semesta_farmer_v2.py` (Blender 4.5).
- Aset yang dimuat situs: `public/models/characters/semesta-farmer-v2.glb`; Vite menyalinnya ke `assets/game/models/characters/` saat build.
- Pratinjau depan, kiri, belakang, dan tiga-perempat: `assets/avatar-v2/previews/semesta_farmer_male_v2-authored/`.
- Hasil audit struktur: `assets/avatar-v2/reports/semesta_farmer_male_v2-validation.md`.

Model ini bukan salinan tokoh Harvest Moon, Final Fantasy, atau Suikoden. Arah visualnya adalah petani chibi 3D untuk gameplay: kepala ekspresif, kemeja kerja biru, celana hijau zaitun, sepatu bot, dan rambut berlapis. Mesh dibuat dari permukaan loft khusus, dengan bobot tulang yang membaur di beberapa sendi. Aset GLB berukuran sekitar 424 KiB, 7.624 segitiga, 19 tulang, 15 mesh render, 3 tekstur kecil, dan delapan klip (`Idle`, `Walk`, `Run`, `Interact`, `Wave`, `Hoe`, `Watering`, `Harvest`).

Pilihan warna kulit, rambut, atasan, dan bawahan lama masih diterapkan di runtime. **Batasan saat ini:** model V2 hanya memiliki satu bentuk rambut, kemeja, celana, dan sepatu. Pilihan model pakaian, penutup kepala, janggut, dan aksesori dari Avatar Studio belum memiliki geometri V2 yang setara; memilihnya tidak akan mengubah siluet V2. Tekstur kain bawaan juga dilepas pada klon yang diberi warna agar warna pilihan pengguna tetap akurat. Karena itu, lulus audit teknis belum berarti seluruh sistem kustomisasi atau mutu artistik akhir sudah selesai.

Pemeriksaan yang telah dijalankan: validasi GLB, `npm run build`, pemeriksaan sintaks dua view PHP, respons HTTP 200 untuk halaman utama dan GLB hasil build. Pemeriksaan visual langsung pada seluruh kombinasi Avatar Studio serta deformasi animasi saat gameplay masih perlu dilakukan sebelum menyebut avatar ini final.
