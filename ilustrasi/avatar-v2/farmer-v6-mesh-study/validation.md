# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (973,164 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 1 / 21 / 1.
- Segitiga/vertex: 25,000 / 14,128.
- Skinned primitive / skin / tulang: 1 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 1 / 0 / 0 / 0.
- Primitive dengan UV / normal: 1 / 1.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.44, -0.003, -0.166], 'max': [0.44, 1.906, 0.251], 'size': [0.879, 1.91, 0.417]}`.

## Temuan

- Jarak bbox bawah dari y=0: `-0.003` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
