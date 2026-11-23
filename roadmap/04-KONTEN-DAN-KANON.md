# Konten, kanon dan game

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
