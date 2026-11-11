# Arsip Roadmap Lama — Semesta Nyasar

> **Dokumen historis.** Roadmap ini ditulis untuk konsep Semesta Nyasar dan tidak menggambarkan tahap aktif Republik WkWkWk. Gunakan [Konsep Produk Republik WkWkWk](KONSEP_REPUBLIK_WKWKWK.md) dan [handover terbaru](HANDOVER_PENGEMBANGAN_DI_SERVER.md) sebelum menetapkan pekerjaan berikutnya.

**Status:** prototipe lokal dalam pengerjaan  
**Cara kerja:** dibangun dan dimainkan di komputer lokal terlebih dahulu  
**Target awal:** alat produksi konten privat, bukan game publik

## Arah produk

Semesta Nyasar diarahkan menjadi game petualangan santai dengan rasa simulasi kehidupan: pemain punya rutinitas, merawat kebun, membantu warga, dan menemukan cerita lucu dari kegiatan sehari-hari. Nuansanya hangat dan menenangkan, dengan karakter, cerita, dan dunia yang kita buat sendiri.

Perjalanan memakai dua jenis peta. Peta dunia 2D dipakai untuk berpindah antarkota dan negara. Saat tiba di kota, pemain melihat peta lokasi lalu memilih tempat seperti dapur MBG, Balai Kopdes, pasar, kampung, kebun, atau hutan kota. Lokasi terpilih menjadi area 3D yang bisa dijelajahi dengan berjalan kaki.

Penonton mengikuti perkembangan kota melalui media sosial. Komentar terpilih dapat menjadi ide tugas harian, warga, dialog, atau kejadian di episode berikutnya.

Versi awal tidak memerlukan akun pemain, multiplayer, toko, atau pembayaran. Kita siapkan peta dunia dan satu peta kota sederhana, lalu satu area 3D yang bisa dimainkan dan direkam. Prototipe pertama juga memuat aktivitas berkebun singkat. Setelah format kontennya terbukti menarik, dunia dan fitur game dapat berkembang mengikuti respons penonton.

## Dasar teknis yang disepakati

- **CodeIgniter 3:** halaman web, panel admin produksi, dan endpoint data.
- **Three.js:** tampilan 3D dan interaksi di browser.
- **XAMPP lokal:** menjalankan PHP dan CI3 selama pengembangan.
- **Dependensi lokal:** Three.js dipasang di proyek; game tidak bergantung pada CDN berbayar.
- **Aset awal:** karakter dan benda dibuat sendiri dari bentuk sederhana. Blender dapat dipakai gratis jika nanti perlu model yang lebih rapi.
- **Sasaran perangkat:** browser ponsel, dengan pengujian desktop untuk proses produksi.
- **Biaya:** coding dan penggunaan lokal ditargetkan tanpa biaya software berbayar. Domain dan server dipertimbangkan saat memang siap merilis.

## Tahap 0 — Siapkan fondasi lokal

**Tujuan:** memastikan proyek dapat dijalankan di komputer sebelum menambah fitur game.

Yang dikerjakan:

- Pastikan struktur proyek CI3, PHP, XAMPP, dan dependensi lokal yang dibutuhkan.
- Jalankan halaman CI3 dari localhost dan catat cara menjalankannya.
- Siapkan struktur berkas terpisah untuk game, data kasus, dan panel admin.
- Buat halaman uji Three.js yang dapat dibuka dari proyek CI3.
- Pastikan halaman uji dapat dibuka di ponsel melalui jaringan Wi-Fi lokal.

Hasil yang harus siap:

- Proyek berjalan lokal tanpa domain atau hosting.
- Halaman CI3 dan scene 3D dapat dibuka melalui browser.
- Ada petunjuk singkat untuk menjalankan proyek kembali.

## Tahap 1 — Prototipe gerak dan kamera

**Tujuan:** membuktikan game terasa nyaman di layar kecil.

Yang dikerjakan:

- Buat satu area kosong kecil dengan lantai, langit, pencahayaan, dan beberapa objek.
- Buat karakter awal dari geometri sederhana buatan sendiri.
- Tambahkan gerak dasar, kamera, dan kontrol sentuh.
- Tambahkan kontrol keyboard untuk memudahkan proses produksi di komputer.
- Tentukan cara mengatur kamera agar adegan mudah direkam menjadi video vertikal.
- Periksa performa dan keterbacaan pada beberapa ukuran layar.

Hasil yang harus siap:

- Karakter dapat berjalan dan kamera dapat diarahkan.
- Kontrol sentuh cukup jelas untuk dicoba di ponsel.
- Komposisi kamera bisa dipakai untuk rekaman video pendek.

**Catatan implementasi saat ini:** peta dunia dan peta kota sudah merespons pilihan dengan menyorot tujuan terdekat saat peta diklik. Tiap kota punya nama lokasi dan cerita pembuka yang berbeda. Karakter utama Cempluk dan scene 3D dibuat langsung dari geometri Three.js; gerak tersedia melalui WASD/tombol panah dan joystick sentuh.

## Tahap 2 — Satu kasus cerita yang bisa dimainkan

**Tujuan:** membuat satu episode utuh di dalam game.

Yang dikerjakan:

- Tambahkan satu titik awal, satu lokasi penyelidikan, karakter pendukung, dan benda terkait kasus.
- Buat interaksi sederhana seperti mendekati objek, memeriksa petunjuk, dan memulai dialog.
- Susun satu alur: pembuka kasus, penyelidikan singkat, kejutan, lalu penutup.
- Gunakan contoh kasus yang mudah divisualkan dan bernada absurd.
- Bangun objek dengan bentuk atau aset yang lisensinya jelas.

Hasil yang harus siap:

- Satu kasus dapat dimainkan dari awal sampai akhir tanpa intervensi kode saat berjalan.
- Cerita tetap mudah dipahami jika dipotong menjadi beberapa adegan pendek.

## Tahap 3 — Alur rekam untuk produksi konten

**Tujuan:** menjadikan game alat produksi video yang praktis.

Yang dikerjakan:

- Buat mode rekam yang menyembunyikan tombol dan elemen antarmuka yang tidak perlu.
- Sediakan pengaturan kamera dan tombol untuk berpindah ke titik adegan.
- Sediakan cara mengulang adegan dan memulai ulang kasus dengan cepat.
- Buat format komposisi yang cocok untuk video vertikal media sosial.
- Rekam satu contoh adegan secara lokal, lalu tambahkan voiceover dan subtitle menggunakan alat gratis yang tersedia.

Hasil yang harus siap:

- Satu episode dapat direkam berulang tanpa mengulang proses bermain secara merepotkan.
- Hasil rekaman bisa dipakai sebagai bahan video setelah diberi suara dan subtitle.

## Tahap 4 — Panel admin dan data episode

**Tujuan:** mengubah isi episode tanpa mengubah kode inti game.

Yang dikerjakan:

- Buat akses admin lokal.
- Buat formulir untuk mengatur judul kasus, ringkasan, dialog, petunjuk, nama panggilan, peran cameo, objek, dan urutan adegan.
- Simpan status episode sebagai draf atau siap direkam.
- Simpan episode dan ide warga dalam database MySQL lokal yang dikelola melalui CI3.
- Hubungkan game ke data kasus yang dipilih dari panel admin.
- Saring dan tinjau nama atau teks kiriman sebelum dipakai di cerita.

Hasil yang harus siap:

- Pengelola dapat membuat dan mengubah episode lewat panel admin.
- Perubahan dialog atau petunjuk tidak mengharuskan pengubahan kode game.
- Panel admin dan data produksi tetap privat di lingkungan lokal.

## Tahap 5 — Alur komentar menjadi episode

**Tujuan:** menyiapkan proses interaksi sosial sebelum game dibuka ke publik.

Alur kerja:

- Terbitkan video yang meminta penonton memilih atau mengusulkan satu hal spesifik.
- Catat komentar yang relevan secara manual pada tahap awal.
- Pilih kontribusi yang aman dan cocok dengan cerita.
- Masukkan nama panggilan atau ide terpilih melalui panel admin.
- Rekam episode lanjutan di game.
- Tampilkan hasilnya pada video berikutnya dan ajak penonton memberi ide lanjutan.

Hasil yang harus siap:

- Beberapa episode dapat dibuat dengan pola komentar-ke-cerita yang konsisten.
- Ada aturan editorial sederhana untuk memilih kontribusi dan menangani nama atau informasi pribadi.
- Game tetap menjadi alat produksi privat selama fase ini.

**Prototipe lokal tahap ini:** panel admin kini memiliki inbox ide warga. Komentar disalin manual setelah ditinjau, lalu disimpan bersama nama panggilan opsional dan sumber platform. Setiap ide dapat diberi status baru, dipilih, dipakai, atau tidak dipakai. Tombol “Pakai di episode” menyalin teks menjadi catatan warga pada editor kasus; perubahan itu baru berlaku pada game setelah kasus disimpan. Inbox tidak mengambil komentar langsung dari platform sosial.

Database lokal `semesta_nyasar` kini menyimpan data episode dan inbox ide warga pada tabel `episodes` dan `citizen_ideas`. Skrip `tools/setup_database.php` menyiapkan database secara idempoten dan mengimpor data JSON lama tanpa menghapus atau menimpa baris yang sudah tersimpan.

## Tahap 6 — Uji format konten

**Tujuan:** mempelajari format mana yang membuat orang menonton, mengikuti akun, dan ikut berkomentar.

Yang dikerjakan:

- Siapkan beberapa video dari satu area dan karakter yang sama.
- Variasikan hook, pertanyaan untuk penonton, dan cara komentar muncul di episode lanjutan.
- Catat hasil yang tersedia di platform, seperti tayangan, durasi tonton, komentar, dan pengikut baru.
- Gunakan hasilnya untuk memilih bagian dunia yang perlu dibuat berikutnya.

Hasil yang harus siap:

- Ada dasar dari respons penonton untuk menentukan apakah perlu menambah area, karakter, atau jenis kasus.
- Produksi tidak menambah sistem game yang belum dibutuhkan oleh cerita.

## Tahap 7 — Perluas game secara selektif

**Tujuan:** memperbesar dunia hanya ketika mendukung cerita atau kebutuhan penonton.

Fitur yang dapat dipertimbangkan:

- Area dan kasus baru.
- Karakter berulang dan peran cameo yang lebih beragam.
- Objek atau lokasi yang berubah berdasarkan pilihan cerita.
- Peta sederhana untuk berpindah antararea.
- Simpan dan muat susunan adegan untuk produksi video.

Setiap fitur dipilih berdasarkan kebutuhan konten dan kemampuan perangkat ponsel. Sistem akun, multiplayer, ekonomi, sewa tempat, dan transaksi belum menjadi prioritas roadmap awal.

## Tahap 8 — Persiapan rilis web

**Tujuan:** baru mempertimbangkan akses publik setelah game dan proses produksinya stabil.

Yang dikerjakan jika diputuskan untuk membuka game:

- Tentukan fitur yang benar-benar perlu tersedia untuk pemain publik.
- Pisahkan akses pemain dari panel admin produksi.
- Rencanakan keamanan, pencadangan data, performa ponsel, dan kebijakan penggunaan konten kiriman.
- Bandingkan pilihan domain dan server sesuai kebutuhan serta anggaran saat itu.
- Uji versi rilis sebelum membagikan alamatnya ke publik.

Domain dan server termasuk biaya tahap rilis. Keduanya tidak diperlukan untuk coding dan uji lokal pada tahap-tahap sebelumnya.

## Batas versi pertama

Versi pertama dianggap cukup untuk mulai membuat konten ketika:

- Satu area kecil bisa dijalankan di browser ponsel.
- Satu karakter dapat bergerak dan berinteraksi dengan objek.
- Satu kasus cerita selesai dimainkan.
- Adegan dapat direkam dalam format vertikal dengan pengulangan yang praktis.
- Dialog, petunjuk, dan cameo episode dapat diubah sebagai data.
- Game dan panel admin belum perlu dibuka untuk publik.

## Urutan kerja yang disarankan

1. Pastikan proyek CI3 dapat dijalankan lokal.
2. Buat scene Three.js dan uji di ponsel.
3. Selesaikan gerak, kamera, dan kontrol.
4. Buat satu kasus cerita sampai selesai.
5. Siapkan mode rekam dan hasilkan satu video uji.
6. Bangun panel admin berdasarkan kebutuhan episode yang sudah diuji.
7. Jalankan alur komentar ke episode dan evaluasi respons.
8. Kembangkan fitur game berikutnya dari kebutuhan nyata.
9. Bahas domain dan server jika game siap dirilis ke publik.

## Hubungan dengan spesifikasi

Dokumen ini menjabarkan urutan implementasi dari [konsep konten dan spesifikasi game](KONSEP_KONTEN_DAN_SPESIFIKASI_GAME_SEMESTA_NYASAR.md). Jika keputusan produk berubah, perbarui spesifikasi dan roadmap bersama-sama.
