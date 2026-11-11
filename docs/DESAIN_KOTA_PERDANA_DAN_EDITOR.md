# Arsip Desain Kota Perdana dan Ruang Editor — Semesta Nyasar

> **Dokumen historis.** Spesifikasi Cempluk dan kota perdana di bawah ini berasal dari konsep lama. Acuan produk sekarang adalah [Konsep Republik WkWkWk](KONSEP_REPUBLIK_WKWKWK.md).

## Tujuan tahap

Menyelesaikan satu kota kecil yang terasa seperti game simulasi kehidupan desa: mudah dibaca, penuh warna, punya tujuan yang jelas, dan enak dijelajahi. Referensinya adalah rasa hangat dan kegiatan sehari-hari dari game berkebun klasik; desain, peta, karakter, dan aset tetap milik Semesta Nyasar.

Kota lain tetap menjadi rencana perjalanan, tetapi belum dapat dimasuki sampai kota pertama selesai.

## Identitas kota pertama

- Nama kerja: **Kampung Sore**, sebuah kampung fiksi di pinggir Jakarta.
- Tokoh pemain: **Cempluk**, petualang serabutan dengan topi kuning, jaket merah, ransel biru, dan gerak jalan sederhana.
- Tujuan pemain: membantu warga, merawat tiga petak kebun, dan menyelidiki barang yang hilang.
- Palet: rumput hijau jenuh, jalan tanah keemasan, rumah kayu beratap merah-oranye, pagar cokelat, bunga koral dan kuning, langit biru.
- Kamera 3D: sudut miring isometrik yang menjaga Cempluk dan tujuan interaksi tetap terlihat.

## Peta kota

Peta Kampung Sore dibuat khusus untuk menunjukkan satu lingkungan yang saling terhubung, bukan kumpulan blok kota generik. Peta ilustratif menampilkan jalan tanah berkelok, sungai kecil, rumah beratap merah, kebun berpagar, lapangan warga, pasar, dapur, pepohonan, dan bunga.

Peta kota menampilkan enam lokasi yang saling terhubung oleh jalan utama, jalan lingkungan, dan jembatan:

- Dapur MBG.
- Balai koperasi desa.
- Pasar sore.
- Gang Bambu.
- Hutan kota.
- Kebun Cempluk.

Pin lokasi berada di atas landmark yang cocok. Klik pin atau area peta akan memilih lokasi terdekat, lalu panel samping menjelaskan tempat tersebut sebelum tombol masuk digunakan. Untuk tahap produksi ini, Dapur MBG adalah satu-satunya titik dengan area 3D yang sudah dirancang; titik lain tetap tampil di peta, tetapi belum bisa dimasuki sampai area uniknya siap. Kota lain juga ditampilkan sebagai tujuan yang akan dibuka setelah Kampung Sore matang.

## Area 3D dan batas gerak

- Area perdana berukuran sekitar 50 × 50 satuan permainan agar pemain bisa berjalan cukup jauh dan melihat beberapa bagian kampung dalam satu kunjungan.
- Jalan tanah utama melewati persimpangan tengah. Cabang dan tujuannya disusun seperti ini:
  - Barat: Kebun Cempluk.
  - Timur: Balai Kopdes, melalui jembatan sungai.
  - Timur laut: Hutan Kota, melalui jembatan sungai.
  - Tenggara: Pasar Sore, melalui jembatan sungai.
  - Utara: Kampung Bambu.
- Dapur MBG berada di barat daya persimpangan dan punya jalur masuk pendek tersendiri. Celah pagar mengikuti jalan yang keluar di sisi kampung.
- Dapur MBG berada di sisi barat daya dekat persimpangan, dengan jalur masuk tersendiri. Rumah, dapur, kandang, pepohonan, NPC, hewan, benda petunjuk, dan pagar ditempatkan sebagai penghalang yang tetap.
- Area menampilkan manusia dengan wajah dan pakaian, ayam, kucing, kambing, pepohonan berbatang dan bercabang, rumput bertekstur, serta jalan tanah. Bentuk tersebut menjadi bahasa visual Kampung Sore, bukan bentuk geometri abstrak.
- Gerak dibatasi batas area dan memakai pemeriksaan jarak antara karakter dan collider berbentuk kotak.
- Cempluk berhenti ketika menabrak bangunan utama, rumah, kios, meja dapur, batang pohon, benda petunjuk, petak kebun, atau NPC.
- Daun/ranting di atas kepala tidak menjadi penghalang. Pemain masih bisa mendekati petunjuk dan warga untuk berinteraksi.
- Keyboard dan joystick sentuh memakai aturan tabrakan yang sama.
- Lokasi, titik di peta, posisi pemain, arah kamera, dan petunjuk yang ditemukan disimpan di penyimpanan browser. Muat ulang saat berada di Dapur MBG akan mengembalikan pemain ke titik terakhir, bukan memulai dari awal.

## Susunan ruang editor

Editor memakai navigasi samping pada desktop dan navigasi ringkas pada ponsel.

- **Ringkasan:** status episode, jumlah ide warga, serta pintasan ke pekerjaan utama.
- **Editor episode:** judul, hook, tugas, catatan warga, saksi, petunjuk, dan akhir cerita.
- **Inbox warga:** komentar yang dicatat manual, status seleksi, dan tindakan memasukkan ide ke episode.
- **Pengaturan lokal:** status penyimpanan MySQL, cakupan kota yang sedang dibuat, dan keterangan pencatatan komentar manual.

Setiap halaman punya judul, keterangan singkat, dan satu tugas utama. Formulir episode dipecah menjadi bagian cerita, petunjuk, dan penutup agar tidak terasa seperti formulir panjang tanpa arah.

## Syarat selesai untuk tahap ini

- Satu kota dapat dipilih dan dipahami lewat peta sebelum pemain masuk.
- Setiap pin kota memilih lokasi yang benar dan memperbarui kartu informasi.
- Peta kota menampilkan landmark yang berbeda dan lokasi dapat dipilih secara terpisah.
- Area 3D menampilkan lingkungan kampung yang berwarna dan Cempluk mudah terlihat.
- Cempluk tidak menembus penghalang lingkungan yang ditentukan.
- Ruang editor memiliki navigasi dan halaman terpisah dengan fungsi yang jelas.
- Database tetap menyimpan episode dan inbox ide warga.
