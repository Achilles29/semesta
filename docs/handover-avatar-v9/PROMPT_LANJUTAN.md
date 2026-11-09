# Prompt lanjutan di server

Salin teks di bawah ke thread pengembangan pada repository server:

---

Lanjutkan pengembangan avatar game ini dari handover `docs/handover-avatar-v9/README.md`. Baca handover dan periksa kondisi repository serta aset terlebih dahulu; jangan menganggap semua berkas untracked dari komputer asal sudah terkirim lewat Git. Bila sumber V9/V8 atau adapter belum tersedia, laporkan path yang kurang dan minta transfer, jangan membuat ulang model dari nol.

Versi kandidat terbaru adalah `ilustrasi/avatar-v2/farmer-v9-friendly-face/`, menggunakan tubuh CC0 yang posturnya sudah saya sukai. Jangan kembali ke V5 atau eksperimen V6 dengan render bernama `front.png` dan sejenisnya. V9 belum menjadi avatar default game dan belum saya setujui secara visual.

Prioritas saya: wajah ramah seperti arah referensi gameplay Cloud FF7/Zidane FF9, bukan wajah menyeramkan. Gunakan referensi lokal yang tercatat di handover. Pertahankan postur tubuh, periksa kepala/leher, rambut depan-belakang, sambungan bahu/pinggul, serta transisi kaki ke sepatu. Bandingkan front, left, back, dan close-up pada skala yang setara sebelum menentukan perbaikan.

Mulai dengan menguji ulang ekspor V9 terakhir di browser: perbaikan scalp/topi dan sambungan leher terakhir belum selesai diuji ulang. Periksa tanpa topi, warna kulit terang/gelap, pergantian seluruh slot/warna, dan delapan animasi. Untuk pengujian browser lokal gunakan Chrome profil Namua (shopee) bila tersedia; jika tidak tersedia pada lingkungan server, sampaikan keterbatasannya. Jangan menyalin profil pribadi atau mengklaim tes browser yang tidak dilakukan.

Setelah visual memadai, lanjutkan integrasi staging agar pilihan pakaian, aksesori, rambut, dan warna tidak mengembalikan model ke avatar lama. Gunakan adapter `game-src/avatar-farmer-v8.js` yang juga mendukung V9, capability yang benar-benar tersedia, dan konfigurasi lengkap untuk `setAppearance()`. Selaraskan Avatar Studio, avatar pemain, API penyimpanan, pemuatan ulang, serta URL/cache model. Jangan mengada-adakan pilihan pakaian yang belum memiliki mesh.

Jalankan tes numerik dan validator GLB dalam handover, build pada staging, serta uji visual dan simpan/reload konfigurasi. Pisahkan bukti lulus struktur dari penilaian visual; status belum premium pada validator tidak berarti GLB rusak. Jangan mengklaim persis sama dengan referensi atau selesai sempurna tanpa bukti.

Jaga perubahan pengguna yang sudah ada. Jangan reset worktree, mengubah kredensial/database, atau deploy langsung ke produksi. Simpan checkpoint sebelum generator menimpa aset. Sampaikan hasil, file yang berubah, bukti pemeriksaan, dan keterbatasan yang masih tersisa secara jujur.
