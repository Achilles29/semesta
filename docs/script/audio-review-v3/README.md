# Pemeriksaan audio Day 1 V3

JSON di folder ini adalah transkripsi otomatis faster-whisper base (CPU int8), bukan hasil review mendengar. Model menerima audio mono 16 kHz yang didekode dengan FFmpeg. Sumber ujaran yang benar tetap `game-src/production-day1-script.json` dan metadata HeyGen.

Pembuka dikenali sebagai “Ini hari pertama republik wkwkwkwk”. Teks sintesis memakai “Republik Weka Weka Weka”; timestamp ketiga kata Weka digunakan untuk menampilkan satu label Wkwkwk pada subtitle.

Bagian untuk diperiksa lewat dengar langsung:

- Narator: nama Pasca Bowow, kata “keahliannya” dan “silsilah”. Mesin mengenali beberapa ejaan berbeda.
- Pasca Bowow: “kenal Pak RT” dikenali mesin sebagai “kenapa RT”.
- Sari: kalimat pendaftaran pertama dikenali mesin dengan beberapa kata yang berbeda.
- Seluruh pemeran: intonasi, pelafalan, jeda komedi dan keterdengaran dialog terhadap musik dalam mix akhir.

Perbedaan transkripsi dapat berasal dari pengenalan suara; ini belum membuktikan kesalahan pengucapan. Tidak dilakukan generasi ulang hanya berdasarkan hasil ASR. Suara V3 memakai katalog yang sudah tersedia sesuai pilihan pengguna setelah desain suara baru ditolak oleh paket HeyGen.

`reference-arsenal.json` dan `reference-kampung.json` mendokumentasikan analisis struktur narasi referensi. Suara pembicara referensi tidak dikloning.
