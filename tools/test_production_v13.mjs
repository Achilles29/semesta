import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EPISODE_SCENES,EPISODE_CUES,EPISODE_DURATION,sampleEpisode,createPreviewClock} from '../game-src/production-v13-episode.js';
import {createV13Props} from '../game-src/production-v13-props.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createHumanModel,setFarmerAsset} from '../game-src/avatar-character-3d.js';
const script=readFileSync('docs/script/002-kursi-kosong-proses-pengganti-wapres-2026-11-13.md','utf8').split('## Arsip V12')[0];
assert.equal(EPISODE_CUES.length,9);assert.equal(EPISODE_SCENES.length,4);
for(const c of EPISODE_CUES)assert.ok(script.includes(c.text),'Exact V13 script: '+c.id);
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
setFarmerAsset(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
const world=new THREE.Group(),production=buildProductionDistrict(THREE,{world,
  makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},
  makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
const props=createV13Props(THREE,production),camera=new THREE.PerspectiveCamera();
let maxGrip=0,worst=null;
for(let t=0;t<=EPISODE_DURATION;t+=.1){
  const s=sampleEpisode(t);assert.deepEqual(s,sampleEpisode(t));
  assert.equal(s.speaking,false);assert.ok(!s.actors.pemandu,'Narrator stays off-screen');
  for(const npc of production.cast){
    const p=s.actors[npc.id];if(!p)continue;
    assert.equal(p.mouthOpen,0,'No fabricated V13 waveform');
    props.reset(npc);npc.root.position.set(p.x,p.y,p.z);npc.root.rotation.set(0,p.yaw,0);
    npc.model.mixer.stopAllAction();const action=npc.model.actions[p.clip];assert.ok(action);action.reset().play();action.time=p.phase%action.getClip().duration;npc.model.mixer.update(0);props.pose(npc,p);
    npc.root.updateWorldMatrix(true,true);
    for(const [side,target] of Object.entries(p.handTargets)){
      const error=npc.model.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...target));
      if(error>maxGrip){maxGrip=error;worst={t,id:npc.id,side,error};}
    }
    npc.model.figure.traverse(n=>{if(n.isBone)assert.ok(n.matrixWorld.elements.every(Number.isFinite));});
  }
  props.poseExtras(s);props.update(s);
  for(const [i,e] of production.neighborhood.extras.entries()){
    e.root.updateWorldMatrix(true,true);
    for(const [side,target] of Object.entries(s.extras[i].handTargets)){
      const error=e.model.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...target));
      if(error>maxGrip){maxGrip=error;worst={t,id:e.id,side,error};}
    }
  }
  if(t>=66){const a=s.actors['bu-warung'];for(const id of ['bahlil','mama-ghufron'])assert.ok(Math.hypot(a.x-s.actors[id].x,a.z-s.actors[id].z)>.65,'Walk path avoids candidate '+t);}
  for(const aspect of [9/16,16/9]){
    const shot=sampleEpisode(t,aspect);camera.fov=shot.camera.fov;camera.aspect=aspect;camera.position.fromArray(shot.camera.position);camera.lookAt(...shot.camera.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const ids=t>=55&&t<66?['komeng','bu-warung']:t<27?['bahlil','bu-warung']:t<55?['bahlil','mama-ghufron','bu-warung']:['bahlil','mama-ghufron','bu-warung'];
    for(const id of ids){const a=shot.actors[id];for(const y of [.13,1.9]){const point=new THREE.Vector3(a.x,y+a.y,a.z).project(camera);assert.ok(Math.abs(point.x)<.98&&Math.abs(point.y)<.98,`Framing ${t} ${id} ${aspect} ${point.toArray()}`);}}
  }
}
console.log('Max grip residual:',maxGrip,worst);
assert.ok(maxGrip<.05,'Hands within 5 cm of grip targets');
assert.equal(sampleEpisode(54).props.roll,0);assert.ok(sampleEpisode(65).props.roll>.99);
assert.equal(sampleEpisode(70).actors['bu-warung'].seated,0);assert.equal(sampleEpisode(73).actors['bu-warung'].seated,1);
assert.ok(sampleEpisode(74).actors.bahlil.headYaw>0);assert.equal(sampleEpisode(0).actors['bu-warung'].seated,0);
assert.deepEqual(sampleEpisode(96).props.hole,sampleEpisode(0).props.hole,'Hole remains; freeing cart is not road repair');
assert.equal(props.group.getObjectByName('V13WarungCart').isGroup,true);
assert.equal(sampleEpisode(96).fadeOut,1);
for(const fps of [30,60,144]){const c=createPreviewClock();await c.start();for(let i=0;i<=fps*13;i++)c.tick(i*1000/fps);assert.ok(Math.abs(c.time-10)<1e-6);await c.pause();c.tick(15000);assert.ok(Math.abs(c.time-10)<1e-6);c.seek(55);await c.pause();c.tick(16000);c.tick(16100);assert.ok(Math.abs(c.time-55.1)<1e-6);c.tick(18000);assert.equal(c.state,'paused');c.dispose();assert.equal(c.active,false);}
const c=createPreviewClock();await c.start(55,66);for(let i=0;i<=600;i++)c.tick(i*1000/30);assert.equal(c.time,66);assert.equal(c.state,'finished');
props.dispose();console.log('PASS V13: exact script, four scenes, deterministic replay, cast rigs, camera framing, cart release, seated rest, silent preview clock.');
