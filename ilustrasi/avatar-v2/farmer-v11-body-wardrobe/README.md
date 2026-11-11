# Farmer V11 — postur dan lemari pakaian

Kelanjutan V10, bukan pengganti tubuh CC0 dengan mannequin primitif. Postur standar dibuat lebih ramping, celana menjadi lurus/longgar dan lebih panjang, serta atasan panjang diberi ruang untuk pinggul dan rok. V10 tetap tersedia sebagai pembanding.

## Melihat hasil

- [Galeri perbandingan 16 postur dan outfit](gallery.html).
- [Kustomisasi 3D](preview.html), buka melalui Apache: `http://localhost/project/ilustrasi/avatar-v2/farmer-v11-body-wardrobe/preview.html`.
- Sumber editable: [farmer-v11-body-wardrobe.blend](farmer-v11-body-wardrobe.blend).
- Aset runtime: [farmer-v11-body-wardrobe.glb](farmer-v11-body-wardrobe.glb).

Preview memakai Three.js lokal dari `node_modules` dan adapter yang sama dengan game. Jangan membuka preview lewat `file://`, atau mengekspos seluruh root proyek/node_modules di server publik.

## Pilihan yang sudah berupa mesh/morph nyata

| Bagian | Pilihan |
| --- | --- |
| Versi tubuh | Cowok, cewek; seluruh postur dan pakaian tersedia untuk keduanya |
| Postur, masing-masing versi | Kurus, langsing, berotot, berisi/gendut, besar/obesitas, atletis/body goals, dewasa/bapak-bapak, dewasa berisi/ibu-ibu |
| Atasan, 10 | Overall + kaus, kaos oblong, kaos oversized, kemeja kerja, kemeja motif batik, koko, kebaya sederhana, hoodie, tunik, blazer santai |
| Bawahan, 4 | Celana lurus longgar, kargo berkantong, sarung kotak, rok panjang |
| Alas kaki | Boot kerja, sandal dengan kaki/shin CC0 yang benar-benar ada di bawahnya |
| Penutup kepala | Topi terbalik, kupluk, peci, hijab sederhana, tanpa penutup |
| Rambut | Pendek, sisir samping, belah tengah, ikat belakang, bob panjang, tanpa rambut |
| Aksesori | Selempang, ransel, syal, tanpa aksesori |
| Tangan/wajah/warna | Sarung tangan atau tangan biasa; fitur wajah dan delapan warna dari V10 tetap tersedia |

Label postur merupakan kategori artistik, bukan diagnosis kesehatan atau pernyataan bahwa satu bentuk tubuh paling ideal. Profil cowok/cewek menggunakan perbedaan proporsi tubuh berpakaian, bukan simulasi anatomi lengkap. Wajah tetap memakai sistem stylized V10; pilihan postur dewasa tidak otomatis memberi kerutan atau wajah usia lanjut.

Motif batik adalah adaptasi geometris untuk game, bukan reproduksi kain daerah tertentu. Kebaya, hijab, koko, dan blazer masih bentuk stylized sederhana. Ini perluasan awal yang bisa dipadukan, **bukan klaim sudah mencakup seluruh outfit Indonesia**.

## Kontrak runtime

Skeleton tetap `semesta-farmer-v8-legacy19`, 19 tulang dan delapan animasi. `game-src/avatar-farmer-v8.js` membaca capability dari aset sehingga model lama tidak mengiklankan pilihan V11 yang tidak dimilikinya.

Tambahan konfigurasi:

```js
const appearance = {
  bodyFrame: 'female',        // male | female
  bodyType: 'fit',            // skinny, slender, muscular, full, plus, fit, mature, soft-mature
  outfit: 'kebaya',
  bottomStyle: 'skirt',       // relaxed | cargo | sarong | skirt
  footwearStyle: 'sandals',  // boots | sandals
  hairStyle: 'bob', headwear: 'none', accessory: 'none', gloves: 'none',
  faceShape: 'oval', eyeStyle: 'almond', noseStyle: 'defined', mouthStyle: 'smile',
  skin: '#c18b60', hair: '#483024', shirt: '#b9697e', trousers: '#78543c',
  footwear: '#70482e', headwearColor: '#344f7c', gloveColor: '#a42a29', pack: '#79502d',
};
avatar.figure.userData.setAppearance(appearance);
```

`footwearStyle` adalah pilihan bentuk; `footwear` tetap warna alas kaki untuk kompatibilitas. `setAppearance()` menerima konfigurasi lengkap; field yang tidak dikirim kembali ke default. Hasil normalisasi dengan objek `colors` juga dapat disimpan dan dimuat ulang. Metadata `avatarBodyMorphs` memilih tepat satu dari 16 target frame/postur pada mesh tubuh dan pakaian; bukan menumpuk dua morph tubuh yang bisa menimbulkan lipatan tak terduga.

Hijab menyembunyikan rambut tanpa menghapus pilihan rambut dari konfigurasi. Mengganti hijab ke penutup lain/tanpa penutup menampilkan kembali gaya rambut yang dipilih. Beberapa slot seperti sarung adalah grup dengan beberapa primitive/material; pemeriksaan visibility harus memperhitungkan parent, bukan hanya `mesh.visible`.

## Pengujian

```sh
node tools/test_farmer_v11.mjs
node tools/test_farmer_v8.mjs ilustrasi/avatar-v2/farmer-v10-customization/farmer-v10-customization.glb
python tools/validate_character_glb.py --input ilustrasi/avatar-v2/farmer-v11-body-wardrobe/farmer-v11-body-wardrobe.glb --report ilustrasi/avatar-v2/farmer-v11-body-wardrobe/validation.md
```

Hasil saat pembuatan:

- [Tes V11](runtime-test.json) lulus: 1.280 kombinasi tubuh/atasan/bawahan/alas kaki, 240 kombinasi kepala/aksesori, isolasi material/skeleton/morph antarkarakter, dan roundtrip konfigurasi.
- 16 tubuh diuji pada delapan klip, lima waktu per klip, setiap vertex ketiga dari mesh terlihat: 5.181.760 sampel posisi finite/tidak meledak. Ini bukan tes collision setiap frame atau seluruh perkalian kombinasi pakaian × wajah × gerakan.
- Regresi V10 lulus: 480 kombinasi perlengkapan dan 81 kombinasi wajah.
- Build Vite terisolasi berhasil tanpa menimpa `assets/game` aktif. Peringatan chunk besar dan dynamic import Three.js masih ada.
- Preview dan galeri merespons HTTP 200. Render depan/samping, tubuh besar, postur cewek, sarung, kebaya, tunik-hijab, serta pose jalan ditinjau langsung dan beberapa masalah fitting diperbaiki.
- Smoke test WebGL melalui skill computer-use berhasil pada Chrome profil **Namua (shopee)**: model V11 tampil, preset cewek ukuran besar mengubah tubuh/outfit, kebaya + rok tampil pada postur atletis cewek, dan oblong + sarung + peci tampil pada cowok dewasa. Tampilan kiri/belakang serta gerak `Walk` pada sarung diamati langsung. Ini bukan sertifikasi semua 1.280 kombinasi secara visual; console browser, benchmark FPS/mobile, unduhan konfigurasi lewat UI, dan penyimpanan API produksi belum diuji pada sesi ini.

## Integrasi game lokal — 11 November 2026

V11 sudah dipasang ke pemuat aset game dan menjadi pilihan awal Studio Avatar. Profil lama tidak ditimpa: avatar modular lama tetap tersedia, sedangkan preset `special: farmer-ps2` sekarang memuat V11.

- Game: masuk sebagai warga → masuk wilayah → Racik avatar → **Pakai Avatar V11** → pilih tubuh/wajah/pakaian/warna → simpan. Pilihan model juga bisa dikembalikan ke avatar modular lama secara eksplisit.
- Studio: `http://localhost/project/admin/?view=avatars`. Pilihan V11 tetap aktif saat mengganti komponen atau mengacak racikan. Katalog menyediakan petani, oblong–sarung, kebaya, dan tunik–hijab.
- GLB aktif: `public/models/characters/semesta-farmer-v11.glb`, disalin oleh build ke `assets/game/models/characters/semesta-farmer-v11.glb`. Byte/hash cocok dengan GLB yang disetujui di folder ini. Tidak menggunakan model eksperimen V5/V6 sebagai pengganti V11.
- Konfigurasi tambahan disimpan di `avatar_config.farmer`; field legacy tetap dipertahankan. Skema bersama UI/PHP: `game-src/avatar-farmer-schema.json`. Jangan menghilangkan file ini dari deployment karena validator PHP membacanya juga. Warna berada di `farmer.colors`; `footwearStyle` adalah model sepatu, `colors.footwear` adalah warnanya.
- Form studio dan pemain memakai `game-src/avatar-farmer-config.js`. Endpoint profil dan katalog memvalidasi semua pilihan/warna. Presence mengirim `avatar_config`; perubahan penampilan pemain lain membuat modelnya diperbarui saat sinkronisasi berikutnya.
- Bug pemanggilan pembaruan header setelah menyimpan avatar diperbaiki. Studio tidak lagi menimpa pose rig V11 dengan ayunan tangan avatar lama.

Verifikasi integrasi: build Vite lokal berhasil (aset build lama tidak dihapus), PHP lint dan pemeriksaan sintaks JS lulus, model/JS/skema/game lokal HTTP 200. Tes berikut lulus:

```sh
node tools/test_farmer_game_integration.mjs
php tools/test_farmer_api.php
node tools/test_farmer_v11.mjs
```

Tes pertama memeriksa 16 postur melalui konversi UI → validator PHP → serialisasi JSON → model game, kontrak capability, penolakan input tidak valid, dan delapan klip. Tes controller memakai session/repository tiruan tanpa menulis database; mencakup profil, katalog, kompatibilitas legacy, serta penolakan tamu/akun nonaktif/input salah. **Simpan–muat melalui akun browser dan pemeriksaan visual di peta belum selesai:** Chrome profil Namua (shopee) sudah dibuka, tetapi masih memerlukan login pengguna. Skill computer-use tidak mengotomatiskan dialog autentikasi. Tidak ada akun/password/session yang diubah untuk melewati login.

Apache dan MySQL lokal dinyalakan untuk pemeriksaan HTTP. Tidak ada perubahan skema database, commit/push, atau deployment server pada tahap integrasi ini. Ukuran GLB dan kebutuhan optimasi di bawah tetap berlaku.

### Pembaruan sinkronisasi Studio dan sidebar (11 November 2026)

- Studio memiliki pemilih model V11/modular lama; preset V11 ditampilkan lebih dulu dan label katalog mengikuti postur serta outfit sebenarnya. Reset mengambil aset game sesuai model aktif. Impor GLB mengarahkan pratinjau ke keluarga model yang sesuai, tidak diam-diam mengubah aset lama sementara V11 tetap ditampilkan.
- Tinggi kanvas dibuat eksplisit agar ukuran drawing buffer tidak memperpanjang layout berulang kali. Model V11 sudah terlihat langsung di Chrome profil Namua (shopee), melalui skill computer-use, dengan pemilih tubuh/pakaian, label V11, dan tombol reset V11. Tidak ada penulisan katalog/profil nyata dalam pemeriksaan ini.
- Sidebar menggunakan link `site_url('admin/')`, bukan path hardcoded `/admin/`. URL localhost mempertahankan `/project/`; klik biasa, tab baru, navigasi history, dan pencarian menu menggunakan target yang sama. Pemuatan editor wilayah di latar belakang tidak lagi menimpa parameter `view` milik Studio Avatar.
- `node tools/test_admin_navigation.mjs` lulus untuk delapan menu pada enam variasi URL: subfolder, port, IP loopback, root, domain, serta front controller. Tes juga mencakup restore/history, query, scroll per menu, dan modifier klik. Build dan regresi konfigurasi/controller V11 lulus. Pengecekan Chrome memperlihatkan Ringkasan dan Studio pada URL `/project/admin/` yang benar; pengujian simpan–muat akun nyata tetap terpisah dari tes ini.

### Koleksi siap pakai dan tampilan admin (11 November 2026)

- `game-src/avatar-farmer-presets.js` menjadi sumber bersama 20 racikan V11 untuk Studio dan pemilih avatar pemain. Racikan mencakup 16 kombinasi bentuk/postur cowok–cewek dan seluruh 10 atasan: kerja/kebun, kasual, Nusantara, serta formal. Ini konfigurasi dari model V11 yang sama, bukan 20 GLB duplikat.
- Studio menyediakan pemilih cepat di atas pengaturan, katalog bergambar, pencarian, filter koleksi, dan pemisahan arsip model lama. Setiap racikan tetap bisa diubah bagian, wajah, dan warnanya; profil yang sudah ada tidak ditimpa otomatis.
- Thumbnail dirender dari mesh game dengan satu renderer tambahan, bergiliran per halaman, dan cache memori. Lingkungan pencahayaan dibuat pada konteks renderer thumbnail sendiri agar tidak memakai tekstur GPU milik preview utama.
- `game-src/admin.css` mengatur lapisan desain khusus admin: sidebar gelap, panel terang, ruang kerja lebih lebar, tipografi, form, serta tata letak responsif. Pengaturan V11 dikelompokkan menjadi tubuh, pakaian/aksesori, wajah, dan palet warna. Halaman game tidak memakai stylesheet admin.
- Tes integrasi mencakup 20 ID/config unik, cakupan postur/outfit, batas nama, roundtrip validator PHP, dan penerapan ke model game tanpa peringatan. Tes sidebar, controller offline, serta regresi rig/wardrobe lulus. Build lokal diperbarui tanpa menghapus build lama. Pemeriksaan tampilan memakai Chrome profil Namua (shopee) melalui skill computer-use; tidak menulis profil atau katalog database.

### Workbench Studio dan koreksi timing animasi (11 November 2026)

- Preview berada di kiri, panel **Koleksi avatar / Racik & simpan** di kanan dengan scroll sendiri. Pemilih cepat dan tombol sebelumnya/berikutnya berada di atas preview; kartu yang dipilih diberi penanda. Pada layar kecil panel ditumpuk. Tombol Depan/Kiri/Belakang/3/4 mengatur kamera tanpa putaran otomatis model.
- Akar gerakan terlalu cepat adalah `mixer.update(1/60)` setiap frame Studio: pada 240 FPS animasi berjalan sekitar 4×. `avatar-studio-playback.js` sekarang memakai selisih waktu nyata, pembatas lonjakan 100 ms, serta reset timestamp ketika tab/menu ditinggalkan. Kecepatan bawaan 1×; tersedia 0,25×–2×, jeda/lanjutkan, dan ulangi klip.
- Pergantian klip menghentikan aksi sebelumnya agar fade/weight tidak menumpuk. Perubahan penampilan V11 diterapkan pada instance yang sama agar fase animasi tidak kembali ke awal. Saat model benar-benar diganti, mixer dan skeleton lama dibersihkan. Reset/impor aset tetap memaksa pembuatan instance baru.
- `node tools/test_avatar_studio_playback.mjs` menguji seluruh delapan klip pada 30/60/144/240/360 FPS, pause, speed, tab tersembunyi, stall, restart, pergantian klip berulang, serta pemeliharaan fase saat penampilan berubah. Tes integrasi, sidebar, controller offline, dan wardrobe/rig V11 juga lulus. Ini koreksi pemutaran Studio; bukan pengerjaan ulang keyframe animasi atau sertifikasi seluruh kombinasi bebas clipping.

## Batas yang masih perlu dikerjakan

- GLB valid, tetapi validator tetap menandai belum siap sebagai aset premium. Paket berisi seluruh pilihan: sekitar 37,3 MB, 176.520 segitiga total. Dalam uji racikan wardrobe, yang terlihat sekitar 31.996–45.336 segitiga; slot tidak aktif disembunyikan, bukan dikeluarkan dari memori. LOD, pemisahan/lazy-load wardrobe, optimasi morph dan uji GPU/perangkat mobile masih diperlukan sebelum produksi.
- Sarung/rok menggunakan bobot campuran kedua kaki, belum cloth simulation. Pose ekstrem, duduk, lompatan, serta kontak tangan dengan perut pada ukuran besar belum disertifikasi bebas clipping. Skeleton pivot belum diretarget per postur; perubahan ini adalah deformasi permukaan yang mengikuti rig yang sama.
- Material masih dominan warna polos, 40 primitive belum memiliki UV; motif geometris bukan tekstur kain final. Detail kerah, hijab, jahitan, dan lipatan masih bisa ditingkatkan secara artistik.
- V11 sudah terhubung ke UI/API game lokal (lihat integrasi di atas), tetapi tidak memigrasikan paksa semua profil lama. Uji akhir browser dengan akun warga/admin dan benchmark perangkat masih diperlukan sebelum deployment server.
- Tidak ada commit/push atau deployment baru pada tahap ini.

## Membuat ulang

```sh
blender --background -t 4 --python ilustrasi/avatar-v2/farmer-v11-body-wardrobe/build_farmer_v11.py
```

Blender 4.5 LTS. Generator membaca V10 `.blend`, helper murni pada generator V8/V10, dan V6 CC0 `.blend` untuk bagian kaki. Pertahankan folder sumber tersebut. Generator menulis ulang hasil V11 saja; cadangkan hasil edit manual sebelum menjalankannya. `-- --views front,left` membatasi render, bukan ekspor model.

Preview V11 berbagi `../farmer-v10-customization/preview.js`; salin juga file itu dan adapter/runtime jika memindahkan ke server. Lihat handover V9 untuk konteks proyek lama, tetapi daftar capability V11 dalam dokumen ini adalah yang terbaru.
