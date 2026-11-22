import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {day2Scenario} from '../game-src/production-day2.js';
import script from '../game-src/production-day2-script.json' with {type:'json'};
import clips from '../game-src/production-day2-audio.json' with {type:'json'};
import provenance from '../docs/script/day2-voice-provenance.json' with {type:'json'};
import previousClips from '../docs/script/day2-audio-v1/manifest.json' with {type:'json'};
import previousProvenance from '../docs/script/day2-audio-v1/provenance.json' with {type:'json'};
import previousRevisionClips from '../docs/script/day2-audio-r2/manifest.json' with {type:'json'};
import previousThirdClips from '../docs/script/day2-audio-r3/manifest.json' with {type:'json'};
import previousThirdProvenance from '../docs/script/day2-audio-r3/provenance.json' with {type:'json'};
import music from '../game-src/production-day1-music.json' with {type:'json'};
import background from '../game-src/production-day1-background.json' with {type:'json'};
import {compileScenario,sampleScenario,srtFor} from '../game-src/production-scenario.js';
import {activeSpeeches,speechCues} from '../game-src/production-speech-cues.js';
import {captionGroups} from '../game-src/production-caption-style.js';
import {loadStoryAudio,storyAudioUrl,duckMusic} from '../game-src/production-story-audio.js';

// Read real PCM headers and hashes. Browser decoding and subjective listening
// are separate checks; this test does not claim either one happened.
function wavDuration(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  let rate=0,stride=0,size=0;
  for(let p=12;p+8<=bytes.length;){
    const name=bytes.toString('ascii',p,p+4),length=bytes.readUInt32LE(p+4);
    assert.ok(p+8+length<=bytes.length,'Complete WAV chunk');
    if(name==='fmt '){assert.equal(bytes.readUInt16LE(p+8),1,'PCM audio');rate=bytes.readUInt32LE(p+12);stride=bytes.readUInt16LE(p+20);}
    if(name==='data')size=length;
    p+=8+length+(length%2);
  }
  assert.ok(rate&&stride&&size);return size/(rate*stride);
}
const root=new URL('../',import.meta.url),scenario=day2Scenario(),compiled=compileScenario(scenario);
assert.equal(scenario.audioStatus,'recorded');
assert.equal(Object.keys(clips).length,42,'37 archived clips and five new intro/closing cues');
assert.equal(script.cues.length,27,'Five new cues and 22 retained lines');
for(const [key,clip] of Object.entries(previousClips))assert.deepEqual(clips[key],clip,'Authored v1 drafts retain exact audio: '+key);
for(const [key,clip] of Object.entries(previousRevisionClips))assert.deepEqual(clips[key],clip,'Authored r2 drafts retain exact audio: '+key);
for(const [key,clip] of Object.entries(previousThirdClips))assert.deepEqual(clips[key],clip,'Authored r3 drafts retain exact audio: '+key);
assert.match(clips['day2r3-narrator-03'].text,/sentra usaha, atau rumah ibadah\?/);
for(const [key,clip] of Object.entries(clips)){
  const bytes=await fs.readFile(new URL(`public/audio/produksi/day-2/${clip.file}`,root));
  assert.ok(Math.abs(wavDuration(bytes)-clip.duration)<1e-8,'Current and saved-draft PCM duration: '+key);
}
assert.equal(Object.keys(provenance).length,8);
assert.equal(new Set(Object.values(provenance).map(v=>v.voiceId)).size,8,'Distinct approved identities');
for(const actor of ['aulia','eqa','cecil'])assert.equal(provenance[actor].catalogGender,'female',actor);
for(const actor of ['pasca','climenzo','xel','nopal'])assert.equal(provenance[actor].catalogGender,'male',actor);
// Nopal is a provisional male avatar, not a statement about the real account.
for(const [actor,take] of [...Object.entries(provenance),...Object.entries(previousProvenance),...Object.entries(previousThirdProvenance)]){
  assert.equal(take.voiceStatus,'ACTIVE');assert.equal(take.language,'id');assert.equal(take.speed,1);
  const sourceCues=take.sourceCues;
  if(sourceCues)assert.equal(take.submittedText,sourceCues.map(c=>c.spokenText).join('\n\n'));
  const bytes=await fs.readFile(new URL(`public/audio/produksi/day-2/${take.originalFile}`,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),take.sourceSha256);
  assert.ok(Math.abs(wavDuration(bytes)-take.sourceDuration)<1e-8);
}
for(const cue of script.cues){
  const clip=clips[cue.key];assert.equal(clip.text,cue.text);assert.equal(clip.spokenText,cue.spokenText);
  assert.equal(clip.directory,'day-2');assert.equal(clip.speaker,cue.speaker);
  if(cue.speaker!=='narrator')assert.equal(clip.castId,cue.speaker);
  const bytes=await fs.readFile(new URL(`public/audio/produksi/day-2/${clip.file}`,root));
  assert.ok(Math.abs(wavDuration(bytes)-clip.duration)<1e-8);
  assert.ok(clip.envelope.some(v=>v>.05));
  assert.ok(clip.words.every((w,i)=>w.start>=0&&w.end>w.start&&w.end<=clip.duration&&(!i||w.start>=clip.words[i-1].end-.001)));
  assert.ok(captionGroups(clip).every(g=>g.words.length<=6&&g.end>g.start));
  assert.ok(storyAudioUrl(cue.key).endsWith('/project/public/audio/produksi/day-2/'+clip.file));
}
assert.ok(clips['day2-pasca-04'].text.includes('Xel'));
assert.ok(clips['day2-pasca-04'].spokenText.includes('Ksel'));
assert.ok(clips['day2-pasca-04'].words.some(w=>w.text==='Xel'));
assert.ok(clips['day2r2-pasca-06'].words.some(w=>w.text==='Xel'));
assert.ok(captionGroups(clips['day2-narrator-01']).flatMap(g=>g.words).some(w=>w.text==='Wkwkwk'));

const allCues=compiled.shots.flatMap(shot=>speechCues(shot).map(cue=>({...cue,start:shot.start+(cue.offset??.3),shot})));
assert.deepEqual(new Set(allCues.map(c=>c.key)),new Set(script.cues.map(c=>c.key)),'Every active script line is used and stale dialogue is absent');
let protestPeak=0,spokenOverlapSeconds=0;
for(let t=0;t<compiled.duration;t+=.05){
  const sample=sampleScenario(compiled,t),voices=activeSpeeches(sample,scenario);
  const spoken=voices.filter(v=>v.clip.words.some(w=>v.local>=w.start&&v.local<w.end));
  assert.equal(new Set(voices.map(v=>v.castId)).size,voices.length,'A person never speaks over their own previous take');
  if(sample.shot.protest){
    protestPeak=Math.max(protestPeak,new Set(voices.map(v=>v.castId)).size);
    if(spoken.length>=2)spokenOverlapSeconds+=.05;
  }
  for(const voice of voices)assert.ok(voice.local>=0&&voice.local<voice.clip.duration);
}
assert.ok(protestPeak>=4,'Crowd contains at least four overlapping individual voices, not sequential turns');
assert.ok(spokenOverlapSeconds>=1,'Actual spoken words overlap, not only silent clip tails');
assert.equal((srtFor(scenario).match(/ --> /g)||[]).length,allCues.length);

const decodedFiles=[],bufferFiles=new WeakMap();
const context={
  decodeAudioData:async bytes=>{const file=bufferFiles.get(bytes);decodedFiles.push(file);return {duration:file===music.file?music.duration:file===background.file?background.duration:wavDuration(Buffer.from(bytes))};},
  createBuffer:(channels,length,rate)=>{const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data};},
};
const fetcher=async url=>{
  const path=new URL(url).pathname.replace(/^\/project\//,''),bytes=await fs.readFile(new URL(path,root));
  return {ok:true,arrayBuffer:async()=>{const result=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);bufferFiles.set(result,path.split('/').at(-1));return result;}};
};
const tracks=await loadStoryAudio(scenario,context,{fetcher}),dialogue=tracks.filter(t=>t.key),bed=tracks.filter(t=>t.kind==='background'),song=tracks.filter(t=>t.kind==='okeGas');
const uniqueCues=new Set(allCues.map(c=>c.key));
assert.equal(decodedFiles.length,uniqueCues.size+2,'Each source decoded once plus the two shared music sources');
assert.equal(dialogue.length,allCues.length);
for(const shot of compiled.shots)for(const cue of speechCues(shot)){
  const track=dialogue.find(t=>t.key===cue.key&&Math.abs(t.offset-shot.start-cue.offset)<1e-8);
  assert.equal(track.offset,shot.start+cue.offset);assert.equal(track.volume,cue.volume??.95);
  assert.equal(track.castId,clips[cue.key].castId);
}
for(const track of tracks){
  assert.ok(track.offset>=0&&track.offset+(track.duration??track.buffer.duration)<=compiled.duration+.001);
  if(track.kind==='background'||track.kind==='okeGas')assert.ok(track.sourceOffset+track.duration<=track.buffer.duration+1e-7,'No source exhausted before its track ends');
  if(track.kind==='foley')assert.ok(track.buffer.getChannelData(0).some(v=>Math.abs(v)>1e-5),'Foley contains a real signal');
}
assert.ok(bed.length&&song.length);
assert.ok(tracks.some(t=>t.foley==='shuffle'),'Crowd movement supports the audible overlapping complaints');
assert.ok(tracks.some(t=>t.foley==='scissors')&&tracks.some(t=>t.foley==='applause'));
assert.equal((await loadStoryAudio(scenario,context,{fetcher,rhythm:false})).length,allCues.length);
assert.equal((await loadStoryAudio(scenario,context,{fetcher,voices:false})).filter(t=>t.key).length,0);
assert.equal(decodedFiles.length,uniqueCues.size+2,'Playback toggles reuse accepted assets');

const duck=duckMusic({offset:0,duration:10,volume:.55,kind:'background'},[{start:4,end:6},{start:1,end:4.5}]);
assert.ok(duck.every((p,i)=>!i||p.time>=duck[i-1].time),'Unsorted overlapping cues produce monotonic gain automation');
assert.equal(duck.filter(p=>p.volume===.33).length,2,'Overlapping turns keep a single duck interval');

// A source-length boundary must loop even if there is no song to reset it.
const long=structuredClone(scenario);
long.shots=Array.from({length:8},(_,i)=>({...structuredClone(scenario.shots[0]),id:'long-'+i,duration:25,sound:undefined,musicBedVolume:.3,actors:Object.fromEntries(scenario.cast.map(c=>[c.id,{action:'Idle'}]))}));
const loop=(await loadStoryAudio(long,context,{fetcher})).filter(t=>t.kind==='background');
assert.deepEqual(loop.map(t=>[t.offset,t.sourceOffset,t.duration]),[[0,0,180],[180,0,20]]);
console.log(`PASS Day 2 audio: current + archived source hashes, ${uniqueCues.size} measured cues, correct voice genders, ${protestPeak} overlapping crowd voices, source bounds, 200s background loop. Browser decoding/full listening still pending.`);
