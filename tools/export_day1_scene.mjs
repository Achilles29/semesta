import fs from 'node:fs/promises';
import {day1Scenario,DAY1_SPEAKERS} from '../game-src/production-day1.js';
import audio from '../game-src/production-day1-audio.json' with {type:'json'};
import {compileScenario,srtFor} from '../game-src/production-scenario.js';
const scenario=day1Scenario(),compiled=compileScenario(scenario),stamp=t=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
await fs.writeFile('docs/script/day1-scenes.json',JSON.stringify(scenario,null,2)+'\n');
await fs.writeFile('docs/script/day1-subtitles.srt',srtFor(scenario));
const rows=compiled.shots.map((s,i)=>`| ${i+1} | ${stamp(s.start)}–${stamp(s.end)} | ${s.label} | ${s.speech?`**${DAY1_SPEAKERS[audio[s.speech].speaker]}:** ${s.caption}`:'—'} | ${s.camera}${s.frame?' · bingkai khusus':''} |`).join('\n');
await fs.writeFile('docs/script/001-day-1-scenes.md',`# Day 1 — Republik Wkwkwk baru buka

Revisi karakter dan penutup: **${compiled.shots.length} shot, ${compiled.duration.toFixed(2)} detik**, tiga pemeran, tiga bagian narator, ${Object.keys(audio).length} klip dialog. Scene aktif di admin Produksi dan peta jelajah → Balai Produksi → Tonton Day 1. Putar dengan **Play semua**; ekspor melalui **Buat MP4**.

Day 1 bawaan yang belum disunting diperbarui otomatis. Draf buatan pengguna dan pilihan eksplisit workspace kosong tetap disimpan. Jika dialog lama dalam draf berubah pada versi suara terbaru, teks pengguna dipertahankan dan suara yang tidak cocok dilepas. Tombol **Day 1 lengkap · dengan narator** membuka episode terbaru secara eksplisit.

## Timeline implementasi

Waktu dihitung dari klip yang benar-benar dipakai. Ujaran mulai 0,30 detik setelah awal shot. Subtitle dan bukaan mulut mengikuti klip; kartu usulan mengikuti timestamp kata. Bibir memakai amplitudo audio, bukan lip sync fonem penuh.

| No. | Waktu | Adegan | Dialog/narasi | Kamera |
|---|---|---|---|---|
${rows}

## Cerita dan latar

Lapangan tanah dan rumput, jalan masuk kiri belakang, papan REPUBLIK WKWKWK, pohon, kursi plastik dan papan KANTOR SEMENTARA. Belum ada rumah, panggung atau gedung jadi. Sari masuk kiri; Joko melewati belakang presiden sebelum mengambil posisi kanan. Warga yang belum datang disembunyikan.

Prabowow memakai wajah khusus senior, peci dan safari putih regular. Sari memakai tunik terracotta dan celana lebar. Joko memakai kemeja navy, celana regular dan kacamata.

Sesudah meminta usulan warga tentang pembangunan, acara, aturan dan kegiatan, presiden malah memutuskan **Koplak Desa** (plesetan Kopdes) dan **Satuan Pengisi Perut Gratis** (plesetan SPPG) lebih dulu. Ia tertawa; warga saling pandang. Overlay terakhir: “LAH, KATANYA WARGA YANG PILIH? · KOMEN!”. Ini lelucon kontradiksi dalam cerita fiktif, bukan pernyataan kebijakan nyata. Ajakan follow disampaikan dalam dialog sebelum penutup.

## Akting dan audio

- Narator baru: **Ewan — Bright & Energetic**. Prabowow baru: **Alistaire — Authoritative & Articulate**, hasil filter katalog pria tua. Sari tetap Annie; Joko tetap Brodie. Bahasa sintesis Indonesia; semua suara karakter publik HeyGen, bukan kloning suara tokoh.
- Dua take baru dibuat sekali per karakter. Sumber WAV lama dipertahankan; take baru bernama narrator-v2-original.wav dan prabowow-v2-original.wav. Teks persis, pengaturan, URL serta timing disimpan dalam [provenance](day1-voice-provenance.json). Tidak ada perubahan kecepatan/nada pascaproduksi.
- Ejaan suara “Weka Weka” dan “Dei Dua” ditampilkan sebagai Wkwkwk dan Day Dua. Tag tawa tidak ditampilkan sebagai dialog. Ekor tawa dipertahankan utuh sampai akhir take; senyum dan gerak dada mulai pada timestamp tag.
- Gerakan tangan bicara memakai IK dua ruas dan aksen kata. Pendengar menoleh ke pembicara; anggukan dibatasi satu gerakan, bukan berulang terus. Kedipan tidak serempak. Identitas wajah tidak hilang saat ekspresi atau bukaan mulut berubah.
- Musik Oke Gas dari file pengguna docs/record/oke gas.aac tetap pada pembuka: pelan selama narator, lebih keras saat joget, lalu berhenti sebelum percakapan. Potongan sumber 0,04–8,04 detik; estimasi tempo 145 BPM. Tidak ada musik yang menutupi punchline/tawa.
- Klip publik memakai nama berisi hash isi agar browser menerima audio baru setelah push/pull. Pemutar peta tidak membaca atau menulis draf admin. Preview dan ekspor menggunakan mix audio yang sama.

## Sumber dan pemeriksaan

- [Skenario JSON](day1-scenes.json), [subtitle SRT](day1-subtitles.srt), [asal suara](day1-voice-provenance.json).
- Sumber scene: game-src/production-day1.js; akting: production-acting.js; aset suara: public/audio/produksi/day-1/.
- Jalankan node tools/export_day1_scene.mjs setelah mengubah timeline; tools/prepare_day1_audio.py memotong ulang take yang sudah ada tanpa sintesis baru.
- Tes memakai rig V15 asli: seek/replay deterministik, kepala dalam frame, jalur warga, tangan di depan badan, identitas wajah saat tertawa, cue tawa, migrasi draf, cache audio, SRT dan penyerahan audio ke encoder.
- Render Blender dari GLB telah ditinjau untuk wajah dan pakaian. Review WebGL browser serta mendengarkan keseluruhan mix belum dilakukan; pemeriksaan sinyal/timing tidak membuktikan kualitas intonasi atau pelafalan. Belum ada MP4 episode final yang telah ditinjau untuk unggah.
`);
console.log(`Saved scene, SRT and shot list: ${compiled.duration.toFixed(2)}s.`);
