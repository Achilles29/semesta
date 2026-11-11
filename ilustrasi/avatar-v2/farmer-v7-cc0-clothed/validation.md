# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (1,155,392 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 21 / 41 / 26.
- Segitiga/vertex: 29,957 / 17,319.
- Skinned primitive / skin / tulang: 26 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 12 / 0 / 0 / 0.
- Primitive dengan UV / normal: 6 / 26.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.44, -0.003, -0.255], 'max': [0.44, 1.969, 0.265], 'size': [0.879, 1.972, 0.52]}`.

## Temuan

- Jarak bbox bawah dari y=0: `-0.003` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 20 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
