# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (1,267,664 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 41 / 61 / 41.
- Segitiga/vertex: 34,992 / 19,808.
- Skinned primitive / skin / tulang: 41 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 13 / 0 / 0 / 0.
- Primitive dengan UV / normal: 5 / 41.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.44, 0.012, -0.218], 'max': [0.44, 1.909, 0.232], 'size': [0.879, 1.897, 0.45]}`.

## Temuan

- Jarak bbox bawah dari y=0: `0.012` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 36 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
