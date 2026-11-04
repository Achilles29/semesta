# Lingkungan 01 — Kawasan Warga

**Versi:** 2  
**Tanggal:** 2026-11-02  
**Arah visual:** peta ilustrasi 2D isometrik bergaya game kehidupan/cozy RPG. Latar peta dan bangunan berupa gambar terpisah agar bangunan dapat dipindah atau diganti per episode.

## Atlas Indonesia

Layar pembuka memakai peta ilustratif Indonesia, bukan atlas navigasi presisi. Pin kota yang aktif: Jakarta, Bandung, Semarang, Surabaya, dan Makassar. Setiap pin membuka lingkungan cerita rekaan yang menyebut wilayah inspirasinya; perpindahan kota tidak mengubah cerita menjadi klaim faktual tentang kota tersebut. Kota dan isu baru dapat ditambahkan melalui data lokasi dan cerita.

## Susunan area

- Latar menggambarkan permukiman, jalan, sungai, pasar, kebun, dan tiga lahan fasilitas umum.
- Sekolah rusak diletakkan di lahan berpagar bagian kiri atas.
- Dapur MBG berada di lahan layanan bagian tengah.
- Kopdes Merah Putih berada di lahan fasilitas bawah kiri.
- Pasar, permukiman, hutan kota, dan kebun tetap dipilih melalui hotspot peta.
- Istana Negara, hutan lestari, serta hutan terbakar disiapkan sebagai aset untuk lingkungan terpisah; ketiganya belum ditempatkan di Kawasan Warga.

## Aset runtime

Sumber WebP berada di `public/map-assets/`. Vite menyalinnya ke `assets/game/map-assets/` saat build untuk menjaga ukuran unduhan dan mempertahankan gambar saat folder output dibersihkan.

| Berkas | Pemakaian |
|---|---|
| `kawasan-warga.webp` | Latar tanpa gedung fasilitas utama |
| `sekolah-rusak.webp` | Gedung sekolah rusak, sprite transparan |
| `dapur-mbg.webp` | Gedung Dapur MBG, sprite transparan |
| `kopdes-merah-putih.webp` | Gedung Kopdes Merah Putih, sprite transparan |
| `istana-negara.webp` | Aset lingkungan pusat pemerintahan mendatang |
| `hutan-lestari.webp` | Aset lingkungan hutan lestari mendatang |
| `hutan-terbakar.webp` | Aset lingkungan hutan terdampak kebakaran mendatang |

Gedung pada peta adalah ilustrasi 2D, bukan model 3D. Hotspot HTML dipisahkan dari gambar supaya tetap bisa diklik dan bangunan bisa diganti tanpa menggambar ulang seluruh peta.
