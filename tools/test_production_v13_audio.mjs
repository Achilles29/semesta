import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EPISODE_DURATION,EPISODE_CUES,EPISODE_SCENES,EPISODE_EVENTS,sampleEpisode,visualTime} from '../game-src/production-v13-audio-episode.js';
import {EPISODE_CUES as approved,sampleEpisode as preview} from '../game-src/production-v13-episode.js';
const dir='public/audio/produksi/episode-002/release-v13/';
const timeline=JSON.parse(readFileSync(dir+'timeline.json','utf8'));
assert.deepEqual(EPISODE_CUES.map(c=>c.display_text),approved.map(c=>c.text));
assert.equal(EPISODE_CUES.length,9);assert.equal(EPISODE_SCENES.length,4);
assert.equal(timeline.speech_speed,1);assert.equal(timeline.speech_pitch,1);
assert.ok(EPISODE_DURATION>65&&EPISODE_DURATION<95);
for(const c of EPISODE_CUES){
  assert.equal(c.characters.map(x=>x.text).join(''),c.spoken_text);
  assert.equal(c.spoken_text,c.display_text.replaceAll('WKWKWK','wekawekaweka'));
  assert.ok(c.audio_end>c.start&&c.end>=c.audio_end);
  for(const p of c.source_to_cue_mapping)assert.equal(p.source_end_frame-p.source_start_frame,p.cue_end_frame-p.cue_start_frame,'Speech remains 1x');
}
for(const name of ['master','dialogue','music','fx']){
  const b=readFileSync(dir+`episode-002-v13-${name}.wav`);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(22),2);assert.ok(Math.abs((b.length-44)/(44100*4)-EPISODE_DURATION)<1/44100);
  let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>0&&peak<32767,'Nonempty and unclipped '+name);
}
let previous=-1;const mouths=new Set();
for(let t=0;t<=EPISODE_DURATION;t+=.025){
  const visual=visualTime(t);assert.ok(visual>=previous);previous=visual;
  const s=sampleEpisode(t);assert.deepEqual(s,sampleEpisode(t));assert.ok(!s.actors.narator&&!s.actors.pemandu);
  const active=Object.entries(s.actors).filter(([,a])=>a.mouthOpen>0);
  assert.ok(active.length<=1);
  if(s.cue.role==='narator')assert.equal(active.length,0);
  if(active.length){assert.equal(active[0][0],s.cue.role);assert.ok(s.speaking);mouths.add(active[0][0]);}
  assert.deepEqual(s.props,preview(visual).props,'Visual action clock follows measured voice');
}
assert.deepEqual([...mouths].sort(),['bahlil','mama-ghufron']);
assert.equal(sampleEpisode(EPISODE_EVENTS.roll_start-.01).props.roll,0);
assert.ok(sampleEpisode(EPISODE_EVENTS.roll_end).props.roll>.999);
assert.equal(sampleEpisode(EPISODE_EVENTS.sit_start).actors['bu-warung'].seated,0);
assert.equal(sampleEpisode(EPISODE_EVENTS.look_start).actors['bu-warung'].seated,1);
assert.equal(sampleEpisode(EPISODE_DURATION).fadeOut,1);
assert.equal(visualTime(0),0);assert.equal(visualTime(EPISODE_DURATION),96);
console.log(`PASS V13 audio: ${EPISODE_DURATION.toFixed(3)}s, 9 exact cues, 4 WAV stems, source speed preserved, measured action anchors, correct visible speakers and deterministic seeking.`);
