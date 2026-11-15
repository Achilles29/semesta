import timeline from '../public/audio/produksi/episode-002/release-v13/timeline.json' with {type:'json'};
import envelope from '../public/audio/produksi/episode-002/release-v13/speech-envelope.json' with {type:'json'};
import {sampleEpisode as sampleVisual} from './production-v13-episode.js';
export const EPISODE_DURATION=timeline.duration;
export const EPISODE_SCENES=timeline.scenes;
export const EPISODE_CUES=timeline.cues;
export const EPISODE_EVENTS=timeline.events;
export function visualTime(seconds){
  const t=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0)),a=timeline.visual_anchors;
  const i=a.findIndex(p=>p.audio>t);
  if(i<0)return a.at(-1).preview;if(i===0)return a[0].preview;
  const p=a[i-1],q=a[i];return p.preview+(q.preview-p.preview)*(t-p.audio)/(q.audio-p.audio);
}
export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const shot=sampleVisual(visualTime(time),aspect);
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  shot.time=time;shot.scene=EPISODE_SCENES.find(s=>time>=s.start&&time<s.end)??EPISODE_SCENES.at(-1);shot.cue=cue;shot.provisional=false;
  shot.speaking=time<cue.audio_end;
  const index=time*envelope.fps,lo=Math.floor(index),f=index-lo;
  const energy=(envelope.values[lo]??0)*(1-f)+(envelope.values[lo+1]??0)*f;
  for(const [id,a] of Object.entries(shot.actors)){
    a.phase=time*.65;
    a.mouthOpen=id===cue.role&&shot.speaking?energy:0;
    if(a.mouthOpen>0)a.headNod=Math.sin(time*6)*.025*energy;
  }
  // Narrator is off-screen: neither Komeng nor Bu Warung lip-syncs his voice.
  shot.direction.speaker=cue.role;
  return shot;
}
export function episodeCueSheet(){return [
  `EPISODE 002 V13 — ${EPISODE_DURATION.toFixed(2)} DETIK / 4 ADEGAN`,
  'Play memutar master V13: narator, Bahlil, Gufron, musik dan efek. Pegangan awal 3 detik.',
  'Mulut Bahlil/Gufron mengikuti RMS rekaman, belum lip-sync fonem. Narator off-screen.',
  'Kecepatan suara 1x. Timing provider; intonasi dan pelafalan masih perlu cek dengar.',
  'Spasi: jeda/lanjut. R: ulang. Panah: adegan. Esc: keluar. Rekam audio tab/sistem.',
  'Parodi rekaan / suara AI. Tidak ada pelantikan dalam cerita ini.',
  ...EPISODE_CUES.map(c=>`${c.start.toFixed(2)}–${c.audio_end.toFixed(2)} ${c.role}: ${c.display_text}`),
].join('\n');}
