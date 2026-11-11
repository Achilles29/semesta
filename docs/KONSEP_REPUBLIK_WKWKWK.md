# Konsep Produk — Republik WkWkWk

**Nama produk:** Republik WkWkWk  
**Status:** prototipe web untuk eksplorasi dan produksi konten  
**Acuan terbaru:** dokumen ini bersama [handover pengembangan](HANDOVER_PENGEMBANGAN_DI_SERVER.md)

## Gagasan inti

Republik WkWkWk adalah negara fiktif yang dihuni warga internet. Pemain menjelajah sebagai Presiden Republik, bertemu warga, melihat fasilitas dan persoalan sehari-hari, lalu menemukan cerita yang bisa dibawa ke konten media sosial. Suasananya populer, ringan, dan absurd; topiknya tetap dekat dengan kehidupan publik Indonesia.

Kalimat pegangan: **Ngomongin negara, kadang sambil ketawa, tetap pakai data.**

Gelar Presiden adalah peran di dunia fiksi. Ini bukan simulasi pemerintahan atau layanan politik, dan pilihan pemain tidak mewakili keputusan maupun kebijakan nyata.

## Apa yang dilakukan pemain

- Membuat akun warga dan menentukan avatar.
- Masuk ke Peta Utama Republik dan memilih kota cerita.
- Membuka Peta Kawasan untuk memilih Kota Warga, Desa Tumbuh, atau Hutan Warga.
- Masuk ke area 3D wilayah terpilih untuk menjelajah dan berinteraksi.
- Menjelajahi scene 3D, menemui karakter, berbicara, dan melihat cerita atau persoalan di lingkungan.
- Mengobrol dengan warga lain yang berada di kawasan sama dan berdekatan.

Peta Indonesia adalah navigasi cerita, bukan peta administrasi lengkap atau peta presisi. Kawasan dan tokoh merupakan ilustrasi fiktif yang terinspirasi keseharian. Identitas privat warga sungguhan tidak digunakan tanpa izin.

## Lingkaran cerita dan konten

- Pilih tema yang dikenal penonton, seperti sekolah, layanan makan, koperasi, pasar, lingkungan, atau kehidupan kampung.
- Ubah tema menjadi kejadian kecil dengan tokoh, tujuan, konflik ringan, dan akhir yang mengundang komentar.
- Tandai bagian fiktif dengan jelas dan sertakan sumber saat dialog atau narasi menyampaikan fakta.
- Rekam adegan dari game, tambahkan voiceover dan teks, lalu ajukan pertanyaan sederhana kepada penonton.
- Gunakan saran komentar sebagai inspirasi episode berikutnya. Komentar menginspirasi cerita, bukan menentukan kebijakan publik.

Hindari fitnah, klaim faktual tanpa sumber, stereotip wilayah atau profesi, dan eksploitasi kesulitan warga nyata. Humor sebaiknya menyorot situasi atau benda absurd, bukan merendahkan kelompok yang terdampak.

## Identitas visual dan interaksi

- Dunia kartun 3D yang cerah, mudah dibaca, dan terasa seperti ruang bermain bersama.
- Antarmuka menyediakan navigasi Peta Utama dan Peta Kawasan, avatar, percakapan, dan mode rekam.
- Peta utama dan kawasan adalah dua tingkat navigasi. Setiap wilayah memiliki susunan scene, objek, dan suasana tersendiri.
- Collision membatasi gerak agar karakter tidak menembus objek penghalang; jalur masuk dan keluar tetap terbaca.
- Posisi permainan disimpan di browser agar refresh tidak memulai pemain dari awal pada perangkat yang sama.

## Peta konsep

- **Peta Utama:** pilihan kota cerita di Indonesia untuk mengarahkan cerita.
- **Peta Kawasan:** Kota Warga, Desa Tumbuh, dan Hutan Warga.
- **Area 3D:** tempat eksplorasi dan interaksi setelah pemain memilih kota dan wilayah; fasilitas dan tempat cerita berada di dalam wilayah.
- **Fasilitas cerita:** sekolah, dapur MBG/SPPG, Kopdes, pasar, permukiman, dan ruang publik. Fasilitas adalah bagian dunia cerita, bukan layanan transaksi.

Nama wilayah dan scene di kode dapat berkembang. Identitas produk tetap Republik WkWkWk kecuali pemilik proyek memutuskan perubahan baru.

### Batas implementasi yang ditarik dari server

- Peta Kawasan saat ini menampilkan satu pin masuk, **Permukiman Warga**.
- Tab Kota Warga, Desa Tumbuh, dan Hutan Warga memilih susunan scene 3D; fasilitas seperti sekolah, MBG, dan Kopdes belum menjadi pintu masuk area terpisah.
- Kunjungan baru membuka Peta Utama. Wilayah 3D dibuka setelah pemain memilih kota dan wilayah.
- Pilihan layar dan posisi disimpan di browser yang sama.

## Akun, peran, dan komersialisasi

Akun warga, profil avatar, dan obrolan tersedia dalam implementasi saat ini. Panel admin menyediakan pengelolaan fitur, warga, avatar, ide, dan tata scene sesuai cakupan kode.

Belum ada keputusan produk untuk menjual akses, menyewakan toko, membuat KTP digital berbayar, atau memperdagangkan barang di dalam game. Jangan menambahkan transaksi atau ekonomi warga tanpa rancangan dan instruksi baru. Monetisasi dapat dipertimbangkan setelah format konten dan kebutuhan produk tervalidasi.

## Peran Project Pintar

Project Pintar tetap menjadi proyek pembelajaran terpisah. Ia dapat muncul sebagai bagian kecil bila cerita membahas belajar, sekolah, keterampilan, atau akses pendidikan. Republik WkWkWk bukan kulit baru untuk Project Pintar; integrasi produk perlu dirancang tersendiri jika dibutuhkan.

## Acuan pengembangan

- Semua tombol peta menuju wilayah yang benar.
- Area 3D tidak kosong dan tiap wilayah berbeda secara visual.
- Collision mencegah karakter berjalan menembus objek.
- Refresh mempertahankan wilayah, scene, dan posisi pemain.
- Error jaringan atau aset memberi pesan yang jelas.
- Akun, panel admin, dan API benar di localhost subfolder maupun domain server.
- Dokumen, label UI, cerita, dan README memakai nama Republik WkWkWk dengan konsisten.

## Dokumen terdahulu

Dokumen [konsep Semesta Nyasar](KONSEP_KONTEN_DAN_SPESIFIKASI_GAME_SEMESTA_NYASAR.md), [roadmap Semesta Nyasar](ROADMAP_GAME_SEMESTA_NYASAR.md), dan [desain kota perdana](DESAIN_KOTA_PERDANA_DAN_EDITOR.md) disimpan sebagai catatan historis. Jika ada perbedaan, gunakan konsep ini dan keadaan kode terbaru sebagai acuan.
