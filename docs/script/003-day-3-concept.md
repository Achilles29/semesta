# Day 3 R3 - Uangnya Warga, Jasanya Presiden

Versi aktif: 33 shot / 113,48 detik (1:53), 21 dialog. Lihat [naskah R3](003-day-3-script-r3-draft.md) dan [timing aktif](003-day-3-scenes.md). Pembangunan memakai Oke Gas 20 detik tanpa narator; pengenalan game dipandu Sari dan Demian. Mix penuh/browser/MP4 belum diterima. Bagian di bawah hanya riwayat konsep panjang yang telah digantikan.

# Riwayat konsep Day 3 sebelum R3

**Usulan revisi berikutnya:** [draf script R3 sekitar dua menit](003-day-3-script-r3-draft.md), dengan Oke Gas saat pembangunan, narator singkat dan demo game Demian–Sari. Susunan lengkap masih naskah; gestur Pasca dan klip alamat dot kom sudah diterapkan pada episode aktif.

Revisi 24 November 2026, baseline `5736160`. **42 shot, 260,67 detik**, utama 9:16. Naskah dan suara terukur terhubung ke Produksi Konten > Muat Day 3 terbaru. Belum penerimaan MP4 penuh/mix pada perangkat sasaran.

## Alur cerita

1. Narator membuka dari udara: hari ketiga, lima triliun sudah masuk, warga ingin melihat hasilnya. Kamera turun ke Sungai Ngalir, Danau Santuy, lalu menuju panggung Jakartawa. Presiden muncul setelah lokasi dan masalah jelas.
2. Pasca mengambil kredit pembangunan; Climenzo mengingatkan bahwa uangnya berasal darinya. Pasca mengaku berjasa menerima sumbangan. Warga menghadap panggung; kamera mengambil sisi depan mereka.
3. Eqa dan Cecil mengingatkan kebutuhan sekolah dan rumah sakit. Xel menata koridor pembangunan. Enam rumah ibadah dibangun bertahap, lalu sekolah, rumah sakit, stadion, markas damkar, kepolisian dan komando tentara republik. Bangunan utama bertingkat, dengan kolom, pintu masuk besar dan identitas terbaca.
4. Empat puluh delapan rumah bernama muncul di Kampung Perintis. Kamera mengunjungi vila pink dua lantai Livia dan Angel Grand Residence: tiga lantai, penthouse dan kolam atap. Nilai Angel Rp200 miliar hanya dalam cerita; bukan transaksi uang/saldo warga. Alamat dan reservasi tidak berubah.
5. Rumah sudah ada; penghasilan dari mana? Lima fasilitas ekonomi diperlihatkan sebagai rencana. Alur petani tetap berlabel **dalam pengembangan**, karena transaksi usaha belum tersedia.
6. Demian bertanya apakah penonton bisa ikut bermain. Narator memperkenalkan game, kemudian kartu animasi menampilkan pendaftaran di **republikwkwkwk.com**, profesi/avatar, kartu warga, rumah subsidi, 1.000 koin dan alat awal.
7. Jelajah, chat, tugas Bu Rani dan proyek yang diaktifkan admin dijelaskan sesuai kemampuan nyata. Form **Usulkan pembangunan** meminta fasilitas, lokasi dan alasan; hasilnya masuk ke inbox admin, bukan otomatis dibangun.
8. Narator menjelaskan klaim rumah bernama dan menenangkan warga yang belum muncul: belum tampil bukan dilupakan; penataan dilakukan bertahap. Tidak menjanjikan jabatan, tanggal atau klaim berdasarkan nama.
9. Pasca mengaku berjasa jika usaha warga berhasil. Climenzo bertanya siapa bertanggung jawab jika sepi. Pasca membentuk tim evaluasi; Demian menyindir kebutuhan kantor baru. Penutup: republik mulai berdiri, warga yang menghidupkan. Ajakan menyebut nama usaha dan barang yang ingin dijual, dengan domain tetap terlihat.

## Pelaksanaan

- Sumber naskah: `game-src/production-day3-script.json`; kamera/akting: `production-day3.js`; audio: `production-day3-audio.json`.
- 42 klip dipotong dari delapan master yang disimpan. Word timing dan envelope berasal dari hasil audio, bukan pembagian kata perkiraan.
- Musik seri dan Foley konstruksi memakai timeline yang sama untuk preview/ekspor. Waktu cerita ditetapkan; jam server mengatur siang/malam gameplay.
- Sungai, danau, palet dan jenis tanaman dipakai bersama dengan jelajah. Fasilitas Day 3 tetap staging sampai ada publikasi dunia yang disetujui; memutar episode tidak menerbitkannya.
- Rumah Livia/Angel adalah variasi eksterior perintis yang disetujui pemilik. Tidak memberikan akun atau kepemilikan otomatis.

## Pemeriksaan

Uji seek deterministik, 17 tapak/48 rumah tanpa overlap, tiga rasio kamera, jadwal audio, draf tersimpan, isolasi episode dan render offline telah dilakukan. Review menemukan kamera dialog tertutup pohon; sudut diperbaiki dan dirender ulang. Gambar offline memakai pencahayaan netral Blender, bukan bukti warna/FPS/flicker WebGL. Mix WAV dibuat dari jadwal runtime; dengar penuh dan MP4 masih wajib sebelum unggah.

[Rincian shot dan dialog](003-day-3-scenes.md) | [Pratinjau offline](day3-r2-visual-review.jpg) | [Provenance suara](day3-voice-provenance.json)
