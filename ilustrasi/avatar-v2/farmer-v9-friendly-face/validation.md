# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (1,256,616 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 46 / 66 / 46.
- Segitiga/vertex: 32,852 / 18,708.
- Skinned primitive / skin / tulang: 46 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 18 / 0 / 0 / 0.
- Primitive dengan UV / normal: 14 / 46.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.44, 0.012, -0.218], 'max': [0.44, 1.914, 0.221], 'size': [0.879, 1.902, 0.438]}`.

## Temuan

- Jarak bbox bawah dari y=0: `0.012` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 32 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
