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

const scenario=day1Scenario(),compiled=compileScenario(scenario);
assert.equal(scenario.set,'republic');assert.equal(compiled.shots.length,27);assert.ok(compiled.duration>=95&&compiled.duration<=110);
const speech=compiled.shots.filter(s=>s.speech);assert.equal(speech.length,20);
assert.deepEqual(migrateProductionDraft(legacy),scenario,'Pristine old episode upgrades automatically');
const custom=structuredClone(legacy);custom.title='Suntingan saya';custom.shots[0].caption='Narasi pilihan saya';
const migrated=migrateProductionDraft(custom);assert.equal(migrated.title,custom.title);assert.equal(migrated.shots[0].caption,custom.shots[0].caption);assert.equal(migrated.shots.length,custom.shots.length);assert.equal(migrated.shots[0].speech,undefined);validateScenario(migrated);
assert.match(scenario.shots.at(-3).caption,/Koplak Desa/);assert.match(scenario.shots.at(-2).caption,/Satuan Pengisi Perut Gratis/);
assert.ok(audio['prabowow-10'].laughStart>0&&audio['prabowow-10'].duration-audio['prabowow-10'].laughStart>1,'Retain audible laughter tail, not just the spoken sentence');
assert.ok(audio['prabowow-10'].envelope.slice(Math.ceil(audio['prabowow-10'].laughStart*30)).some(v=>v>.1),'Laughter segment has an actual audio signal');
for(const s of speech){const clip=audio[s.speech];assert.equal(s.caption,day1Caption(s.speech));assert.ok(s.speechOffset+clip.duration<=s.duration);assert.ok(clip.envelope.some(v=>v>.05));assert.ok(clip.words.every(w=>w.start>=0&&w.end<=clip.duration));const bytes=await fs.readFile(`public/audio/produksi/day-1/${clip.file}`);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');}
assert.equal(speech.filter(s=>audio[s.speech].speaker==='narrator').length,3);
for(const [id,expected] of [['hari-pertama',1],['sari-menyapa',2],['minta-konser',3],['reaksi-keputusan',3]]){const shot=compiled.shots.find(s=>s.id===id),sample=sampleScenario(compiled,shot.start+.5);assert.equal(Object.values(sample.actors).filter(a=>a.visible).length,expected);}
// Each incoming citizen follows a continuous path with enough separation from others.
for(let t=0;t<compiled.duration;t+=.1){const sample=sampleScenario(compiled,t),present=Object.values(sample.actors).filter(a=>a.visible);for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(...present[i].position.map((v,k)=>v-present[j].position[k]))>.75,`Crowding at ${t}`);}
await loadTestAvatars();const stage=await createProductionStage(scenario);
assert.ok(stage.scene.getObjectByName('TemporaryOfficeChair'));assert.ok(stage.scene.getObjectByName('REPUBLIK WKWKWK'));
const snapshot=t=>{stage.pose(t);return [...stage.actors.values()].flatMap(a=>{const values=[a.figure.visible,...a.figure.position.toArray()];a.figure.traverse(n=>{if(n.isBone)values.push(...n.matrixWorld.elements);if(n.morphTargetInfluences)values.push(...n.morphTargetInfluences);});return values;});};
stage.pose(scenario.shots[0].duration-.00001);const prior=stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion());stage.pose(scenario.shots[0].duration);assert.ok(prior.angleTo(stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion()))<.01,'Opening dance must not reset at narration cut');
for(const s of compiled.shots)for(const offset of [0,.1,Math.min(1,s.duration/2),s.duration-.01]){const t=s.start+offset,expected=snapshot(t);snapshot(compiled.duration-.1);snapshot(0);assert.deepEqual(snapshot(t),expected,`Replay/seek ${s.id} ${offset}`);assert.ok(expected.filter(v=>typeof v==='number').every(Number.isFinite));}
for(const s of compiled.shots){if(s.frame)continue;stage.pose(s.start+s.duration/2);for(const [id,actor] of stage.actors){if(!actor.figure.visible||s.camera==='close'&&id!==s.focus||s.camera==='medium'&&id!==s.focus)continue;const sample=sampleScenario(compiled,s.start+s.duration/2);if(sample.actors[id].action==='Walk')continue;const head=actor.head.getWorldPosition(new THREE.Vector3()).project(stage.camera);assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1,`${s.id}: head in frame ${id}`);}}
const president=stage.actors.get('a'),skin=[];president.figure.traverse(n=>{if(n.userData.avatarSlot==='skin')skin.push(n);});
const laughShot=compiled.shots.find(s=>s.id==='keputusan-perut');stage.pose(laughShot.start+.3+audio['prabowow-10'].laughStart+.4);
assert.ok(skin.some(n=>n.morphTargetInfluences[n.morphTargetDictionary.Id_facePrabowow]===1),'New face identity survives laughter');
const smileName=president.figure.userData.expressionController.contract.targets.smile;
assert.ok(skin.some(n=>n.morphTargetInfluences[n.morphTargetDictionary[smileName]]>.4),'Laughter smiles on the rig at the measured cue');
const talk=compiled.shots.find(s=>s.id==='bangun-bareng');stage.pose(talk.start+1.4);
for(const side of ['L','R']){const hand=president.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3());president.figure.worldToLocal(hand);assert.ok(hand.z>.08&&hand.y>.85&&hand.y<1.3,'Conversational hands remain in front and below the face');}
stage.dispose();
let decoded=0;
const context={decodeAudioData:async bytes=>{decoded++;return {bytes};},createBuffer:(channels,length,rate)=>({duration:length/rate,getChannelData:()=>new Float32Array(length)})};
const fetcher=async url=>({ok:true,arrayBuffer:async()=>{const key=url.split('/').at(-1);const b=await fs.readFile(`public/audio/produksi/day-1/${key}`);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const tracks=await loadStoryAudio(scenario,context,{fetcher});assert.equal(decoded,21);assert.equal(tracks.length,22);
for(let i=0;i<speech.length;i++)assert.equal(tracks.filter(t=>t.volume===.95)[i].offset,speech[i].start+.3);
assert.equal((await loadStoryAudio(scenario,context,{fetcher,rhythm:false})).length,20);assert.equal(decoded,21,'Decoded clips cached');
const musicTracks=await loadStoryAudio(scenario,context,{fetcher,voices:false});assert.equal(musicTracks.length,2);assert.equal(musicTracks[0].volume,.08);assert.equal(musicTracks[1].sourceOffset,scenario.shots[0].duration);assert.equal(musicTracks[1].duration,3);
const starts=[];globalThis.OfflineAudioContext=class{destination={};createBufferSource(){return {connect(destination){return destination;},start(at,offset,length){starts.push({at,offset,length});}};}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}};}async startRendering(){return {numberOfChannels:2,getChannelData:()=>new Float32Array(2)};}};
await mixProductionAudio(musicTracks.map(t=>({...t,buffer:{duration:8}})),compiled.duration);
assert.deepEqual(starts.map(t=>[t.at,t.offset,t.length]),musicTracks.map(t=>[t.offset,t.sourceOffset,t.duration]),'Mix must trim music and carry the source offset, not restart or spill into dialogue');
assert.ok(storyAudioUrl('narrator-01').endsWith('/project/public/audio/produksi/day-1/'+audio['narrator-01'].file));
assert.ok(srtFor(scenario).includes('00:00:00,300 -->'));
for(const mutate of [s=>s.shots[0].speech='../../secret',s=>s.shots[0].duration=1,s=>s.shots[0].actors.a.visible='yes',s=>s.shots[0].frame={target:[0,1,0],width:Infinity}]){const bad=structuredClone(scenario);mutate(bad);assert.throws(()=>validateScenario(bad));}
console.log(`PASS Day 1: ${compiled.shots.length} shots, ${compiled.duration.toFixed(2)}s, 20 measured voice clips, continuous entrances, camera framing, deterministic real rigs, audio scheduling/cache, timed SRT. Browser visual/audio review still required.`);
