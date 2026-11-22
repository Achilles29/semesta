# Riset dan keputusan revisi warga Gelombang 1

Tanggal: **22 November 2026**. Tahap: dua temuan visual terakhir sudah diperbaiki; review offline, pengujian ulang, build frontend dan verifikasi rilis HTTP lokal selesai. Rujukan tetap: [acuan produksi](../PROMPT_ACUAN_PRODUKSI_KONTEN.md) dan [lembar 48 karakter](WARGA_GELOMBANG_1.md).

## Temuan dari aset sebelumnya

Audit mencakup empat lembar kontak `warga-gelombang-1-1.jpg` sampai `-4.jpg`, `warga-wajah-detail.jpg`, seluruh 48 konfigurasi, serta generator model. Nama file merujuk paket sebelum revisi ini; setelah render ulang gambar pada path yang sama dapat berubah.

| Temuan visual | Contoh yang diperiksa | Keputusan revisi |
|---|---|---|
| Rambut perempuan dari depan tampak seperti rambut pendek yang sama. Tambahan belakang belum menyatu dengan pangkal. | Angel/Asila/Aca/Jojo; bagian belakang Nara dan Sy4 tampak seperti lembaran atau batang cokelat. | Buat siluet rambut utuh: lurus panjang, bergelombang, ponytail panjang, kepang, bob lembut; jangan hanya menambah ekor di rambut pendek. |
| Wajah dan bahu perempuan belum cukup terbaca berbeda; beberapa kostum menutupi seluruh variasi bentuk tubuh. | Delapan close-up dan perbandingan seragam Zizi/Sheena dengan DD. | Perbaiki dasar bentuk perempuan, transisi bahu–pinggang–pinggul dan desain fitur wajah; pertahankan profil ramping/ideal/berisi. |
| Profesi hanya terbaca dari aksesori. | Dokter memakai safari putih, pilot safari + headset, damkar baju taktis + helm. | Tambah jas laboratorium, seragam pilot, baju damkar, operator dan balap; perlengkapan kecil menjadi penguat. |
| Pakaian kotak, kerah/kantong menyerupai kepingan tempel, dan banyak celana menggembung serupa. | Seragam dinas, fitted Angel/Climenzo, celana wide-leg. | Bentuk potongan, ketebalan, sambungan dan jatuh kain terlebih dahulu. Gunakan rok/blouse/blazer yang benar-benar berbeda dari pakaian pria. |
| Warna palet pada data tidak cocok dengan keluaran. Rambut hitam menjadi kelabu; palet terakota masih menghasilkan rompi hijau. | Seluruh lembar kontak; deskripsi lama harus dikoreksi mengikuti gambar. | Warna pakaian baru memakai target material yang jelas. Warna pada tabel di bawah adalah arah desain sampai dibuktikan pada render, bukan klaim hasil. |

Penyebab rambut juga terlihat pada generator: [`avatar_v15_wardrobe.py`](../../tools/avatar_v15_wardrobe.py) mengkloning rambut pendek untuk bob/ponytail lalu menambahkan tube atau tirai sederhana; [`avatar_v15_uniforms.py`](../../tools/avatar_v15_uniforms.py) membuat beberapa gaya melalui perubahan koordinat rambut dasar yang sama. Banyak nama variasi belum menghasilkan banyak siluet yang kuat.

## Pelajaran dari sumber primer

| Sumber yang diperiksa | Hal yang diambil untuk proyek | Batas pemakaian |
|---|---|---|
| [MakeHuman — MakeClothes](https://static.makehumancommunity.org/assets/creatingassets/makeclothes/clothes.html) | Fitting perlu memakai helper dan kelompok vertex yang sesuai. Dokumentasi memperingatkan pakaian terlalu mengikuti celah badan serta lipatan besar ketika asosiasi fitting tidak sesuai. | Ini mendukung cara memeriksa celana/baju; kemiripan masalah pada render lama merupakan inferensi, bukan bukti semua penyebab internal sama. |
| [Reallusion — Custom Design](https://www.reallusion.com/character-creator/custom.html) | Morph, kepala, rambut, pakaian, sepatu dan aksesori diperlakukan sebagai aset terpisah yang membentuk pustaka karakter untuk animasi/game. | Dipakai sebagai pola pipeline; tidak membeli, mengimpor, atau mengklaim memakai Character Creator. |
| [Blender Studio — Stylized Character Workflow](https://studio.blender.org/training/stylized-character-workflow/) | Tahap desain, sculpt, retopologi, material dan presentasi dinilai terpisah. | Yang dibaca adalah ringkasan katalog; pelajaran berbayar tidak ditonton. |
| [Adobe — Texturing Characters](https://www.adobe.com/learn/substance-3d-painter/web/texturing-characters-in-substance-3d-painter) | Warna kulit, detail, lapisan, subsurface dan roughness mempunyai tugas berbeda; tint tunggal bukan seluruh look development. | Ringkasan/struktur materi yang diperiksa, bukan klaim telah mengikuti seluruh video atau menambahkan shader tertentu. |
| [Zara — Satin Blouse with Belt](https://www.zara.com/es/en/satin-blouse-with-belt-p02094581.html) | Contoh nyata kerah, lengan bermanset, penutupan depan dan garis pinggang pada blouse; bahan satin dibedakan dari kain seragam. | Referensi konstruksi dan bahan, bukan penyalinan merek/logo atau rekomendasi pembelian. [Tautan blazer yang diberikan](https://www.zara.com/es/en/asymmetric-fitted-blazer-with-shoulder-pads-p02791593.html) mengembalikan 410 saat pemeriksaan; detail halaman itu tidak dianggap terverifikasi. |
| [Perkap 12/2021 — gambar pakaian dinas Polri](https://k3i.korlantas.polri.go.id/api/web/uploads/regulation_doc/PERKAP%20NOMOR%2012%20TAHUN%202021%20PERUBAHAN%20ATAS%20PERKAP%20NOMOR%206%20TAHUN%202018%20TENTANGPAKAIAN%20DINAS%20PEGAWAI%20NEGERI%20PADA%20POLRI.pdf) | Tim memeriksa gambar pria/perempuan: kemeja cokelat, bawahan lebih gelap, kerah, epaulette, kantong dan nama. | Referensi visual pakaian; bukan penetapan pangkat atau kepatuhan hukum. Model memakai emblem republik rekaan, bukan logo/pangkat asli. Nilai warna material adalah keputusan artistik. |
| [Itjen PU — Mengenal APD dan APK](https://itjen.pu.go.id/baru/kolompengawasan/108) | Helm, rompi keselamatan dan sepatu kerja memberi kombinasi visual operator yang lebih masuk akal. | Aset animasi bukan APD nyata dan tidak diklaim tersertifikasi. |
| [FIA — Protective Clothing](https://www.fia.com/sites/default/files/guidelines_safety_clothing_web_0.pdf), [Alpinestars — GP Race V2](https://www.alpinestars.com/products/gp-race-v2-suit-fia) | Baju balap memiliki siluet overall, kerah, lengan/manset dan panel; bukan cargo taktis yang sekadar diganti warna. | Desain orisinal RW Racing tanpa logo sponsor, klaim homologasi, atau sertifikasi. Pakaian balap berbeda dari pakaian bengkel. |

Sumber busana dan proses di atas dipakai sebagai referensi desain. Model, foto, logo dan tekstur dari halaman fashion/seragam tersebut tidak diimpor ke game.

## Sumber aset yang benar-benar dipakai

Implementasi revisi menambahkan **36 berkas sumber MakeHuman CC0** ke pustaka proyek, mencakup kandidat kulit perempuan, mesh/proxy rambut, alis dan bulu mata. Lisensinya tercatat pada [daftar resmi MakeHuman System Assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html). Jumlah ini menghitung berkas tambahan untuk revisi ini, bukan seluruh dependensi avatar; beberapa kandidat sumber disimpan untuk perbandingan dan tidak semuanya tampil pada satu model.

[`fetch_citizen_beauty_assets.py`](../../tools/fetch_citizen_beauty_assets.py) mengambil berkas pilihan dari paket resmi dan membuat **7 tekstur turunan netral** untuk enam sumber rambut serta satu alis. Turunan mempertahankan alpha dan detail helai, menghilangkan warna rambut bawaan, serta mengurangi pencahayaan yang sudah tertanam pada tekstur rambut agar warna katalog dapat diterapkan lebih konsisten. [`manifest.json`](../../ilustrasi/avatar-v2/farmer-v15-proportions/source/citizen-beauty/manifest.json) menyimpan URL paket, bukti lisensi, hash direktori sumber, SHA-256 setiap berkas, asal dan operasi setiap turunan. Pemeriksaan lokal terhadap 36 berkas sumber dan 7 turunan cocok dengan hash manifest saat catatan ini ditambahkan.

Mesh rambut tersebut dipasangkan ke tubuh/rig V15 melalui [`avatar_v15_citizen_beauty.py`](../../tools/avatar_v15_citizen_beauty.py). Busana baru dibentuk dalam generator proyek; referensi Zara/Polri/FIA membantu keputusan potongan dan material, bukan menjadi sumber mesh atau tekstur busana yang diunduh.

## Prinsip kurasi

- Ikuti brief terbaru: perempuan yang diminta cantik dan sespri mendapat arah kulit terang/hangat terang, rambut panjang dan busana feminin dewasa yang ditata dengan jelas. Ini keputusan karakter fiktif, bukan dugaan penampilan akun asli atau ukuran kecantikan universal.
- Angel, Nara, Reva, Sy4, Jojo, Aulia, Livia dan Aca tidak dijadikan salinan satu wajah/outfit. Kulit tetap mempunyai undertone, bukan putih datar; postur berisi tetap ada.
- Profesi membutuhkan potongan pakaian yang benar. Satpam/hansip, polisi, militer, operator, pilot, dokter dan pembalap tidak memakai kostum yang sama dengan satu aksesori berbeda.
- Seluruh 48 ID, nama, gender yang belum diketahui, status follow, peran ambigu, riwayat DD dan cerita sumbangan dipertahankan. Tidak ada jabatan atau keputusan warga baru yang disahkan.
- Nama tampil bersama karakter. Identitas Day 1 dan 36 preset lama dipertahankan; revisi ini mengkurasi 48 warga gelombang pertama.

## Tabel keputusan 48 desain

Tabel ini dimulai **sebelum perubahan preset** dan mencatat arah desain. Koreksi hasil review ditambahkan bila gambar berbeda dari brief awal; Demian kini dicatat dengan kemeja burgundy dan rompi arang. Profil tubuh yang tidak ditandai tetap mengikuti pilihan awal untuk menjaga variasi. Penutupan QA mengikuti status di akhir dokumen.

| Nama | Arah rambut/kulit | Pakaian yang dipilih | Pembeda utama |
|---|---|---|---|
| demian | Pendek modern cokelat; hangat | Kemeja burgundy + rompi arang, celana relaxed | Tubuh berisi, wajah bulat; warna dikoreksi dari potret aktual. |
| zizi | Ponytail panjang gelap; hangat | Polisi + celana polisi, sepatu formal | Siluet perempuan profesional; tanpa topi agar wajah terbaca. |
| arsen | Pendek modern gelap; cokelat | Jaket lapangan, cargo, bot dan topi lebar | Pengusaha kebun berisi; palet hijau bumi. |
| asila | Lurus panjang cokelat; terang | Blazer kantor, celana fitted, heels; cream | Calon pemimpin perempuan, berbeda dari safari presiden. |
| DD | Cepak gelap; sawo matang | Polisi + celana polisi, sepatu formal | Pimpinan rekaan berisi dengan rahang tegas. |
| cecil | Ponytail panjang cokelat; terang | Jas lab, celana putih, sneaker | Wajah lembut, stetoskop dan kacamata kecil. |
| veysha | Bob lembut cokelat; hangat | Blazer kantor, celana straight; teal | Akademisi berisi, kacamata bulat. |
| azril_zeroeight | Pendek modern gelap; hangat | Blazer kantor, celana fitted; midnight | Figur ramping formal, peci dan pin republik. |
| climenzo_jr | Pendek modern cokelat; terang | Blazer kantor, fitted; burgundy | Pengusaha berisi, sepatu formal dan jam tangan. |
| aku.ardhyy | Cepak gelap; sawo matang | Operator, cargo, hardhat, work boots | Rompi keselamatan oranye di atas lengan arang. |
| angel | Lurus panjang cokelat; terang | Blazer kantor + pencil skirt + heels; cream | Elegan profesional, wajah oval lembut, perhiasan kecil. |
| 4ku_fek.smail | Pendek modern cokelat; hangat | Kemeja linen, straight, sneaker; teal | Kasir ramping dengan pakaian sederhana; belum apron khusus. |
| tazinho.cc | Pendek modern gelap; hangat | Polisi + celana polisi, bot | Wajah memanjang, kacamata; berbeda dari DD. |
| naraevelync | Gelombang panjang cokelat; terang | Satin top + pencil skirt + heels; midnight | Glamour profesional dengan wajah lebih panjang, berbeda dari Angel. |
| fale | Pendek modern gelap; hangat | Racing + racing, sepatu ramping | Overall grafit/merah/putih; tanpa cargo dan sabuk kulit. |
| faikal | Crew cut gelap; sawo matang | Loreng + celana loreng, bot | Prajurit lapangan, profil ideal sementara. |
| sheaza | Ponytail panjang auburn; hangat | Stage top + jeans regular, sneaker; violet | Kreator dewasa kasual, headset dan gelang. |
| wkwk | Pendek gelap; hangat | PNS khaki + celana PNS | Bupati berisi, peci dan kacamata. |
| livia | Kepang cokelat; terang | Fitted blouse + A-line skirt, sepatu rendah; rose | Pelukis imut dewasa, bros palet dan warna pastel. |
| zine | Kepang gelap; sawo matang | Fitted blouse + wide-leg; teal | Pelukis berisi, siluet berbeda dari Livia. |
| aca | Ponytail panjang cokelat; terang | PNS + pencil skirt, heels | Camat perempuan; karakter melamun melalui akting. |
| Qiyya | Kepang cokelat; hangat | Fitted blouse + A-line skirt, sneaker; rose | Pendidik berisi yang hangat dan praktis. |
| Dinda | Lurus panjang gelap; hangat | Blazer kantor + pencil skirt, sepatu formal; midnight | Busana formal perempuan; belum toga pengadilan. |
| Ell | Pendek modern gelap; terang | Pilot + celana pilot, sepatu formal | Kerah, emblem sayap rekaan dan epaulette; headset penerbangan. |
| caramella | Ponytail panjang cokelat; hangat | Fitted blouse + celana regular, sneaker; teal | Kasir pet shop praktis; belum apron khusus. |
| nopal | Pendek modern cokelat; hangat | Linen + jeans slim, sneaker; midnight | Headset dan gaya santai; gender tetap belum diketahui. |
| Znou | Pendek modern gelap; sawo matang | Jas lab + celana putih, sepatu formal | Dokter berisi berkacamata, berbeda dari Cecil. |
| Reva | Gelombang panjang auburn; terang | Satin top + pencil skirt + heels; burgundy | Entertainer dewasa berisi dengan garis pinggang jelas. |
| Xel | Crop gelap; cokelat | Operator + cargo, hardhat dan bot | Mandor berisi, wajah persegi; berbeda dari operator ideal. |
| Sy4_iii | Ponytail panjang auburn; terang | Stage top + mini skirt + heels; violet | Idol dewasa; inner di bawah jaket dan perhiasan panggung. |
| avdzib | Crew cut gelap; sawo matang | Loreng + celana loreng, bot | Panglima rekaan berisi dengan kacamata dan pin. |
| pii | Pendek modern gelap; sawo matang | Linen + rompi, jeans regular, bot; midnight | Klub motor-komedi rekaan; tidak menduga identitas seksual. |
| jojo | Gelombang panjang gelap; terang | Stage top + jeans slim, bot; midnight | Rockstar perempuan dengan gitar merah; beda dari Sy4/Joko. |
| Atha | Pendek modern cokelat; hangat | Blazer kantor, fitted, formal; cream | Pengusaha energi smart casual, tubuh ideal. |
| ammarhddhhjj3 | Crop gelap; sawo matang | Firefighter + firefighter, helm dan bot | Strip reflektif, bukan set taktis generik. |
| bisma.1.1.1 | Pendek modern gelap; sawo matang | Polisi + celana polisi, formal | Wajah ramah, tanpa topi atau pin pangkat pimpinan. |
| Faris | Crew cut cokelat; hangat | Polisi + celana polisi, bot dan topi | Patroli ramping, berbeda dari dua pimpinan. |
| aulia.talita2 | Lurus panjang cokelat; terang | Fitted blouse + A-line skirt, sneaker; rose | Feminin sehari-hari, perhiasan kecil, wajah ramah. |
| ranriany20 | Pendek gelap; sawo matang | Jaket lapangan + cargo, topi dan bot | Hansip hijau, bukan seragam polisi. |
| resa | Pendek beruban; sawo matang | Kemeja + celana regular, sepatu sederhana; cream | Pak RT berisi berpeci dan berkacamata. |
| frnsisc44 | Bob lembut gelap; terang | Jas lab + celana putih, sepatu tertutup | Forensik perempuan; pelindung adegan pemeriksaan masih terpisah. |
| eqa | Bob lembut cokelat; hangat | Blazer kantor + A-line skirt; teal | Kepala sekolah perempuan berisi, kacamata dan pin. |
| tio | Pendek modern cokelat; hangat | Blazer kantor, fitted; teal | CEO ramping dengan garis pakaian bersih. |
| damy's | Ponytail panjang cokelat; hangat | Fitted blouse + jeans regular, sneaker; cream | Warga sehari-hari; berbeda dari Aulia yang berrok. |
| Muhammad Hatta | Pendek beruban; hangat | PNS + celana PNS, sepatu formal | Kepala sekolah berisi, peci dan kacamata. |
| Faras | Pendek modern gelap; sawo matang | Kemeja + celana relaxed; cream | Pemilik sembako, pakaian kerja sederhana tanpa rompi pejabat. |
| sheena | Kepang gelap; hangat | Polisi + celana polisi, formal | Perempuan ramping, bentuk wajah dan rambut berbeda dari Zizi. |
| SANKIBOYy | Pendek modern gelap; cokelat | PNS + celana PNS, formal | Bupati ideal berpeci, tanpa kacamata. |

## Pipeline yang dapat diulang

Jalankan dari `C:\xampp\htdocs\project` dengan Node/dependency `npm` proyek, Python dengan Pillow/NumPy/imageio-ffmpeg, dan Blender 4.5 LTS. Keenam sumber `avatar.blend` V15 serta sumber anatomi sebelumnya harus tersedia: ini perluasan kosmetik model yang sudah ada. Perintah di bawah adalah urutan reproduksi, bukan pernyataan bahwa semua tahap sudah selesai. Lanjutkan ke tahap berikutnya hanya setelah perintah sebelumnya selesai dengan exit code `0`.

Path Blender yang dipakai pada lingkungan ini:

```powershell
Set-Location 'C:\xampp\htdocs\project'
$avatarBlender = 'C:\tmp\semesta-blender-tar\blender-4.5.15-windows-x64\blender.exe'
$citizenProfiles = 'female-slim,female-balanced,female-heavy,male-slim,male-balanced,male-heavy'
$priorityCitizens = 'v15-warga-angel,v15-warga-naraevelync,v15-warga-livia,v15-warga-aca,v15-warga-reva,v15-warga-sy4-iii,v15-warga-jojo,v15-warga-aulia-talita2'
$closeupCitizens = 'v15-warga-aca,v15-warga-angel,v15-warga-asila,v15-warga-aulia-talita2,v15-warga-cecil,v15-warga-dd,v15-warga-demian,v15-warga-frnsisc44,v15-warga-jojo,v15-warga-livia,v15-warga-naraevelync,v15-warga-reva,v15-warga-sheena,v15-warga-sy4-iii,v15-warga-zizi'
```

1. Siapkan sumber grafis, bangun enam profil, lalu kemas aset yang dimuat game. `extend_avatar_v15_citizens.py` membandingkan tulang/rest pose dan hash kurva animasi sebelum/sesudah perubahan, menyimpan `citizen-art-build.json`, serta menyimpan cadangan pertama ke `C:/tmp/republik-citizens-before-art-revision`. `--profiles` wajib diberikan untuk rebuild seluruh profil; default script hanya `female-balanced`.

```powershell
python tools/fetch_citizen_beauty_assets.py
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/extend_avatar_v15_citizens.py -- --profiles $citizenProfiles
python tools/package_avatar_v15_runtime.py
```

Packaging menyalin GLB ke `public/models/characters/v15/`, membuat glTF/tekstur bersama bernama hash, dan memperbarui `game-src/avatar-v15-runtime-manifest.json`. Jangan mengubah manifest secara manual atau mengambil potret sebelum ekspor profil yang bersangkutan selesai.

Setelah satu build lengkap tersimpan, perbaikan pakaian dapat membangun ulang hanya modul yang berubah. Contoh berikut memperbarui fashion dan professions pada tiga profil pria tanpa mengulang beauty; `--parts` menerima `beauty`, `fashion`, `professions` dalam urutan eksekusi yang ditulis. Script menolak rebuild sebagian bila belum ada laporan build lengkap. Setelahnya tetap ulangi packaging, tes, potret yang terdampak dan build frontend.

```powershell
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/extend_avatar_v15_citizens.py -- --profiles male-slim,male-balanced,male-heavy --parts fashion,professions
```

`--threads 4` membatasi thread Blender pada perintah build/render di sini. Opsi lama `--fashion-only` masih menjadi alias `--parts fashion`; untuk revisi gabungan gunakan `--parts`.

2. Jalankan pemeriksaan aset dan integrasi. Apache/XAMPP harus melayani `http://localhost/project`; uji integrasi memuat runtime melalui HTTP dan memakai `C:/xampp/php/php.exe` untuk membandingkan validator PHP dengan JavaScript.

```powershell
node tools/test_avatar_v15.mjs
node tools/test_avatar_v15_wardrobe.mjs
node tools/test_avatar_v15_integration.mjs
npm run test:citizens
npm run test:production
```

Uji warga memeriksa 48 identitas, ketersediaan mesh pilihan, coverage kaki/atasan, warna profesi, isolasi tint dan aksesori rig. Regresi khusus memastikan semua primitive kain/manset satu pakaian ikut hilang saat berganti pakaian; metadata pada parent Group glTF tidak boleh membuat celana lama terus terlihat. Uji wardrobe mempertahankan pengukuran celana dan memeriksa tiga rok sebagai shell tersambung beserta kulit kaki di bawah hem. Ini pemeriksaan numerik, bukan penilaian artistik.

Untuk prototipe satu profil sebelum packaging, tersedia `node tools/test_citizen_roster.mjs --source-assets --profile=female-balanced` dan `node tools/test_avatar_v15_wardrobe.mjs female-balanced`. `--data-only` memeriksa konfigurasi saja; hasilnya tidak berarti GLB atau gambar sudah benar.

3. Render seluruh 84 preset, 19 pilihan bawahan, tujuh morph wajah, serta 15 close-up warga termasuk delapan perempuan prioritas. Potret utama masuk ke `ilustrasi/avatar-v2/farmer-v15-proportions/presets/`; renderer membaca GLB, pilihan katalog dan descriptor aksesori yang sama dengan runtime.

```powershell
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --samples 16
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --bottoms --samples 16
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --faces --samples 16
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --ids $closeupCitizens --face --angle 0.55 --samples 16
```

Gunakan folder terpisah untuk pemeriksaan sudut dan pose agar potret utama tidak tertimpa. Contoh berikut menghasilkan satu sudut tiga-perempat dan satu sampel langkah, bukan video satu siklus gerak:

```powershell
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --ids $priorityCitizens --angle 0.55 --samples 16 --output-dir C:/tmp/republik-citizen-review/three-quarter
& $avatarBlender --background --threads 4 --python-exit-code 1 --python tools/render_avatar_v15_presets.py -- --ids $priorityCitizens --clip Walk --frame 6 --samples 16 --output-dir C:/tmp/republik-citizen-review/walk
```

Sudut `1.6` dipakai untuk samping, `3.1` untuk belakang. `--clip Run --frame <angka>` memberi sampel lari; periksa beberapa frame sesuai klip. Nama file mencatat clip/frame, tetapi sudut kurang dari `1` tidak menambah suffix, sehingga `--output-dir` penting untuk beberapa sudut depan. Nama warga ditambahkan pada galeri/lembar kontak; PNG potret mentah tidak memiliki label nama.

4. Setelah gambar ditinjau, buat halaman/lembar kontak bernama, salin potret ke aset publik, build frontend, lalu periksa distribusi HTTP. `package_avatar_v15_release.py` membutuhkan hasil tes integrasi/runtime dan semua potret utama, bawahan serta wajah dari langkah sebelumnya.

```powershell
python tools/package_avatar_v15_release.py
python tools/package_citizen_gallery.py
npm run build
python tools/verify_avatar_v15_release.py
```

Galeri berada di `ilustrasi/avatar-v2/farmer-v15-proportions/warga-gelombang-1.html`; empat lembar kontak bernama berada di folder yang sama. Build menyalin aset publik ke `assets/game/`. Verifikasi rilis membandingkan hash sumber/public/build, memeriksa referensi manifest dan potret serta respons HTTP. `npm run build` menjalankan pencatatan build lokal; urutan ini tidak menjalankan git commit atau push.

**Batas verifikasi:** pemeriksaan yang tersedia pada pekerjaan ini adalah render offline Blender, pengujian Node/PHP dan validasi HTTP lokal. Review interaktif browser/WebGL, pengukuran GPU/FPS dan review video/mix penuh belum dilakukan. Kelulusan tes tidak membuktikan semua kombinasi bebas clipping, kualitas seluruh frame gerak, atau performa perangkat pengguna; hasil visual yang benar-benar ditinjau disebutkan di bawah.

## Gerbang kualitas dan status

1. Render depan, tiga-perempat, samping dan belakang untuk perempuan prioritas; sertakan wajah dekat. Rambut panjang harus terbaca dari depan, bukan hanya ekor di belakang.
2. Bandingkan karakter tanpa warna/aksesori untuk melihat apakah siluet, fitur wajah dan potongan pakaian benar-benar berbeda.
3. Periksa pinggang, bahu, selangkangan, hem, dada, lutut dan sambungan rambut. Tidak ada kain menempel seperti cat, kantong seperti balok atau rambut seperti papan.
4. Periksa semua profil tubuh saat Idle/Walk/Run dan pose akting yang dipakai; rok, rambut, jas dan seragam tidak boleh tembus badan.
5. Cocokkan warna render dengan sasaran cream/rose/burgundy/midnight/teal/violet. Jangan mengubah dokumentasi menjadi pujian hasil yang belum terlihat.
6. Nama tampil pada kartu dan scene, termasuk nama panjang; 48 identitas tetap unik, DD hanya satu. Tampilan memakai simbol republik rekaan.
7. Uji konfigurasi, ekspor, fitting dan build lokal setelah katalog/model selesai. Tes data belum membuktikan kualitas artistik atau FPS browser.

### Hasil QA offline setelah perbaikan

- Enam profil GLB sumber dan paket runtime telah diperbarui. Total keluaran meliputi 84 potret preset, 19 pilihan bawahan, tujuh morph wajah dan 15 close-up. Dari keluaran tersebut, 25 potret tubuh dan enam close-up terdampak dirender ulang setelah perbaikan terakhir.
- Empat lembar kontak final yang mencakup seluruh 48 warga dan lembar 15 close-up final telah ditinjau dan lulus review offline. Tim juga telah melakukan review terpisah terhadap 21 karakter perempuan. Metadata desain ditetapkan menjadi `offline_portraits_reviewed`; status ini tidak menyatakan pengujian browser atau seluruh frame gerak.
- Temuan clipping lengan pakaian pria sudah ditutup pada sampel yang diperiksa. Climenzo dan Atha memakai GLB final serta lolos review pose `Run`, frame 6. Pemeriksaan ini membuktikan hasil pada pose tersebut, bukan seluruh kombinasi pakaian/animasi.
- Temuan tonjolan tajam pada kerah seragam sudah ditutup. Area leher polisi dan Cecil bersih pada bukti render/GLB yang ditinjau. Audit shoulder tab DD mencatat jarak maksimum **7,5 mm**; bentuk tajam lama tidak tampak pada review akhir. Angka ini khusus bagian yang diaudit, bukan ukuran kelonggaran seluruh pakaian.
- Setelah fix, `node tools/test_avatar_v15.mjs` untuk enam profil, tes wardrobe, integrasi, `npm run test:citizens` dan `npm run test:production` telah dijalankan ulang; semuanya selesai dengan **exit code 0**.
- Pemeriksaan manifest sumber menghasilkan **43/43 hash cocok**: 36 berkas sumber dan tujuh turunan. Pemeriksaan ini juga diulang dan lulus dalam verifikasi rilis akhir.
- Pada **22 November 2026**, `npm run build` dan `python tools/verify_avatar_v15_release.py` selesai dengan **exit code 0**. Hash enam profil cocok antara sumber/public/build; 84 potret cocok; 40 berkas runtime lolos pemeriksaan hash konten dan HTTP 200; 43 hash sumber/turunan serta 48 nama galeri terverifikasi. Bundle memuat revisi `v15-citizens-2-art`.

**Status distribusi:** build dan verifikasi rilis lokal selesai; bukti tersimpan pada [release-check.json](../../ilustrasi/avatar-v2/farmer-v15-proportions/release-check.json). Laporan tetap mencatat `browserInteractionVerified: false` dan `gpuFPSMeasured: false`. Review interaktif browser/WebGL, pengukuran GPU/FPS dan review video/mix penuh belum dilakukan. Revisi karakter ini tidak menghasilkan audio, episode baru, atau pembangunan kota; tidak ada git commit/push dalam pekerjaan ini.
