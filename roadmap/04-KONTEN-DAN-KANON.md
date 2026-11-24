# Konten, kanon dan game

## Episode aktif: Day 3 R3 pendek

**33 shot / 113,48 detik, 21 dialog**, sudah terpasang menggantikan versi panjang. Narator tiga bagian; Sari memandu daftar/profesi/avatar/Kartu Warga, subsidi dan 1.000 koin, jelajah/chat/tugas Bu Rani serta usulan pembangunan. Oke Gas mengiringi montase 20 detik tanpa narator; papan rumah Demian terbaca sebelum reaksi; akhir mengembalikan kredit kepada Climenzo. Antarmuka merupakan simulasi berlabel; bukti fitur lokal tidak menggantikan smoke test domain server. Review dengar/MP4 penuh tetap terbuka. Gedung ekonomi tidak dibangun dalam montase R3; alur usaha penuh tidak diiklankan sebagai aktif. Playback tetap tidak memublikasikan fase dunia.

## Riwayat penyusunan sebelum penerapan R3

**Penerapan kecil setelah draf:** gestur Pasca pada adegan mengambil kredit, menepis koreksi dan mengelak sudah terpasang di episode aktif. Alamat memakai klip Gufron baru “republik wekawekaweka dot kom”; acuan dan R3 mengikuti pelafalan itu. Tidak menambah ungkapan khas yang tidak relevan ke dialog. Runtime 42 shot / 260,67 detik; R3 dua menit tetap pekerjaan terpisah, bukan otomatis selesai. Review audio/visual manusia belum selesai.

**Draf editorial terbaru:** [Day 3 R3](../docs/script/003-day-3-script-r3-draft.md), target sekitar dua menit (123 detik perkiraan), masih script sesuai permintaan pengguna. Oke Gas khusus montase pembangunan, pelafalan Wekawekaweka tersambung, papan rumah Demian terbaca dan demo game melalui percakapan. Belum mengganti susunan penuh episode 42 shot; pengecualian gestur dan klip alamat dicatat di atas. Klaim fitur “sekarang” wajib lolos smoke test server sebelum publikasi.

## Paket Day 3 — 24 November 2026

[Konsep](../docs/script/003-day-3-concept.md) dan [42 shot](../docs/script/003-day-3-scenes.md): **Uangnya Warga, Jasanya Presiden**, 260,67 detik terukur. Intro narator dimulai dari udara, turun melewati sungai, baru membuka panggung. 42 suara, envelope dan subtitle memakai timing audio; mix penuh belum didengarkan dan MP4 belum diterima. Rumah Livia pink bertingkat; Angel vila mewah bernilai cerita Rp200 miliar (bukan saldo/harga transaksi akun). Form usulan game mengirim ke inbox admin, tidak otomatis mengesahkan pembangunan. Day 1/Day 2 dan draf suntingan tetap dipertahankan.

Pembangunan enam tempat ibadah, sekolah, rumah sakit, stadion, damkar, polisi, kodim, lima fasilitas ekonomi dan 48 rumah mengikuti arahan pemilik, bukan hasil survei yang dikarang. Keadaan publik tetap memakai versi server; tidak ada publikasi fase Day 3 dari playback/seek/ekspor. Target episode belum menyatakan total biaya maupun sisa dana dari sumbangan 5 T.

Promosi memakai **republikwkwkwk.com**. Simulasi pendaftaran bukan akun nyata. Rumah subsidi privat + 1.000 Koin Republik + satu set alat sudah berfungsi pada paket lokal E-01a/E-02a; rilis dan smoke test server wajib sebelum promosi publik. Siklus jual beli tetap berlabel **DALAM PENGEMBANGAN**. Paket awal tidak mensyaratkan follow; rumah perintis memerlukan klaim identitas terverifikasi.

## Dua jalur yang saling memberi bahan

Game mengatur apa yang bisa dilakukan pemain serta progres yang disimpan. Produksi mengatur cerita, kamera, audio, pemeran dan ekspor. Keduanya memakai geometri/avatar yang sama jika sesuai, tetapi mempunyai data dan hak akses terpisah.

**Episode tayang → sejarah dunia. Komentar → usulan. Usulan terpilih → rancangan dan fitur. Fitur siap → publikasi dunia. Kejadian bermain → bahan episode berikutnya.**

Pemain dapat memahami tujuan tanpa harus menonton video. Pendaftaran warga memberi akun dan kartu game; tampil sebagai pemeran video tetap pilihan kreatif. Daftar 48 tokoh cerita tidak boleh ditampilkan seolah semuanya akun sungguhan yang sedang online.

## Kanon yang harus dipertahankan

- Pasca Bowow adalah presiden fiktif dengan watak yang tercatat pada [acuan produksi](../docs/PROMPT_ACUAN_PRODUKSI_KONTEN.md). Semua pemain adalah warga, bukan masing-masing presiden.
- Day 1 menjanjikan Koplak Desa dan SPPG. Day 2 membangun serta meresmikannya sebelum survei kebutuhan berikutnya.
- Dua gedung tersedia pada fase sesudah Day 2, yang menjadi seed dunia server. Hunian awal tetap fondasi. Proyek rumah contoh P01 bisa diaktifkan admin untuk pilot konstruksi; belum menjadi rumah pribadi atau layanan lengkap dua gedung.
- Enam pilihan survei mengikuti naskah aktif: periksa `game-src/production-day2-script.json` sebelum menuliskan opsi/hasil. Jangan menyatakan dana habis, klinik menang, atau warga diangkat menjadi pejabat tanpa keputusan.
- Jakartawa menjadi titik awal. Kota lain masih lahan; nama dan koordinat memakai layout dunia yang sama.
- Pemilik menyetujui **Wisma Warga** dan NPC petugas **Bu Rani** sebagai perluasan game pada 23 November 2026. Wisma memberi akses kamar per akun melalui tugas sambutan, tanpa mengambil salah satu dari 24 petak. Bangunan ini mengikuti rilis game, terpisah dari dua fase set Day 2 dan proyek P01. Naskah, suara, kamera, hasil survei dan rekaman episode lama tidak berubah. Penulis dapat memakai perluasan ini untuk episode berikutnya setelah penerimaan fitur.

## Proses keputusan yang dituju

1. Catat masukan: episode/post asal, tanggal, usulan, alasan kebutuhan dan jumlah dukungan yang dapat diperiksa.
2. Pemilik meninjau; tandai `usulan`, `dipilih`, `dirancang`, `dikerjakan`, `siap uji`, atau `diterbitkan`. Komentar terbanyak tidak otomatis memicu perubahan database.
3. Pengembang menghubungkan keputusan dengan ID tugas roadmap, kemampuan game yang dibutuhkan dan aset. Catat batas bila cerita mendahului gameplay.
4. Uji fitur dan siapkan perubahan dunia. Menu admin **Dunia bersama** mencatat versi, pelaksana, waktu dan alasan publikasi. Tulis sumber keputusan pada alasan. Penggantian fase harus ditinjau; tidak menghapus kontribusi proyek.
5. Penulis melanjutkan cerita dari keadaan yang benar-benar ditetapkan. Ikuti [acuan produksi](../docs/PROMPT_ACUAN_PRODUKSI_KONTEN.md) untuk sinematografi, suara sesuai tokoh, label nama kontekstual dan penerimaan video.

Publikasi dunia global sudah diimplementasikan melalui API admin dan database. Pembukaan, pemutaran penuh, seek dan ekspor episode **tidak** menulis fase dunia. Nilai `worldPhaseOnComplete` pada metadata episode tidak memberi hak publikasi. Peta/denah/minimap/jelajah publik membaca keadaan server dan mengabaikan fase localStorage lama. Rumah contoh P01 adalah draft pilot, **bukan pemenang survei** dan bukan penetapan cerita episode berikutnya.

## Catatan setiap episode berikutnya

Simpan kondisi awal/akhir, perubahan kanon, pemeran dan suara, kemampuan yang sudah tersedia, aset/fitur baru yang diperlukan, pertanyaan kepada warga, serta status penerimaan video. Perubahan isi episode dikerjakan pada jalur produksi sendiri; pekerjaan onboarding dan peta ini tidak menulis ulang naskah/audio Day 2.

## Perluasan rumah perintis, 24 November 2026

Atas permintaan pemilik, semua 48 identitas unik pada roster gelombang pertama mendapat eksterior rumah bernama di Kampung Perintis. Ini perluasan game setelah paket Wisma, bukan penulisan ulang pembangunan Day 2. P01-P24 dan proyek contoh tetap utuh. Studio tidak mengimpor kawasan baru secara otomatis; penulis dapat menggunakannya pada episode berikut setelah integrasi set disiapkan.

Reservasi rumah bukan bukti akun game atau status follow terverifikasi. DD dideduplikasi sesuai roster saat ini. Klaim rumah dan keterlibatan dalam konten adalah proses berbeda; mengikuti akun medsos tidak menjanjikan jabatan, tampil di semua episode, atau rumah baru untuk semua follower mendatang. Lihat aturan terbaru pada [dokumen 06](06-GAME-HIDUP-DAN-HUNIAN.md).
