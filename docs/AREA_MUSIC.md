# Musik Area Jelajah

Musik area diatur di `game-src/main.js` lewat dua registry:

- `AREA_MUSIC_BY_REGION` menghubungkan ID wilayah game (`kota`, `desa`, `hutan`) ke ID lagu.
- `AREA_MUSIC_CATALOG` menyimpan judul dan path file untuk setiap ID lagu.

Saat ini semua wilayah yang sudah tersedia memakai lagu `jalan-ke-alun-alun`. File sumbernya berada di `ilustrasi/musik/jalan-ke-alun-alun/jalan-ke-alun-alun.wav`. Pemetaan wilayah dibuat terpisah dari katalog agar wilayah baru dapat memiliki musik sendiri tanpa mengubah pengendali audio.

## Menambahkan lagu untuk wilayah baru

1. Simpan berkas audio final di `ilustrasi/musik/<id-lagu>/` dengan nama yang sesuai.
2. Tambahkan judul dan path relatif dari folder `ilustrasi/musik/` ke `AREA_MUSIC_CATALOG`.
3. Ubah atau tambahkan pasangan `id-wilayah: id-lagu` pada `AREA_MUSIC_BY_REGION`.
4. Jika suatu wilayah belum memiliki lagu khusus, biarkan tanpa entri. Lagu default `jalan-ke-alun-alun` akan dipakai.

Audio mulai diputar saat pemain masuk ke area, dapat dijeda/dilanjutkan dari tombol musik, dan volumenya tersimpan di browser. Saat pemain kembali ke peta kawasan atau peta utama, musik dijeda.
