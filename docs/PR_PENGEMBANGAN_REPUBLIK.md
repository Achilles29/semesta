# PR pengembangan Republik Wkwkwk

**Acuan kelanjutan game sejak 23 November 2026 berada di [roadmap](../roadmap/README.md).** Daftar di bawah menyimpan pemeriksaan produksi/dunia sebelumnya; jumlah shot, durasi dan cue lama bukan sumber konfigurasi runtime. Gunakan script aktif untuk angka terbaru dan handover roadmap untuk perbaikan yang ditarik dari server.

Pembaruan **22 November 2026**, setelah implementasi lokal Jakartawa dan revisi Day 2. Dokumen ini membedakan fitur yang sudah tersedia di pratinjau lokal, pemeriksaan teknis yang dilakukan, penerimaan video yang masih tertunda, serta pekerjaan dunia berikutnya. Implementasi lokal tidak berarti video sudah final atau kemajuan dunia sudah tersimpan global di server.

Acuan konten: [PROMPT_ACUAN_PRODUKSI_KONTEN.md](PROMPT_ACUAN_PRODUKSI_KONTEN.md). Konsep kelanjutan: [Day 2 — Sudah Dibangun, Baru Ditanya](script/002-day-2-concept.md).

## Karakter warga

- [x] Sediakan 48 karakter siap pakai dari daftar pendaftar, dengan nama pada kartu Studio, pratinjau, dan komposit Produksi/MP4.
- [x] Bedakan wajah, rambut, proporsi, pakaian dan aksen antarwarga; profesi sama tidak berarti avatar kembar.
- [x] Satukan DD polisi dan DD Kapolri sementara sebagai satu pendaftar dengan permintaan terakhir, sambil mempertahankan riwayat usulnya.
- [x] Simpan keinginan pekerjaan/jabatan sebagai **permintaan peran**, bukan pengangkatan resmi otomatis.
- [x] Catat status Zizi “belum follow” sesuai masukan pengguna; status warga lain belum diketahui.
- [x] Jenis kelamin yang tidak disebutkan tetap belum diketahui. Rancangan visual adalah pilihan kreatif avatar, bukan profil pribadi terverifikasi.
- [x] Uji pencarian/seleksi warga, identitas, label nama dalam tiga rasio layar, dan aksesori pada rig asli. Review komposit nama secara offline tersimpan di [lembar review](script/day1-character-label-review.jpg).
- [ ] Tinjau interaksi Studio dan kinerja GPU langsung pada browser/perangkat sasaran. Uji DOM, rig CPU dan render Blender tidak menggantikan pemeriksaan ini.

Status teknis karakter harus mengikuti katalog dan pemeriksaan implementasi yang benar-benar selesai. Daftar ini bukan pengganti laporan hasil implementasi.

## Janji Day 1: dua fasilitas dalam episode dan kota

Koplak Desa dan SPPG **sudah diimplementasikan sebagai geometri bertahap dalam Day 2 dan keadaan kota sesudah episode pada pratinjau lokal**. Keduanya masih tapak kosong pada keadaan awal. Penerimaan video penuh belum selesai; pemilihan menu, staf dan tata layanan tetap belum diputuskan warga.

| PR | Implementasi lokal yang tersedia | Pemeriksaan penerimaan yang tetap diperlukan |
|---|---|---|
| **Koplak Desa** | Gerai koperasi mengikuti referensi fasad Pacul dan interior Kediri; patok, galian, fondasi, dinding, atap, finishing, rak dan kasir tersedia dalam set episode. Geometri yang sama dipakai pada fase kota sesudah Day 2; akses pintu dan benturan interior tersedia. | Tinjau proporsi, bukaan, kanopi, warna dan skala terhadap foto primer; periksa seluruh proses kerja, tangan dan keterbacaan papan/nama dalam MP4 serta browser sasaran. |
| **SPPG — Satuan Pengisi Perut Gratis** | Dapur produksi mengikuti fasad Tanuharjo dan referensi interior BGN; tahap konstruksi, atap pelana, kanopi, papan rendah, meja stainless serta ruang kerja tersedia. Pintu dapat dilalui pada dunia jelajah sesudah Day 2. | Tinjau kemiripan fasad/interior, framing dapur, operator/pekerja dan jalur layanan pada video penuh; jangan mengklaim menu/pengelola sudah dipilih tanpa keputusan. |

Day 2 aktif mempunyai **28 shot, 49 avatar manusia dan durasi terukur 110,541 detik**. Seluruh 48 warga berkumpul; empat suara tuntutan saling bertumpuk. Serah terima simbolis 5 T berlangsung sambil donor maju. Pasca mengklaim kredit, menepis koreksi dan memaksakan dua proyek; pembangunan berlanjut sampai peresmian. Rumah warga tetap fondasi. Baru sesudahnya ada survei sekolah, rumah sakit, rumah warga, sentra usaha, rumah ibadah atau usul lain. Tidak ada hasil survei rekaan atau klaim dana sudah habis.

- [x] Sediakan skenario runtime, model konstruksi, regu kerja, properti simbolis dan peresmian; integrasikan pilihan Day 1/Day 2 sambil menjaga draft pengguna.
- [x] Simpan 25 cue suara aktif dengan identitas/gender yang konsisten, timing kata aktual dan amplitudo untuk mulut. Empat suara protes bertumpuk dan dialog dapat melintas cut; klip versi awal tetap tersedia untuk draft tersimpan.
- [x] Perluas kamera menjadi descent kepulauan-ke-panggung, zoom, truck, orbit, dolly dan crane; perhitungan berdasarkan waktu absolut. Set konstruksi tidak tertutup fog jarak dekat.
- [ ] Tonton MP4 penuh dan dengarkan mix penuh pada browser/perangkat sasaran, termasuk pelafalan, intonasi, interupsi, protes, framing, label nama, objek yang terhalang, fullscreen dan unduhan. Tes/Blender serta pemeriksaan sinyal belum menggantikan penerimaan ini.

## Kota dan peta: sudah diimplementasikan lokal

Lihat [rencana Jakartawa](world/KOTA_MULAMULA.md) dan [siteplan](world/kota-mulamula-siteplan.svg). Produksi, denah jalan, minimap dan jelajah memakai koordinat bersama dari [layout dunia](../game-src/republic-world-layout.js).

| Status | PR | Hasil dan batas implementasi |
|---|---|---|
| Tersedia lokal | **Jakartawa sebagai ibu kota pertama** | Awal berisi panggung sementara, akses kerikil, patok rencana dan 24 petak fondasi. Rancangan kapasitas dua warga/petak menampung 48 warga, tetapi belum ada rumah selesai atau pembagian kepemilikan. Zona alun-alun, permukiman, pendidikan, kesehatan, pasar/bengkel dan ruang terbuka tercatat. |
| Tersedia lokal | **Jelajah open-world** | Terrain 25 chunk berukuran 64 meter mengikuti pemain, dengan pembuangan resource yang menjauh. Pemain dapat berjalan di luar batas denah menuju bentang alam/pantai; kontrol desktop dan sentuh, benturan, tangga, serta kamera tersedia. Kerumunan 48 pemeran hanya ada di Produksi. Jelajah menampilkan Pasca sebagai NPC dan maksimal 12 akun warga online terdekat; posisi dan obrolan memakai ruang dunia bersama melalui API. Kinerja GPU/perangkat sasaran serta dua sesi akun nyata tetap perlu ditinjau. |
| Tersedia lokal | **Jaringan jalan, denah dan minimap** | Akses utama, jalan permukiman dan jalur zona mengikuti layout yang sama dengan posisi dunia. Penanda pemain, pilihan area, fase sebelum/sesudah Day 2 dan navigasi kembali tersedia. Pintu kedua gedung serta tangga panggung memiliki akses fisik; tembok/perabot menghalangi langkah. |
| Tersedia lokal | **Produksi dan episode hanya di panel admin** | Penanda produksi dan akses pemutar episode di UI publik dihilangkan. Entry admin dipisah; server memeriksa sesi admin untuk modul/hasil build privat, audio, rekaman sumber dan dokumen episode. Graph publik/shared tetap terbuka. Tes HTTP Apache lokal dan router PHP lulus untuk sesi non-admin/admin, MIME, payload, Range, HEAD dan logout; konfigurasi server online belum diverifikasi. |
| Tersedia lokal | **Peta dunia kepulauan rekaan** | Atlas animatif dapat digeser/diperbesar dengan lima tujuan bernama Jakartawa, Bandunggul, Semarame, Surabawow dan Makasabar. Nama Indonesia tidak dipakai pada tampilan geografis; ID teknis lama hanya menjaga kompatibilitas data. |
| Tersedia lokal | **Hierarki peta dunia → regional → siteplan → jelajah** | Peta regional memuat kota, desa, padang, hutan, perbukitan dan rute; denah ibu kota merinci tapak. Tujuan dan navigasi kembali dibedakan per skala; episode tidak menjadi tujuan publik. |
| Tersedia lokal | **Kota lain tetap tanah kosong** | Empat tujuan selain ibu kota berupa lahan/penanda lokasi, tanpa gedung atau rumah jadi. Pembangunan berikutnya menunggu keputusan cerita/warga. |
| Tersedia lokal | **Fase sebelum/sesudah Day 2** | Sebelum episode hanya panggung/fondasi/tapak; sesudah episode hanya Koplak Desa dan SPPG yang bertambah. Fase mengikuti pemutaran Day 2 kanonis yang selesai, atau pilihan inspeksi pada denah; membuka episode atau seek langsung ke akhir tidak otomatis membangun kota. |

### Pemeriksaan teknis dan batas penerimaan

- [x] Audio: uji file/durasi PCM, hash sumber kini/arsip, 25 dialog, empat suara protes tumpang tindih, tidak ada tokoh menimpa suaranya sendiri, batas musik dan loop 200 detik. Mix offline 110,541 detik tersedia sebagai bahan dengar; tidak clipping pada versi yang diperiksa.
- [x] Dunia/geometri: `tools/test_republic_world.mjs` lulus untuk fase awal/akhir dan seek balik, hanya NPC yang disengaja pada jelajah, 24 fondasi, pintu/tangga, benturan tanpa menembus tembok, tanah di luar denah, lubang terrain untuk galian Produksi, streaming/disposal 25 chunk dan anggaran mesh. Tes protokol kehadiran dua akun dan uji browser dengan satu pemain simulasi juga lulus; uji dua akun nyata tetap diperlukan.
- [x] Peta/UI: `tools/test_republic_map_ui.mjs` lulus untuk lima nama rekaan, pilihan tujuan/pan/zoom, kesamaan koordinat, 24 fondasi, penambahan hanya dua gedung pada fase akhir, empat kota kosong, minimap dan pelestarian formulir akun/navigasi. Uji navigasi republik, UI Produksi dan UI warga juga lulus.
- [x] Regresi Produksi: `npm run test:production` lulus. Uji sebelumnya memeriksa 49 identitas dan Pasca terlihat pada posisi pita. Revisi terbaru mengizinkan label disembunyikan pada wide/kerumunan, tanpa garis penghubung; pemeriksaan tiga rasio mengikuti aturan ini.
- [x] Ekspor MP4 menggunakan fixture pengujian lulus pada 1080×1920, 1920×1080 dan 1080×1080. Ini membuktikan jalur encoder pada fixture, **bukan** pemeriksaan MP4 episode penuh.
- Keyframe offline kerumunan, interior dan pita sudah ditinjau; penghalang pohon/mandor/fasad dikoreksi dan dirender ulang. Hasil ini tetap dipisahkan dari menonton animasi penuh dan mendengarkan mix.
- [ ] Pemeriksaan interaksi WebGL, kinerja perangkat desktop/ponsel, readability seluruh label, touch/joystick, fullscreen dan video unduhan secara langsung masih diperlukan. Uji DOM/CPU dan gambar Blender tidak membuktikan semua interaksi tersebut selesai ditinjau.

## Pekerjaan berikutnya yang belum selesai

- [x] **Simpan kemajuan dunia global di server.** Paket 23 November 2026 menambah API/database fase dan proyek bersama, publikasi admin, serta konstruksi rumah P01. LocalStorage tidak mengatur fase publik. Tes dua sesi/reload, konflik dan retry tercatat di [handover](../roadmap/03-HANDOVER-SERVER.md); penerimaan browser/perangkat dan deploy tetap terpisah.
- [ ] Bangun rumah warga di atas fondasi setelah keputusan pembangunan, tentukan kebutuhan akses dasar serta mekanisme penempatan/penghunian tanpa mengarang kepemilikan akun.
- [ ] Bangun fasilitas pendidikan, kesehatan, pasar/bengkel dan zona lain berdasarkan rekap kebutuhan; slot pada denah bukan gedung yang sudah ada.
- [ ] Perluas kota kosong secara bertahap setelah cerita/keputusan yang mendasarinya tersedia.
- [ ] Putuskan menu, pengelola dan tata layanan SPPG/Koplak Desa; model interior bukan keputusan operasional warga.

Bangunan, wilayah, acara, dan aturan dapat menerima usulan warga. Tempat pengumpulan, tenggat, mekanisme seleksi/pemungutan suara, hasil, dan cara mengumumkan keputusan masih **belum diputuskan**; jangan mengarang hasil partisipasi.

## Ketentuan pengerjaan

- Selesaikan dan tinjau karakter dahulu, baru produksi episode lanjutan. Batasi tokoh fokus tiap episode agar cerita mudah diikuti; perkenalkan warga lain lewat kegiatan yang relevan.
- Nama tokoh tampil di atas kepala bila dapat terbaca, dengan pembicara/fokus sebagai prioritas. Nama boleh disembunyikan saat zoom out, kamera sangat jauh atau kerumunan padat; tidak memakai garis putih/penghubung label. Periksa aturan yang sama pada pratinjau dan MP4.
- Pilih suara sesuai gender karakter yang ditetapkan, dengan satu identitas konsisten per tokoh. Identitas yang belum diketahui tetap dicatat sebagai sementara sesuai rancangan avatar.
- Pertahankan kesinambungan identitas tokoh dan perkembangan dunia. Jangan mengubah seluruh kota sekaligus tanpa mencatat tahap perubahan yang dipakai cerita.
- Jalankan pemeriksaan dan build lokal yang sesuai sebelum melaporkan hasil. MP4/mix yang belum ditonton dan didengar penuh tidak disebut final.
- **Tidak auto-push Git.** Push hanya ketika diminta secara eksplisit untuk pekerjaan yang sedang berlangsung, sesuai [AGENTS.md](../AGENTS.md).
