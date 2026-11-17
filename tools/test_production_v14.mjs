import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sampleEpisode,EPISODE_DURATION,EPISODE_CUES,EPISODE_SCENES,EPISODE_SHOTS,EPISODE_EVENTS} from '../game-src/production-v14-episode.js';
import {createV14Props} from '../game-src/production-v14-props.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createHumanModel,setFarmerAsset} from '../game-src/avatar-character-3d.js';
const base='public/audio/produksi/episode-002/release-v14/';
const timeline=JSON.parse(readFileSync(base+'timeline.json','utf8'));
const script=readFileSync('docs/script/002-kursi-kosong-proses-pengganti-wapres-2026-11-13.md','utf8').split('# Arsip Naskah')[0];
assert.equal(EPISODE_CUES.length,10);assert.equal(EPISODE_SHOTS.length,18);assert.equal(EPISODE_SCENES.length,6);
for(const c of EPISODE_CUES){assert.ok(script.includes(c.text));assert.equal(c.spoken_text,c.text.replaceAll('WKWKWK','wekawekaweka'));assert.equal(c.inserted_holds.length,0);
  for(const m of c.source_to_cue_mapping)assert.equal(m.source_end_frame-m.source_start_frame,m.cue_end_frame-m.cue_start_frame);}
assert.ok(EPISODE_CUES.at(-1).text.includes('Follow jadi warga'));assert.ok(EPISODE_CUES.at(-1).text.includes('Komen:'));
for(const stem of ['master','dialogue','music','fx']){
 const wav=readFileSync(base+`episode-002-v14-${stem}.wav`);assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),44100);
 assert.ok(Math.abs(wav.readUInt32LE(40)/4/44100-EPISODE_DURATION)<1e-5);
 for(let i=44;i<wav.length;i+=2)assert.ok(Math.abs(wav.readInt16LE(i))<32767,'No clipping '+stem);
}
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
setFarmerAsset(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
const world=new THREE.Group(),production=buildProductionDistrict(THREE,{world,makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
const originalCount=production.cast.length,props=createV14Props(THREE,production),camera=new THREE.PerspectiveCamera();
const originalExtraVisibility=production.neighborhood.extras.map(e=>e.root.visible);
assert.equal(production.cast.length,originalCount,'Cutscene actors must not enter world interaction list');
assert.equal(props.extraCast.length,3);
let maxGrip=0,worst=null;const bad=new Map();
function checkPose(npc,p,t){
 npc.root.updateWorldMatrix(true,true);
 for(const [side,target] of Object.entries(p.handTargets)){
  const error=npc.model.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...target));
  if(error>maxGrip){maxGrip=error;worst={t,id:npc.id,side,error};}
  if(error>.07&&(!bad.has(npc.id)||bad.get(npc.id).error<error))bad.set(npc.id,{t,side,error});
 }
 npc.model.figure.traverse(n=>{if(n.isBone)assert.ok(n.matrixWorld.elements.every(Number.isFinite));});
}
for(let t=0;t<=EPISODE_DURATION;t+=.12){
 const s=sampleEpisode(t);assert.deepEqual(s,sampleEpisode(t));assert.ok(!s.actors.pemandu);assert.equal(s.extras.length,8);
 for(const npc of [...production.cast,...props.extraCast]){const p=s.actors[npc.id];if(!p)continue;
  if(npc.id!==s.cue.role)assert.equal(p.mouthOpen,0);
  if(npc.id===s.cue.role)assert.notEqual(p.visible,false,'Speaking actor cannot be hidden');
  props.reset(npc);npc.root.position.set(p.x,p.y,p.z);npc.root.rotation.set(0,p.yaw,0);
  npc.model.mixer.stopAllAction();const a=npc.model.actions[p.clip];assert.ok(a);a.reset().play();a.time=p.phase%a.getClip().duration;npc.model.mixer.update(0);props.pose(npc,p);checkPose(npc,p,t);
 }
 props.poseExtras(s);props.update(s);
 for(const [i,e] of production.neighborhood.extras.entries())checkPose(e,s.extras[i],t);
 for(const aspect of [9/16,16/9]){
  const shot=sampleEpisode(t,aspect);camera.fov=shot.camera.fov;camera.aspect=aspect;camera.position.fromArray(shot.camera.position);camera.lookAt(...shot.camera.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  assert.ok(camera.matrixWorld.elements.every(Number.isFinite));
  const target=new THREE.Vector3(...shot.camera.target).project(camera);assert.ok(Math.abs(target.x)<.01&&Math.abs(target.y)<.01);
 }
}
console.log('Grip residual',maxGrip,worst,'issues',Object.fromEntries(bad));
assert.ok(maxGrip<.07,'Prop grips within 7cm');
assert.equal(sampleEpisode(EPISODE_EVENTS.sit+1).actors.bahlil.seated,1);
assert.equal(sampleEpisode(EPISODE_EVENTS.smile_drop+1).actors.bahlil.smile,0);
assert.equal(sampleEpisode(EPISODE_DURATION-1).props.writing,true);
assert.equal(sampleEpisode(EPISODE_DURATION).fadeOut,1);
for(let i=1;i<EPISODE_SHOTS.length;i++)assert.equal(EPISODE_SHOTS[i-1].end,EPISODE_SHOTS[i].start);
assert.equal(timeline.speech_speed,1);assert.equal(timeline.speech_pitch,1);
props.resetExtras();assert.deepEqual(production.neighborhood.extras.map(e=>e.root.visible),originalExtraVisibility);
props.dispose();assert.equal(production.cast.length,originalCount);
console.log('PASS V14: exact script/audio, 18 cuts, 6 scenes, deterministic rigs/props, speaker gating, seated work payoff, resource disposal.');
