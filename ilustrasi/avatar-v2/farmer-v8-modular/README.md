# Farmer V8 model modular

Kelanjutan mesh CC0 V6 yang posturnya dipilih pengguna. Ini model 3D yang dapat dimuat Three.js, bukan ilustrasi konsep. Versi V5–V7 dan avatar bawaan peta tidak ditimpa.

## Hasil yang diperiksa

- [Depan](front.png), [kiri](left.png), [belakang](back.png), [tiga perempat](three-quarter.png).
- [Kaus tanpa aksesori](variant-tee-no-accessories.png) dan [varian warna kulit serta pakaian](variant-colors.png).
- [Jalan](pose-walk.png), [lari](pose-run.png), [mencangkul](pose-hoe.png), [melambaikan tangan](pose-wave.png).
- Sumber editable: [farmer-v8-modular.blend](farmer-v8-modular.blend). Aset runtime: [farmer-v8-modular.glb](farmer-v8-modular.glb).

Kepala diperkecil hingga 8% dengan transisi di leher. Torso dilebarkan hingga 9% dan ditebalkan hingga 12%, tanpa mengganti topologi anatomi CC0 dengan tubuh primitif. Rambut memiliki scalp tersendiri, poni miring, dan lapisan belakang; telinga tidak lagi diwarnai sebagai rambut. Boot menggunakan permukaan utuh dari ujung kaki ke batang, bukan beberapa ellipsoid yang bertumpuk. Kaki tersembunyi di bawah boot tidak diekspor; ujung celana dan bibir boot mengikuti tulang betis yang sama.

Titik bahu, siku, pergelangan, panggul, lutut, dan pergelangan kaki pada rig disesuaikan dengan tubuh CC0. Pose dasar direset sebelum setiap pemeriksaan, sehingga sisa pose animasi tidak terbawa ke gambar depan/samping/belakang.

## Mencoba kustomisasi

Buka saat Apache XAMPP aktif:

http://localhost/project/ilustrasi/avatar-v2/farmer-v8-modular/preview.html

Pratinjau menggunakan Three.js dari `node_modules` proyek dan fungsi `createHumanModel()` yang sama dengan game. Tidak perlu layanan berbayar, CDN, unggahan aset, atau API key. Jangan membuka lewat `file://`. Halaman dapat menampilkan depan/kiri/belakang, memutar model, menjalankan delapan animasi, mengganti komponen/warna, dan mengunduh konfigurasi JSON.

Pilihan yang benar-benar tersedia sekarang:

| Bagian | Pilihan |
| --- | --- |
| Pakaian | Overall di atas kaus; kaus dengan celana tanpa bib/strap overall |
| Rambut | Pendek berlapis; tanpa rambut |
| Topi | Topi terbalik; tanpa topi |
| Tas | Selempang; tanpa tas |
| Tangan | Sarung tangan kerja; tangan biasa |
| Warna | Kulit, rambut, kaus, celana/overall, sepatu, topi, sarung tangan, tas |

Pakaian ini bukan dua model tubuh berbeda: kaus dan celana lengkap tetap ada, sementara bib dan tali overall merupakan slot yang dapat dilepas. Helm, hijab, rok, jaket, sandal, dan pakaian lain belum dibuat untuk tubuh V8. Penambahan pilihan tersebut membutuhkan mesh yang cocok dengan skeleton dan aturan penutupan tubuh; mengganti label tidak menciptakan bentuk baru.

## Kontrak implementasi

`game-src/avatar-farmer-v8.js` mengatur slot melalui metadata glTF `avatarSlot`/`avatarChoice` dan warna melalui `avatarColor`. `avatar-character-3d.js` mendeteksi kontrak ini sebelum masuk ke cabang avatar lama. Geometri dibagi untuk efisiensi; material dan skeleton diklon per avatar, sehingga warna dan gerak satu karakter tidak mengubah karakter lain.

Contoh pemakaian:

```js
const gltf = await new GLTFLoader().loadAsync(urlV8);
setFarmerAsset(gltf);
const avatar = createHumanModel(THREE, {
  ps2Farmer: true,
  outfit: 'overalls', headwear: 'cap', accessory: 'satchel',
  skin: '#c18b60', shirt: '#ddd7c9', trousers: '#354f79',
});
scene.add(avatar.figure);
// Konfigurasi lengkap; field yang tidak diberikan kembali ke default.
avatar.figure.userData.setAppearance({
  outfit: 'tee', headwear: 'none', accessory: 'none', gloves: 'none',
  skin: '#704020', shirt: '#258050',
});
avatar.mixer.update(deltaSeconds);
```

Kontrak V8 bernama `semesta-farmer-v8-legacy19`, memakai 19 tulang dan delapan klip. Ini **bukan** klaim memenuhi skeleton baru pada draft `AVATAR_V2_MODULAR_SPEC.md`. Menambah aksesori harus memakai nama tulang dan bind pose V8 yang sama. Mesh lain tidak boleh ditempel dengan dugaan posisi saja.

**Belum dijadikan default game.** URL `SEMESTA_FARMER_MODEL`, katalog lama, dan data avatar tersimpan belum dimigrasikan. Form produksi masih memiliki logika yang keluar dari preset `farmer-ps2` saat komponen diubah. Sebelum promosi V8, form tersebut harus mempertahankan identitas V8, membatasi pilihan ke kemampuan di atas, dan menyimpan konfigurasi warna/slot yang sesuai. Pratinjau dalam folder ini sudah menjalankan pergantian slot secara langsung tanpa mengganti model.

## Verifikasi dan batas hasil

Jalankan dari root proyek:

```powershell
node tools/test_farmer_v8.mjs
python tools/validate_character_glb.py --input ilustrasi/avatar-v2/farmer-v8-modular/farmer-v8-modular.glb --report ilustrasi/avatar-v2/farmer-v8-modular/validation.md
```

[Uji runtime](runtime-test.json) lulus: 32 kombinasi slot, isolasi material/skeleton antarkarakter, bobot skin ter-normalisasi, dan 25 sampel per klip untuk delapan animasi. Sebanyak 3.961.600 posisi vertex hasil skinning diperiksa agar finite dan tidak meledak. Build Vite berhasil di direktori sementara tanpa mengganti build game aktif.

[Validator GLB](validation.md) mengenali glTF 2.0 valid: 34.992 segitiga, 19.808 vertex, 41 mesh, satu skin, 19 tulang, 13 material, delapan animasi. Validator tetap menyatakan belum lulus gate aset premium: material masih warna polos, tanpa texture/normal map; 36 primitive baru belum memiliki UV. Ini tidak menghalangi pergantian warna dan komponen, tetapi tekstur kain/detail rambut, optimasi draw call/LOD, serta uji perangkat sasaran masih pekerjaan berikutnya.

Render PNG ditinjau langsung. HTTP halaman pratinjau merespons 200. Pemeriksaan visual WebGL melalui otomatisasi browser dihentikan oleh pengaman alat karena URL browser tidak bisa dipastikan; interaksi UI dan tampilan browser belum terverifikasi. Uji numerik tidak membuktikan semua pose bebas clipping atau kaki selalu tepat menyentuh tanah. Bentuk wajah tetap berdasarkan anatomi CC0, bukan replika karakter Harvest Moon.

## Sumber dan membangun ulang

Mesh tubuh berasal dari Blender Studio Human Base Meshes v1.4.1 (CC0), memakai salinan lokal V6 yang sudah ada. Sumber/provenans sebelumnya ada di folder V6/V7; tidak ada aset game komersial yang diekstrak untuk V8.

`build_farmer_v8.py` memerlukan Blender 4.5 LTS dan file `../farmer-v6-mesh-study/farmer-v6-cc0-base-study.blend`. Jalankan Blender dalam background dengan `--python` menunjuk script ini. Proses menghasilkan ulang `.blend`, `.glb`, render PNG, dan `build-report.json` di folder ini; hasil render adalah model yang sama dengan sumber ekspor GLB.
