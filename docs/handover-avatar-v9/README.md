# Handover pengembangan avatar — 10 November 2026

## Posisi terakhir

Proyek memakai CodeIgniter 3, PHP/MySQL, Three.js, dan Vite. Lanjutkan pekerjaan avatar dari **V9**, di `ilustrasi/avatar-v2/farmer-v9-friendly-face/`. Model ini masih kandidat, **belum menjadi avatar default game dan belum mendapat persetujuan visual akhir pengguna**.

Pengguna menyukai postur mesh CC0: pertahankan tubuh tersebut. Jangan kembali ke avatar primitif V5 atau eksperimen `front.png`, `left.png`, dan `back.png` tanpa awalan di folder V6. Render V6 yang disukai adalah `farmer-v6-cc0-base-study-*.png`. Permintaan terakhir sebelum handover: wajah jangan menyeramkan; arahkan ke wajah gameplay Cloud FF7/Zidane FF9, bukan versi sinematik. Pilihan warna kulit, pakaian, rambut, dan aksesori harus tetap bisa diimplementasikan dalam game.

## Yang sudah dikerjakan

- V8 memperkecil kepala, menebalkan torso, memperbaiki rambut, sambungan boot, dan pivot rig. Tubuh berasal dari Blender Studio Human Base Meshes (CC0), bukan model hasil ekstraksi game komersial.
- V9 mengganti wajah dewasa dengan kepala bergaya JRPG, rahang lebih kecil, hidung kecil, mata almond mengikuti permukaan wajah, iris teal, alis, dan senyum tipis. Sambungan kepala-leher serta ukuran scalp/topi juga diperbaiki.
- Runtime modular berada di `game-src/avatar-farmer-v8.js`; nama V8 sengaja tetap dipakai oleh V9. Deteksinya terhubung melalui `game-src/avatar-character-3d.js`.
- Kontrak aset: `semesta-farmer-v8-legacy19`, 19 tulang, delapan animasi: Idle, Walk, Run, Interact, Wave, Hoe, Watering, Harvest. Ini bukan skeleton baru pada draft spesifikasi V2.
- Pilihan nyata: overall/kaus, topi/tanpa topi, tas/tanpa tas, sarung tangan/tangan biasa, rambut pendek/tanpa rambut. Delapan warna: kulit, rambut, kaus, celana, sepatu, topi, sarung tangan, tas. Pakaian lain belum dibuat.

## Berkas yang harus tersedia di server pengembangan

Semua path berikut relatif terhadap root proyek. **Folder handover ini hanya teks, bukan paket aset. Banyak aset dan skrip lokal masih untracked; push dokumen ini tidak otomatis mengirimkannya.** Periksa keberadaannya sebelum mulai. Bila belum ada, minta transfer berkas berikut dari komputer asal; jangan merekonstruksi avatar dari deskripsi saja.

| Berkas/folder | Kegunaan |
| --- | --- |
| `ilustrasi/avatar-v2/farmer-v9-friendly-face/` seluruhnya | GLB terbaru, sumber Blender, generator, render, preview, laporan tes |
| `ilustrasi/avatar-v2/farmer-v8-modular/` seluruhnya | Input Blender V9 dan `preview.js` yang masih digunakan preview V9 |
| `ilustrasi/avatar-v2/farmer-v6-mesh-study/farmer-v6-cc0-base-study.blend` | Input bila perlu membangun ulang V8 |
| `ilustrasi/avatar-v2/farmer-v6-mesh-study/farmer-v6-cc0-base-study-*.png` | Pembanding postur yang dipilih pengguna |
| `ilustrasi/avatar-v2/farmer-v7-cc0-clothed/cc0-base-original.blend` | Sumber tubuh CC0 asli untuk rujukan |
| `ilustrasi/karakter-gameplay/final-fantasy/ff7-cloud-turnaround.png` dan `ff9-zidane-turnaround.png` | Referensi wajah lokal |
| `ilustrasi/karakter-gameplay/harvest-moon/ps2-save-the-homeland-hero-turnaround.png` | Referensi gaya karakter gameplay |
| `game-src/avatar-farmer-v8.js`, `game-src/avatar-character-3d.js` | Adapter dan integrasi pemuatan model |
| `tools/test_farmer_v8.mjs`, `tools/validate_character_glb.py` | Pengujian runtime dan struktur GLB |
| `package.json`, `package-lock.json`, `vite.config.js` | Dependensi dan konfigurasi build proyek |

Pertahankan struktur folder. Dependensi rebuild: V6 CC0 `.blend` → generator V8 → V8 `.blend` → generator V9. Untuk memainkan GLB yang sudah jadi, Blender tidak diperlukan. Referensi visual lokal adalah panduan gaya, bukan bukti bahwa model merupakan replika asli game tersebut.

## Status pemeriksaan yang sebenarnya

- Laporan `runtime-test.json` V9 lulus: 32 kombinasi slot, isolasi material/skeleton antarkarakter, bobot skin, dan 3.741.600 sampel posisi vertex pada delapan animasi.
- GLB valid: 1.256.616 byte, 46 mesh, 18.708 vertex, 32.852 segitiga, 18 material. Masih tanpa tekstur/normal map; 32 primitive belum memiliki UV. Validator menyatakan **belum siap sebagai aset premium**, bukan GLB rusak.
- Preview WebGL versi antara telah dibuka di Chrome profil **Namua (shopee)**; pergantian topi/pakaian dan animasi jalan dicoba. Ditemukan kulit menembus scalp, kemudian diperbaiki pada ekspor terakhir.
- **Ekspor terakhir belum selesai diuji ulang di browser.** Preset cepat, seluruh warna, tampilan tanpa topi, serta kombinasi aksesori perlu diperiksa lagi. Jangan menganggap tes numerik membuktikan tampilan bagus atau bebas clipping.
- Build Vite terisolasi pernah berhasil pada tahap V8; belum ada pemeriksaan build final setelah seluruh perubahan V9. Ekspresi wajah masih statis, belum berkedip atau memiliki rig ekspresi.

## Menjalankan di server pengembangan

Gunakan checkout/staging terpisah, bukan langsung menimpa produksi. Node yang sesuai dependensi Vite saat ini: `^20.19.0 || >=22.12.0`. Jalankan dari root proyek:

```sh
npm ci
node tools/test_farmer_v8.mjs ilustrasi/avatar-v2/farmer-v9-friendly-face/farmer-v9-friendly-face.glb
python3 tools/validate_character_glb.py --input ilustrasi/avatar-v2/farmer-v9-friendly-face/farmer-v9-friendly-face.glb --report ilustrasi/avatar-v2/farmer-v9-friendly-face/validation.md
```

Validator dapat mengembalikan exit nonzero karena gate kualitas premium; baca laporan sebelum menyimpulkan ada kerusakan. Tes tersebut menulis ulang laporan di folder aset.

Untuk preview statis privat, jalankan `python3 -m http.server 8080 --bind 127.0.0.1` dari root staging, lalu akses melalui SSH tunnel pada path `/ilustrasi/avatar-v2/farmer-v9-friendly-face/preview.html`. Jangan membuka lewat `file://`. Preview masih mengimpor Three.js dari `node_modules`; jangan mengekspos root proyek, kredensial, atau `node_modules` ke publik. Untuk menjalankan aplikasi PHP lengkap, ikuti `docs/HANDOVER_PENGEMBANGAN_DI_SERVER.md`.

Rebuild opsional memakai Blender 4.5 LTS yang sesuai OS server:

```sh
blender --background -t 4 --python ilustrasi/avatar-v2/farmer-v9-friendly-face/build_farmer_v9.py
```

Generator menimpa hasil V9: cadangkan terlebih dahulu. Inputnya V8 `.blend`; tidak perlu membangun V8/V6 ulang bila input tersedia. Render headless membutuhkan dukungan grafis yang sesuai; bila server tidak mendukung, lakukan render di workstation. Jangan mengandalkan path Blender Windows di folder TEMP komputer asal.

## Pekerjaan berikutnya, berurutan

1. Pastikan aset terbaru tersedia, buka render wajah serta front/left/back, lalu ulangi pemeriksaan WebGL ekspor terakhir. Bandingkan dengan referensi pada sudut dan skala yang sebanding. Pertahankan postur yang sudah disukai.
2. Periksa kepala-leher, scalp tanpa topi, rambut belakang, wajah pada kulit terang/gelap, sambungan bahu/pinggul/boot, dan delapan animasi. Koreksi bila masih bermasalah; jangan menyatakan mirip hanya karena ekspor berhasil.
3. Integrasikan ke UI avatar game setelah visual memadai. `application/views/game.php` dan `admin.php` masih memuat `semesta-farmer-v5-ps2-style.glb`. Belum ada promosi V9 ke aset publik/default.
4. Perbaiki `game-src/main.js`: perubahan komponen saat ini dapat menghapus identitas `farmer-ps2` sehingga kembali ke model lama. Pertahankan identitas model dan batasi pilihan sesuai capability V9, baik pada Avatar Studio maupun pengaturan pemain.
5. Selaraskan penyimpanan/pemuatan konfigurasi dengan `application/controllers/Api.php`, yang saat ini membatasi nilai special ke `farmer-ps2`. Jangan mengganti identifier tanpa kompatibilitas data lama dan validasi server. Uji simpan, reload, dan dua avatar dengan konfigurasi berbeda.
6. Setelah integrasi, perbarui URL model, cache version, thumbnail, dan build di staging. `npm run build` memakai `emptyOutDir: true` pada `assets/game`, sehingga harus dicadangkan/dijalankan pada salinan staging terlebih dahulu. Deployment produksi merupakan langkah terpisah.

Catatan runtime: GLB mengekspor semua slot; gunakan adapter agar pilihan yang tidak aktif disembunyikan. `setAppearance()` menerima konfigurasi lengkap; field yang tidak dikirim kembali ke default, bukan mempertahankan nilai sebelumnya. Material dan skeleton independen per avatar, geometri dibagi. Alias `tas-anyaman` hanya memetakan ke satchel, bukan mesh tas anyaman baru.

Worktree lokal berisi banyak perubahan proyek lain. Jangan reset, menimpa, atau memasukkan semuanya ke commit avatar. Jangan menyalin kredensial, database, profil Chrome, atau isi TEMP ke repository. Browser lokal yang diminta pengguna adalah Chrome profil Namua (shopee); jika profil itu tidak tersedia di server, jelaskan keterbatasannya dan gunakan lingkungan uji yang disepakati tanpa menyalin profil pribadi.

Prompt siap salin tersedia di [PROMPT_LANJUTAN.md](PROMPT_LANJUTAN.md).
