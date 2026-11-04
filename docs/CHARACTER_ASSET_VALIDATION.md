# Audit aset karakter Semesta

- Status file GLB: **valid glTF 2.0** (5,531,036 byte).
- Status produksi: **belum siap sebagai aset premium**.
- Mesh/node/primitive: 76 / 93 / 109.
- Segitiga/vertex: 104,416 / 65,474.
- Skinned primitive / skin / tulang: 109 / 1 / 16.
- Material / material ber-base-color texture / normal map / gambar: 24 / 8 / 0 / 6.
- Primitive dengan UV / normal: 108 / 109.
- Klip animasi: `Idle` (0.542s, 48 channel), `Walk` (0.542s, 48 channel).
- Bounding box dunia (x, y, z): `{'min': [-0.545, 0.007, -0.336], 'max': [0.376, 1.837, 0.336], 'size': [0.921, 1.83, 0.672]}`.

## Temuan

- Jarak bbox bawah dari y=0: `0.007` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).
- 104,416 segitiga melampaui rentang awal player 15k–35k yang tercantum di task.md; ukur ulang pada perangkat sasaran.
- 109 primitive menambah draw call potensial; sebagian node outfit disembunyikan per racikan.
- Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.
- Klip belum tersedia: Run, Interact, Wave, Hoe, Watering, Harvest.
- Riwayat generator lokal membuat bagian tubuh dari primitive Blender lalu menggabungkannya; GLB valid dan terskeleton, tetapi belum memenuhi target karakter produksi premium pada task.md.
- 1 primitive tidak memiliki TEXCOORD_0.

## Batas validasi

Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.
