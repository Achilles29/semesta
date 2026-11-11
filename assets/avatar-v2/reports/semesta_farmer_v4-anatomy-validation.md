# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (1,159,796 byte).
- Status produksi: **lulus gate awal**.
- Mesh/node/primitive: 35 / 55 / 35.
- Segitiga/vertex: 33,776 / 17,040.
- Skinned primitive / skin / tulang: 35 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 15 / 1 / 0 / 1.
- Primitive dengan UV / normal: 8 / 35.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.689, -0.013, -0.263], 'max': [0.689, 1.927, 0.285], 'size': [1.378, 1.941, 0.548]}`.

## Temuan

- Jarak bbox bawah dari y=0: `-0.013` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 27 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
