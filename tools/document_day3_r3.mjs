import fs from 'node:fs';
import {day3Scenario,DAY3_SCRIPT} from '../game-src/production-day3.js';
import {compileScenario} from '../game-src/production-scenario.js';
import {STORY_CLIPS} from '../game-src/production-audio-catalog.js';
const c=compileScenario(day3Scenario());
const fmt=t=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
const lines=['# Day 3 R3 — shot dan dialog aktif','',`${c.shots.length} shot / ${c.duration.toFixed(2)} detik. 21 dialog, tiga bagian narator, montase Oke Gas 20 detik. Suara pada kecepatan asli; pemeriksaan dengar dan MP4 penuh belum selesai.`,'','| Shot | Waktu | Pemeran | Aksi / kamera | Dialog |','|---|---|---|---|---|'];
for(const shot of c.shots){
  const row=DAY3_SCRIPT.shots.find(r=>r.id===shot.id),clip=STORY_CLIPS[row.audioKey];
  const action=[row.beat,shot.frame?.motion?.type||'hold',row.gesture,shot.sound?'Oke Gas':null,shot.day3Panel].filter(Boolean).join('; ');
  lines.push(`| ${shot.id} | ${fmt(shot.start)} - ${fmt(shot.end)} | ${DAY3_SCRIPT.actors[row.speaker]?.name||'Tanpa dialog'} | ${action} | ${clip?.text||'—'} |`);
}
fs.writeFileSync('docs/script/003-day-3-scenes.md',lines.join('\n')+'\n');
console.log(`Documented ${c.duration.toFixed(2)} seconds, ${c.shots.length} shots.`);
