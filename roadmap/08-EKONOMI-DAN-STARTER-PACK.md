# Ekonomi warga dan paket awal

Keputusan pemilik, 24 November 2026. Alamat game: **https://republikwkwkwk.com**. Nilai awal **1.000 Koin Republik** telah disetujui. Dokumen ini menggantikan arah lama bahwa hunian dasar selamanya hanya kamar Wisma; implementasi Wisma yang sudah ada tetap dipertahankan selama transisi.

## Hak warga baru

Setiap akun memperoleh satu rumah subsidi standar, 1.000 koin dan alat dasar sesuai pekerjaan. Tidak mensyaratkan follow, donasi atau jabatan. Rumah dasar tidak perlu dibeli. Membeli tanah lebih luas, meningkatkan bangunan dan membuka tempat usaha menjadi tujuan bermain berikutnya.

**Status lokal sekarang:** grant starter sudah berfungsi melalui `citizen_home` setelah migrasi `20261124_citizen_starter.sql`. Profil/jelajah akun lengkap memicu satu pemberian: saldo 1.000, satu set alat berdasarkan profesi saat grant, serta alamat `Griya Republik · RS-{ID}`. Rumah privat berupa cutaway dengan kamar, ruang duduk, dapur kecil dan teras, diakses lewat pintu Wisma. Ini instance per akun, bukan petak baru di peta. Tugas Bu Rani menjadi bonus tanaman; progres/dekorasi lama tetap ada. Belanja, penggunaan alat dalam usaha, transfer dan peningkatan rumah **belum tersedia**. Server produksi harus migrasi dan menerima paket sebelum promosi menyatakan fitur sudah tayang.

Aturan implementasi:

- Server memberikan paket setelah akun dan profil berhasil tersimpan, dalam transaksi sekali per ID akun; bukan hadiah setiap login atau perubahan pekerjaan. Kegagalan koneksi dapat dicoba ulang tanpa menggandakan hadiah.
- Akun lama yang belum mendapat paket diberi hak yang sama pada request autentikasi fitur berikutnya; migrasi hanya menambah tabel. Kamar, tanaman, XP dan progres P01 tidak dihapus. Dua kali migrasi localhost dan uji HTTP berhasil.
- Akun warga cerita tetap menerima modal dan alat satu kali. Setelah klaim rumah perintis disetujui, rumah perintis menjadi hunian utama; subsidi tidak diberikan lagi sebagai petak/jualan gratis kedua. Barang dipindahkan melalui transaksi, bukan menghapus dekorasi lama.
- Akun umum memakai alamat blok subsidi baru dengan interior per akun. Jangan mengambil P01–P24 atau 48 alamat perintis. Alokasi blok dipersistenkan; kapasitas dapat bertambah tanpa membangun ribuan mesh sekaligus.
- Rumah subsidi dan alat dasar terikat akun pada prototipe, tidak bisa dijual/ditransfer. Koin starter tidak dapat dihadiahkan langsung. Batas satu per akun belum membuktikan satu orang satu akun; anti-penyalahgunaan/rate limit perlu diuji sebelum pasar antarpemain dibuka.
- Jangan meminta KTP atau password medsos. Username medsos hanya diperlukan untuk klaim identitas cerita; verifikasi mengikuti H-03.

## Fasilitas yang saling terhubung

[Review rumah subsidi](../docs/world/rumah-subsidi-review.png) adalah render offline geometri runtime. Atap dan dua dinding dibuka secara visual agar isi rumah terlihat; interaksi saat ini rak tanaman, bukan berjalan di interior atau renovasi bebas.

| Fasilitas | Fungsi bermain | Kaitan profesi |
|---|---|---|
| Toko Tani & Sewa Alat | Beli benih/pupuk; pinjam alat lanjutan | Petani membutuhkan kurir, mekanik dan pasar |
| Pasar Warga | Jual hasil, papan harga dan pesanan | Pedagang/kasir mengolah stok; pembeli NPC cadangan menjaga permainan solo |
| Gudang & Logistik | Penyimpanan, penerimaan dan pengiriman | Kurir mengantar barang nyata dengan tujuan dan batas muatan |
| Bengkel & Bahan Bangunan | Perbaikan alat, bahan renovasi, pesanan konstruksi | Mekanik, mandor, operator dan pelukis bekerja pada hasil yang terlihat |
| Balai Hunian & Usaha | Rumah subsidi, klaim rumah perintis, peningkatan rumah/tempat usaha | Satu sumber hak kepemilikan dan biaya; bukan pembayaran pada dekorasi peta |
| Koplak Desa | Titik pesanan/penjualan komunitas setelah layanan dibuat | Melengkapi pasar, tidak menggandakan stok tanpa transaksi |
| SPPG | Pesanan bahan pangan sesuai kapasitas dapur kelak | Menyambungkan hasil petani dengan logistik/koki |

Tujuh belas tapak Day 3 tersimpan di `game-src/civic-development-layout.js`; enam tempat ibadah, sekolah, rumah sakit, stadion, tiga layanan keamanan/darurat dan lima fasilitas ekonomi. **Model bangunan dalam scene tidak berarti API layanan publik tersedia.** Publikasi kota dan aktivasi layanan adalah pekerjaan terpisah dengan versi dunia dan alasan admin.

## Siklus pertama yang konkret

Contoh harga untuk pilot, belum ekonomi final: benih 80, pupuk 40, ongkos pengiriman 20 = **140 koin**. Hasil contoh satu siklus laku 200 koin, sehingga saldo 1.000 → 860 → 1.060. Server menghitung jumlah panen, waktu dan harga; klien hanya mengajukan aksi. Harga harus diuji bersama durasi, hasil gagal dan jumlah pemain, bukan dianggap keuntungan yang dijamin.

Alur petani: terima alat dasar → ambil petak usaha latihan → beli kebutuhan → tanam/rawat/panen → bawa atau pesan pengiriman → jual → pilih peningkatan. Petak usaha terpisah dari rumah. Siklus pertama memberi aksi singkat dan hasil terlihat; jangan hanya menunggu timer panjang. Pembelian ulang/refresh tidak menggandakan panen.

Profesi lain mendapat satu alur yang benar-benar berbeda sebelum diperluas: kurir memilih pesanan/rute/muatan; mekanik mendiagnosis lalu mengganti komponen; pedagang mengelola stok; pelukis mengerjakan papan nama. Jabatan polisi/presiden pada profil tidak memberi hak admin, uang tanpa batas atau akses data privat.

Rumah tambahan dibeli melalui Balai Hunian: pilih petak yang tersedia → lihat harga dan pratinjau → konfirmasi → server mengunci petak, memotong saldo dan memberikan hak secara atomik. Untuk peningkatan rumah, pemilik memenuhi koin/bahan dan tahap pekerjaan; jangan memakai `citizens.house` sebagai bukti kepemilikan karena kolom itu masih preferensi gaya.

## Kontrak dan urutan kerja

| ID | Pemilik | Hasil dan kriteria selesai |
|---|---|---|
| E-01 | Server | Dompet, ledger, inventaris dan grant starter atomic; unique grant per akun; retry/race/rollback/cross-account teruji; backfill akun lama idempotent; saldo tidak dipercaya dari klien |
| E-02 | Server + lokal | Alokasi rumah subsidi, alamat, akses interior dan kontinuitas kamar/perabot; dua akun terpisah; rumah perintis tidak menduplikasi hadiah; blok tidak tumpang tindih |
| E-03 | Lokal + server | Toko tani → lahan latihan → panen → pembeli NPC; harga/biaya/waktu dijelaskan; seluruh hasil persisten dan satu kali; transaksi bisa dipulihkan setelah koneksi putus |
| E-04 | Server + lokal | Pembelian/peningkatan rumah dan gudang; stok serta saldo atomic; izin pemilik, audit dan konkurensi teruji |
| E-05 | Pemilik + lokal | Pilot harga 1.000/140/200; ukur waktu sampai hasil pertama, saldo, pengeluaran, kebingungan pemain; revisi harga dengan versi |

Urutan: rilis/smoke test paket lokal → kontrak H-03 dan E-01 → E-02/H-04 → E-03 → pilot → pasar antarpemain S-02. E-01 dapat dikerjakan tanpa menunggu semua klaim perintis, tetapi keputusan hak hunian harus sama pada E-02/H-03. Email/Google tetap dikerjakan nanti di server.

Implementasi parsial E-01/E-02 dipecah menjadi **E-01a/E-02a** pada checklist: grant, saldo dan satu alat persisten; rumah privat standar. Ledger belanja/inventaris umum, petak publik dan pemindahan hak rumah perintis tetap pekerjaan berikutnya. Bukti: 117 pemeriksaan hunian/starter MySQL terisolasi, race grant, rollback, pergantian pekerjaan, dua akun bernama sama, migrasi berulang; tes HTTP CodeIgniter localhost dan DOM. Itu belum penerimaan GPU/perangkat atau rilis server.
