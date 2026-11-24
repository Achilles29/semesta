# Audit kesesuaian seluruh panel admin

24 November 2026, baseline `f719128` ditambah working tree lokal. Audit membaca view, navigasi, modul JS, API dan pemisahan sumber public/admin. Bukan klaim penerimaan GPU atau semua interaksi melalui browser nyata.

| Panel | Fungsi yang berlaku | Temuan dan penanganan |
|---|---|---|
| Ringkasan | Arah masuk menuju dunia, akun, hunian dan produksi | Tambah domain resmi dan pemisahan jalur; kartu editor tidak lagi menjanjikan peta publik langsung berubah |
| Studio avatar | V15, enam profil tubuh, roster dan racikan | Model lama tidak dihidupkan; saran profesi/gender di onboarding diperbaiki, request thumbnail terbaru mengalahkan request lambat |
| Tata wilayah | Laboratorium tataan aset kota/desa/hutan | Label menjadi draf tataan; simpan tetap menyimpan `world_scenes`, bukan siteplan Jakartawa atau publikasi fase dunia; data lama dipertahankan |
| Dunia bersama | Fase sebelum/sesudah Day 2, status proyek P01, riwayat alasan/versi | Pertahankan API dan review publikasi; Day 3 belum menjadi pilihan fase palsu. Proyek selesai tidak otomatis rumah pribadi |
| Hunian & ekonomi (baru) | Register 48 rumah dan 17 fasilitas rencana, filter nama/pekerjaan/alamat | Memisahkan reservasi cerita dari akun; menampilkan keputusan 1.000 koin dan status backend; status skema dibaca dari API admin tanpa mutasi |
| Produksi konten | Day 1/2/3, draft, play/export admin | Day 3 tersedia, rekaman ujaran yang belum ada ditandai; draft lama dan pilihan eksplisit Day 2 tidak ditimpa |
| Galeri objek | Katalog aset editor dan sumber ilustrasi | Keberadaan aset bukan tanda gedung sudah diterbitkan atau layanan ekonomi berjalan; model Day 3 dikelola set produksi, bukan otomatis masuk editor lama |
| Inbox warga | Catatan manual sumber/komentar dan status editorial | Hapus klaim penyimpanan selalu lokal; Dipilih/Dipakai bukan hasil voting/publikasi otomatis |
| Direktori warga | Akun terdaftar, status aktif/email, biodata privat | Label membedakan akun, follower dan pemeran; angka roster 48 tidak dicampur statistik registrasi |
| Log pengunjung | Analitik privat, filter dan retensi yang sudah ada | Tetap terpisah dari pemain online/akun warga. Tidak menggunakan IP sebagai bukti kepemilikan rumah |
| Data & pengaturan | Status server dan konfigurasi akses | Hapus database aktif/nama DB hardcoded dan klaim draf langsung muncul di game; verifikasi email mengikuti toggle. Respons simpan mempertahankan status Google/pengirim agar UI tidak salah berubah |

Endpoint episode lama tanpa resource sebelumnya masih mengembalikan data kasus kepada publik. Kini memerlukan admin seperti aset produksi. Tidak ada pemanggil aktif dari game publik. Endpoint status baru `admin_operations` hanya GET admin, no-store, menampilkan ketersediaan kelompok tabel tanpa kredensial, akun atau data pribadi; skema tersedia tidak diklaim berarti layanan lulus uji nyata.

## Bukti dan batas

- Tes navigasi PHP view pada enam base URL, deep link, back/forward, query, pencarian dan scroll mencakup 11 panel.
- Tes DOM panel hunian/ekonomi: 48 reservasi, 17 fasilitas, pencarian, teks aman, respons gagal, respons setelah dispose, dan status database sesuai respons.
- Fixture controller memeriksa auth admin, penolakan POST, no-store, skema parsial dan database tidak tersedia. Tidak memodifikasi DB.
- Produksi dan onboarding diperiksa melalui tes regresi terkait; daftar hasil akhir berada di handover paket.
- Email/Google sungguhan tetap ditunda ke server. Tidak ada konfigurasi SMTP/OAuth yang diganti.
- Starter diberikan oleh API akun lengkap, bukan tombol admin. Panel membaca kesiapan skema starter bersama dunia/hunian/P01. Tidak ada tombol pemberian saldo manual, klaim rumah tapak atau belanja yang belum memiliki API.
- Browser/perangkat sasaran, rasa bermain dan MP4 penuh masih memerlukan penerimaan. Jangan menandai selesai dari tes DOM/CPU.

Tugas berikut: rilis E-01a/E-02a, H-03 klaim, H-04 akses tapak, E-03 siklus usaha; detail kontrak di dokumen 06/08. Publikasi fasilitas perlu versi dunia baru yang diterbitkan sengaja, bukan efek menekan Play.

## Revisi Tata Wilayah dan usulan ? baseline 5736160

Tata Wilayah sekarang dibuka pada denah kanonis Jakartawa: 48 reservasi, 24 fondasi, panggung, Koplak/SPPG sesuai fase server, 17 fasilitas rencana, sungai, danau dan taman. Lapisan dunia terbit tidak memasukkan fasilitas Day 3. Pan/zoom, pencarian dan detail menggunakan koordinat sumber game. Perubahan fase/proyek tetap melalui Dunia bersama. Ini belum editor untuk menyeret/menerbitkan tapak resmi. Editor aset bebas lama berada dalam details terpisah dan baru memuat renderer ketika dibuka. Inbox menerima sumber Game dan dapat meninjau status; pemain hanya membaca usulannya sendiri.
