# Tahapan dan checklist

Status per 24 November 2026. Centang setiap hasil secara terpisah. Urutan bergantung pada kemampuan yang diperlukan, bukan janji tanggal.

## A — Onboarding, identitas dan navigasi

- [x] `A-01` Saran untuk seluruh 23 profesi awal × model laki-laki/perempuan; pilihan gender lain mendapat penjelasan dan editor manual. Katalog/master tidak dikenal memakai pilihan umum yang diberi keterangan, bukan seragam palsu.
- [x] `A-02` Profesi/gender mengubah saran, pilihan manual tidak tertimpa, tombol menerapkan saran tersedia. Data disimpan melalui profil akun.
- [x] `A-03` Kartu warga dengan nomor stabil, nama, profesi, tanggal bergabung dan status email. Tidak menampilkan NIK, agama, alamat atau tanggal lahir pribadi sebagai kartu publik.
- [x] `A-04` Alur daftar/login email, profil, logout dan masuk kembali diperiksa melalui HTTP/DB lokal dengan akun sementara yang dibersihkan. Email belum terverifikasi tidak diberi label terverifikasi hanya karena verifikasi tidak diwajibkan.
- [x] `A-05` Penguatan kode Google: subject stabil, state kedaluwarsa, pembatalan jelas, profil awal harus dilengkapi; tombol layanan yang belum dikonfigurasi menjelaskan ketidaktersediaannya.
- [x] `A-05a` Perbaikan antarmuka tombol Google: ikon dan teks memiliki gaya terpisah, label tidak terkunci 23 piksel. Tombol login dan pesan pendaftaran disembunyikan pada profil akun yang sudah masuk. Tes DOM/cascade CSS lulus; pengujian OAuth tetap A-07.
- [ ] `A-06` Uji email sungguhan di server: kirim, terima, verifikasi, expired/reuse, kirim ulang. **Ditunda ke server atas arahan pemilik; tidak dikerjakan pada paket dunia/konstruksi.**
- [ ] `A-07` Uji Google sungguhan: akun baru/lama, pembatalan, callback/state expired, subfolder, profil dan login ulang. **Ditunda ke server atas arahan pemilik; tidak dikerjakan pada paket dunia/konstruksi.**
- [x] `A-08` Satu klik kota menuju wilayah yang benar. Tombol “Lihat semua” mengembalikan pan/zoom; tidak mengaku melacak posisi pemain.
- [x] `A-09` Atlas dan wilayah memakai pantai bersama, palet laut/daratan, relief ilustratif, label yang disederhanakan. ID/koordinat kota dan jalur tetap.
- [x] `A-09a` HUD jelajah memiliki area terpisah untuk minimap, navigasi, tugas, aksi, joystick, zoom dan LARI. LARI toggle mouse/sentuh + Shift; reset blur, pause dan fokus formulir. Tes kontrak delapan viewport/mode input, DOM dan integrasi CPU lulus. Detail proyek dapat dibuka sebagai lembar petunjuk pada layar kecil. Penerimaan browser tetap A-10.
- [ ] `A-10` Penerimaan visual/interaksi pada browser HP dan desktop: modal/kartu, saran dan editor 3D, fit rambut/topi/APD, label peta, pinch/drag/keyboard, memori/frame time. Tes DOM/render offline hanya bukti pendukung.
- [ ] `A-11` Rilis server dan smoke test sesudah pemilik melakukan commit/push/pull. Build lokal tidak berarti sudah tayang.

## G — Fondasi dunia dan progres server

Paket dunia resmi dan konstruksi P01 sudah diimplementasikan lokal. Pertahankan jalur public/admin dan presence yang telah diperbaiki. Penerimaan browser/perangkat dan deploy tetap terpisah.

- [x] `G-01` Migrasi tambahan dan API versi/fase/proyek server. Seed after-day2, P01 draft, tidak mengimpor localStorage. Dua sesi/reload, fase sebelum/sesudah dan idempotensi migrasi diperiksa pada database uji terisolasi.
- [x] `G-02` Admin Dunia bersama: publikasi fase, aktivasi/jeda/resume proyek, alasan, versi pembanding, riwayat dan retry. Semua pembaca publik memakai server. Tes memastikan preview/seek/playback penuh/ekspor tidak menerbitkan dunia.
- [ ] `G-03` Inventaris, keterampilan dan catatan imbalan per akun. Server menghitung hasil, transaksi atomic, kunci request unik, batas jumlah, penolakan akses akun lain, rollback/retry teruji.
- [x] `G-03a` Bagian konstruksi: satu kit per akun, XP bangun, timer, ledger dan requestId. Tes server meliputi dua akun, akses, replay, rollback, bahan berlebih, dan race hadiah terakhir. Inventaris barang umum/kemampuan lain belum dibuat.
- [x] `G-03b` Bagian hunian: satu paket tugas dan tanaman sambutan per akun, transaksi/ledger, requestId, validasi slot/pemilik/sesi, imbalan satu kali. Tes 72 pemeriksaan backend terisolasi termasuk race, rollback, dua akun dan presence privat; HTTP aplikasi localhost juga lulus.
- [ ] `G-04` Kontrak pekerjaan dan proyek: kebutuhan bahan, status, contributor, tahap visual; uji kontribusi bersamaan dan retry tanpa hadiah ganda.
- [x] `G-04a` Proyek P01 tetap: 12 kit/komponen, draft–active–paused–completed, ledger kontribusi, versi proyek, rumah bertahap serta denah/minimap sinkron. Editor proyek umum/jenis kerja lain belum tersedia.
- [ ] `G-05` Observabilitas: error API yang aman, waktu muat, frame time, pemakaian memori, beban query/polling, prosedur backup/restore dan migrasi.
- [ ] `G-06` Audit interaksi dua akun: target chat saat request lambat/berganti target, presence masuk/keluar, blokir/lapor/rate limit, tidak membocorkan profil privat.

## P — Satu bagian Jakartawa yang bisa dimainkan

Tergantung `G-01`–`G-04`. Gunakan satu proyek yang disetujui; jangan menyatakan klinik telah memenangkan survei.

- [x] `P-01` Implementasi konstruksi ambil–bawa–serahkan–pasang, feedback, hasil server, geometri bertahap dan lanjut setelah reload. Bukti: tes HTTP/DB, DOM/state/geometri dan render offline. Rasa bermain/GPU perangkat menunggu P-07.
- [ ] `P-02` Layanan/logistik: pesanan NPC, pilihan barang dan tujuan, validasi penyelesaian, dapat dimainkan solo.
- [x] `P-02a` Satu tugas sambutan solo dari Bu Rani, paket terlihat di punggung, petunjuk arah/jarak, serahkan di Wisma untuk membuka kamar + satu tanaman. Pilihan pesanan/barang dan kemampuan layanan umum belum tersedia.
- [ ] `P-03` Satu kegiatan kreatif: papan/mural atau pertunjukan, interaksi yang berbeda dari dua pekerjaan lain, hasil tersimpan.
- [ ] `P-04` Proyek bersama utuh: kebutuhan, kontribusi, kemajuan bertahap, penyelesaian sekali, fasilitas hasil dapat dipakai.
- [ ] `P-05` Putuskan kapasitas hunian; alokasi rumah/ruang pribadi, inventaris perabot, penempatan dengan validasi, izin tamu, persistensi lintas perangkat.

  Model kapasitas sudah disetujui: kamar dasar per akun melalui hunian bersama; 24 petak tidak membatasi akun. Peningkatan rumah dan hadiah follower kosmetik menyusul; pilihan gaya rumah saat daftar tetap preferensi.
- [x] `P-05a` Wisma di dunia publik, kamar 3D terpisah per akun, tempat tidur/meja/jendela/karpet, satu rak tanaman yang dapat diisi/dikosongkan dan tersimpan. Masuk/keluar memakai sesi server; presence publik dihentikan di kamar. Tidak ada kunjungan, pemindahan bebas perabot atau rumah tapak.
- [ ] `P-06` Alur awal 5–10 menit: tujuan terbaca, dapat berhenti tanpa kehilangan hasil, contoh tiga aktivitas, satu barang untuk rumah, tujuan kembali.
- [x] `P-06a` Rangkaian awal tugas–hadiah–kamar–dekorasi–keluar/login ulang terhubung dan diuji. Tempo 5–10 menit, rasa bermain dan contoh tiga kegiatan penuh tetap menunggu P-06/P-07; tidak mengklaim target durasi dari tes API.
- [ ] `P-07` Uji pilot dengan pemilik: aktivitas terasa berbeda, solo tetap berjalan, kerja sama nyata, tidak ada dead end/progres ganda. Catat hasil dan revisi sebelum perluasan.

## S — Sosial dan ekonomi setelah aktivitas inti

- [ ] `S-01` Teman, undangan kerja/rumah, mute/blokir/lapor dan panel moderasi yang sesuai peran.
- [ ] `S-02` Pasar barang buatan/hasil kegiatan: transaksi server, stok, pertukaran atomic, catatan, pembatasan penyalahgunaan; tanpa uang nyata pada tahap awal.
- [ ] `S-03` Acara alun-alun terjadwal serta kegiatan asinkron. Tidak mengunci progres dasar pada jadwal acara.
- [ ] `S-04` Tambah profesi berdasarkan kegiatan yang diminati dan fitur yang siap, bukan hanya jumlah seragam.

## W — Performa dan perluasan dunia

Pekerjaan pengukuran dapat berjalan sejak G; perluasan kota menunggu pilot.

- [ ] `W-01` Ukur biaya muat avatar/body/tekstur/wardrobe di perangkat sasaran. Pertahankan runtime terpisah dan tekstur bersama yang sudah tersedia.
- [ ] `W-02` Prototipe satu avatar modular + level detail dengan kualitas sebanding. Ukur bytes, draw calls, RAM/GPU, transisi pakaian dan kecocokan rig sebelum migrasi semua aset. Jangan sekadar membelah file tanpa mengurangi yang diunduh.
- [ ] `W-03` Rancang satu kota baru dengan kegiatan/identitas yang berbeda. Terrain kosong yang ada tetap dapat dijelajahi; jangan mengisinya dengan kota jadi sebelum fungsi dan kanon siap.
- [ ] `W-04` Optimalkan presence/transport berdasarkan beban terukur, kompatibel dengan ID dunia/koordinat yang sama. Tidak mengganti mesin atau transport hanya karena daftar fitur bertambah.

## K — Konten dan keputusan warga

- [x] `K-01` Pisahkan panduan game dari produksi; catat aturan kanon, komentar dan publikasi dunia.
- [ ] `K-02` Rangkuman survei pembangunan berikut, jumlah/asal komentar dan keputusan pemilik. Belum ada hasil yang ditetapkan dalam pekerjaan ini.
- [ ] `K-03` Daftar kemampuan scene/fitur game siap pakai untuk penulis; episode baru memakai kemampuan yang tersedia atau menandai kebutuhan implementasi.
- [ ] `K-04` Penerimaan MP4 penuh Day 2 di browser/perangkat tujuan tetap dicatat terpisah dari perubahan onboarding/peta.
