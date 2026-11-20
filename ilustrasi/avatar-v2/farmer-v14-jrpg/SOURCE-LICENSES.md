# Sumber grafis Arka V14

Arka adalah kandidat karakter orisinal untuk Republik WkWkWk. Gambar referensi
Final Fantasy dipakai untuk arah proporsi/penyajian, bukan sebagai sumber mesh,
tekstur, kostum, atau identitas karakter.

## MakeHuman — CC0-1.0

Lisensi grafis diperiksa pada 19 November 2026:

- [Penjelasan lisensi resmi](https://www.makehumancommunity.org/about/license.html).
- [Lisensi aset dan perbedaan dengan kode aplikasi](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md).
- [Daftar aset system pack beserta lisensinya](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html).

Core mesh hm08, target pria dewasa, target ekspresi, definisi sendi, serta skin
weights berasal dari repositori MakeHuman pada commit
`a8bc2d54ff0ac92e78ff71431b1023eda42bf482`.
File asli, URL, ukuran, dan SHA256 disimpan dalam
[manifest core](source/makehuman/manifest.json). Teks lisensi asli tersedia dalam
[LICENSE.md](source/makehuman/LICENSE.md) dan
[LICENSE.ASSETS.md](source/makehuman/LICENSE.ASSETS.md).

Tekstur kulit young_asian_male, rambut short02, alis eyebrow001, tekstur brown_eye,
serta teeth_base berasal dari system asset pack CC0. Proxy dipasang ke anatomi
yang sudah dibentuk menggunakan data barycentric MHCLO. MakeHuman custom eye
shader tidak dipakai: sclera/iris memakai permukaan bola dan UV baru agar hasil
GLB tidak bergantung pada shader tersebut. Manifest pack:
[system-manifest.json](source/system-manifest.json). Beberapa input pembanding
yang tidak digunakan pada kandidat akhir tetap disimpan agar audit awal bisa
ditelusuri.

Lisensi CC0 aset tersebut mengizinkan modifikasi, penggunaan komersial, video,
dan distribusi dalam game. Kode aplikasi MakeHuman memiliki lisensi berbeda;
pipeline ini tidak menyalin atau menjalankan kode aplikasi MakeHuman. Kode
pembangun di `tools/avatar_v14_*.py` dan `tools/build_avatar_v14.py` ditulis khusus
untuk project, menggunakan aset grafisnya sebagai data.

## Bagian yang dibuat untuk project

Desain satu karakter, pemilihan proporsi, topology dan UV pakaian, material kain
dan kulit prosedural, sabuk, pouch, trim, skeleton ringkas, metadata, animasi,
adapter Three.js, halaman review, serta skrip build dibuat untuk project ini.
Anatomi lengkap yang belum dipotong disimpan tersembunyi sebagai
`Anatomy_Source` di Blender, tidak dimasukkan ke GLB kandidat.

Blender dipakai sebagai alat produksi. Three.js dan dependency project mengikuti
lisensi masing-masing yang sudah tersedia di project. Tidak ada pembelian aset
atau penggunaan layanan berbayar.
