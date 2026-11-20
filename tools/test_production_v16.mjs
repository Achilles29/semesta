import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHumanModel} from '../game-src/avatar-runtime.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createV16Props} from '../game-src/production-v16-props.js';
import {sampleEpisode,EPISODE_DURATION,EPISODE_CUES,EPISODE_SHOTS,EPISODE_SCENES,EPISODE_EVENTS,V16_SET} from '../game-src/production-v16-episode.js';
const base='public/audio/produksi/episode-002/';
const plan=JSON.parse(readFileSync(base+'generated-v16/batch-plan.json','utf8'));
const endingPlan=JSON.parse(readFileSync(base+'generated-v16-r3/ending-plan.json','utf8'));
assert.equal(EPISODE_CUES.length,17);assert.equal(EPISODE_SCENES.length,6);assert.equal(EPISODE_SHOTS.length,23);
assert.ok(EPISODE_CUES.some(c=>c.text.includes('Diindaa!')));
assert.ok(EPISODE_CUES.some(c=>c.text.includes('Betul apa tidak?')));
assert.ok(EPISODE_CUES.at(-1).text.includes('Follow buat jadi warga'));
assert.ok(EPISODE_CUES.at(-1).text.includes('Republik ini kita bangun dari komentar kalian.'));
for(const [i,c] of EPISODE_CUES.entries()){
  assert.equal(c.text,i===16?endingPlan.approved_text:plan.cues[i].text);assert.equal(c.spoken_text,c.text.replaceAll('WKWKWK','wekawekaweka'));
  assert.equal(c.characters.map(x=>x.text).join(''),c.spoken_text);
  assert.ok(c.start<c.audio_end&&c.audio_end<c.end);
  assert.equal(c.inserted_holds.length,0);
  for(const m of c.source_to_cue_mapping)assert.equal(m.source_end_frame-m.source_start_frame,m.cue_end_frame-m.cue_start_frame);
  if(i)assert.equal(c.start,EPISODE_CUES[i-1].end);
}
for(const name of ['master','dialogue','music','fx']){
 const wav=readFileSync(base+`release-v16-r3/episode-002-v16-r3-${name}.wav`);
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(22),2);
 assert.ok(Math.abs(wav.readUInt32LE(40)/4/44100-EPISODE_DURATION)<1e-6);
 let peak=0;for(let i=44;i<wav.length;i+=2)peak=Math.max(peak,Math.abs(wav.readInt16LE(i)));assert.ok(peak<32767);
}
await loadTestAvatars();
const world=new THREE.Group(),production=buildProductionDistrict(THREE,{world,makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
const visibility=new Map(production.group.children.map(c=>[c,c.visible]));
const props=createV16Props(THREE,production);props.group.visible=true;props.activate();
assert.ok(production.neighborhood.scenery.visible);
const camera=new THREE.PerspectiveCamera();let maxGrip=0,maxFraming=0,worstGrip=null;
for(let time=0;time<EPISODE_DURATION;time+=.15){
 const s=sampleEpisode(time);assert.deepEqual(s,sampleEpisode(time));assert.equal(s.extras.length,8);
 for(const npc of production.cast){const p=s.actors[npc.id];npc.root.visible=!!p?.visible;if(!p)continue;
  props.reset(npc);npc.root.position.set(p.x,p.y,p.z);npc.root.rotation.set(0,p.yaw,0);
  npc.model.mixer.stopAllAction();const a=npc.model.actions[p.clip];assert.ok(a);a.reset().play();a.time=p.phase%a.getClip().duration;npc.model.mixer.update(0);props.pose(npc,p);
  for(const [side,target] of Object.entries(p.handTargets)){const error=npc.model.figure.getObjectByName('hand'+side).getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...target));if(error>maxGrip){maxGrip=error;worstGrip={id:npc.id,time,side,target};}}
  if(npc.id!==s.cue.role)assert.equal(p.mouthOpen,0);
 }
 props.poseExtras(s);props.update(s);
 for(const aspect of [9/16,16/9]){
  const shot=sampleEpisode(time,aspect);camera.fov=shot.camera.fov;camera.aspect=aspect;camera.position.fromArray(shot.camera.position);camera.lookAt(...shot.camera.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  for(const id of shot.camera.fullBodySubjects){const p=shot.actors[id];for(const x of [-.43,.43])for(const y of [0,2.05]){
   const v=new THREE.Vector3(p.x+x,p.y+y,p.z).project(camera);maxFraming=Math.max(maxFraming,Math.abs(v.x),Math.abs(v.y));assert.ok(Math.abs(v.x)<.96&&Math.abs(v.y)<.96,'Framing '+id+' '+time);
  }}
 }
}
assert.ok(maxGrip<.07,'Reachable hands: '+maxGrip+' '+JSON.stringify(worstGrip));
const impact=sampleEpisode(EPISODE_EVENTS.impact+.5);
assert.ok(Math.abs(impact.props.car[0]+.88-V16_SET.hole[0])<1e-6);assert.ok(Math.abs(impact.props.car[2]+1.06-V16_SET.hole[1])<1e-6);
assert.equal(impact.props.ribbonCut,1);assert.equal(impact.props.dip,1);
assert.equal(sampleEpisode(EPISODE_DURATION).fadeOut,1);
props.deactivate();props.resetExtras();
const castRoots=new Set(production.cast.map(n=>n.root));
for(const [c,v] of visibility)if(!castRoots.has(c))assert.equal(c.visible,v,'World visibility restored: '+c.name); // Director owns cast snapshot restoration.
props.dispose();assert.ok(!props.group.parent);
console.log('PASS V16: approved script, original 1x speech, all audio stems, full timeline, rigs, full-body framing, wheel/hole contact, set restore. Grip',maxGrip,'framing',maxFraming);
