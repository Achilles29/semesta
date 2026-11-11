# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (37,307,332 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 57 / 77 / 60.
- Segitiga/vertex: 176,520 / 96,339.
- Skinned primitive / skin / tulang: 60 / 1 / 19.
- Material / material ber-base-color texture / normal map / gambar: 20 / 0 / 0 / 0.
- Primitive dengan UV / normal: 20 / 60.
- Klip animasi: `Idle` (2.042s, 57 channel), `Walk` (1.042s, 57 channel), `Run` (0.708s, 57 channel), `Interact` (1.375s, 57 channel), `Wave` (1.708s, 57 channel), `Hoe` (1.708s, 57 channel), `Watering` (2.042s, 57 channel), `Harvest` (1.875s, 57 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.44, 0.012, -0.289], 'max': [0.44, 1.932, 0.234], 'size': [0.879, 1.92, 0.523]}`.

## Temuan

- Jarak bbox bawah dari y=0: `0.012` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- 176,520 segitiga melampaui rentang awal player 15k–35k yang tercantum di task.md; ukur ulang pada perangkat sasaran.
- 60 primitive menambah draw call potensial; sebagian node outfit disembunyikan per racikan.
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- 40 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
