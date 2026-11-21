import fs from 'node:fs/promises';
import {day1Scenario,DAY1_SPEAKERS} from '../game-src/production-day1.js';
import audio from '../game-src/production-day1-audio.json' with {type:'json'};
import {compileScenario,srtFor} from '../game-src/production-scenario.js';
const scenario=day1Scenario(),compiled=compileScenario(scenario),stamp=t=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
await fs.writeFile('docs/script/day1-scenes.json',JSON.stringify(scenario,null,2)+'\n');
await fs.writeFile('docs/script/day1-subtitles.srt',srtFor(scenario));
const rows=compiled.shots.map((s,i)=>`| ${i+1} | ${stamp(s.start)}–${stamp(s.end)} | ${s.label} | ${s.speech?`**${DAY1_SPEAKERS[audio[s.speech].speaker]}:** ${s.caption}`:'—'} | ${s.followExtra?'Mengikuti ayam':s.camera}${s.frame?.elevation?' · sudut tinggi':''} |`).join('\n');
await fs.writeFile('docs/script/001-day-1-scenes.md',`# ${scenario.title}

Episode aktif: **${compiled.shots.length} shot, ${compiled.duration.toFixed(2)} detik, ${Object.keys(audio).length} klip suara**. Buka admin Produksi atau peta → Balai Produksi → Tonton Day 1. Play semua menjalankan kamera, karakter, figuran, dialog, subtitle dan musik. Tombol Layar penuh tersedia; Buat MP4 mengekspor H.264/AAC.

## Cerita

Pasca Bowow membuka republik dengan joget dan kantor satu kursi. Sari ingin dinilai dari kemampuan. Joko datang sebagai musisi, membawa gitar di punggung. Ayam menawarkan kemampuan membangunkan warga, tetapi ditolak karena bukan manusia. Kucing semula ditolak juga, lalu diloloskan setelah mengaku keponakan kucing Pak RT.

Narator menjelaskan sebab-akibat: ketika kenalan mengalahkan kemampuan, antrean berubah menjadi silsilah. Joko menyindir bahwa gitar rupanya perlu dilengkapi kartu keluarga. Sari mengusulkan antrean yang sama untuk semua. Penonton diminta menentukan pembangunan, acara dan aturan. Pasca Bowow justru memutuskan Koplak Desa dan Satuan Pengisi Perut Gratis lebih dahulu, lalu tertawa. Narator menutup kontradiksinya. Cerita ini satir rekaan, bukan laporan peristiwa atau tuduhan faktual terhadap orang nyata.

## Timeline terukur

| No. | Waktu | Adegan | Ujaran | Kamera |
|---|---|---|---|---|
${rows}

## Pementasan

- Sari dan Joko masuk dari kanan dalam 1,5 dan 1,6 detik, tanpa memutari presiden. Joko memakai preset rockstar, denim slim, rambut spiky, rompi gelap, anting dan gelang. Gitar merah dan strap mengikuti tulang dada.
- Ayam dan kucing adalah model 3D prosedural: kaki bergerak saat berjalan, kepala bereaksi, ekor kucing bergerak. Posisi, gerak, visibilitas dan kamera ditentukan waktu absolut sehingga seek dan ekspor konsisten.
- Kamera memakai pembuka lokasi dari sudut tinggi, framing karakter sedang/dekat, sudut samping saat gitar terlihat, close-up rendah hewan, reaksi lawan bicara, dan dorongan kamera perlahan. Kamera ayam mengikuti posisinya selama masuk.
- Template seri memakai gradasi merah transparan pada bagian atas dan bawah, tanpa garis bingkai samping atau kotak emas. Label Day, identitas Republik Wkwkwk dan teks utama berwarna putih. Judul editorialnya **Baru Buka, Sudah Ada Orang Dalam**, bukan “Parodi Fiktif”.
- Subtitle memakai kelompok frasa pendek dengan sorotan kata berdasarkan timestamp audio. Nama pembicara berada pada label kecil. Ejaan suara “Republik Weka Weka Weka” tampil sebagai “Republik Wkwkwk”.

## Audio

- Empat take HeyGen yang tersedia: **Gufron** untuk narator (bahasa asli Indonesia), **Alistaire — Authoritative & Articulate** untuk Pasca Bowow, **Annie — Excited** untuk Sari, **Brodie — Breezy & Genuine** untuk Joko. Tiga suara terakhir berasal dari katalog publik berbahasa asli Inggris, disintesis dengan bahasa Indonesia; kualitas pengucapan tetap perlu didengarkan.
- Desain suara baru tidak dilanjutkan karena paket HeyGen gratis menolak fitur itu (402). Pengguna kemudian memilih suara HeyGen yang sudah tersedia. Tidak ada kloning baru atau penyalinan suara pembicara referensi.
- Satu take per pemeran, kemudian dipotong memakai timestamp karakter. Sumber WAV V1/V2/V3 dipertahankan. [Provenance](day1-voice-provenance.json) mencatat teks persis, suara, hasil, waktu dan sumber setiap take.
- Oke Gas mengikuti pembuka, lalu masuk lagi saat keputusan Koplak Desa. Potongan akhir tersambung melewati SPPG, tawa dan penutup narator. Volume otomatis turun selama ujaran dan naik kembali saat jeda.
- Musik latar diganti instrumental komedi yang lebih bertenaga, dengan brass dan drum dari katalog HeyGen. Sumber: docs/record/day1-background-v2-source.json. Gain dialog .33 dan jeda .55; Oke Gas .19 selama suara dan .68 pada jeda penutup. Preview dan ekspor memakai mix yang sama.
- Pemeriksaan otomatis memakai faster-whisper base sebagai alat bantu, bukan bukti kualitas intonasi. Transkrip mesin dan bagian yang perlu didengar ada di audio-review-v3/. Tidak dilakukan review mendengar keseluruhan mix.

## Referensi yang benar-benar diperiksa

- **Untung di Arsenal gak begini....mp4**, sekitar 81 detik: visual dan transkripsi memperlihatkan penjelasan skenario hipotetis, kemampuan versus hubungan keluarga, akibat bagi peserta lain, dan punchline di akhir. Yang diadaptasi adalah pola penjelasan dan tempo frasa, bukan suara atau klaim faktualnya.
- **Day 1 kampung komen.mp4**, sekitar 56 detik: file lokal cocok dengan unggahan lama yang ditemukan di riwayat Git. Variasi pengambilan gambar mencakup lokasi lebar, kendaraan datang, detail jumlah warga, close-up reaksi, kegiatan membangun dan pandangan tinggi. Adegan panjang berjalan dipangkas; tiap perubahan kamera mengikuti informasi baru.
- Sumber naskah: game-src/production-day1-script.json. Skenario: game-src/production-day1.js. Figuran/gitar: production-props.js. Template/subtitle: production-caption-style.js.

## Verifikasi dan batasnya

Tes memakai rig V15 sebenarnya untuk framing, jalur masuk, tangan, identitas wajah, tawa, timing, seek/replay, audio, migrasi draf dan kontrak ekspor. Uji DOM mencakup fullscreen native/fallback serta pemutar peta. Fixture MP4 H.264/AAC diuji dalam tiga orientasi.

Review offline memakai scene Three yang diekspor ke Blender dan kompositor subtitle yang sama; pencahayaannya diadaptasi karena glTF tidak membawa hemisphere light. Ini tidak menggantikan pemeriksaan WebGL di browser atau review dengar. Draf bawaan versi sebelumnya dimigrasikan otomatis; suntingan pengguna dipertahankan dan suara yang tidak cocok dilepas.
`);
console.log(`Saved Day 1: ${compiled.shots.length} shots, ${compiled.duration.toFixed(2)}s.`);
