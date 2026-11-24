# Roadmap Republik Wkwkwk

**Diperbarui 24 November 2026.** Acuan pengembangan game dan handover lokal–server. Konsep ini menggabungkan arahan pemilik proyek, gagasan server, serta kondisi kode pada baseline terbaru `5736160`. Paket revisi sinematik, lanskap dan usulan warga masih lokal; tidak ada push otomatis.

**Arah game:** simulasi kehidupan warga multiplayer dengan pembangunan kota bersama. Pemain memiliki kehidupan, kemampuan, barang, dan rumah sendiri; kerja mereka juga mengubah republik. Three.js dan backend PHP/MySQL yang ada tetap dipakai untuk tahap pertama.

## Mulai membaca

**Alamat game:** https://republikwkwkwk.com. Paket lokal terbaru sudah memberi rumah subsidi privat, **1.000 Koin Republik** dan satu set alat sesuai pekerjaan sekali per akun lengkap. Migrasi starter dijalankan lokal; server memerlukan migrasi dan smoke test. Belanja/usaha belum aktif. Progres Wisma tetap dipertahankan. Usulan pembangunan dalam game masuk ke inbox admin setelah migrasi tambahan; waktu dunia mengikuti server dengan zona Asia/Jakarta. Lihat [ekonomi dan starter pack](08-EKONOMI-DAN-STARTER-PACK.md).

1. [Konsep dan pengalaman bermain](01-KONSEP-GAME.md): apa yang membuat warga mau kembali.
2. [Tahapan dan checklist](02-TAHAP-DAN-CHECKLIST.md): status, ketergantungan, dan kriteria selesai.
3. [Handover server](03-HANDOVER-SERVER.md): perbaikan yang wajib dipertahankan, perubahan lokal, verifikasi, dan pekerjaan berikutnya.
4. [Konten dan kanon](04-KONTEN-DAN-KANON.md): hubungan episode, komentar, keputusan, dan fitur game.
5. [Riset dan arah visual](05-RISET-DAN-ARAH-VISUAL.md): rujukan desain, profesi/avatar, dan peta.
6. [Game hidup, hunian dan klaim](06-GAME-HIDUP-DAN-HUNIAN.md): sintesis ide server/lokal, aturan kepemilikan dan urutan kerja.
7. [Register 48 rumah perintis](07-REGISTER-RUMAH-PERINTIS.md): ID stabil, nama dan alamat reservasi.
8. [Ekonomi dan starter pack](08-EKONOMI-DAN-STARTER-PACK.md): subsidi, 1.000 koin, fasilitas dan siklus usaha.
9. [Audit panel admin](09-AUDIT-PANEL-ADMIN.md): fungsi setiap panel, koreksi konsep, bukti dan batas pemeriksaan.

## Keadaan sekarang

| Bagian | Keadaan sebenarnya |
|---|---|
| Game publik | Pendaftaran, profil/avatar, peta, presence dan obrolan tersedia. Konstruksi P01 menyimpan kit, XP dan kontribusi. Rumah subsidi privat melalui Wisma, saldo 1.000 dan alat awal tersedia setelah migrasi starter; tugas Bu Rani memberi satu tanaman dan rak persisten. Eksterior 48 rumah tapak bernama tersedia sebagai reservasi cerita. Klaim akun, interior rumah tapak, inventaris umum dan kunjungan belum tersedia. |
| Onboarding lokal terbaru | Saran avatar untuk 23 pilihan profesi awal × dua model gender, editor manual, kartu warga virtual, penyempurnaan login email/Google dan pelengkapan profil. Rincian penerimaan ada di checklist. |
| Dunia | Keadaan resmi di database, awal sesudah Day 2: panggung, 24 fondasi, Koplak Desa dan SPPG. Wisma Warga + Bu Rani adalah perluasan game yang disetujui, tidak ditambahkan ke rekaman episode lama. Admin mengaktifkan/menjeda P01; proyek masih draft, bukan hasil survei. Kampung Perintis ditambahkan di sebelah timur tanpa mengambil P01-P24. Empat kota lain belum dibangun. |
| Konten | Produksi hanya di admin. Day 1/Day 2 dipertahankan; Day 3 R3 memiliki 33 shot/113,48 detik, 21 dialog, Oke Gas kontinu 20 detik, 12 fasilitas dalam montase dan 48 rumah termasuk vila Livia/Angel. Review MP4 penuh dan dengar mix masih menunggu penerimaan. Pemeran konten dan akun pemain tetap berbeda. |
| Pekerjaan utama selanjutnya | Server: rilis/migrasi starter dan smoke test 11 panel, lalu klaim identitas H-03. Lokal berikutnya: pintu/interior H-04 setelah kontrak klaim siap. Uji alur sambutan–kamar serta konstruksi di HP/desktop (`P-07`, `A-10`), lalu variasi pesanan `P-02`, inventaris umum dan satu kegiatan kreatif `P-03`. Rilis server `A-11` dan email/Google tetap terpisah. |

## Cara memperbarui roadmap

- Sebelum mengerjakan perubahan, baca handover dan tugas yang terkait. Cocokkan dengan kode/commit yang benar-benar ditarik.
- Gunakan ID tugas yang tetap. `[x]` berarti kriteria pada baris itu telah dibuktikan; pekerjaan yang baru dirancang tetap `[ ]`.
- Setelah perubahan, perbarui status, bukti tes, batas yang tersisa, keputusan produk yang berubah, dan tugas berikutnya di handover. Jangan hanya menambahkan catatan di chat.
- Jika arah berubah, revisi konsep dan checklist terkait pada perubahan yang sama. Simpan alasan singkat agar server tidak menghidupkan konsep lama.
- Pisahkan **implementasi**, **verifikasi lokal**, **penerimaan perangkat sasaran**, dan **rilis server**. Build lokal atau tes DOM bukan bukti bahwa SMTP, OAuth, GPU perangkat, atau server produksi sudah bekerja.
- Jangan simpan kredensial, token, email pribadi, atau data identitas sensitif di roadmap. Jangan otomatis melakukan commit/push.

## Catatan keputusan

| Tanggal | Keputusan |
|---|---|
| 2026-11-23 | Pemain menjadi warga dengan profesi yang dapat dikembangkan; jabatan presiden/polisi dalam komentar tidak otomatis memberikan wewenang pada akun. |
| 2026-11-23 | Identitas permainan berupa Kartu Warga Republik. Email dan Google memverifikasi akses akun, bukan identitas hukum/KYC dokumen. |
| 2026-11-23 | Saran avatar mengikuti profesi dan gender; perubahan manual tetap milik pemain. Seluruh 23 profesi awal memiliki dua pilihan model. |
| 2026-11-23 | Satu klik kota membuka peta wilayah. Tombol bekas simbol lokasi berarti reset pan/zoom; labelnya menjadi **Lihat semua**. |
| 2026-11-23 | Prioritas berikutnya: dunia tersimpan server → tiga kegiatan + proyek → rumah → sosial/pasar → perluasan wilayah. Jenis proyek berikut belum diputuskan hasil survei. |
| 2026-11-23 | Dunia resmi dimulai setelah Day 2. Rumah contoh P01 menjadi proyek uji yang perlu aktivasi admin; tidak menggantikan hasil survei. Playback/seek/ekspor tidak menerbitkan dunia. SMTP dan Google dikerjakan nanti di server. |
| 2026-11-23 | Pemilik menyetujui kamar dasar untuk semua akun melalui Wisma Warga, dibuka dengan tugas pengantar singkat. Rumah berkembang lewat kegiatan; hadiah follower hanya kosmetik opsional, integrasi klaim belum dibuat. |
| 2026-11-24 | Implementasi lokal pertama: Bu Rani → paket ke Wisma → kamar + tanaman → rak tersimpan. HUD jelajah ditata dan LARI menjadi toggle yang terlihat pada mouse/sentuh. Belum merupakan penerimaan visual browser atau rilis server. |
| 2026-11-24 | Rumah bernama untuk 48 warga cerita di Kampung Perintis. Nama medsos opsional untuk pendaftaran umum; wajib pada pengajuan klaim warga cerita, diverifikasi sebelum ditautkan ke ID akun. Tanpa klaim otomatis berdasarkan nama. Label NPC dihapus; presence tetap hanya pemain nyata. |
