# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (1,362,004 byte).
- Status produksi: **lulus gate awal**.
- Mesh/node/primitive: 8 / 28 / 8.
- Segitiga/vertex: 20,886 / 11,296.
- Skinned primitive / skin / tulang: 8 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 8 / 8 / 0 / 8.
- Primitive dengan UV / normal: 8 / 8.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.705, 0.018, -0.395], 'max': [0.705, 2.049, 0.298], 'size': [1.409, 2.031, 0.693]}`.

## Temuan

- Jarak bbox bawah dari y=0: `0.018` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
