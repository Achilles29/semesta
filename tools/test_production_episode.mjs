import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EPISODE_SCENES,EPISODE_CUES,EPISODE_DURATION,sampleEpisode,createEpisodeClock,episodeCueSheet} from '../game-src/production-episode.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createV10Props} from '../game-src/production-v10-props.js';
import {createCastPerformance} from '../game-src/production-performance.js';
import {createHumanModel,setFarmerAsset} from '../game-src/avatar-character-3d.js';
const plan=JSON.parse(readFileSync('public/audio/produksi/episode-002/revision-v10/dialogue-plan.json','utf8'));
assert.equal(EPISODE_SCENES.length,6);assert.equal(EPISODE_CUES.length,19);
assert.ok(EPISODE_DURATION>80&&EPISODE_DURATION<110);
assert.deepEqual(EPISODE_CUES.map(c=>c.spoken_text),plan.cues.map(c=>c.spoken_text));
for(let i=0;i<6;i++){const s=EPISODE_SCENES[i];assert.equal(s.start,i?EPISODE_SCENES[i-1].end:0);assert.ok(s.end>s.start);assert.equal(sampleEpisode(s.start).scene.id,s.id);}
for(let i=0;i<19;i++){const c=EPISODE_CUES[i];assert.equal(c.end,EPISODE_CUES[i+1]?.start??EPISODE_DURATION);assert.ok(c.audio_end>c.start&&c.end>=c.audio_end);}
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');setFarmerAsset(asset);
const clips=new Set(asset.animations.map(c=>c.name)),world=new THREE.Group();
const production=buildProductionDistrict(THREE,{world,
 makeHuman(parent,options){const m=createHumanModel(THREE,options);parent.add(m.figure);return m;},
 makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},
 addCollider(x,z){return {x,z};},createWorldAsset(){return new THREE.Group();}
});
const props=createV10Props(THREE,production),camera=new THREE.PerspectiveCamera();
const performance=createCastPerformance(THREE,production.cast);
const speakingFrames=new Set();
let maxGripError=0;const gripErrors={};
for(let t=0;t<=EPISODE_DURATION;t+=.05){
 const shot=sampleEpisode(t);assert.deepEqual(shot,sampleEpisode(t));assert.ok(shot.actors[shot.cue.role]);
 const movingMouths=Object.entries(shot.actors).filter(([,a])=>a.mouthOpen>0);
 assert.ok(movingMouths.length<=1,'Never animate a silent actor as the speaker');
 if(movingMouths.length){assert.equal(movingMouths[0][0],shot.cue.role);speakingFrames.add(shot.cue.id);}
 assert.ok(shot.direction.partners.includes(shot.cue.role)||!shot.speaking);
 for(const aspect of [9/16,16/9]){
  const s=sampleEpisode(t,aspect);camera.fov=s.camera.fov;camera.aspect=aspect;camera.position.fromArray(s.camera.position);camera.lookAt(...s.camera.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const a=s.actors[s.cue.role],face=new THREE.Vector3(a.x,1.6+(a.y??0),a.z).project(camera);
  assert.ok(Math.abs(face.x)<.96&&Math.abs(face.y)<.95,'Speaking face outside frame '+t+' '+s.cue.role);
 }
 for(const npc of production.cast){
  const a=shot.actors[npc.id];assert.ok(clips.has(a.clip));assert.ok([a.x,a.y,a.z,a.yaw,a.phase].every(Number.isFinite));
  props.reset(npc);npc.root.position.set(a.x,a.y,a.z);npc.root.rotation.set(0,a.yaw,0);
  npc.model.mixer.stopAllAction();const action=npc.model.actions[a.clip];action.reset().play();action.time=((a.phase%action.getClip().duration)+action.getClip().duration)%action.getClip().duration;npc.model.mixer.update(0);
  props.pose(npc,a);performance.update(npc,a);npc.root.updateWorldMatrix(true,true);
  for(const [side,target] of Object.entries(a.handTargets)){
   const hand=npc.model.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3());
   const error=hand.distanceTo(new THREE.Vector3(...target));maxGripError=Math.max(maxGripError,error);
   if(error>(gripErrors[npc.id]?.error??0))gripErrors[npc.id]={error,t,side,target,hand:hand.toArray(),shoulder:npc.model.figure.getObjectByName('upper_arm'+side).getWorldPosition(new THREE.Vector3()).toArray()};
  }
  npc.model.figure.traverse(n=>{if(n.isBone)assert.ok(n.matrixWorld.elements.every(Number.isFinite));});
 }
 props.poseExtras(shot);props.update(shot);
}
console.log('Maximum grip target residual:',maxGripError.toFixed(3));
console.log(gripErrors);
assert.ok(maxGripError<.05,'Grip must remain within 5 cm of prop without stretching bones');
assert.equal(speakingFrames.size,19,'Every dialogue has measured speech activity');
performance.reset();
for(const npc of production.cast)assert.equal(npc.model.figure.getObjectByName('SpeechMouth').visible,false);
const cue=beat=>EPISODE_CUES.find(c=>c.beat===beat);
assert.equal(sampleEpisode(cue('open_valve').audio_end).props.water,0);
assert.ok(sampleEpisode(cue('open_valve').audio_end+1.6).props.water>.99);
assert.equal(sampleEpisode(cue('declare_winner').audio_end+3.6).actors['bu-warung'].seated,1);
assert.equal(sampleEpisode(cue('accept_and_serve').start).actors['bu-warung'].seated,1);
assert.equal(sampleEpisode(EPISODE_DURATION-2).actors['bu-warung'].seated,1);
assert.ok(sampleEpisode(cue('declare_winner').start).extras.filter(e=>e.vote>.9).length>=5);
assert.equal(sampleEpisode(0).props.water,0,'Replay resets the tap');
assert.equal(sampleEpisode(0).actors['bu-warung'].seated,0,'Replay resets the chair');
assert.equal(props.group.getObjectByName('V10MainValve').isGroup,true);
assert.ok(sampleEpisode(EPISODE_DURATION).fadeOut>.999);
assert.ok(episodeCueSheet().includes('belum lip-sync'));
for(const fps of [30,60,144]){
 const c=createEpisodeClock();c.start();for(let i=0;i<=fps*13;i++)c.tick(i*1000/fps);assert.ok(Math.abs(c.time-10)<1e-6);
 c.pause();const paused=c.time;c.tick(13100);assert.equal(c.time,paused);c.seek(40);c.pause();c.tick(14000);c.tick(14100);assert.ok(Math.abs(c.time-40.1)<1e-6);
 c.tick(20000);assert.equal(c.state,'paused');c.stop();assert.ok(!c.active);
}
const selected=createEpisodeClock();selected.start(29,40);selected.tick(0);assert.equal(selected.time,29);
for(let i=1;i<=450;i++)selected.tick(i*1000/30);assert.equal(selected.time,40);
performance.dispose();props.dispose();
console.log('PASS: V10 19 cues, six audio-aligned scenes, 9:16/16:9 speaker framing, actual rig/props, deterministic sampling, water cause/effect, majority vote, seated winner and end fade.');
