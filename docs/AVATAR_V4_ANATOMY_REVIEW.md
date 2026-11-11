# Avatar V4 — perbaikan anatomi blockout

V4 adalah kandidat terpisah. Render di bawah berasal dari mesh Blender yang sama dengan GLB uji, bukan gambar AI. Avatar aktif situs tetap V2 sampai bentuk dan deformasi V4 disetujui.

| Tampak | File |
|---|---|
| Depan | [front.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/front.png) |
| Samping | [left.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/left.png) |
| Belakang | [back.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/back.png) |
| Tiga-perempat | [three-quarter.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/three-quarter.png) |
| Kamera gameplay | [gameplay.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/gameplay.png) |
| Pose berjalan | [walk-pose.png](../ilustrasi/avatar-v2/semesta_farmer_v4-anatomy/walk-pose.png) |

## Perbaikan enam area

1. **Leher:** kepala dan leher yang dulu hanya saling menembus digabung menjadi satu permukaan skinned. Leher tetap pendek secara visual; transisi rahang–kerah masih perlu sculpt manual.
2. **Lengan:** badan kemeja dan kedua lengan baju disatukan setelah diberi ketebalan. Potongan bahu V3 berkurang, meski lipatan di ketiak masih kasar.
3. **Jari:** kedua tangan sekarang punya telapak, ibu jari, dan empat ujung jari yang menyatu dengan mesh tangan. Jarinya masih sederhana dan belum punya tulang/knuckle tersendiri.
4. **Postur badan:** volume bahu lebih berkesinambungan, tetapi torso masih relatif lurus dan pose netralnya belum sepenuhnya hidup.
5. **Pinggul:** pinggang dan kedua paha menjadi satu permukaan; ujung baju belakang yang sebelumnya masuk ke panggul sudah diratakan. Area selangkangan masih butuh retopologi/rapi lipatan.
6. **Kaki:** pusat lutut, betis, dan pergelangan dibedakan, dengan celah antarkaki lebih terbaca. Sepatu masih terlalu membulat untuk target kualitas akhir.

Sumber edit: [`semesta_farmer_v4-anatomy.blend`](../assets/avatar-v2/source/semesta_farmer_v4-anatomy.blend). Ekspor uji: [`semesta_farmer_v4-anatomy.glb`](../assets/avatar-v2/source/semesta_farmer_v4-anatomy.glb). Script reproduksi: [`refine_semesta_farmer_v4_anatomy.py`](../tools/refine_semesta_farmer_v4_anatomy.py). [Audit GLB](../assets/avatar-v2/reports/semesta_farmer_v4-anatomy-validation.md) menemukan 33.776 segitiga, 35 mesh, 19 tulang, dan delapan klip; semua mesh punya skin. Audit struktur lulus, tetapi itu bukan bukti kualitas artistik maupun uji semua pose animasi.

**Keputusan produksi:** jangan promosi ke avatar aktif dulu. Empat arah dan pose berjalan sudah dapat diperiksa, tetapi sculpt tangan/sepatu, kerah–leher, lipatan panggul, UV/tekstur, dan pengujian animasi lengkap masih diperlukan untuk mencapai mutu referensi.
