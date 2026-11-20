# V13 — tubuh, tangan, dan gerakan

Kandidat lokal lanjutan V12. Buka [review.html](review.html) untuk perbandingan
V12/V13 dan [body-demo.mp4](body-demo.mp4) untuk demo tanpa suara selama 12 detik.
Di Studio Avatar pilih **V13 · tubuh & tangan**, lalu **Karakter acuan**.
Gunakan kamera **Tangan** / **Kaki**, kontrol **Gerak jari**, dan klip
**Sit / Point / Hold**. Tombol **Properti pegangan** menampilkan batang contoh
di tangan kiri karakter. Kontrol jari **Ikuti animasi** mengembalikan pose klip.

V11 tetap menjadi avatar game. Menyimpan racikan tidak mempromosikan kandidat;
konfigurasi bentuk, warna, pakaian dan aksesori tetap memakai skema yang sama.
V11/V12, file Blender sumbernya, serta aset publiknya tidak ditimpa.

## Dasar keputusan visual

Audit sumber dan render awal menemukan bahu kaos yang datar, celana dengan
lebar bawah hampir seragam, tangan tanpa artikulasi terpisah, dan skin weights
berbasis zona yang kurang lentur di sendi. Topology CC0 sudah memiliki lima jari
dan bentuk kaki; membuangnya tidak diperlukan. V13 mengolah topology tersebut,
menambah detail permukaan tangan yang diperlukan untuk tekukan, dan memperluas
skeleton tanpa mengganti 19 rest matrix tulang lama.

Perubahan tubuh mempertahankan identitas karakter. Ini bukan pembangunan ulang
anatomi seluruh badan. Perubahan paling besar ada pada kemampuan tangan bergerak,
siluet celana, dan gerakan jalan/lari. Bandingkan gambar netral dan demo gerak;
keberhasilan tes numerik sendiri tidak membuktikan kualitas artistik.

## Implementasi

- Satu medan deformasi membentuk bahu, dada, punggung, pinggang, lengan bawah,
  betis/pergelangan, serta pakaian/trim yang mengikuti area tersebut. Semua key
  identitas menerima perubahan yang sama. Batas potongan pakaian dipertahankan
  karena sumber tidak menyertakan kulit di bawah semua pakaian.
- Celana relaxed/cargo lebih mengecil ke pergelangan, dengan kontur lutut/betis.
  Kaki dan sandal dipersempit bersama, sementara permukaan jari kaki dihaluskan.
- Tangan bare/work-gloves memperoleh satu tingkat Catmull–Clark yang diterapkan
  identik ke seluruh shape key. Batas pergelangan tetap sama dengan forearm.
  Penambahan polygon dibatasi ke tangan untuk memperhalus tekukan jari.
- Skin weights bahu/siku, pinggul/lutut dan pergelangan diperluas transisinya.
- Skeleton memiliki **49 tulang: 19 lama + 30 jari**, tiga sendi per jari pada
  kedua tangan. Penempatan tulang mengikuti geometry tangan CC0. Gestur terbuka,
  rileks, menunjuk, memegang, dan mengepal tersedia melalui metadata.
- Pusat putaran jari mengikuti perpindahan permukaan tangan dari 16 morph tubuh.
  Controller mengoreksi pivot sesudah mixer tanpa menerjemahkan mesh dua kali;
  tangan berisi tetap dapat memakai gestur yang sama dengan tangan ramping.
- Enam klip lama **Idle, Interact, Wave, Hoe, Watering, Harvest** mempertahankan
  gerak tubuh/attachment dan mendapat key jari. **Walk/Run** dibangun ulang
  menggunakan IK dua ruas yang dibakukan menjadi keyframe; tidak membutuhkan
  solver IK saat runtime. **Sit, Point, Hold** adalah klip pose bertahan, bukan
  transisi masuk/keluar pose yang lengkap.
- Wajah, ekspresi, viseme, 16 bentuk tubuh, 10 outfit, pilihan warna dan slot
  aksesori V12 dipertahankan. Sarung tangan mengikuti rig jari yang sama.

## Kontrak runtime dan migrasi

Kontrak dasar tetap `semesta-farmer-v8-legacy19`; itu menandai kompatibilitas
19 tulang dasar, bukan total tulang V13. Ekstensi disimpan sebagai metadata:

- `avatarSkeletonExtension`: jumlah tulang dasar/jari dan versi ekstensi.
- `avatarHandContract`: nama joint, sisi, sumbu rotasi lokal, dan sudut gestur.
- `avatarGripOffsets`: socket grip terpisah dari attachment tangan lama.
- `avatarLocomotion`: periode, porsi fase menapak, panjang langkah, kecepatan.
- `avatarExpressionContract` dan `avatarAttachments`: kontrak V12 dipertahankan.

`game-src/avatar-hands.js` hanya mengubah joint jari yang dideklarasikan. Setiap
instance memiliki skeleton, controller, material, dan bobot morph independen.
`figure.userData.handController.update({pose:'grip', side:'L', intensity:1})`
dipanggil **setelah mixer.update()** jika ingin menimpa pose jari klip.
`pose:'clip'` membiarkan mixer mengatur jari. `getGrip('handL')` mengembalikan socket
pegangan baru; `getAttachment('handL')` tetap mengembalikan tulang tangan lama.
Socket grip juga mengikuti morph telapak; metadata pivot jari tengah menjadi
acuan perpindahan, sehingga prop tidak tertinggal ketika bentuk tubuh diganti.
Di Blender, penyesuaian pivot ini diterapkan helper `fit_hand_pivots()` dalam
pipeline review; sumber tidak memasang driver otomatis untuk perubahan morph
manual. Jalankan helper setelah mengevaluasi pose jika meninjau bentuk tubuh
berbeda langsung di Blender.

Production performance menerima cue `handPose`, `handSide`, `handIntensity`
bersama ekspresi/viseme. Episode dan game tetap memuat V11 sampai kandidat
dipromosikan secara terpisah. Pemuatan V13 hanya terjadi ketika dipilih di Studio;
cache kandidat tidak mengganti cache global V11.

Gerakan di tempat memerlukan kecepatan translasi yang sesuai agar pijakan tidak
bergeser terhadap dunia. Metadata Walk: **0,4667 unit/detik**, Run: **1,4286
unit/detik**, pada skala 1 dan playback 1. Kalikan kecepatan dengan skala karakter
dan playback rate. Runtime lama tidak otomatis mengganti kecepatan game karena
V13 belum menjadi aset default. Ini belum merupakan IK untuk permukaan miring.

## Ukuran dan pemeriksaan

Lihat [hand-test.json](hand-test.json), [runtime-test.json](runtime-test.json),
dan [build-report.json](build-report.json) untuk angka dari file hasil ekspor.

| Metrik | V12 | V13 |
| --- | ---: | ---: |
| GLB | 21,87 MB | 23,89 MB |
| Tulang | 19 | 49 |
| Klip | 8 | 11 |
| Segitiga karakter acuan | 36.292 | 44.380 |
| Segitiga seluruh slot | 178.184 | 194.360 |
| Perkiraan draw call acuan | 28 | 28 |

V13 memiliki 71 primitive, 104.739 vertex hasil ekspor, dan 216 array posisi morph
aktif pada racikan acuan (4.178.748 byte setelah didekode Three.js). Ini ukuran
array dan perkiraan draw call, **bukan pengukuran memori GPU atau FPS**. Seluruh
slot tidak digambar sekaligus. Atlas tekstur dan LOD belum ditambahkan.

Pemeriksaan mencakup:

- 1.280 kombinasi tubuh/pakaian dan 240 kombinasi kepala/aksesori.
- 8.385.960 sampel vertex dengan morph + skinning pada 16 tubuh dan 11 klip.
- 27.250 sampel vertex gestur tangan, bobot skin ternormalisasi, serta isolasi
  instance dan identitas.
- 1.440 pemeriksaan pusat putaran jari pada 16 morph tubuh dan tiga gestur.
- Titik grip dibandingkan dengan pusat permukaan telapak pada 16 morph tubuh.
- 160 sampel transform attachment terhadap V12: enam klip tubuh lama identik;
  perbedaan Walk/Run memang disengaja.
- 44 sampel fase menapak Walk/Run: posisi ankle cocok dengan lintasan deklarasi
  dan sole berada di lantai pada karakter acuan. Ini uji frame sampel, bukan
  jaminan setiap interpolation/subframe dan semua variasi pakaian bebas clipping.
- Pergantian Sit/Hold kembali ke Idle tidak menyisakan offset pelvis.
- Cue produksi mencapai controller wajah dan jari.
- Regresi V12, playback Studio, konfigurasi/game V11, production director,
  navigasi admin, PHP lint dan build frontend.

Render source mencakup sudut depan/samping/belakang, detail tangan/kaki, semua
klip, serta variasi pakaian representatif. GLB diimpor ulang ke Blender untuk
render pembanding `export-*.png`. Demo dibuat dari sumber Blender final.
HTTP lokal dan kesamaan hash sumber/publik/build diperiksa saat penyerahan.
Interaksi UI, pencahayaan browser, dan FPS GPU belum diverifikasi otomatis.
Build masih memiliki peringatan chunk besar dan impor Three.js statis/dinamis.

## Batas visual

Kandidat masih memerlukan penilaian artistik pengguna. Sela jari, genggaman
ekstrem, bahu, panggul serta pakaian lama dapat membutuhkan corrective morph
atau pemolesan manual lebih lanjut. Penghalusan dan skinning belum menjadi
simulasi otot atau kain. Rok/sarung memakai skinning kaki; pose duduk ekstrem
tidak dijamin bebas clipping. Demo duduk tidak menyertakan kursi.

Jari kaki tidak memiliki rig terpisah. Body topology tetap terdiri dari slot
potongan sumber; tidak ada kulit badan lengkap di balik semua pakaian. Wajah dan
rambut non-short tetap membawa batas artistik V12. Ekspor menghilangkan delta
normal morph seperti V12; shading ekstrem perlu ditinjau di perangkat sasaran.

## Reproduksi dari root project

Memerlukan Blender 4.5 LTS, Node dependencies project, Python + Pillow dan
imageio-ffmpeg. Semua proses lokal, tanpa layanan berbayar. Ganti `blender` dengan
path executable portable jika tidak ada di PATH.

```powershell
blender -b -t 6 --python tools/audit_avatar_v13.py
blender -b -t 6 --python tools/inspect_avatar_v13_hands.py
blender -b -t 6 --python tools/build_avatar_v13.py -- --views none
node tools/test_avatar_v13.mjs
node tools/test_farmer_v11.mjs ilustrasi/avatar-v2/farmer-v13-body/farmer-v13-body.glb
blender -b -t 6 --python tools/render_avatar_v13_review.py
blender -b -t 6 --python tools/render_avatar_v13_review.py -- --export --quick
blender -b -t 6 --python tools/render_avatar_v13_review.py -- --demo
python tools/package_avatar_v13_review.py
Copy-Item ilustrasi/avatar-v2/farmer-v13-body/farmer-v13-body.glb public/models/characters/semesta-farmer-v13.glb
npm run build -- --emptyOutDir false
python tools/verify_avatar_v13_release.py
```

Generator membaca `.blend` V12 dan hanya menulis folder kandidat ini. Simpan
salinan sebelum regenerasi jika mengedit `.blend` final secara manual.
`avatar_v13_common.py` berisi konfigurasi, kamera, dan helper pose bersama.
`demo-frames/` dan `video-frames/` merupakan hasil antara yang diabaikan Git.
Asal topology CC0 mengikuti sumber Blender Studio yang didokumentasikan dalam
pipeline V6/V11; pekerjaan V13 tidak menambahkan aset eksternal.
