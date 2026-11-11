# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (434,156 byte).
- Status produksi: **lulus gate awal**.
- Mesh/node/primitive: 15 / 35 / 15.
- Segitiga/vertex: 7,624 / 4,170.
- Skinned primitive / skin / tulang: 15 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 15 / 3 / 0 / 3.
- Primitive dengan UV / normal: 10 / 15.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.686, -0.013, -0.271], 'max': [0.686, 1.869, 0.284], 'size': [1.372, 1.882, 0.556]}`.

## Temuan

- Jarak bbox bawah dari y=0: `-0.013` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 5 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
