import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {day1Scenario,day1Caption} from '../game-src/production-day1.js';
import audio from '../game-src/production-day1-audio.json' with {type:'json'};
import {compileScenario,sampleScenario,validateScenario,srtFor} from '../game-src/production-scenario.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {loadStoryAudio,storyAudioUrl} from '../game-src/production-story-audio.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';

const scenario=day1Scenario(),compiled=compileScenario(scenario);
assert.equal(scenario.set,'republic');assert.equal(compiled.shots.length,26);assert.ok(compiled.duration>=85&&compiled.duration<=91);
const speech=compiled.shots.filter(s=>s.speech);assert.equal(speech.length,19);
for(const s of speech){const clip=audio[s.speech];assert.equal(s.caption,day1Caption(s.speech));assert.ok(s.speechOffset+clip.duration<=s.duration);assert.ok(clip.envelope.some(v=>v>.05));assert.ok(clip.words.every(w=>w.start>=0&&w.end<=clip.duration));const bytes=await fs.readFile(`public/audio/produksi/day-1/${clip.file}`);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');}
assert.equal(speech.filter(s=>audio[s.speech].speaker==='narrator').length,3);
for(const [id,expected] of [['hari-pertama',1],['sari-menyapa',2],['minta-konser',3],['joget-bersama',3]]){const shot=compiled.shots.find(s=>s.id===id),sample=sampleScenario(compiled,shot.start+.5);assert.equal(Object.values(sample.actors).filter(a=>a.visible).length,expected);}
// Each incoming citizen follows a continuous path with enough separation from others.
for(let t=0;t<compiled.duration;t+=.1){const sample=sampleScenario(compiled,t),present=Object.values(sample.actors).filter(a=>a.visible);for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(...present[i].position.map((v,k)=>v-present[j].position[k]))>.75,`Crowding at ${t}`);}
await loadTestAvatars();const stage=await createProductionStage(scenario);
assert.ok(stage.scene.getObjectByName('TemporaryOfficeChair'));assert.ok(stage.scene.getObjectByName('REPUBLIK WKWKWK'));
const snapshot=t=>{stage.pose(t);return [...stage.actors.values()].flatMap(a=>{const values=[a.figure.visible,...a.figure.position.toArray()];a.figure.traverse(n=>{if(n.isBone)values.push(...n.matrixWorld.elements);if(n.morphTargetInfluences)values.push(...n.morphTargetInfluences);});return values;});};
stage.pose(3-.00001);const prior=stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion());stage.pose(3);assert.ok(prior.angleTo(stage.actors.get('a').figure.getObjectByName('forearmL').getWorldQuaternion(new THREE.Quaternion()))<.01,'Opening dance must not reset at narration cut');
for(const s of compiled.shots)for(const offset of [0,.1,Math.min(1,s.duration/2),s.duration-.01]){const t=s.start+offset,expected=snapshot(t);snapshot(compiled.duration-.1);snapshot(0);assert.deepEqual(snapshot(t),expected,`Replay/seek ${s.id} ${offset}`);assert.ok(expected.filter(v=>typeof v==='number').every(Number.isFinite));}
for(const s of compiled.shots){if(s.frame)continue;stage.pose(s.start+s.duration/2);for(const [id,actor] of stage.actors){if(!actor.figure.visible||s.camera==='close'&&id!==s.focus||s.camera==='medium'&&id!==s.focus)continue;const sample=sampleScenario(compiled,s.start+s.duration/2);if(sample.actors[id].action==='Walk')continue;const head=actor.head.getWorldPosition(new THREE.Vector3()).project(stage.camera);assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1,`${s.id}: head in frame ${id}`);}}
stage.dispose();
let decoded=0;
const context={decodeAudioData:async bytes=>{decoded++;return {bytes};},createBuffer:(channels,length,rate)=>({duration:length/rate,getChannelData:()=>new Float32Array(length)})};
const fetcher=async url=>({ok:true,arrayBuffer:async()=>{const key=url.split('/').at(-1);const b=await fs.readFile(`public/audio/produksi/day-1/${key}`);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const tracks=await loadStoryAudio(scenario,context,{fetcher});assert.equal(decoded,19);assert.equal(tracks.length,21);
for(let i=0;i<speech.length;i++)assert.equal(tracks.filter(t=>t.volume===.95)[i].offset,speech[i].start+.3);
assert.equal((await loadStoryAudio(scenario,context,{fetcher,rhythm:false})).length,19);assert.equal(decoded,19,'Decoded clips cached');
assert.ok(storyAudioUrl('narrator-01').endsWith('/project/public/audio/produksi/day-1/narrator-01.wav'));
assert.ok(srtFor(scenario).includes('00:00:00,300 -->'));
for(const mutate of [s=>s.shots[0].speech='../../secret',s=>s.shots[0].duration=1,s=>s.shots[0].actors.a.visible='yes',s=>s.shots[0].frame={target:[0,1,0],width:Infinity}]){const bad=structuredClone(scenario);mutate(bad);assert.throws(()=>validateScenario(bad));}
console.log(`PASS Day 1: ${compiled.shots.length} shots, ${compiled.duration.toFixed(2)}s, 19 measured voice clips, continuous entrances, camera framing, deterministic real rigs, audio scheduling/cache, timed SRT. Browser visual/audio review still required.`);
