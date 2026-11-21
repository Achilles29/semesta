import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {day1Scenario,day1Caption} from '../game-src/production-day1.js';
import audio from '../game-src/production-day1-audio.json' with {type:'json'};
import {compileScenario,sampleScenario,validateScenario,srtFor} from '../game-src/production-scenario.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {loadStoryAudio,storyAudioUrl} from '../game-src/production-story-audio.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {mixProductionAudio} from '../game-src/production-export.js';
import {migrateProductionDraft} from '../game-src/production-draft-migration.js';
import legacy from '../game-src/production-day1-legacy.json' with {type:'json'};
import legacyV3 from '../game-src/production-day1-legacy-v3.json' with {type:'json'};
import {captionGroups} from '../game-src/production-caption-style.js';
import script from '../game-src/production-day1-script.json' with {type:'json'};
import legacyV2 from '../game-src/production-day1-legacy-v2.json' with {type:'json'};
import music from '../game-src/production-day1-music.json' with {type:'json'};
import {displaySpeechText} from '../game-src/production-speech-text.js';

const scenario=day1Scenario(),compiled=compileScenario(scenario);
assert.equal(scenario.set,'republic');assert.equal(compiled.shots.length,28);assert.ok(compiled.duration>=80&&compiled.duration<=110);
const speech=compiled.shots.filter(s=>s.speech);assert.equal(speech.length,23);
for(const id of ['sari-datang','joko-datang']){const shot=compiled.shots.find(s=>s.id===id),who=id.startsWith('sari')?'b':'c';assert.ok(shot.duration<=1.6);assert.ok(shot.tracks[who].from[0]>shot.tracks[who].to[0],'Citizens arrive from the right');assert.ok(shot.tracks[who].distance/shot.duration<1.5,'Short entrance retains a natural walking speed');}
for(const clip of Object.values(audio)){const groups=captionGroups(clip);assert.ok(groups.every(g=>g.words.length<=6&&g.end>g.start));assert.ok(groups.every((g,i)=>!i||g.start>=groups[i-1].end));}
assert.deepEqual(migrateProductionDraft(legacyV3),scenario);
assert.deepEqual(migrateProductionDraft(legacy),scenario,'Pristine old episode upgrades automatically');
assert.deepEqual(migrateProductionDraft(legacyV2),scenario,'Previous 27-shot episode upgrades automatically');
// Serialized durations from the old .35s-padding autosave, using d94a771 audio.
const savedV3=structuredClone(legacyV3);
const savedV3Durations=[3.159002267573696,3,3.586009070294785,2.348004535147392,2.7,3.201995464852608,2.475986394557823,1.6,2.0930158730158728,1.6,2.4,2.8,1.4,2.2629931972789117,1.6,3.416009070294785,4.780997732426303,2.561995464852608,4.397006802721088,1.836984126984127,4.208004535147392,6.999999999999999,5.31501133786848,2.0930158730158728,4.5680045351473915,7.529999999999999,2.2];
savedV3.shots.forEach((shot,i)=>{shot.duration=savedV3Durations[i];});
assert.deepEqual(migrateProductionDraft(savedV3),scenario,'Unedited historical autosave upgrades despite its loader-added padding');
const savedV3AfterVoiceRefresh=structuredClone(savedV3);
// All 20 old turns mismatch the new voice script; the previous loader removed them.
for(const shot of savedV3AfterVoiceRefresh.shots){delete shot.speech;delete shot.speechOffset;}
assert.deepEqual(migrateProductionDraft(savedV3AfterVoiceRefresh),scenario,'Recover an untouched old draft already autosaved without its stale voices');
for(const saved of [savedV3,savedV3AfterVoiceRefresh])for(const edit of [s=>{s.title='Judul saya';},s=>{s.shots[0].caption='Pembuka saya';},s=>{s.cast[0].position[0]=.2;},s=>{s.shots[4].duration+=.03;},s=>{s.shots[0].duration+=.001;}]){
  const authored=structuredClone(saved);edit(authored);const next=migrateProductionDraft(authored);
  assert.equal(next.shots.length,authored.shots.length,'Do not replace authored legacy scenes');
  assert.equal(next.title,authored.title);assert.deepEqual(next.cast,authored.cast);
  assert.deepEqual(next.shots.map(s=>[s.caption,s.duration]),authored.shots.map(s=>[s.caption,s.duration]),'Keep even small intentional timeline edits');
  validateScenario(next);
}
let savedCurrent=structuredClone(scenario);
for(let save=0;save<4;save++){
  savedCurrent=JSON.parse(JSON.stringify(validateScenario(migrateProductionDraft(savedCurrent))));
  assert.deepEqual(savedCurrent,scenario,'Repeated reload and autosave must not alter the current timeline');
}
const paddedCurrent=structuredClone(scenario);
for(const shot of paddedCurrent.shots)if(shot.speech)shot.duration=Math.max(shot.duration,shot.speechOffset+audio[shot.speech].duration+.35);
assert.deepEqual(migrateProductionDraft(paddedCurrent),scenario,'Repair the exact loader-padded current episode too');
const authoredCurrent=structuredClone(scenario);authoredCurrent.title='Judul terbaru saya';
assert.deepEqual(migrateProductionDraft(authoredCurrent),authoredCurrent,'Current authored draft keeps its measured .32s tail');
assert.equal(displaySpeechText('Republik Weka Weka Weka!'),'Republik Wkwkwk!');
const custom=structuredClone(legacy);custom.title='Suntingan saya';custom.shots[0].caption='Narasi pilihan saya';
const migrated=migrateProductionDraft(custom);assert.equal(migrated.title,custom.title);assert.equal(migrated.shots[0].caption,custom.shots[0].caption);assert.equal(migrated.shots.length,custom.shots.length);assert.equal(migrated.shots[0].speech,undefined);validateScenario(migrated);
assert.equal(scenario.cast[2].prop,'guitar');assert.equal(scenario.cast[2].preset,'v15-joko-rockstar');assert.match(scenario.title,/Orang Dalam/);assert.ok(!scenario.notice.includes('PARODI'));assert.equal(scenario.shots.filter(s=>s.plannedSpeech).length,0);
for(const shot of speech){const [actor,num]=shot.speech.split('-');assert.equal(audio[shot.speech].text,script.actors[actor].lines[Number(num)-1].replace(' [laughs]',''));}
assert.ok(audio['narrator-01'].text.includes('Weka Weka Weka'));assert.ok(captionGroups(audio['narrator-01']).flatMap(g=>g.words).some(w=>w.text==='Wkwkwk'&&w.end-w.start>.7));
assert.match(scenario.shots.at(-4).caption,/Koplak Desa/);assert.match(scenario.shots.at(-3).caption,/Satuan Pengisi Perut Gratis/);
assert.ok(audio['prabowow-09'].laughStart>0&&audio['prabowow-09'].duration-audio['prabowow-09'].laughStart>1,'Retain audible laughter tail, not just the spoken sentence');
assert.ok(audio['prabowow-09'].envelope.slice(Math.ceil(audio['prabowow-09'].laughStart*30)).some(v=>v>.1),'Laughter segment has an actual audio signal');
for(const s of speech){const clip=audio[s.speech];assert.equal(s.caption,day1Caption(s.speech));assert.ok(s.speechOffset+clip.duration<=s.duration);assert.ok(clip.envelope.some(v=>v>.05));assert.ok(clip.words.every(w=>w.start>=0&&w.end<=clip.duration));const bytes=await fs.readFile(`public/audio/produksi/day-1/${clip.file}`);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');}
assert.equal(speech.filter(s=>audio[s.speech].speaker==='narrator').length,8);
for(const [id,expected] of [['hari-pertama',1],['sari-menyapa',2],['minta-konser',3],['reaksi-keputusan',3]]){const shot=compiled.shots.find(s=>s.id===id),sample=sampleScenario(compiled,shot.start+.5);assert.equal(Object.values(sample.actors).filter(a=>a.visible).length,expected);}
// Each incoming citizen follows a continuous path with enough separation from others.
for(let t=0;t<compiled.duration;t+=.1){const sample=sampleScenario(compiled,t),present=Object.values(sample.actors).filter(a=>a.visible);for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(...present[i].position.map((v,k)=>v-present[j].position[k]))>.75,`Crowding at ${t}`);}
await loadTestAvatars();const stage=await createProductionStage(scenario);
assert.ok(stage.scene.getObjectByName('TemporaryOfficeChair'));assert.ok(stage.scene.getObjectByName('REPUBLIK WKWKWK'));
assert.ok(stage.actors.get('c').productionGuitar.parent.isBone);assert.equal(stage.extras.items.cat.root.visible,false);
const chickenShot=compiled.shots.find(s=>s.id==='ayam-daftar');
for(const local of [.1,chickenShot.duration/2,chickenShot.duration-.1]){stage.pose(chickenShot.start+local);const chicken=stage.extras.items.chicken;assert.ok(chicken.root.visible);assert.equal(stage.extras.items.cat.root.visible,false);const head=chicken.head.getWorldPosition(new THREE.Vector3()).project(stage.camera);assert.ok(Math.abs(head.x)<.6&&Math.abs(head.y)<.8,'Animal camera must follow the chicken throughout its entrance');}
const animalSnapshot=t=>{stage.pose(t);return Object.values(stage.extras.items).flatMap(a=>[a.root.visible,...a.root.position.toArray(),...a.head.rotation.toArray(),...a.legs.flatMap(l=>l.rotation.toArray())]);};
for(const t of [chickenShot.start+.7,compiled.shots.find(s=>s.id==='kucing-kenalan').start+1,compiled.duration-.2]){const expected=animalSnapshot(t);animalSnapshot(0);animalSnapshot(compiled.duration);assert.deepEqual(animalSnapshot(t),expected,'Animal poses must survive arbitrary seeking');}
const snapshot=t=>{stage.pose(t);return [...stage.actors.values()].flatMap(a=>{const values=[a.figure.visible,...a.figure.position.toArray()];a.figure.traverse(n=>{if(n.isBone)values.push(...n.matrixWorld.elements);if(n.morphTargetInfluences)values.push(...n.morphTargetInfluences);});return values;});};
stage.pose(scenario.shots[0].duration-.00001);const prior=stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion());stage.pose(scenario.shots[0].duration);assert.ok(prior.angleTo(stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion()))<.01,'Opening dance must not reset at narration cut');
for(const s of compiled.shots)for(const offset of [0,.1,Math.min(1,s.duration/2),s.duration-.01]){const t=s.start+offset,expected=snapshot(t);snapshot(compiled.duration-.1);snapshot(0);assert.deepEqual(snapshot(t),expected,`Replay/seek ${s.id} ${offset}`);assert.ok(expected.filter(v=>typeof v==='number').every(Number.isFinite));}
for(const s of compiled.shots){if(s.frame)continue;stage.pose(s.start+s.duration/2);for(const [id,actor] of stage.actors){if(!actor.figure.visible||s.camera==='close'&&id!==s.focus||['medium','follow'].includes(s.camera)&&id!==s.focus)continue;const sample=sampleScenario(compiled,s.start+s.duration/2);if(sample.actors[id].action==='Walk')continue;const head=actor.head.getWorldPosition(new THREE.Vector3()).project(stage.camera);assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1,`${s.id}: head in frame ${id}`);}}
const president=stage.actors.get('a'),skin=[];president.figure.traverse(n=>{if(n.userData.avatarSlot==='skin')skin.push(n);});
const laughShot=compiled.shots.find(s=>s.id==='keputusan-perut');stage.pose(laughShot.start+laughShot.speechOffset+audio['prabowow-09'].laughStart+.4);
assert.ok(skin.some(n=>n.morphTargetInfluences[n.morphTargetDictionary.Id_facePrabowow]===1),'New face identity survives laughter');
const smileName=president.figure.userData.expressionController.contract.targets.smile;
assert.ok(skin.some(n=>n.morphTargetInfluences[n.morphTargetDictionary[smileName]]>.4),'Laughter smiles on the rig at the measured cue');
const talk=compiled.shots.find(s=>s.id==='warga-menentukan');stage.pose(talk.start+1.4);
for(const side of ['L','R']){const hand=president.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3());president.figure.worldToLocal(hand);assert.ok(hand.z>.08&&hand.y>.85&&hand.y<1.3,'Conversational hands remain in front and below the face');}
stage.dispose();
let decoded=0;
const context={decodeAudioData:async bytes=>{decoded++;return {bytes};},createBuffer:(channels,length,rate)=>({duration:length/rate,getChannelData:()=>new Float32Array(length)})};
const fetcher=async url=>({ok:true,arrayBuffer:async()=>{const key=url.split('/').at(-1);const b=await fs.readFile(`public/audio/produksi/day-1/${key}`);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const tracks=await loadStoryAudio(scenario,context,{fetcher});assert.equal(decoded,25);assert.equal(tracks.length,27);
for(let i=0;i<speech.length;i++)assert.equal(tracks.filter(t=>t.volume===.95)[i].offset,speech[i].start+speech[i].speechOffset);
assert.equal((await loadStoryAudio(scenario,context,{fetcher,rhythm:false} )).length,23);assert.equal(decoded,25,'Decoded clips cached');
const musicTracks=await loadStoryAudio(scenario,context,{fetcher,voices:false});assert.equal(musicTracks.length,4);
const song=musicTracks.filter(t=>t.kind==='okeGas');assert.equal(song[0].volume,.2);assert.equal(song[1].sourceOffset,scenario.shots[0].duration);assert.equal(song[1].duration,2);
assert.equal(song[2].offset,compiled.shots.at(-4).start,'Oke Gas returns exactly at the two-program decision');assert.equal(song[2].sourceOffset,0);assert.ok(Math.abs(song[2].duration-(compiled.duration-song[2].offset))<1e-8,'Ending song continues across all three shots');
const bed=musicTracks.find(t=>t.kind==='background');assert.equal(bed.offset,song[1].offset+song[1].duration);assert.equal(bed.offset+bed.duration,song[2].offset,'Background hands off to ending song');
const ending=tracks.find(t=>t.kind==='okeGas'&&t.offset===song[2].offset);assert.ok(ending.volumePoints.some(p=>p.volume===.19));assert.ok(ending.volumePoints.at(-1).volume>.4,'Music recovers after the final laugh');
assert.ok(musicTracks.every(t=>t.sourceOffset+t.duration<=(t.kind==='okeGas'?music.duration:180)),'No music is cut off by its source file');
const starts=[];globalThis.OfflineAudioContext=class{destination={};createBufferSource(){return {connect(destination){return destination;},start(at,offset,length){starts.push({at,offset,length});}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}};}async startRendering(){return {numberOfChannels:2,getChannelData:()=>new Float32Array(2)};}};
await mixProductionAudio(musicTracks.map(t=>({...t,buffer:{duration:t.kind==='okeGas'?music.duration:180}})),compiled.duration);
assert.deepEqual(starts.map(t=>[t.at,t.offset,t.length]),musicTracks.map(t=>[t.offset,t.sourceOffset,t.duration]),'Mix must trim music and carry the source offset, not restart or spill into dialogue');
assert.ok(storyAudioUrl('narrator-01').endsWith('/project/public/audio/produksi/day-1/'+audio['narrator-01'].file));
assert.ok(srtFor(scenario).includes('00:00:00,180 -->'));
for(const mutate of [s=>s.shots[0].speech='../../secret',s=>s.shots[0].duration=1,s=>s.shots[0].actors.a.visible='yes',s=>s.shots[0].frame={target:[0,1,0],width:Infinity}]){const bad=structuredClone(scenario);mutate(bad);assert.throws(()=>validateScenario(bad));}
console.log(`PASS Day 1: ${compiled.shots.length} shots, ${compiled.duration.toFixed(2)}s, 23 measured voice clips, continuous entrances, camera framing, deterministic real rigs, audio scheduling/cache, timed SRT. Browser visual/audio review still required.`);
