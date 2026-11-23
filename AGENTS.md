# Workflow proyek

- Jangan otomatis mem-push perubahan proyek ke remote. Jalankan `git push` untuk publikasi perubahan hanya jika pengguna memintanya secara eksplisit untuk pekerjaan yang sedang berlangsung.
- Selesaikan perubahan, verifikasi yang relevan, dan build lokal sebelum melaporkan hasil.
- Untuk pengembangan game, baca `roadmap/README.md`, checklist dan handover server sebelum mengubah kode. Setelah perubahan, perbarui tugas terkait, bukti verifikasi, batas yang tersisa, keputusan yang berubah, dan pekerjaan berikutnya. Jangan mencentang pengujian layanan eksternal/perangkat hanya berdasarkan tes unit atau build.
- Jadikan `roadmap/` acuan konsep game terbaru. Produksi konten mengikuti `docs/PROMPT_ACUAN_PRODUKSI_KONTEN.md` dan kanon; jangan mencampur pemutaran episode dengan perubahan dunia publik. Pertahankan perbaikan server yang tercatat di handover kecuali tugas baru memang memerlukan perubahan yang diuji.

- Untuk rumah/identitas warga, baca `roadmap/06-GAME-HIDUP-DAN-HUNIAN.md` dan register 07. Jangan memberikan kepemilikan berdasarkan nama akun atau mengubah ID/alamat rumah karena urutan roster. Klaim medsos harus diverifikasi sebelum ditautkan ke ID akun.
- Handover wajib menyebut baseline commit, lingkup paket, migrasi yang benar-benar dijalankan, bukti verifikasi, batas fitur, ID tugas berikut beserta pemilik lokal/server dan kriteria selesai. Perubahan keputusan harus memperbarui konsep, checklist dan handover pada paket yang sama.
