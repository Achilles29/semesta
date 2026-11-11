# Avatar V3 — pemeriksaan bentuk sebelum detail

Ini adalah **render dari model Blender yang sama dengan GLB kandidat**, bukan gambar AI yang kemudian harus ditebak saat pemodelan. Model aktif di game masih V2; kandidat V3 sengaja belum dipasang.

Gambar AI sebelumnya disimpan terpisah sebagai [`semesta-petani-v3-konsep-ai-eksplorasi.png`](../ilustrasi/avatar-v2/semesta-petani-v3-konsep-ai-eksplorasi.png); gambar tersebut **bukan** spesifikasi geometri V3.

| Sudut | Render |
|---|---|
| Depan | [front.png](../ilustrasi/avatar-v2/semesta_farmer_v3-blockout/front.png) |
| Samping kiri | [left.png](../ilustrasi/avatar-v2/semesta_farmer_v3-blockout/left.png) |
| Belakang | [back.png](../ilustrasi/avatar-v2/semesta_farmer_v3-blockout/back.png) |
| Tiga-perempat | [three-quarter.png](../ilustrasi/avatar-v2/semesta_farmer_v3-blockout/three-quarter.png) |
| Kamera gameplay | [gameplay.png](../ilustrasi/avatar-v2/semesta_farmer_v3-blockout/gameplay.png) |

Sumber yang bisa diedit: [`semesta_farmer_v3-blockout.blend`](../assets/avatar-v2/source/semesta_farmer_v3-blockout.blend). Ekspor uji: [`semesta_farmer_v3-blockout.glb`](../assets/avatar-v2/source/semesta_farmer_v3-blockout.glb). Pembuat: [`build_semesta_farmer_v3_blockout.py`](../tools/build_semesta_farmer_v3_blockout.py).

## Perbandingan dengan V2

- Mata bulat-putih yang tampak ditempel diganti mata oval gelap yang lebih sederhana.
- Rambut dibuat lebih gelap dengan arah sapuan, ditambah permukaan belakang agar kepala tidak tampak botak.
- Kemeja tertutup diganti kaus bagian dalam dan overshirt terbuka yang benar-benar merupakan dua permukaan 3D.
- Siluet celana dibentuk lebih penuh di paha/lutut dan sedikit mengerut di ujung.
- Lengan bawah sampai telapak sekarang satu permukaan skinned untuk menghilangkan celah pergelangan.

## Yang belum memenuhi target akhir

Blockout ini masih jauh dari kualitas karakter referensi: detail wajah, sculpt rambut, lipatan pakaian, telapak/jari, dan bentuk sepatu masih kasar. Materialnya sengaja sederhana; belum ada UV/tekstur lukis khusus. Sambungan bahu dan pangkal celana masih perlu retopologi dan uji deformasi saat animasi. Jadi gambar ini adalah **patokan bentuk yang bisa benar-benar dibangun**, bukan klaim bahwa kualitas avatar final sudah tercapai.

GLB lolos audit struktur: 7.126 segitiga, 36 mesh, 19 tulang, delapan klip animasi. Audit teknis tidak menggantikan penilaian artistik. Langkah berikutnya adalah menilai arah siluet dari render ini, lalu memperbaiki sculpt/retopologi pada file Blender yang sama sebelum memasangnya ke game.
