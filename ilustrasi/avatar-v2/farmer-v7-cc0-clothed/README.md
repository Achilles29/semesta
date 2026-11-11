# Farmer V7 — percobaan pakaian, belum lulus

**Dasar yang dipilih untuk pengembangan berikutnya:** `cc0-base-original.blend`, yaitu mesh Blender Studio CC0 dengan proporsi aslinya. Ini mempertahankan postur dan topologi dari `cc0-base-mesh-preview.png` di folder V6. Sumber resmi: [Human Base Meshes v1.4.1](https://www.blender.org/download/demo-files/) (CC0). `extract_cc0_base.py` menyimpan mesh itu secara lokal agar tidak bergantung pada unduhan di folder sementara.

`farmer-v7-cc0-clothed.blend` dan `.glb` adalah **uji berpakaian**, bukan kandidat yang dipilih untuk gameplay. Render: [depan](front.png), [kiri](left.png), [belakang](back.png), [pose jalan](pose-walk.png). GLB lolos struktur format dan menyertakan delapan klip, tetapi [audit](validation.md) tetap menyatakan belum siap produksi. Avatar aktif tidak diganti.

## Penilaian jujur

- Yang membaik: tubuh berasal dari mesh CC0 beranatomi nyata; tangan dan kaki tidak lagi dibangun dari tabung terpisah. Pengujian material langsung pada mesh menghilangkan sobekan lapisan pakaian di siku/lutut yang terlihat pada render V7 pertama.
- Yang belum lulus: bentuk wajah masih terlalu realistis untuk referensi, batas area baju berupa tepi poligon yang bergerigi, rambut belakang terlalu sederhana, serta sepatu dan tas tampak sebagai benda terpisah. Rig masih 19 tulang dari V5; deformasi pose belum dikurasi satu per satu.
- Keputusan: **jangan promosikan V7 ke `public/models/characters`**. Jangan menganggap warna dan aksesori prosedural ini sebagai kostum final.

## Jalur berikutnya

Mulai dari `cc0-base-original.blend`, pertahankan proporsi tubuh yang disukai. Sculpt kepala versi kartun dan bentuk pakaian/rambut secara artistik di Blender; baru setelah bentuk tiga arah disetujui, buat rig/weight painting yang cocok untuk mesh itu dan uji pose. `build_farmer_v7.py` adalah catatan percobaan teknis, bukan resep final untuk mengulang gaya V5.
