import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {blankScenario,rehearsalScenario,validateScenario,compileScenario,sampleScenario,travel,srtFor} from '../game-src/production-scenario.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {encodeMp4,frameCount} from '../game-src/production-export.js';

assert.deepEqual(blankScenario().shots,[],'Day 1 must start empty');
const rehearsal=rehearsalScenario(),compiled=compileScenario(rehearsal);
assert.equal(compiled.duration,10);assert.equal(frameCount(compiled.duration),300);
assert.equal(sampleScenario(compiled,2).shot.id,'salam');assert.equal(sampleScenario(compiled,999).shot.id,'selesai');
assert.equal(sampleScenario(compileScenario(blankScenario()),0),null);
assert.deepEqual(sampleScenario(compiled,0).actors.a.position,rehearsal.cast[0].position);
assert.deepEqual(sampleScenario(compiled,2).actors.a.position,rehearsal.shots[0].actors.a.to);
assert.equal(travel(0,2),0);assert.equal(travel(2,2),1);
for(let i=0;i<200;i++)assert.ok(travel(i/100,2)<=travel((i+1)/100,2));
for(const mutate of [s=>s.cast[0].preset='missing',s=>s.shots[0].duration=NaN,s=>s.shots[0].duration=-1,s=>s.shots[0].focus='missing',s=>s.shots[0].actors.a.to=[Infinity,0],s=>s.shots[0].actors.a.action='UnknownAction',s=>s.cast.push(s.cast[0]),s=>s.shots[1].id=s.shots[0].id,s=>s.props.push('missing'),s=>s.shots=Array.from({length:8},(_,i)=>({...s.shots[0],id:String(i),duration:30}))]){
  const invalid=structuredClone(rehearsal);mutate(invalid);assert.throws(()=>validateScenario(invalid));
}
const srt=srtFor(rehearsal);assert.ok(srt.includes('00:00:02,000 --> 00:00:05,000'));assert.equal(srtFor(blankScenario()),'');
await loadTestAvatars();
const stage=await createProductionStage(rehearsal);
function snapshot(t){stage.pose(t);return [...stage.actors.values()].flatMap(a=>{a.figure.updateMatrixWorld(true);const result=[...a.figure.position.toArray(),...a.figure.quaternion.toArray()];a.figure.traverse(n=>{if(n.isBone)result.push(...n.matrixWorld.elements);});return result;});}
for(const t of [0,.1,.7,1.95,2,2.1,4.9,5.1,7.9,8.1,10]){
  const expected=snapshot(t);snapshot(9.9);snapshot(.02);assert.deepEqual(snapshot(t),expected,`seek/replay ${t}`);assert.ok(expected.every(Number.isFinite));
}
const before=snapshot(2.4);const edited=structuredClone(rehearsal);edited.shots[1].actors.a={action:'Point',yaw:1};stage.setScenario(edited);
assert.notDeepEqual(snapshot(2.4),before,'Edits must update the actual pose, not only the displayed timeline');
edited.shots[1].actors.a={action:'Hold',yaw:0};stage.setScenario(edited);stage.pose(3);
const parcel=stage.actors.get('a').productionParcel;
assert.equal(parcel.visible,true);assert.equal(parcel.parent,stage.actors.get('a').figure.userData.getGrip('handR'));
assert.ok(parcel.getWorldPosition(new THREE.Vector3()).y>.5,'Held prop must not be left at the ground origin');
stage.pose(0);assert.equal(parcel.visible,false);
for(const aspect of [9/16,16/9,1]){stage.pose(5.5,aspect);assert.equal(stage.camera.aspect,aspect);assert.ok(stage.camera.projectionMatrix.elements.every(Number.isFinite));}
// Shared avatar resources must survive preview replacement.
stage.dispose();const next=await createProductionStage(rehearsal);next.pose(2);assert.equal(next.actors.size,2);next.dispose();

// Backpressure, exact timestamps, audio inclusion, cancellation, and codec failure.
let order=[],cancelled=0,finalized=0;
class Output{constructor({target}){this.target=target;}addVideoTrack(){}addAudioTrack(){order.push('audio-track');}async start(){}async finalize(){finalized++;this.target.buffer=new Uint8Array([0,0,0,20,102,116,121,112]).buffer;}async cancel(){cancelled++;}}
class CanvasSource{constructor(){}async add(t,d){order.push([t,d]);await new Promise(r=>setTimeout(r,1));}close(){}}
class AudioBufferSource{async add(){order.push('audio-data');}close(){}}
const media={Output,CanvasSource,AudioBufferSource,Quality:class{},Mp4OutputFormat:class{},BufferTarget:class{},canEncodeVideo:async()=>true,canEncodeAudio:async()=>true};
const args={canvas:{width:1080,height:1920},duration:.2,audio:{},renderFrame:t=>order.push(`render:${t}`)};
const result=await encodeMp4(args,media);assert.equal(result.type,'video/mp4');assert.equal(finalized,1);assert.equal(cancelled,0);
assert.equal(order[0],'audio-track');assert.equal(order[1],'audio-data');
for(let i=0;i<6;i++){assert.equal(order[2+i*2],`render:${i/30}`);assert.deepEqual(order[3+i*2],[i/30,1/30]);}
const abort=new AbortController();await assert.rejects(encodeMp4({...args,signal:abort.signal,renderFrame:()=>abort.abort()},media),{name:'AbortError'});assert.equal(cancelled,1);assert.equal(finalized,1);
await assert.rejects(encodeMp4(args,{...media,canEncodeVideo:async()=>false}),/H.264/);
await assert.rejects(encodeMp4(args,{...media,canEncodeAudio:async()=>false}),/AAC/);
const main=await fs.readFile('game-src/main.js','utf8'),admin=await fs.readFile('application/views/admin.php','utf8');
assert.ok(main.includes("import('./production-studio.js')"));assert.ok(!main.includes('mountProductionDirector'));assert.ok(admin.includes('adminProductionStudio'));assert.ok(!admin.includes('mountProductionVideoLibrary'));
for(const path of ['public/audio/produksi/episode-001','public/audio/produksi/episode-002','public/audio/produksi/episode-003','public/audio/produksi/episode-004'])await assert.rejects(fs.access(path));
console.log('PASS: empty Day 1, validation, replay/seek on real V15 rigs, prop attachment, edits, export timing/audio/cancel/codec guards, old content removed. Browser GPU/encoder not exercised.');
