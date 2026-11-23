# Riset dan arah visual

Ditinjau 23 November 2026. Sumber dipakai untuk prinsip desain dan ciri visual, bukan janji bahwa semua fitur rujukan telah dibuat di Republik.

## Rujukan permainan

| Sumber primer | Pelajaran yang diterapkan |
|---|---|
| [Palia — Game Design Philosophy](https://support.palia.com/hc/en-us/articles/7474545281556-Game-Design-Philosophy) | Kegiatan hidup, rumah, dan komunitas dapat menjadi inti permainan; kegiatan perlu menyenangkan saat dilakukan. Dokumen filosofi bertanggal 2023, bukan daftar fitur terkini. |
| [Palia — Social Features](https://support.palia.com/hc/en-us/articles/7475337549076-Social-Features) | Kemajuan solo tetap berarti; kerja sama dan kontribusi bersama menambah alasan bertemu. Pernyataan rencana pada sumber tidak dianggap fitur yang sudah dirilis. |
| [Stardew Valley — berita resmi](https://www.stardewvalley.net/category/news/) | Catatan multiplayer membedakan keadaan dunia bersama dari inventaris/keterampilan pribadi. Prinsip pemisahan itu dipakai pada rancangan data. |
| [Kampung Komen — pilot](https://app.kampungkomen.id/pilot.html) | Antarmuka publik memperlihatkan identitas warga, kustomisasi dan navigasi sosial. Pengamatan halaman tidak membuktikan backend atau seluruh fitur berjalan. [Halaman games](https://app.kampungkomen.id/games.html) belum memberi isi terbaca yang cukup untuk menyimpulkan ekonomi/klasemen. |

Sintesis desain Republik: profesi menghasilkan sesuatu yang berguna untuk pemain atau proyek; proyek mengubah kota dan membuka kegiatan berikutnya. Ini usulan proyek sendiri berdasarkan kebutuhan pengguna, bukan klaim keunikan absolut terhadap semua game.

## Profesi dan penampilan

Sumber visual dibaca sebelum menyusun pemetaan. Profesi dengan seragam memiliki ciri yang harus dikenali; profesi tanpa seragam baku menggunakan pilihan kreatif yang dijelaskan. Warna kulit dan bentuk wajah bukan bukti kemampuan, kecantikan, pekerjaan, atau identitas pemilik akun. Pemain tetap dapat menggantinya.

| Kelompok | Ciri yang dipakai | Dasar dan batas |
|---|---|---|
| Polri | Atasan cokelat muda, bawahan cokelat tua, sabuk/sepatu gelap, penanda seragam | [Indonesia Baik — beda seragam polisi dan satpam](https://indonesiabaik.id/infografis/beda-seragam-polisi-dan-satpam). Avatar memakai adaptasi kostum fiksi; bukan pengangkatan pangkat nyata. |
| Buruh/konstruksi | Rompi oranye dengan strip reflektif, helm keselamatan dan sepatu kerja | [Kementerian PU — Spesifikasi Umum 2025](https://binamarga.pu.go.id/uploads/files/2104/Spesifikasi-Umum-2025-untuk-Pekerjaan-Konstruksi-Jalan-dan-Jembatan.pdf), bagian APD pekerjaan jalan; [PUPR Magetan — rompi APD](https://pupr.magetan.go.id/2025/06/16/penyerahan-secara-simbolis-rompi-apd/). Rujukan visual untuk kostum, bukan panduan keselamatan kerja. |
| Tenaga kesehatan | Pakaian klinis/jas, sepatu praktis, stetoskop sebagai pilihan desain | Kategori sangat luas. Saran awal memakai figur dokter; tidak mengklaim semua tenaga kesehatan harus memakai jas/stetoskop. [Contoh ketentuan pakaian kesehatan Kemhan](https://www.peraturan.go.id/files/bn1156-2017.pdf) terbatas pada instansi dan konteks dokumennya. |
| ASN/TNI | Opsi seragam sipil khaki dan kamuflase dari katalog yang ada | Adaptasi aset proyek yang harus ditinjau fit/warna; belum simulasi lengkap seluruh instansi, matra, pangkat atau aturan dinas. |
| Guru/pelajar/mahasiswa/swasta | Pakaian rapi atau kasual, tas/kacamata sesuai saran | Tidak ada satu pakaian yang mewakili semua orang pada kategori ini; dipilih agar peran mudah dibaca tanpa mengunci editor. |
| Tani/nelayan/peternak/pengemudi/pedagang | Pakaian kerja praktis, bawahan sesuai kegiatan, sepatu dan penutup kepala | Interpretasi kegiatan, bukan generalisasi semua pekerja. |
| Koki | Topi putih baru yang mengikuti rig, kemeja putih, celana gelap, sepatu tertutup; tanpa jam tangan | [Culinary Institute of America — panduan ProChef](https://ciaprochef.com/wp-content/uploads/2024/04/ProChefLevelI_StudyGuide-1.pdf), bagian pakaian dapur. Kostum masih adaptasi kemeja katalog, belum jaket double-breasted/apron lengkap. |
| Kreatif/rumah tangga/pensiunan/lainnya | Saran pakaian dari katalog, aksesori sesuai konteks, penjelasan bila bukan seragam baku | Kategori umum mendapat tampilan umum; tidak mengarang jabatan atau alat khusus yang belum ada. |

Kontrak implementasi ada di `game-src/citizen-professions.json` dan `citizen-professions.js`: **23 pilihan master awal × dua model = 46 rekomendasi**. Ini kombinasi terkurasi dari badan, wardrobe, rambut dan aksesori yang tersedia, bukan 46 GLB baru. Pilihan master baru yang ditambahkan admin perlu profil visual tersendiri; sebelum itu UI memberi saran umum secara jujur.

Setiap rekomendasi tetap dapat diedit: profil tubuh, kulit, wajah, rambut, atasan, bawahan, sepatu dan aksesori. Jenis celana dipilih menurut kegiatan; tidak semuanya ketat atau semuanya gombrang. Pilihan manual tidak diganti diam-diam ketika profesi berubah. Rekomendasi untuk dua model tidak menganggap bentuk tubuh atau pakaian sebagai validasi jenis kelamin seseorang.

### Penerimaan avatar

[Lembar review 8 contoh profesi](../docs/characters/profession-onboarding-review.jpg) memakai konfigurasi rekomendasi aktual dan GLB asli: polisi, konstruksi, medis dan koki, masing-masing dua gender. Koki mendapat topi baru setelah pemeriksaan pertama; rambut medis perempuan dirapikan ke belakang. Gambar adalah render offline idle, bukan verifikasi seluruh gerak pada browser.

- Periksa seluruh kombinasi terhadap katalog dan jenis aset; jangan menerima ID opsi yang tidak tersedia.
- Periksa pasangan perempuan/laki-laki pada peran berisiko tumpang tindih: polisi, konstruksi, medis dan pakaian berlapis.
- Lihat depan/samping serta idle/jalan: helm/topi pas, rambut tidak tembus, sepatu dan bawahan menutupi tubuh dengan baik, aksesori mengikuti rig.
- Kartu dan editor harus menampilkan identitas yang dipilih tanpa memuat semua model serentak.
- Tes data/DOM dan render Blender membantu pemeriksaan; penerimaan WebGL, warna layar, animasi serta performa tetap perlu browser/perangkat sasaran.

## Peta

Atlas diperlakukan sebagai peta bergambar: laut biru kehijauan, lapisan pantai, hijau daratan, tanda hutan/pegunungan, sedikit awan bergerak, pin kota dan ruang kosong yang terbaca. Relief ilustratif bukan peta ketinggian terukur. Tiga kota berbagi daratan utama; dua kota lain berada di pulau tersendiri.

Pantai atlas dan terrain berasal dari fungsi yang sama. Mempercantik atlas tidak boleh menciptakan daratan yang tidak ada di jelajah atau memindahkan koordinat kota. Peta regional menampilkan wilayah kota; siteplan tetap denah rinci, bukan seluruh kota yang dipaksa ke satu kotak.

Klik kota membuka wilayah langsung. Kontrol **+**, **−**, **Lihat semua** bekerja untuk zoom dan mengembalikan posisi awal. Ikon lama menyerupai penanda lokasi padahal hanya reset; ikon frame dan label baru memperjelas fungsi. Kontrol ini tidak memakai GPS atau menentukan posisi pemain.

Target penerimaan: nama tidak bertabrakan pada ponsel, seluruh atlas terlihat saat reset, drag/pinch/keyboard bekerja, tap kota tidak perlu klik kedua, rencana lahan tidak tergambar sebagai gedung yang sudah selesai. Render offline seni peta tidak menggantikan pemeriksaan interaksi browser.

[Review seni atlas](../docs/world/atlas-onboarding-review.jpg) berasal dari SVG runtime tanpa lapisan tombol/label HTML. Tes DOM memeriksa navigasi/label secara terpisah; pemeriksaan browser tetap tercatat pada A-10.
