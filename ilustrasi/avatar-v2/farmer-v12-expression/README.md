# Kandidat V12 — studi wajah dan ekspresi

Kandidat terpisah dari avatar game V11. Buka `review.html` untuk perbandingan dan
`expression-demo.mp4` untuk demo diam enam detik. Halaman studio memiliki pilihan
**Versi pratinjau → V12**, tombol **Karakter acuan**, dan kamera **Wajah**.
Menyimpan racikan tetap menyimpan konfigurasi V11; versi kandidat tidak diam-diam
dipromosikan ke game atau produksi video.

## Perubahan

- Tubuh, skeleton, 16 variasi tubuh, pakaian dan delapan animasi V11 dipertahankan.
- Kepala diperkecil secara lokal; aksesori kepala mengikuti transform yang sama.
- Mulut memakai bukaan pada mesh kulit, bibir, rongga dan gigi. Deformasi rahang,
  senyum, bentuk lebar/bulat dapat dipadukan dengan identitas wajah.
- Mata memakai permukaan cembung, kelopak, blink kiri/kanan, gaze dan alis.
- Rambut pendek diganti scalp dan kelompok rambut menyamping; gaya lainnya masih
  warisan V11. Kaos memperoleh bagian bahu/leher dan sedikit lipatan tambahan.
- Kontrak `avatarExpressionContract` dan `avatarAttachments` diekspor di metadata.
  Runtime membaca nama target dari metadata, tidak koordinat wajah.
- `avatar-expression.js` mengontrol hanya morph ekspresi. Material, skeleton dan
  bobot morph tiap karakter tetap independen. Resolusi nama attachment mendukung
  nama Blender bertitik maupun nama yang disanitasi Three.js.
- Kandidat studio dimuat terpisah; tidak mengganti cache global aset V11.
- Director mendukung cue `viseme`, `visemeWeight`, `expression`, `gaze`, `time`.
  Tanpa cue viseme, energi audio hanya menggerakkan rahang; itu bukan phoneme sync.

## Hasil pemeriksaan

- GLB publik dan sumber kandidat: 21.874.288 byte, dibanding V11 37.307.332 byte.
- 178.184 segitiga seluruh slot; racikan acuan 36.292 segitiga dan 28 primitive.
  Ini bukan pengukuran FPS GPU. Jumlah segitiga seluruh slot tidak sama dengan
  jumlah yang digambar sekaligus.
- 1.280 kombinasi tubuh/pakaian dan 240 kombinasi kepala/aksesori: lulus.
- 5.313.600 sampel vertex pada 16 tubuh dan 8 klip: lulus.
- 122.850 sampel vertex ekspresi, isolasi antar-instance, identitas tetap: lulus.
- 48 perbandingan matriks tangan pada 8 klip terhadap V11: lulus. Posisi grip
  yang bergantung pada attachment tangan tidak berubah.
- Build Vite, navigasi admin, integrasi game dan director: lulus. Build masih
  mengeluarkan peringatan chunk besar dan impor Three.js statis/dinamis.
- Source dirender dari depan, tiga perempat, samping, belakang, enam ekspresi,
  pose jalan/lari/lambaian/interaksi/duduk manual dan tiga variasi pakaian.
- GLB publik diimpor ulang ke Blender dan dirender (`export-face.png` dan
  `export-speech.png`) untuk membandingkan hasil ekspor, bukan sumber saja.
- URL aset dan review diperiksa melalui HTTP lokal. Interaksi UI dan FPS browser
  belum diverifikasi secara otomatis; pengujian numerik tidak membuktikan visual.

## Keterbatasan yang terlihat

Kandidat ini belum merupakan aset final premium. Sambungan bibir, tepi kelopak,
garis bahu kaos serta pakaian/rambut warisan masih membutuhkan pemolesan.
Pose duduk manual memperlihatkan lipatan celana yang tajam; pose itu tidak menjadi
klip animasi baru. Skeleton 19 tulang tidak memiliki artikulasi jari. Tidak ada
klaim semua kombinasi pakaian bebas clipping.

Atlas tekstur belum dibuat. Pengurangan ukuran terutama berasal dari ekspor tanpa
delta normal morph, bukan pengurangan semua varian atau pemisahan per pakaian.
Periksa shading ekspresi ekstrem pada engine. Pemisahan unduhan tiap slot dan LOD
game/konten merupakan pekerjaan berikutnya; saat ini hanya pemuatan kandidat
yang dilakukan sesuai kebutuhan.

Demo ucapan adalah rangkaian cue tanpa suara. Ekstraksi fonem dan sinkronisasi
otomatis terhadap rekaman belum diimplementasikan. Game dan episode yang ada
tetap menggunakan V11.

## Reproduksi dari root repository

Memerlukan Blender 4.5 LTS, Node dependencies proyek, Python dengan Pillow dan
imageio-ffmpeg. Tidak memerlukan layanan berbayar. Blender harus tersedia di PATH
atau gantikan `blender` dengan path executable portable yang lengkap.

```powershell
blender -b -t 6 --python tools/build_avatar_v12.py -- --views all
Copy-Item ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.glb public/models/characters/semesta-farmer-v12.glb
node tools/test_farmer_v11.mjs ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.glb
node tools/test_avatar_v12.mjs
blender -b -t 6 --python tools/render_avatar_v12_review.py
blender -b -t 6 --python tools/render_avatar_v12_export_check.py
python tools/package_avatar_v12_review.py
npm run build -- --emptyOutDir false
```

Generator membaca sumber V11 lokal dan helper geometri V8/V9/V10 tanpa menjalankan
generator versi lama. Generator hanya menulis direktori kandidat ini. Sumber
`.blend` dapat diedit; simpan salinan sebelum regenerasi. Render baseline dibuat
sekali dari V11 dengan kamera/pencahayaan yang sama. Untuk merender ulang baseline,
pindahkan `baseline.png` dan `baseline-face.png` ke folder cadangan terlebih dahulu.
File `demo-frames/` merupakan keluaran antara yang dapat diregenerasi.
