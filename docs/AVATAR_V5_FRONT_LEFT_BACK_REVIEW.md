# Pemeriksaan avatar petani V5 terhadap referensi 3D PS2

Referensi yang dipakai: `ilustrasi/karakter-gameplay/harvest-moon/ps2-save-the-homeland-hero-turnaround.png`. Ini adalah lembar ilustrasi referensi yang dibuat untuk proyek, **bukan** mesh atau tangkapan layar gameplay asli. Aset proyek adalah karakter orisinal yang mengejar proporsi dan bahasa bentuk serupa.

## Bukti visual

[Referensi empat sudut](../ilustrasi/karakter-gameplay/harvest-moon/ps2-save-the-homeland-hero-turnaround.png) · [Render depan](../ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style/front.png) · [Render kiri](../ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style/left.png) · [Render belakang](../ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style/back.png) · [Pose jalan](../ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style/walk-pose.png)

| Sudut | Masalah yang terlihat sebelum revisi | Perbaikan pada model | Sisa selisih dari referensi |
| --- | --- | --- | --- |
| Depan | Sepatu tampak sebagai dua tabung lurus; topi tidak punya bukaan depan, poni berupa bongkah kecil; overall terputus di pinggang. | Ujung sepatu dilebarkan dan dibulatkan, sambungan overall diturunkan ke pelvis, topi diberi bukaan rambut, poni utama memanjang dan menyapu ke depan, warna denim dinaikkan. | Wajah dan rambut masih terlalu geometris; boot belum memiliki lipatan kulit setara referensi. |
| Kiri | Profil hidung hampir hilang; rambut tengkuk berupa kerucut terpisah; sepatu belum punya bentuk kaki yang kuat. | Hidung dibentuk sebagai volume kecil, rambut tengkuk memakai massa tersambung dan helai yang tumpang tindih, ujung sepatu lebih panjang dan lebar. | Profil pipi/dagu dan helaian rambut belum sesoft sculpt referensi; kantong belakang sedikit tampak dari samping. |
| Belakang | Rambut seperti deretan gigi; visor kuning berupa garis tipis; tidak ada kantong belakang; tas hampir tersembunyi. | Rambut menjadi massa berlapis dengan lima helai utama, visor melengkung, dua kantong belakang mengikuti mesh celana dan bobot rig, tas serta talinya terbaca. | Jahitan kantong dan kain masih sederhana; rambut masih terlalu simetris dan tidak memiliki tekstur lukis. |

Render terbaru: `ilustrasi/avatar-v2/semesta_farmer_v5-ps2-style/front.png`, `left.png`, `back.png`, dan pose animasi di folder yang sama. Model dapat dibangun ulang dari `tools/build_semesta_farmer_v5_ps2_style.py`; sumber Blender yang masih terpisah per bagian ada di `assets/avatar-v2/source/semesta_farmer_v5-ps2-style-editable.blend`.

Status: struktur GLB dan delapan klip animasi lulus pemeriksaan teknis. Revisi siluet ini **lebih dekat**, tetapi **kedekatan artistik belum lulus** target "benar-benar mirip". Kesenjangan utama sekarang adalah sculpt lembut wajah/rambut, keluwesan jari, serta lipatan dan tekstur lukis pada kain dan sepatu. Validitas glTF tidak boleh dipakai sebagai bukti kemiripan visual.
