# Rencana game hidup, rumah warga dan klaim identitas

**Keputusan produk 24 November 2026. Baseline kode: `f719128`.** Dokumen ini menggabungkan ide server yang dikirim pemilik (kehidupan pribadi, saling membutuhkan, kota berubah) dengan prototipe lokal (konstruksi P01, tugas Bu Rani, kamar dan dekorasi), serta permintaan terbaru rumah bagi warga cerita. Ini rancangan pengembangan; fitur rencana tidak otomatis dianggap tersedia.

## Pengalaman yang ingin diwujudkan

**Pembaruan implementasi 24 November:** E-01a/E-02a menyediakan satu grant 1.000 koin, alat sesuai profesi saat grant, serta rumah subsidi privat melalui Wisma. Rumah ini tidak mengambil petak perintis/P01 dan tidak mengubah aturan klaim H-03. Progres tugas/dekorasi lama tetap tersimpan; belanja, transfer dan akses rumah perintis belum aktif. Rincian terbaru di dokumen 08; tabel tahap awal Wisma di bawah adalah riwayat fondasi.

**Tinggal, berkarya, bertetangga, lalu melihat republik berubah.** Rumah memberi tujuan pribadi; pekerjaan memberi aksi yang menyenangkan; pesanan menghubungkan profesi; proyek memberi hasil bersama. Humor Pasca dan warga hadir dalam percakapan singkat serta kejadian kota. Pemain baru tetap bisa menikmati game tanpa menonton episode.

Contoh sesi 15–20 menit yang dituju, bukan durasi yang sudah teruji: pemain keluar rumah, memilih satu dari tiga kebutuhan di papan kampung, mengantar bahan ke Koplak atau membantu proyek, membuat papan nama sendiri, lalu mengunjungi tetangga. Saat keluar, ia sudah memperoleh satu hasil yang terlihat dan mengetahui kegiatan berikutnya. Besok kebutuhan berbeda, tetapi tidak ada hukuman kehilangan rumah atau rentetan hadiah karena absen.

| Pilar | Pengalaman konkret | Tahap pertama yang dibangun |
|---|---|---|
| Kehidupan pribadi | Rumah bernama, koleksi barang, penataan dan kemampuan | Kamar yang ada → klaim rumah perintis → interior/dekorasi lebih bebas |
| Pekerjaan menyenangkan | Memilih barang, membawa, memasang, merancang motif; bukan menunggu angka naik | Tiga pesanan logistik berbeda, konstruksi yang sudah ada, satu papan nama kreatif |
| Saling membutuhkan | Hasil tukang/pelukis/kurir dipakai warga lain | Pesanan asinkron; layanan cadangan ketika profesi tertentu offline |
| Kota berubah | Bahan terpasang, toko mendapat stok, fasilitas membuka layanan | Proyek aktif dan papan kontribusi; Koplak menjadi titik pesanan setelah fitur siap |
| Kehidupan sosial | Bertemu tetangga, menyapa, undangan, panggung | Blokir/lapor dahulu, lalu tamu rumah dengan izin dan acara kecil |
| Identitas republik | Pasca berkomentar, Demian tampil, warga punya cerita | Dialog pendek kontekstual; kejadian game menjadi bahan konten, bukan seluruh pemain dijadikan pemeran |

## Kota yang hidup tanpa memaksa kerumunan avatar

Kampung Perintis terdiri dari enam gang A–F, masing-masing delapan rumah. Pintu, papan nama, jalan gang dan pilihan tujuan membuat rumah mudah ditemukan. Kantor layanan, proyek dan alun-alun menjadi tempat bertemu. Suasana berikutnya dapat memakai lampu sore, suara lingkungan berjarak, hewan sesekali, dan jadwal tokoh terdekat. Jadwal tidak boleh menutup akses tugas dasar.

Jangan sekaligus memuat 48 avatar warga cerita ke dunia publik. Kehadiran akun online tetap berasal dari server. Nama/jabatan tokoh cukup tampil secara natural, tanpa tulisan “NPC”; tokoh otomatis tetap tidak dihitung sebagai pemain online atau diberi tombol chat pemain. Ketika pemilik rumah terverifikasi online kelak, jangan menggandakan avatarnya dengan pemeran otomatis.

Perluasan wilayah mengikuti kepadatan kegiatan: satu kampung lengkap dahulu. Kota lain tetap lahan. Contoh klinik/sekolah bukan hasil survei yang disahkan. Gunakan tugas kecil dengan akhir jelas; proyek kota tidak boleh hanya menjadi penggilingan ribuan klik.

## Siapa mendapat rumah?

**Revisi keputusan terbaru:** hak dasar yang dituju kini rumah subsidi standar + 1.000 koin + alat kerja, sesuai persetujuan pemilik. Tabel berikut mencatat implementasi lama yang tetap berjalan selama transisi. Jalur target dan transaksi pemberian baru mengikuti [dokumen 08](08-EKONOMI-DAN-STARTER-PACK.md); tidak boleh mengharuskan semua pemain membeli rumah pertama atau follow terlebih dahulu.

| Kelompok | Hak dasar | Kapan bisa dipakai |
|---|---|---|
| Semua akun baru | Kamar Wisma melalui tugas Bu Rani; boleh ikut pekerjaan | Sudah diterapkan, tanpa syarat follow |
| 48 warga cerita gelombang pertama | Satu rumah tapak bernama yang direservasi untuk identitas cerita | Eksterior/alamat sudah dibuat; akses akun menunggu verifikasi klaim dan interior |
| Pemain berikutnya | Kamar awal, lalu jalur peningkatan rumah melalui kegiatan | Jalur peningkatan belum dibuat; kapasitas blok perlu disiapkan sebelum menjanjikan petak |

Rumah perintis merupakan hadiah tempat tinggal/identitas dalam game, bukan hak properti dunia nyata atau kuasa jabatan. Zizi tetap mendapat reservasi sesuai permintaan semua warga cerita; status follow yang belum pasti tidak boleh dianggap sudah diverifikasi. DD polisi dan DD Kapolri adalah satu entri warga yang sama pada roster saat ini, sehingga mendapat satu rumah. Jika pemilik nanti mengoreksi bahwa dua orang berbeda, buat dua ID cerita dan alokasi tambahan melalui revisi yang tercatat.

Sumber alamat: `game-src/citizen-story-homes.json`, 48 ID rumah dan `storyCitizenId` tetap. Nama papan mengikuti nama warga cerita, bukan nomor akun. ID/alamat tidak berubah hanya karena urutan roster berubah. Jangan menghasilkan ulang koordinat dari indeks roster pada setiap login. Daftar lengkap: [register rumah](07-REGISTER-RUMAH-PERINTIS.md).

### Cara warga mengenali dan mengklaim rumahnya

**Username medsos tidak wajib untuk semua pendaftar.** Pada alur klaim rumah cerita, minta platform dan username asal komentar. Nama tampilan game boleh berbeda. Nama sama, foto sama, screenshot, atau login Google tidak membuktikan bahwa ia pemilik akun TikTok/Instagram tersebut.

Alur yang harus dibuat di server (`H-03`):

1. Pemain daftar/login, melengkapi profil, memilih **Klaim warga cerita**. Pilih platform, masukkan username, pilih nama cerita. Tampilkan alamat yang dicadangkan serta status bahwa klaim belum disetujui. Jangan menghalangi onboarding umum.
2. Server membuat kode tantangan acak sekali pakai dengan waktu berlaku. Pemain menaruh kode pada komentar baru di posting resmi dari akun asal, atau menyampaikan lewat percakapan akun resmi bila diperlukan. Sistem tidak mengirim pesan otomatis. Admin memeriksa akun/post yang benar, bukan hanya screenshot yang diunggah pengguna.
3. Untuk nama yang dahulu hanya display name, admin mencari komentar asal dan mencatat platform + identitas akun sebelum menyetujui. Handle yang sudah berubah atau dua orang bernama sama masuk peninjauan, bukan diberikan kepada pengklaim tercepat.
4. Admin melihat akun game, identitas cerita, rumah, bukti sumber dan kode, lalu menyetujui/menolak dengan alasan. Persetujuan mengikat rumah ke **ID akun game**, tidak ke nama yang mudah berubah. Kode tidak ditulis pada halaman publik atau log biasa.
5. Pemain melihat **Rumah saya — Rumah [nama] — alamat — petunjuk arah**. Papan publik tetap nama cerita; mengganti nama akun tidak merebut atau memindahkan rumah. Membuka pintu hanya boleh dilakukan setelah server memeriksa kepemilikan.
6. Klaim bersaing ditangani transaksi: satu rumah hanya punya satu pemilik, satu identitas cerita hanya terhubung sekali; batas satu hadiah perintis per akun. Retry persetujuan tidak menggandakan hadiah. Penolakan masih memungkinkan banding dengan bukti baru; pemindahan harus melalui admin dan riwayat, tidak dengan reset tabel.

Status klaim: `pending → approved/rejected`, tantangan `expired` dapat dibuat ulang. Reservasi rumah tidak dihapus otomatis ketika pemain belum mendaftar. Status follow dicatat terpisah dan bukan bukti kepemilikan akun. Jangan meminta password medsos, KTP, atau data pribadi yang tidak diperlukan. Bukti/kode hanya dapat dibaca pengaju dan admin sesuai kebutuhan; masa simpan bukti perlu ditetapkan sebelum rilis.

**Batas rilis lokal ini:** belum ada formulir klaim, API klaim, pengikatan akun ataupun interior 48 rumah. Papan nama adalah reservasi visual, bukan kepemilikan yang sudah diverifikasi. Kamar Wisma tetap berfungsi. Keputusan ini sengaja mencegah pemberian rumah kepada akun yang meniru nama follower.

## Kontrak implementasi limpahan server

Pisahkan `story_citizens` (identitas tokoh/sumber komentar), `story_homes` (ID rumah, alamat, pemilik nullable), `story_home_claims` (pengaju, tantangan hash, status, masa berlaku, bukti privat), dan catatan review. Bisa memakai penamaan sesuai konvensi proyek, tetapi pisahkan identitas cerita dari `citizens` dan `citizen_homes` yang sudah menyimpan kamar Wisma.

Seed hanya 48 ID/alamat dari register dengan insert idempotent; jangan membuat akun palsu untuk follower. Unique constraint untuk `home_id`, `story_citizen_id`, serta pemilik hadiah yang telah disetujui; persetujuan mengunci baris rumah dan klaim. Endpoint pemain menerima aksi/requestId/CSRF, bukan `owner_id` atau `approved` dari klien. Admin memerlukan sesi admin dan audit alasan. API publik hanya alamat/nama/status terbatas, tanpa bukti, email, kode atau ID akun privat. Penanganan penghapusan akun dan sengketa harus mempertahankan jejak kepemilikan yang sah.

Uji wajib: dua akun mengklaim satu rumah, nama serupa, ulang request, bukti expired, pergantian handle, hak baca bukti, cross-account, CSRF, admin approval berulang, rollback, reload/login ulang, dan tidak mengubah dekorasi Wisma. Setelah klaim siap, kerjakan pintu/interior rumah tapak sebagai tugas tersendiri.

## Urutan pengembangan dan pembagian kerja

| Urutan / ID | Pemilik pengerjaan | Hasil yang harus diserahkan | Syarat selesai |
|---|---|---|---|
| 1 · H-01/H-02 | Lokal | Rumah, nama/alamat, pencarian peta, kecepatan jalan/lari, label tokoh | Tes roster/geometri/navigasi + build; penerimaan layar terpisah |
| 2 · A-11/H-03 | Server | Rilis paket, migrasi lama bila belum ada, formulir/API/review klaim | Bukti domain nyata + tes klaim; perbarui checklist dan handover |
| 3 · H-04 | Lokal setelah kontrak H-03 disepakati | Rumah saya, pintu pemilik, interior rumah tapak dan penyimpanan dekorasi | Dua akun tidak saling masuk/mengubah; Wisma tidak kehilangan progres |
| 4 · P-02b/G-03c | Lokal + server sesuai kontrak data | Tiga pesanan, jenis barang, tujuan, inventaris umum dan ledger | Ada keputusan/aksi berbeda, dapat solo, reward idempotent; ukur rasa bermain |
| 5 · P-03a | Lokal | Membuat papan nama: motif, warna, hasil untuk rumah | Hasil terlihat dan tersimpan; teks aman, bukan hadiah angka saja |
| 6 · S-01/G-06 | Server API/moderasi, lokal UI | Izin tamu, mute/blokir/lapor dan undangan | Pemilik dapat mencabut akses; blokir berlaku pada undangan/chat |
| 7 · L-01/L-02 | Lokal | Suasana berjarak dan kejadian kota ringan, papan kebutuhan | Tetap lancar di HP; tokoh tidak menyamar sebagai pemain |
| 8 · S-02/S-03 | Setelah pilot inti | Pasar asinkron dan acara alun-alun | Transaksi tidak menggandakan barang; kegiatan dasar tetap solo |

Jangan mengerjakan tabel/endpoint yang sama bersamaan tanpa kesepakatan kontrak dan baseline commit. Pemilik memindahkan pekerjaan lewat commit/push/pull atas instruksinya. Pihak penerima mencatat SHA, migrasi yang benar-benar dijalankan, bukti tes dan sisa pekerjaan. Email/Google tetap tugas server tersendiri, tidak menjadi penghalang pembuatan konten lokal.

## Penerimaan yang menentukan langkah berikutnya

Pilot dengan pemilik dan beberapa warga: apakah mereka menemukan rumah, memahami status reservasi, menyelesaikan satu tugas tanpa arahan lisan, merasakan beda jalan/lari, dan tahu tujuan kembali? Catat masalah, waktu muat, frame time, query dan perangkat. Tiga pekerjaan yang berbeda, satu hasil untuk rumah dan satu manfaat bersama harus terbukti dahulu sebelum menambah banyak profesi atau kota.

Setiap perubahan wajib memperbarui dokumen ini bila keputusan berubah, checklist ID terkait, dan bagian paket terkini handover. Jangan mengganti centang implementasi menjadi klaim bahwa rilis/perangkat sudah diterima.
