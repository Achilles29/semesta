import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SUBTITLE_CUES,subtitleAt,createProductionSubtitles} from '../game-src/production-subtitles.js';

const base='public/audio/produksi/episode-002/';
const timeline=JSON.parse(readFileSync(base+'release-v16-r3/timeline.json','utf8'));
const sha=path=>createHash('sha256').update(readFileSync(base+path)).digest('hex');
assert.equal(sha('release-v16/episode-002-v16-dialogue.wav'),sha('release-v16-r2/episode-002-v16-r2-dialogue.wav'));
assert.equal(sha('release-v16/episode-002-v16-fx.wav'),sha('release-v16-r2/episode-002-v16-r2-fx.wav'));
for(const c of timeline.cues){
  const captions=SUBTITLE_CUES.filter(s=>s.cue_id===c.id);
  assert.equal(captions.map(s=>s.spoken_text).join(' '),c.spoken_text.replace(/\s+/g,' '),'Every spoken word retained: '+c.id);
  for(const s of captions){
    assert.equal(s.start,c.characters[s.source_character_start].start_time);
    assert.equal(s.speech_end,c.characters[s.source_character_end-1].end_time);
    assert.equal(s.text,s.spoken_text.replace('wekawekaweka','WKWKWK'));
    assert.equal(s.lines.join(' '),s.text);
    assert.ok(s.lines.length<=2);
  }
}
for(let i=0;i<SUBTITLE_CUES.length;i++){
  const s=SUBTITLE_CUES[i];
  assert.ok(s.start>=0&&s.end>s.start&&s.end<=timeline.duration);
  assert.ok(!i||s.start>=SUBTITLE_CUES[i-1].end,'No overlapping captions');
  assert.equal(subtitleAt(s.start),s);
  assert.notEqual(subtitleAt(s.end),s,'End-exclusive lookup');
}
assert.equal(subtitleAt(0),null);assert.equal(subtitleAt(timeline.duration),null);
for(const s of [...SUBTITLE_CUES].reverse())assert.equal(subtitleAt((s.start+s.end)/2),s,'Seek backwards is deterministic');
class Element {
  constructor(){this.style={};this.children=[];this.hidden=false;}
  append(child){this.children.push(child);} remove(){this.removed=true;}
}
globalThis.document={body:new Element(),createElement:()=>new Element()};
const overlay=createProductionSubtitles(),node=document.body.children[0],plate=node.children[0];
const bahlil=SUBTITLE_CUES.find(c=>c.speaker==='bahlil');
overlay.update(bahlil.start,{x:100,y:0,w:540,h:960});
assert.equal(plate.children[0].textContent,'BAHLIL');assert.equal(node.style.left,'370px');
assert.equal(node.style.top,'182.4px');assert.equal(node.hidden,false);
overlay.update(SUBTITLE_CUES[0].start,{x:0,y:100,w:960,h:540});
assert.equal(plate.children[0].style.display,'none');assert.equal(node.style.left,'480px');
overlay.update(bahlil.start,{x:0,y:0,w:540,h:960},false);assert.equal(node.hidden,true);
overlay.dispose();assert.equal(node.removed,true);
const srt=readFileSync(base+'release-v16-r3/subtitles.srt','utf8');
assert.equal((srt.match(/ --> /g)||[]).length,SUBTITLE_CUES.length);
const frames=JSON.parse(readFileSync(base+'release-v16-r3/review.json','utf8')).retained_prefix_frames;
for(const name of ['master','dialogue','music','fx']){
  const old=readFileSync(base+`release-v16-r2/episode-002-v16-r2-${name}.wav`).subarray(44,44+frames*4);
  const revised=readFileSync(base+`release-v16-r3/episode-002-v16-r3-${name}.wav`).subarray(44,44+frames*4);
  assert.deepEqual(revised,old,'Cues 1–16 samples unchanged: '+name);
}
console.log('PASS: 47 phrase captions, full approved speech coverage, real timestamps, seek/pause/clear, SRT and unchanged cues 1–16 mix samples.');
