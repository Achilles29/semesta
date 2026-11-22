# Warga Gelombang 1 — revisi penampilan

Revisi aktif **`v15-citizens-2-art`** menyediakan 48 warga yang dikurasi berdasarkan
brief profesi, bersama 36 preset sebelumnya: total 84 karakter pada enam profil
tubuh. [Buka galeri warga bernama](warga-gelombang-1.html),
[lihat seluruh preset](review.html), atau [buka Studio Avatar](../../../admin/?view=avatars).

Tambahan meliputi enam gaya rambut dari aset MakeHuman CC0, kulit/alis/bulu mata
perempuan, blazer/blouse/satin/pakaian panggung, tiga rok, sepatu berhak rendah,
rompi operator, setelan balap, damkar, pilot, dan jas medis. Seragam polisi serta
PNS dibentuk ulang dengan warna tetap dan emblem Republik Wkwkwk.
Celana slim, regular, longgar, denim, cargo dan seragam tetap tersedia.

Generator `tools/extend_avatar_v15_citizens.py` memperbarui kosmetik enam sumber
Blender, memeriksa bahwa rig dan kurva animasi tetap sama, lalu mengekspor GLB.
Renderer dan runtime berbagi kontrak pemilihan pakaian, kulit yang perlu terlihat,
serta warna tetap seragam. Jangan menjalankan generator wardrobe lama sebagai
langkah terakhir karena dapat mengembalikan revisi katalog/aset sebelumnya.

[Riset, sumber aset, pipeline reproduksi dan batas verifikasi](../../../docs/characters/RISET_REVISI_WARGA.md)
serta [lembar karakter](../../../docs/characters/WARGA_GELOMBANG_1.md) menjadi
acuan revisi ini. Gambar offline tidak menggantikan pemeriksaan interaktif
browser atau pengukuran FPS pada perangkat pengguna.

## Riwayat Wardrobe 4 — karakter dan produksi Day 1

Pada revisi `v15-wardrobe-4-peci`, peci mengikuti irisan kulit kepala dengan
kelonggaran sekitar 4,5 mm pada semua enam profil, felt hitam dan bobot penuh
ke tulang kepala. Tujuh bentuk wajah (termasuk persegi,
panjang, senior dan Prabowow), 13 pilihan celana, seragam polisi tanpa insignia,
serta preset Prabowow santai, Bima polisi dan Raka denim slim.

Prabowow memakai morph identitas khusus untuk pipi, rahang, kelopak, hidung dan
mulut. Ini interpretasi 3D bergaya game; kemiripan belum setara potret realistis.
Referensi bentuk wajah: [foto BPMI Setpres/Rusman melalui Sekretariat Negara](https://setneg.go.id/baca/index/prabowo_subianto_dan_gibran_rakabuming_raka_resmi_dilantik_sebagai_presiden_dan_wakil_presiden_republik_indonesia).
Foto referensi tidak dimasukkan sebagai tekstur atau aset game.

Celana slim, tapered, regular, loose dan wide-leg memiliki geometri berbeda.
Denim tersedia regular/slim; taktis, tentara loreng, polisi, PNS dan safari
mempertahankan warna bahan masing-masing. PNS dan safari tidak lagi memakai
volume longgar. Semua enam profil tubuh memiliki pilihan yang sama.

Bangun ulang setelah wardrobe 3:

```powershell
foreach ($profileId in @('male-slim','male-balanced','male-heavy','female-slim','female-balanced','female-heavy')) {
  blender -b --python tools/extend_avatar_v15_character.py -- --profile $profileId
}
python tools/package_avatar_v15_runtime.py
node tools/test_avatar_v15.mjs
node tools/test_avatar_v15_wardrobe.mjs
node tools/test_avatar_v15_integration.mjs
blender -b --python tools/render_avatar_v15_presets.py
blender -b --python tools/render_avatar_v15_presets.py -- --bottoms
blender -b --python tools/render_avatar_v15_presets.py -- --faces
python tools/package_avatar_v15_release.py
```

Pembentukan ulang memakai koordinat sumber tersimpan sehingga tidak menyusutkan
celana berulang kali. Tulang, bobot, dan klip jalan/lari tetap dipertahankan.
Morph ekspresi terpisah dari identitas wajah. Render GLB diperiksa secara visual;
pemeriksaan interaksi browser dan FPS GPU belum dilakukan.

Catatan versi sebelumnya di bawah dipertahankan sebagai riwayat.

# V15 - karakter aktif untuk game dan konten

[Buka Studio Avatar](../../../admin/?view=avatars) atau [lihat 32 karakter](review.html).
V15 sekarang menjadi model aktif pemain, warga daring, NPC, figuran, dan pemeran
konten. Model lama keluar dari pilihan aktif; sumbernya tetap tersimpan sebagai arsip.

## Pilihan siap pakai

- Enam profil: pria/perempuan dengan tubuh kurus, ideal, atau gemuk.
- 32 karakter dengan konfigurasi lengkap, gambar dari GLB aktual, dan ID stabil.
- Tiga bentuk wajah, mata, hidung, mulut, dan telinga; tiga warna iris.
- Rambut pendek, cepak, sanggul, sisir samping, ekor kuda, bob pendek, crew cut, belah samping rapi, spiky RPG, curtain belah tengah, atau
  tanpa rambut; lima warna rambut.
- Lima warna kulit dan enam palet pakaian. Atasan linen, tunik, kemeja
  berkerah, atau jaket lapangan lengan panjang. Dua rompi opsional.
- Lima potongan celana: lurus (bawaan), loose, wide-leg, cargo dengan saku
  tiga dimensi, serta regular tapered. Semua memiliki ruang kain dan hem
  di luar sepatu, bukan menempel seperti legging.
- Set tambahan: taktis, loreng woodland, PNS khaki, safari putih. Atasan dan
  celana dapat dipilih terpisah; celana taktis/loreng memakai cargo longgar,
  sedangkan PNS/safari memakai potongan lurus. Warna seragam tidak dipengaruhi
  palet kasual. Motif loreng dibuat orisinal, tanpa lambang atau pangkat resmi.
- Bot perjalanan, bot tebal, sneaker kanvas, bot kerja, dan sepatu formal hitam.
- Topi kain, kupluk, topi bertepi lebar, ikat kepala, dan peci hitam; kacamata bulat/persegi;
  anting hoop/stud, gelang/jam tangan, tas punggung, selempang dada, dan sabuk.
  Topi bermahkota menutup rambut; jaket/seragam menutup rompi, selempang dan sabuk.
  Pilihan lapisan yang tertutup tetap tersimpan.

Dasar revisi `v15-wardrobe-2` membentuk ulang celana dari pinggul sampai hem dengan
volume kain terukur, saku, fly seam, dan material twill tersendiri. Lihat
[perbandingan celana pada profil yang sama](wardrobe-bottoms.jpg),
[galeri sebelum revisi](wardrobe-before.jpg), dan [uji geometri](wardrobe-test.json).
Generator `avatar_v15_wardrobe.py` menyimpan koordinat sumber agar rebuild
berulang tidak terus memperbesar celana. Klip gerak tidak diubah.

Bentuk wajah memakai sepuluh identity morph `Id_*` terpisah dari `Expr_*`.
Mata, alis, dan gigi mengikuti deformasi identitas. Iris biru/hijau memakai tekstur
baru yang mempertahankan pupil dan bagian putih mata. Pakaian tambahan adalah
geometri fitted dengan bobot rig; semua profil memiliki asetnya sendiri.
[Daftar pilihan](catalog.json) dan [32 konfigurasi](presets.json) adalah sumber
pilihan yang benar-benar tersedia, bukan daftar fitur rencana.

## Wardrobe 3 dan preset safari

Revisi aktif `v15-wardrobe-3` menyediakan 91 pilihan pada 21 bidang konfigurasi.
[Galeri delapan set baru](uniforms-contact.jpg). Delapan preset baru: Reno Taktis, Kirana Taktis, Rangga Loreng, Dita Loreng,
Darma PNS, Ratih PNS, Surya Safari Putih, dan Prabowo - Dasar Safari.
Preset terakhir memakai tubuh pria berisi, wajah bulat, peci hitam, safari putih
dan sepatu formal. Rambut belah samping tetap tersimpan di bawah peci. Ini dasar
penampilan untuk dikembangkan lagi, **belum merupakan kemiripan wajah final**.

Generator `tools/avatar_v15_uniforms.py` menambahkan mesh yang mengikuti rig,
kemeja dengan saku/kerah/plaket, lengan panjang untuk taktis/loreng, serta
texture base-colour woodland yang dapat diekspor langsung ke glTF.
Jalankan `blender -b --python tools/extend_avatar_v15_uniforms.py -- --profile ID`
untuk membangun ulang tambahan ini saja, tanpa mengubah aset wardrobe 2.
Rebuild penuh `extend_avatar_v15.py` juga memanggil modul yang sama.

## Integrasi dan penyimpanan

Konfigurasi baru: `{model:"v15", profileId, appearance, presetId?}`.
`avatar-v15-config.js` dan validator PHP `avatar_v15_helper.php` membaca katalog
JSON yang sama. Akun lama diterjemahkan saat dibaca ke penampilan V15 terdekat;
konfigurasi baru disimpan ketika pengguna memilih atau mengubah avatarnya.
Tidak ada migrasi massal yang menimpa data akun lama.

Studio dapat mengubah semua variasi, memainkan tujuh klip, menguji ekspresi dan
jari, menyimpan preset tambahan ke katalog admin, dan mengunduh konfigurasi JSON.
Pemilih karakter akun juga menyediakan semua kontrol variasi. Pemain, NPC,
warga daring dan produksi memakai factory `avatar-runtime.js` yang sama.

## Animasi dan proporsi

Kepala dan transisi leher mempertahankan revisi proporsi yang sudah disetujui.
Tinggi anatomis pria 1,78 m dan perempuan 1,68 m. Profil perempuan memakai
anatomi perempuan MakeHuman; fitting tubuh berlaku pada kulit, pakaian dan rig.

Revisi gerak tetap `v15-cmu-locomotion-2-head`. Walk dari CMU 07_01, Run/joging
dari CMU 16_35; kemiringan dasar kepala sudah dinetralkan. Tujuh klip:
Idle, Walk, Run, Wave, Sit, Point, Hold. Sit/Point/Hold masih pose bertahan.
Game menghilangkan pantulan root tambahan dan menghitung cadence dari perpindahan
aktual serta `recommendedForwardSpeed` masing-masing profil. Shift atau tombol
LARI mengaktifkan joging. Berhenti di depan penghalang kembali ke Idle.

Video pada halaman review adalah pemeriksaan gerak yang disetujui sebelum
wardrobe ditambahkan. Klip animasinya dipertahankan. Sisa sliding pada tumpuan
sekitar 0,15-0,23 m/detik dalam uji retarget; belum ada IK tanah miring,
transisi start/stop/turn, atau simulasi kain.

## Pemuatan dan pengujian

GLB mandiri sekitar 37 MB per profil disediakan untuk pengunduhan/authoring.
Game memuat glTF dengan tekstur bersama dan nama berkas berbasis hash: sekitar
145 MB untuk enam profil dibanding 222 MB jika memuat seluruh GLB. Tekstur juga
dibagikan di cache runtime. Studio/pemilih akun memuat profil sesuai permintaan;
kartu preset memakai PNG agar tidak memuat semua profil hanya untuk katalog.
Belum ada LOD atau pengukuran FPS kerumunan.

- [Uji gerak](runtime-test.json): enam GLB, tujuh klip, seluruh bobot,
  sampling deformasi, loop, tumpuan kaki dan kestabilan kepala.
- [Uji integrasi](integration-test.json): seluruh pilihan variasi pada enam profil,
  roundtrip validator PHP/JS, penolakan input tidak valid, migrasi 20 preset
  lama, isolasi instance, cache, cadence, serta pemeran produksi.
- 32 preset dirender dari GLB dan diperiksa pada [contact sheet](presets-contact.jpg).
- [Pemeriksaan distribusi](release-check.json): hash source/public/build,
  decoding tekstur, berkas HTTP, video dan bundle.
- Uji adegan produksi V14/V15/V16 dan director menggunakan rig V15 asli.
  Properti kertas pada arsip V15 menyesuaikan permukaan tangan; 55 sampel
  adegan lolos pemeriksaan kontak dan tidak menembus jari. Nama aksi lama
  diterjemahkan ke klip V15 agar naskah konten terdahulu tetap dapat diputar.

Uji Node memakai geometri dan rig asli dengan placeholder tekstur; piksel tekstur
serta render diperiksa terpisah. Interaksi browser dan FPS GPU belum diverifikasi.
Pengujian numerik tidak menjamin setiap kombinasi bebas clipping; terutama
aksesori dan ekspresi ekstrem masih dapat memerlukan koreksi artistik.

Kulit yang tertutup pakaian dikeluarkan dari ekspor. Jangan menambahkan celana
pendek atau baju terbuka tanpa memperbarui coverage mask. Sumber anatomi lengkap
`Anatomy_Source` tetap ada sebagai objek authoring tersembunyi di Blender.

## Sumber dan reproduksi

Pipeline memakai sumber CC0 V14, tercatat di
[lisensi V14](../farmer-v14-jrpg/SOURCE-LICENSES.md). Target anatomi perempuan
tambahan dipatok ke commit MakeHuman yang sama dan dicatat URL/SHA256-nya di
[manifest tambahan](source/manifest.json). Lisensi grafis resmi:
[CC0 MakeHuman](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.ASSETS.md).
Motion capture memiliki ketentuan terpisah, **bukan CC0**: lihat
[sumber dan ketentuan CMU](source/cmu/README.md). Data boleh dimasukkan ke produk
komersial, tetapi data geraknya sendiri tidak boleh dijual ulang, termasuk
hasil konversi. The data used in this project was obtained from mocap.cs.cmu.edu.
Tidak ada pembelian aset atau pemakaian aset Final Fantasy.

Aksesori tambahan dibuat oleh generator lokal; geometri turunan mempertahankan
asal MakeHuman. Tidak ada aset yang diambil dari Final Fantasy. Lihat juga
[Sumber dan lisensi](../../../public/models/characters/v15/SOURCE-LICENSES.md).

## Reproduksi

Dari root project, dengan Blender 4.5 LTS dan dependency Python/Node terpasang:

```powershell
foreach ($profile in @('male-slim','male-balanced','male-heavy','female-slim','female-balanced','female-heavy')) {
  # Untuk rebuild penuh jalankan build_avatar_v15.py terlebih dahulu.
  blender -b --python tools/extend_avatar_v15.py -- --profile $profile
}
blender -b --python tools/render_avatar_v15_presets.py
blender -b --python tools/render_avatar_v15_presets.py -- --bottoms
python tools/package_avatar_v15_runtime.py
node tools/test_avatar_v15.mjs
node tools/test_avatar_v15_integration.mjs
node tools/test_avatar_v15_wardrobe.mjs
node tools/test_production_v14.mjs
node tools/test_production_v15.mjs
node tools/test_production_v16.mjs
node tools/test_production_director.mjs
node tools/test_production_district.mjs
python tools/package_avatar_v15_release.py
npm run build
node tools/test_admin_navigation.mjs
python tools/verify_avatar_v15_release.py
```

`extend_avatar_v15.py` idempotent dan menyimpan sumber `.blend` serta GLB lengkap.
`package_avatar_v15_runtime.py` hanya mengemas ulang byte geometri/animasi dan
mengekstrak tekstur bersama; manifest hash ikut dibundel untuk menghindari cache
model lama. Setelah perubahan aset, jalankan packaging lalu build lagi.
