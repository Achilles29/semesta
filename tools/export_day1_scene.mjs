import fs from 'node:fs/promises';
import {day1Scenario,DAY1_SPEAKERS} from '../game-src/production-day1.js';
import audio from '../game-src/production-day1-audio.json' with {type:'json'};
import {compileScenario,srtFor} from '../game-src/production-scenario.js';
const scenario=day1Scenario(),compiled=compileScenario(scenario),stamp=t=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
await fs.writeFile('docs/script/day1-scenes.json',JSON.stringify(scenario,null,2)+'\n');
await fs.writeFile('docs/script/day1-subtitles.srt',srtFor(scenario));
const rows=compiled.shots.map((s,i)=>`| ${i+1} | ${stamp(s.start)}–${stamp(s.end)} | ${s.label} | ${s.speech?`**${DAY1_SPEAKERS[audio[s.speech].speaker]}:** ${s.caption}`:'—'} | ${s.camera}${s.frame?' · bingkai khusus':''} |`).join('\n');
await fs.writeFile('docs/script/001-day-1-scenes.md',`# Day 1 lengkap — Republik Wkwkwk baru buka

Status: **scene dapat diputar di studio**, ${compiled.shots.length} shot, **${compiled.duration.toFixed(2)} detik**, tiga pemeran, tiga bagian narator. Narasi/dialog tersedia dalam 19 potongan WAV dengan waktu hasil sintesis. Tampilan dan hasil suara belum ditinjau langsung di browser; belum ada MP4 final yang sudah diperiksa.

Buka Produksi → **Day 1 lengkap · dengan narator** → **Play semua**. Pilih kualitas/format lalu **Buat MP4** → **Unduh MP4**. Audio bawaan dimuat dari proyek dan ikut diekspor. Workspace lama tidak ditimpa sampai tombol episode dipilih; episode buatan pengguna dicadangkan sebelum diganti.

## Timeline implementasi

Waktu di bawah dihitung dari skenario yang benar-benar dijalankan, bukan estimasi naskah lama. Setiap klip mulai 0,30 detik setelah awal shot. Subtitle dan bukaan mulut mengikuti klip; kartu usulan mengikuti timestamp kata. Ekspresi mulut berbasis amplitudo, bukan lip sync fonem penuh.

| No. | Waktu | Adegan | Dialog/narasi | Kamera |
|---|---|---|---|---|
${rows}

## Latar dan kesinambungan

Lapangan tanah/rumput dengan jalur kedatangan dari kiri belakang, papan REPUBLIK WKWKWK, pohon di kanan belakang, kursi plastik dan papan KANTOR SEMENTARA. Tidak ada gedung/rumah/panggung jadi. Kursi sudah ada sejak awal; kamera baru menyorotnya saat lelucon kantor. Kartu usulan berupa teks overlay, belum ilustrasi sketsa.

Prabowow memakai safari putih/peci (preset v15-prabowo-inspired); Sari memakai tunik terracotta dan celana lebar (v15-laras); Joko memakai kemeja navy, celana straight, kacamata (v15-arka). Sari mengambil posisi kiri, Prabowow tengah, Joko kanan. Joko berjalan lewat belakang presiden sebelum maju agar tidak bertabrakan. Warga yang belum datang disembunyikan; jumlah warga berubah 1 → 2 → 3.

Joget awal berlanjut melewati cut narator tanpa mengulang pose. Musik berhenti saat lapangan kosong diperlihatkan. Joget akhir dimulai Joko, diikuti presiden dan Sari. Narator tidak berbicara lagi setelah menjembatani perbedaan keinginan warga.

## Audio

- Narator: Lewis; Prabowow: Roderic; Sari: Annie; Joko: Brodie, suara publik HeyGen dengan bahasa Indonesia. Suara karakter fiktif, bukan kloning tokoh nyata. Katalog tidak menyediakan hasil native Indonesia pada pencarian saat produksi; pelafalan perlu didengar langsung sebelum rilis.
- Permintaan pengucapan pertama ditolak layanan. Percobaan berikutnya dilakukan setelah izin pengguna; teks suara memakai “Republik Weka Weka” dan “Dei Dua”, sedangkan subtitle mempertahankan merek “Wkwkwk” dan tulisan “Day Dua”.
- Berkas asli, teks yang dikirim, voice ID, respons/timing, serta pemetaan potongan disimpan. Tidak ada perubahan kecepatan atau nada audio.
- **Oke Gas belum dibundel.** Pembuka dan penutup memakai perkusi orisinal sebagai ritme uji 130 BPM, bukan rekaman/tiruan lagu tersebut. Checkbox ritme dapat dimatikan. File musik tambahan otomatis menonaktifkan ritme uji. Untuk hasil dengan Oke Gas, masih diperlukan potongan audio yang boleh digunakan dan pemeriksaan sinkronisasi musik final.
- Suara bawaan mengikuti urutan/durasi hasil suntingan. Jika subtitle diedit, klip suara dilepas agar tidak membacakan teks lama. Pilih lagi klip di menu Suara adegan untuk mengembalikan dialog. Durasi yang memotong suara ditolak.
- Subtitle SRT mengikuti interval audio, bukan panjang seluruh shot. Tidak ada efek langkah/ambience burung pada versi ini.

## Berkas produksi

- [Skenario JSON](day1-scenes.json): dapat diimpor ke studio.
- [Subtitle SRT](day1-subtitles.srt): cue dialog sesuai timeline.
- [Asal suara dan timing](day1-voice-provenance.json).
- [Konsep dan mekanisme keputusan warga](001-day-1-prabowow-draft.md): naskah sebelum tambahan narator, dipertahankan sebagai catatan desain; timeline aktif adalah dokumen ini.

Sumber implementasi: game-src/production-day1.js; aset suara: public/audio/produksi/day-1/. Jalankan node tools/export_day1_scene.mjs setelah perubahan timeline untuk memperbarui berkas ini, JSON, dan SRT. tools/prepare_day1_audio.py memotong ulang sumber yang sudah ada tanpa panggilan sintesis baru.

## Pemeriksaan

Tes CPU menggunakan rig V15 asli untuk semua shot: seek/replay, visibilitas, jalur tanpa tabrakan, posisi kepala dalam bingkai, serta pose akhir. Tes audio memeriksa 19 WAV, interval ujaran, cache, dan waktu penjadwalan. Tes editor memeriksa tombol episode, play, penyerahan suara ke encoder MP4, dan pelepasan klip ketika teks berubah. Tes ini tidak menggantikan peninjauan visual WebGL atau mendengarkan hasil akhir. Jangan memberi label siap unggah sebelum pemeriksaan tersebut dan musik final selesai.
`);
console.log(`Saved scene, SRT and shot list: ${compiled.duration.toFixed(2)}s.`);
