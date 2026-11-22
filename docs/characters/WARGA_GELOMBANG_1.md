# Warga Gelombang 1 — lembar karakter revisi 2

Revisi desain: **`warga-style-2`**. Rujukan produksi: [Prompt Acuan Produksi Konten](../PROMPT_ACUAN_PRODUKSI_KONTEN.md). Hasil audit, referensi primer dan keputusan seluruh 48 desain tersedia pada [Riset Revisi Warga](RISET_REVISI_WARGA.md).

Sumber data game/Studio: [citizen-roster.json](../../game-src/citizen-roster.json). Pilihan penampilan: [avatar-v15-presets.json](../../game-src/avatar-v15-presets.json).

## Status revisi

Enam profil GLB dan paket runtime sudah diperbarui; **84 potret preset, 19 pilihan bawahan, tujuh morph wajah dan 15 close-up** sudah dirender. Setelah perbaikan terakhir, 25 potret tubuh dan enam close-up yang terdampak dirender ulang. Empat lembar kontak berisi seluruh 48 warga dan lembar 15 close-up final telah ditinjau dan lulus review offline. Sebelumnya, 21 karakter perempuan juga ditinjau secara terpisah.

Dua temuan terakhir sudah ditutup pada hasil yang diperiksa: clipping lengan pakaian pria dan tonjolan tajam kerah seragam. Climenzo dan Atha lolos pemeriksaan GLB final pada pose `Run`, frame 6; area leher polisi dan Cecil bersih pada bukti render/GLB yang ditinjau. Rincian cakupan dan audit shoulder tab DD dicatat pada [hasil QA](RISET_REVISI_WARGA.md#hasil-qa-offline-setelah-perbaikan).

Tes runtime enam profil, wardrobe, integrasi, `test:citizens` dan `test:production` sudah **diulang setelah fix dan semuanya selesai dengan exit code 0**. Metadata desain kini `offline_portraits_reviewed`. Review tersebut memakai Blender offline, Node/PHP dan HTTP lokal; review interaktif browser/WebGL, pengukuran GPU/FPS dan review video/mix penuh belum dilakukan.

**Build dan verifikasi rilis lokal selesai pada 22 November 2026.** `npm run build` dan `python tools/verify_avatar_v15_release.py` selesai dengan exit code 0. Hash enam profil cocok antara sumber, public dan build; 84 potret, 40 berkas runtime beserta HTTP 200, 43 hash sumber/turunan dan 48 nama galeri terverifikasi. Bundle memuat revisi `v15-citizens-2-art`. [Laporan rilis](../../ilustrasi/avatar-v2/farmer-v15-proportions/release-check.json) tetap mencatat `browserInteractionVerified: false` dan `gpuFPSMeasured: false`.

Revisi menambahkan rambut panjang yang utuh, busana perempuan dewasa, rok, heels, jas lab, seragam pilot, operator, damkar dan racing suit. Uraian berikut memuat pilihan desain serta koreksi yang terlihat pada potret; jumlah variasi atau nama palet saja bukan bukti kualitas hasil.

## Cakupan dan keputusan identitas

- Masukan berisi **49 entri, menjadi 48 warga unik**. DD polisi dan DD Kapolri digabung sementara dengan permintaan terakhir Kapolri; bila ternyata dua orang berbeda, identitas dapat dipisah tanpa mengubah warga lain.
- Ada **48 preset warga**, total katalog **84 preset** bersama 36 preset sebelumnya. Identitas Pasca Bowow, Sari dan Joko tidak diubah oleh kurasi ini.
- Nama akun dipertahankan, termasuk kapitalisasi, titik, apostrof dan underscore; backslash untuk escape underscore tidak menjadi bagian nama.
- Semua merupakan **karakter dewasa fiktif** berdasarkan nama/usulan peran. Wajah bukan rekonstruksi orang asli; jabatan bukan pengangkatan resmi atau bukti pekerjaan pribadi.
- **Nama harus terlihat saat karakter ditampilkan** pada kartu, potret, pemilih dan scene. Pada kelompok, pecah framing/atur label agar nama terbaca tanpa menutup wajah atau aksi; jangan hanya menampilkan profesi.
- Hanya Zizi tercatat belum follow dari masukan pengguna; status warga lain belum diketahui. Tidak ada pemeriksaan akun media sosial.
- Gender Arsen, Faikal dan Nopal belum disebutkan. Visual pria sementara tetap ditandai `unspecified_provisional_visual`; rancangan tidak menetapkan identitas orang asli.
- Asila ingin menjadi presiden; Pasca Bowow belum diganti. Angel dan naraevelync sama-sama berminat menjadi akuntan/sespri; pembagian posisi belum diputuskan.
- Dua peminat bupati (wkwk/SANKIBOYy) dan kepala sekolah (eqa/Muhammad Hatta) belum mendapat pembagian wilayah/sekolah. Nama Muhammad Hatta tidak otomatis dikaitkan dengan tokoh sejarah.
- Sumbangan 5 T climenzo_jr adalah keterangan cerita dari pengguna, bukan transaksi terverifikasi. Hubungan resa dengan kucing Day 1 belum ditetapkan.
- Pii direka sebagai JOMOKERS: Jomblo Motor Keliling Republik, klub motor-komedi; bukan definisi slang atau dugaan orientasi pribadi. Reva ditafsirkan sebagai penghibur panggung.

## Bahasa visual yang dipilih

Setiap racikan dikurasi, bukan diacak. Brief terbaru untuk perempuan yang diminta cantik/sespri diterapkan lewat kulit terang/hangat terang, rambut panjang, wajah yang ditata dan pakaian feminin dewasa. Angel, Nara, Reva, Sy4, Jojo, Aulia, Livia dan Aca mempunyai tujuan gaya berbeda; pilihan kulit ini adalah keputusan karakter sesuai brief, bukan klaim penampilan asli atau ukuran kecantikan universal.

Profil ramping, ideal dan berisi tetap dipertahankan. Bentuk bahu, pinggang, pinggul dan jatuh kain harus diperiksa bersama, bukan hanya mengganti warna. Tokoh satu profesi dibedakan melalui wajah, rambut, proporsi, detail pakaian dan gestur.

| Profil | Jumlah |
|---|---:|
| Pria ramping | 7 |
| Pria ideal | 9 |
| Pria berisi | 11 |
| Perempuan ramping | 7 |
| Perempuan ideal | 9 |
| Perempuan berisi | 5 |

Warna kulit konfigurasi: warm 20, brown 3, light 13, tan 12. Potret sudah ditinjau pada tahap offline; pencahayaan set produksi dan tampilan browser tetap perlu pemeriksaan saat dipakai pada adegan.

Enam atribut tambahan tetap tersedia: hardhat, helm damkar, stetoskop, headset, pin republik dan bros palet. Pin dihapus dari satin/panggung/balap bila tidak membantu desain. Seragam menggunakan identitas republik rekaan. Gitar Jojo tetap properti produksi yang mengikuti sistem gitar Joko.

Kostum yang belum dibuat tidak boleh disamarkan lewat nama: Dinda memakai busana formal pengenalan, **belum toga**; kasir belum mempunyai apron khusus; pelindung adegan forensik masih perlu sesuai aktivitas. Model damkar/balap/operator adalah aset visual cerita, bukan perlengkapan keselamatan bersertifikat.

## Desain setiap warga

Kolom di bawah mengikuti konfigurasi revisi 2. Awalan “Rancangan” menandai brief karakter; penutupan QA keseluruhan tetap mengikuti status di atas. Deskripsi warna Demian dikoreksi berdasarkan gambar aktual.

| Nama yang tampil | Peran cerita | Profil | Desain dan pembeda |
|---|---|---|---|
| **demian** | Pelawak | Pria berisi | Komedian dewasa berisi: rambut pendek modern cokelat, wajah bulat, kemeja burgundy dan rompi arang dengan celana santai; kombinasi warna ini terlihat pada potret yang ditinjau. |
| **zizi** | Polisi | Perempuan ideal | Rancangan polisi perempuan dengan rambut ponytail panjang, kemeja cokelat dan celana cokelat gelap yang ditailor; tanpa topi agar wajah terbaca, jam tangan serta anting kecil. |
| **arsen** | Pengusaha sawit | Pria berisi (sementara) | Rancangan pengusaha kebun berisi: kulit cokelat, topi lebar, jaket lapangan hijau, cargo dan bot; siluet kerja lapangan dipertahankan. |
| **asila** | Calon presiden warga | Perempuan ideal | Rancangan calon pemimpin perempuan dewasa: kulit terang, rambut panjang lurus cokelat, blazer cream berpinggang dengan celana tailored dan heels; pin republik, bukan safari presiden. |
| **DD** | Kapolri | Pria berisi | Rancangan pimpinan polisi rekaan berisi: rambut cepak, wajah persegi, kemeja cokelat dan celana lebih gelap dengan epaulette serta pin republik; tanpa menyalin pangkat asli. |
| **cecil** | Dokter | Perempuan ramping | Rancangan dokter perempuan ramping: kulit terang, ponytail panjang rapi, jas laboratorium di atas pakaian medis, celana putih dan sepatu tertutup; stetoskop serta kacamata kecil. |
| **veysha** | Profesor | Perempuan berisi | Rancangan profesor perempuan berisi: bob lembut cokelat, kacamata bulat, blazer teal dan celana straight; kesan akademik melalui potongan rapi, bukan rompi pria yang diperpanjang. |
| **azril_zeroeight** | Anggota DPR | Pria ramping | Rancangan anggota dewan rekaan ramping: blazer formal midnight, celana tailored, peci dan kacamata; berbeda dari seragam khaki pegawai. |
| **climenzo_jr** | Pengusaha; donatur cerita | Pria berisi | Rancangan pengusaha berisi berpenampilan mapan: rambut pendek modern cokelat, blazer burgundy, celana tailored, sepatu formal dan jam tangan; cerita sumbangan tetap masukan pengguna. |
| **aku.ardhyy** | Operator excavator | Pria ideal | Rancangan operator excavator: helm konstruksi, rompi keselamatan oranye berstrip reflektif di atas lengan arang, cargo dan bot kerja; wajah sawo matang, profil ideal. |
| **angel** | Akuntan; calon sespri presiden | Perempuan ideal | Rancangan sespri dewasa elegan: kulit terang hangat, wajah oval lembut, rambut lurus panjang cokelat, blazer cream berpinggang, rok pensil dan heels; pin kecil serta jam tipis. |
| **4ku_fek.smail** | Kasir Koplak Desa | Pria ramping | Rancangan kasir Koplak Desa ramping: rambut pendek modern, atasan linen beraksen teal, celana regular dan sneaker; pakaian sederhana yang mudah bergerak, belum apron khusus. |
| **tazinho.cc** | Wakapolri | Pria ideal | Rancangan wakil pimpinan polisi: profil ideal, wajah memanjang, rambut modern rapi dan kacamata; kemeja cokelat, celana gelap serta bot membedakannya dari DD. |
| **naraevelync** | Akuntan; calon sespri presiden | Perempuan ramping | Rancangan sespri dewasa glamor: kulit terang netral, wajah lebih panjang, rambut panjang bergelombang cokelat, atasan satin midnight, rok pensil dan heels; berbeda dari blazer Angel. |
| **fale** | Mekanik; pembalap mobil | Pria ramping | Rancangan pembalap sekaligus mekanik: racing suit grafit-merah-putih dengan kerah, manset dan panel; tanpa kantong cargo besar atau sabuk kulit. Pakaian bengkel dapat menjadi racikan adegan berikutnya. |
| **faikal** | Tentara | Pria ideal (sementara) | Rancangan prajurit lapangan: crew cut, seragam loreng berpotongan rapi, celana loreng dan bot; visual pria ideal sementara karena gender belum disebutkan. |
| **sheaza** | Kreator konten | Perempuan ideal | Rancangan kreator perempuan dewasa: ponytail panjang auburn, atasan violet modern, denim regular, sneaker dan headset; busana kasual yang berbeda dari seragam. |
| **wkwk** | Bupati | Pria berisi | Rancangan bupati rekaan berisi: peci, kacamata bulat dan set khaki tailored; wajah serta arah akting membedakannya dari SANKIBOYy. |
| **livia** | Pelukis | Perempuan ramping | Rancangan pelukis imut dewasa: kulit terang, wajah bulat lembut, kepang panjang cokelat, blouse rose dan rok A-line dengan sepatu rendah; bros palet menjadi aksen seni. |
| **zine** | Pelukis | Perempuan berisi | Rancangan pelukis perempuan berisi: kepang gelap, blouse teal dan celana wide-leg yang jatuh rapi; bros palet, siluet berbeda dari Livia yang berrok. |
| **aca** | Camat | Perempuan ideal | Rancangan camat perempuan dewasa: kulit terang, ponytail panjang cokelat, kemeja dinas khaki berpinggang dan rok pensil, heels serta pin; sifat agak melamun hadir lewat jeda akting. |
| **Qiyya** | Guru PAUD | Perempuan berisi | Rancangan guru PAUD dewasa berisi: kepang cokelat, kacamata, blouse rose dan rok A-line dengan sneaker; pakaian hangat, praktis dan mudah bergerak. |
| **Dinda** | Hakim | Perempuan ideal | Rancangan hakim perempuan dengan rambut panjang rapi: blazer midnight, rok pensil dan sepatu formal, kacamata persegi serta pin; busana pengenalan formal, belum toga pengadilan. |
| **Ell** | Pilot | Pria ideal | Rancangan pilot: kemeja penerbangan dengan emblem sayap rekaan, epaulette dan celana navy, sepatu formal serta headset; rambut pendek modern dan wajah memanjang. |
| **caramella** | Kasir pet shop | Perempuan ramping | Rancangan kasir pet shop perempuan ramping: ponytail panjang cokelat, blouse teal, celana regular dan sneaker; pakaian praktis, belum apron pet shop khusus. |
| **nopal** | Pemain esports | Pria ramping (sementara) | Rancangan pemain esports ramping: rambut pendek modern cokelat, atasan kasual midnight, jeans slim, sneaker dan headset; visual pria sementara karena gender belum disebutkan. |
| **Znou** | Dokter; mengaku paling hebat | Pria berisi | Rancangan dokter berisi: rambut pendek modern, kacamata, jas laboratorium dan celana putih dengan stetoskop; wajah dan proporsi dibedakan dari Cecil. |
| **Reva** | Penghibur panggung | Perempuan berisi | Rancangan entertainer perempuan dewasa berisi: kulit terang, gelombang rambut panjang auburn, satin burgundy dan rok pensil dengan heels; garis pinggang jelas dan perhiasan panggung. |
| **Xel** | Mandor | Pria berisi | Rancangan mandor berisi: wajah persegi, kulit cokelat, helm proyek dan rompi keselamatan di atas pakaian kerja; cargo serta bot, berbeda dari operator berprofil ideal. |
| **Sy4_iii** | Idol; penyanyi | Perempuan ramping | Rancangan idol perempuan dewasa: kulit terang, ponytail panjang auburn, jaket panggung violet dengan inner, rok mini, heels dan aksesori kecil; bukan seragam sekolah. |
| **avdzib** | Panglima pasukan republik | Pria berisi | Rancangan panglima pasukan rekaan berisi: crew cut, kacamata, loreng dengan potongan lapangan dan bot; pin republik fiktif, berbeda dari Faikal. |
| **pii** | Penggerak JOMOKERS; klub motor-komedi | Pria ramping | Rancangan anggota klub motor-komedi rekaan: rambut pendek modern, rompi midnight di atas atasan kasual, denim regular dan bot; anting serta gelang, tanpa dugaan identitas pribadi. |
| **jojo** | Musisi | Perempuan ideal | Rancangan rockstar perempuan dewasa: kulit terang, rambut gelap panjang bergelombang, stage top midnight, jeans slim dan bot; gitar merah produksi di punggung menjadi pembeda dari Sy4 dan Joko. |
| **Atha** | CEO Pertamini | Pria ideal | Rancangan CEO Pertamini: rambut pendek modern cokelat, blazer cream dengan celana tailored, sepatu formal dan jam tangan; profil ideal, gaya smart casual. |
| **ammarhddhhjj3** | Petugas damkar | Pria ideal | Rancangan petugas damkar: helm merah, jaket dan celana damkar dengan strip reflektif, bot kerja; pakaian profesi diperjelas tanpa klaim sertifikasi perlindungan. |
| **bisma.1.1.1** | Polisi pelayanan warga | Pria ideal | Rancangan polisi pelayanan warga: rambut pendek modern, wajah ramah, kemeja cokelat dan celana gelap serta sepatu formal; tanpa topi atau pin pimpinan. |
| **Faris** | Polisi patroli | Pria ramping | Rancangan polisi patroli ramping: topi kain, kemeja cokelat, celana lebih gelap dan bot; siluet lebih ringan daripada DD atau Bisma. |
| **aulia.talita2** | Warga | Perempuan ideal | Rancangan warga perempuan dewasa yang feminin sehari-hari: kulit terang, rambut panjang lurus cokelat, blouse rose, rok A-line dan sneaker; wajah hangat, perhiasan sederhana. |
| **ranriany20** | Hansip; petugas pos ronda | Pria berisi | Rancangan hansip berisi: topi kain, jaket hijau lapangan, cargo dan bot; penampilan ronda dibedakan dari seragam polisi cokelat. |
| **resa** | Pak RT | Pria berisi | Rancangan Pak RT berisi: rambut beruban di bawah peci, kacamata dan kemeja cream, celana regular serta sepatu sederhana; terlihat seperti tetangga yang mudah didekati. |
| **frnsisc44** | Dokter forensik | Perempuan ramping | Rancangan dokter forensik perempuan ramping: bob lembut gelap, kacamata persegi, jas laboratorium dan celana putih; perlengkapan pemeriksaan khusus tetap menyesuaikan adegan. |
| **eqa** | Kepala sekolah | Perempuan berisi | Rancangan kepala sekolah perempuan berisi: bob lembut cokelat, kacamata, blazer teal dan rok A-line; penampilan profesional yang berbeda dari PNS pria. |
| **tio** | CEO muda | Pria ramping | Rancangan CEO muda ramping: rambut pendek modern cokelat, blazer teal dan celana tailored, sepatu formal serta jam tangan; siluet bersih tanpa rompi panjang. |
| **damy's** | Warga | Perempuan ideal | Rancangan warga perempuan sehari-hari: ponytail panjang cokelat, blouse cream, denim regular dan sneaker; berbeda dari Aulia yang memakai rok. |
| **Muhammad Hatta** | Kepala sekolah | Pria berisi | Rancangan kepala sekolah berisi: rambut beruban, peci, kacamata bulat dan set khaki rapi; nama warga dipertahankan tanpa mengaitkan identitas dengan tokoh sejarah. |
| **Faras** | Pemilik toko sembako | Pria ideal | Rancangan pemilik toko sembako: rambut pendek modern gelap, kemeja cream dan celana relaxed, sepatu sederhana; tanpa rompi pejabat agar terasa dekat dengan aktivitas toko. |
| **sheena** | Polisi | Perempuan ramping | Rancangan polisi perempuan ramping: kepang panjang gelap, kemeja cokelat dan celana gelap tailored; bentuk wajah serta rambut dibedakan dari Zizi. |
| **SANKIBOYy** | Bupati | Pria ideal | Rancangan bupati rekaan berprofil ideal: peci, kulit cokelat dan set khaki rapi; tanpa kacamata, berbeda dari bupati wkwk. |

## Akting dan watak awal

Watak adalah titik awal penulisan, bukan fakta tentang pemilik akun atau hasil pemilihan warga. Suara baru, dialog dan hubungan antartokoh belum diproduksi oleh revisi penampilan ini.

| Nama | Arah akting/kepribadian |
|---|---|
| **demian** | Suka mengamati lalu menyelipkan satu kalimat kering; tawa datang setelah ia menunggu reaksi. |
| **zizi** | Sigap mengatur antrean, lalu kikuk saat syarat follow miliknya sendiri diperiksa. |
| **arsen** | Membicarakan semua rencana dengan ukuran lahan; pandai tawar-menawar tetapi ingin dihitung dengan jelas. |
| **asila** | Ambisius dan berani menyela dengan solusi; belum memegang jabatan presiden. |
| **DD** | Bicara singkat dan mantap; gemar membentuk struktur sebelum tahu jumlah personelnya. |
| **cecil** | Teliti, menenangkan pasien, dan lebih peduli tempat cuci tangan daripada pita peresmian. |
| **veysha** | Selalu meminta definisi sebelum menjawab, lalu menjelaskan hal rumit lewat contoh sederhana. |
| **azril_zeroeight** | Terampil membuat kalimat resmi, tetapi mulai belajar mendengar pertanyaan warga sampai selesai. |
| **climenzo_jr** | Tenang saat menyebut angka besar; ingin melihat rincian penggunaan sumbangan cerita 5 T. |
| **aku.ardhyy** | Praktis dan sabar; selalu menanyakan titik galian sebelum mesin dinyalakan. |
| **angel** | Ramah tetapi tajam pada angka; menawarkan diri menjadi sespri tanpa menganggap posisi sudah diberikan. |
| **4ku_fek.smail** | Hafal kembalian tetapi selalu meminta kas awal; antrean baginya harus punya urutan. |
| **tazinho.cc** | Menyiapkan rencana rinci dan mengingatkan atasan dengan kalimat sangat sopan. |
| **naraevelync** | Teratur dan tenang; membawa daftar jadwal serta mengoreksi anggaran dengan humor tipis. |
| **fale** | Menguji solusi dengan tangan sendiri; suka adu cepat tetapi teliti sebelum berangkat. |
| **faikal** | Disiplin dan suka membantu pekerjaan berat; menunggu instruksi yang benar-benar jelas. |
| **sheaza** | Selalu mencari sudut cerita, tetapi mau menurunkan kamera ketika orang perlu dibantu. |
| **wkwk** | Suka menyambut warga dengan pidato yang terlalu panjang, lalu tertawa saat diingatkan. |
| **livia** | Peka pada detail kecil; senang menawarkan sketsa papan nama untuk orang yang baru datang. |
| **zine** | Lebih suka mural besar daripada potret; bicara seperlunya lalu menunjukkan gambar. |
| **aca** | Kadang tertinggal satu detik saat rapat, lalu justru menemukan pertanyaan yang luput dari semua orang. |
| **Qiyya** | Sabar, jelas saat menerangkan, dan mampu menenangkan rapat orang dewasa seperti kelas kecil. |
| **Dinda** | Mendengar dua sisi sebelum memutuskan; humor muncul dari pertanyaan pendek yang membongkar alasan berputar-putar. |
| **Ell** | Tenang membaca prosedur; kebiasaan memberi pengumuman terbawa ke antrean warga. |
| **caramella** | Mengenali kebiasaan ayam dan kucing lebih cepat daripada menghafal nama pejabat. |
| **nopal** | Cepat membaca situasi dan sering memakai istilah strategi, tetapi mau menjelaskannya ke warga lain. |
| **Znou** | Percaya diri mengaku paling hebat; tetap harus membuktikan kerja sama dan ketelitian di dalam cerita. |
| **Reva** | Hangat membangkitkan suasana dan pandai membaca penonton; profesi ditafsirkan sebagai entertainer panggung. |
| **Xel** | Tegas soal urutan kerja dan keselamatan, tetapi cepat memberi solusi ketika anggaran seret. |
| **Sy4_iii** | Enerjik saat tampil; di luar panggung justru rajin latihan dan mengajak orang ikut bernyanyi. |
| **avdzib** | Tenang dan berwibawa; menghargai kesiapan logistik lebih daripada barisan untuk foto. |
| **pii** | Pendiri Jomblo Motor Keliling Republik; suka menolong sambil membuat singkatan konyol. Ini istilah rekaan cerita, bukan dugaan orientasi siapa pun. |
| **jojo** | Percaya diri di panggung dan santai saat berbincang; ingin konser punya alasan selain meramaikan peresmian. |
| **Atha** | Antusias menawarkan solusi bahan bakar sambil menghitung apakah warga sudah punya kendaraan. |
| **ammarhddhhjj3** | Cepat bergerak menolong, termasuk saat masalahnya kucing turun pohon dan bukan kebakaran. |
| **bisma.1.1.1** | Menjelaskan prosedur dengan sabar dan membantu warga yang salah mengisi formulir. |
| **Faris** | Sigap berkeliling; perlu belajar tidak meniup peluit untuk setiap hal kecil. |
| **aulia.talita2** | Mengajukan kebutuhan dasar yang sering dilupakan orang berjabatan; hangat dan terus terang. |
| **ranriany20** | Hafal siapa pulang lewat mana; suka mengajak bicara sehingga ronda sering berubah jadi forum warga. |
| **resa** | Merasa mengenal semua keluarga; hubungan dengan kucing kerabat Pak RT Day 1 belum ditetapkan. |
| **frnsisc44** | Cermat membedakan dugaan dan bukti; punchline-nya datang dari observasi yang sangat spesifik. |
| **eqa** | Tegas tetapi adil; memikirkan ruang belajar sebelum papan jabatan kepala sekolah. |
| **tio** | Penuh ide dan presentasi singkat; belajar bahwa rencana perlu diuji oleh orang yang menjalankannya. |
| **damy's** | Ramah menghubungkan warga yang baru kenal dan sering melihat solusi praktis dari pinggir rapat. |
| **Muhammad Hatta** | Teratur dan suka membuat jadwal; nama warga dipertahankan tanpa menyamakan identitas dengan tokoh sejarah. |
| **Faras** | Hafal harga kebutuhan pokok dan selalu menanyakan siapa yang akan membayar pesanan rapat. |
| **sheena** | Tenang mencatat detail, lalu menyampaikan fakta yang membuat rapat kembali fokus. |
| **SANKIBOYy** | Ringkas dan suka target terukur; wilayah jabatan dua bupati belum ditentukan oleh cerita. |

## Kontrak produksi dan pemeriksaan

- Identitas terkunci pada `presetId`. Pergantian baju adegan tidak boleh mengubah nama, wajah, postur atau kulit tanpa keputusan kreatif yang dicatat.
- Perkenalkan warga lewat kegiatan yang relevan: pembangunan, layanan, pendidikan, panggung atau kebutuhan sehari-hari. Jangan menjadikan seluruh roster parade pembacaan nama.
- Tinjau delapan perempuan prioritas dari depan, ¾, samping, belakang dan close-up. Rambut panjang harus terbaca dari depan; tekstur pangkal–ujung menyatu.
- Periksa semua profil dan pakaian baru saat Idle/Walk/Run serta pose akting yang dipakai. Perhatikan bahu, ketiak, pinggang, dada, selangkangan, lutut, hem, rok, rambut dan sepatu.
- Slim/regular/wide/jeans/cargo/rok harus berbeda melalui potongan dan material; tidak ada lipatan besar acak, tubuh menembus baju atau rambut berbentuk papan.
- Uji nama panjang pada frame ponsel. Label identitas menjadi bagian komposit MP4 dan tidak menutup wajah, tangan, gitar, hewan atau subtitle.
- Setelah perbaikan model, ulangi validasi konfigurasi JavaScript/PHP, tes warga/produksi, pemeriksaan rig, render potret terdampak dan build lokal. Hasil lulus sebelum fix tidak otomatis berlaku pada ekspor baru.
- Review video hasil gerak dan mix penuh mengikuti acuan produksi ketika episode dikerjakan. Revisi ini belum menghasilkan audio, episode baru, bangunan kota atau hasil suara warga.

## Membuka dan merawat karakter

- Studio Avatar: `http://localhost/project/admin/?view=avatars`, pilih **Warga gelombang 1**, cari nama/profesi, putar model dan periksa geraknya.
- Produksi: `http://localhost/project/admin/?view=production`; pemilih pemeran menggunakan nama dan peran roster. Identitas Day 1 tetap Pasca Bowow, Sari dan Joko.
- [Galeri potret bernama](../../ilustrasi/avatar-v2/farmer-v15-proportions/warga-gelombang-1.html) perlu dirender/dikemas ulang setelah model atau preset berubah; gambar lama bukan bukti revisi baru sudah muncul.
- `game-src/citizen-accessory-designs.json` menjadi sumber ukuran/warna aksesori untuk runtime Three.js dan renderer Blender.
- Perintah pemeriksaan: `npm run test:citizens`, `node tools/test_avatar_v15_integration.mjs`, dan `npm run test:production` setelah katalog/model lengkap.
- Sesudah render `tools/render_avatar_v15_presets.py`, kemas ulang lewat `python tools/package_citizen_gallery.py` dan `python tools/package_avatar_v15_release.py`, lalu `npm run build`.
- Urutan lengkap, opsi rebuild sebagian dan batas verifikasi tersedia pada [pipeline reproduksi](RISET_REVISI_WARGA.md#pipeline-yang-dapat-diulang).

**Tidak auto-push Git.** Publikasi remote hanya jika pengguna memintanya untuk pekerjaan yang sedang berjalan.

