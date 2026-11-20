import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sampleEpisode,EPISODE_DURATION,EPISODE_CUES,EPISODE_SCENES,EPISODE_SHOTS,EPISODE_EVENTS} from '../game-src/production-v15-episode.js';
import {createV15Props} from '../game-src/production-v15-props.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createHumanModel} from '../game-src/avatar-runtime.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
const base='public/audio/produksi/episode-002/release-v15/';
const timeline=JSON.parse(readFileSync(base+'timeline.json','utf8'));
const approved=JSON.parse(readFileSync('public/audio/produksi/episode-002/generated-v15/batch-plan.json','utf8')).cues;
assert.equal(EPISODE_CUES.length,10);assert.equal(EPISODE_SHOTS.length,18);assert.equal(EPISODE_SCENES.length,6);
for(const c of EPISODE_CUES){assert.equal(approved.find(a=>a.id===c.id).text,c.text);assert.equal(c.spoken_text,c.text.replaceAll('WKWKWK','wekawekaweka'));assert.equal(c.inserted_holds.length,0);
  for(const m of c.source_to_cue_mapping)assert.equal(m.source_end_frame-m.source_start_frame,m.cue_end_frame-m.cue_start_frame);}
assert.ok(EPISODE_CUES.at(-1).text.includes('Follow jadi warga'));assert.ok(EPISODE_CUES.at(-1).text.includes('Komen:'));
for(const stem of ['master','dialogue','music','fx']){
 const wav=readFileSync(base+`episode-002-v15-${stem}.wav`);assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),44100);
 assert.ok(Math.abs(wav.readUInt32LE(40)/4/44100-EPISODE_DURATION)<1e-5);
 for(let i=44;i<wav.length;i+=2)assert.ok(Math.abs(wav.readInt16LE(i))<32767,'No clipping '+stem);
}
await loadTestAvatars();
const world=new THREE.Group(),production=buildProductionDistrict(THREE,{world,makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
const originalCount=production.cast.length,props=createV15Props(THREE,production),camera=new THREE.PerspectiveCamera();
const originalExtraVisibility=production.neighborhood.extras.map(e=>e.root.visible);
assert.equal(production.cast.length,originalCount,'Cutscene actors must not enter world interaction list');
assert.equal(props.extraCast.length,3);
let maxGrip=0,worst=null;const bad=new Map();let maxFraming=0;
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
  for(const id of shot.camera.fullBodySubjects){
    const p=shot.actors[id];
    for(const y of [0,2.05])for(const x of [-.43,.43]){
      const point=new THREE.Vector3(p.x+x,p.y+y,p.z).project(camera);
      maxFraming=Math.max(maxFraming,Math.abs(point.x),Math.abs(point.y));
      assert.ok(Math.abs(point.x)<.96&&Math.abs(point.y)<.96,'Full-body safe frame '+id+' '+shot.cut.id+' '+t);
    }
  }
 }
}
console.log('Grip residual',maxGrip,worst,'issues',Object.fromEntries(bad));
console.log('Full-body screen extent',maxFraming);
assert.ok(maxGrip<.07,'Prop grips within 7cm');
assert.equal(sampleEpisode(EPISODE_EVENTS.sit+1).actors.bahlil.seated,1);
assert.equal(sampleEpisode(EPISODE_EVENTS.smile_drop+1).actors.bahlil.smile,0);
assert.equal(sampleEpisode(EPISODE_DURATION-1).props.writing,true);
assert.equal(sampleEpisode(EPISODE_DURATION).fadeOut,1);
for(let i=1;i<EPISODE_SHOTS.length;i++)assert.equal(EPISODE_SHOTS[i-1].end,EPISODE_SHOTS[i].start);
assert.equal(timeline.speech_speed,1);assert.equal(timeline.speech_pitch,1);
// No pop-in / teleport at scene boundaries or prop hand-off, independently of camera cuts.
let prev=sampleEpisode(0);
for(let t=1/60;t<EPISODE_DURATION;t+=1/60){
 const s=sampleEpisode(t);
 for(const id of Object.keys(s.actors)){
  const a=s.actors[id],b=prev.actors[id];assert.equal(a.visible,true);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.12,'Actor discontinuity '+id+' '+t);
 }
 for(const name of ['chair','photo','folder'])assert.ok(new THREE.Vector3(...s.props[name]).distanceTo(new THREE.Vector3(...prev.props[name]))<.12,'Prop discontinuity '+name+' '+t);
 prev=s;
}
assert.equal(sampleEpisode(0).camera.position[0],sampleEpisode(0).camera.target[0],'Frontal opening');
function applyFrame(t){
 const s=sampleEpisode(t);
 for(const npc of [...production.cast,...props.extraCast]){
  const p=s.actors[npc.id];if(!p)continue;props.reset(npc);npc.root.position.set(p.x,p.y,p.z);npc.root.rotation.set(0,p.yaw,0);
  npc.model.mixer.stopAllAction();const a=npc.model.actions[p.clip];a.reset().play();a.time=p.phase%a.getClip().duration;npc.model.mixer.update(0);props.pose(npc,p);
 }
 props.poseExtras(s);props.update(s);world.updateMatrixWorld(true);return s;
}
// Inspect actual skinned finger vertices, not only the hand-bone centre.
let intersections=0,closestGrip=Infinity;
const inspectionTimes=[0,...EPISODE_SHOTS.flatMap(s=>[s.start+.01,(s.start+s.end)/2,s.end-.01])];
for(const t of inspectionTimes){
 applyFrame(t);
 const pairs=[
  [props.extraCast.find(n=>n.id==='v15-young'),'V15FamilyPhoto',.46,.34],
  [production.neighborhood.extras[0],'V15ChangingRules',.39,.34],
  [production.neighborhood.extras[7],'V15ExperienceFolder',.40,.32],
  ...(t<EPISODE_EVENTS.folder?[[production.cast.find(n=>n.id==='bu-warung'),'V15ComplaintFolder',.45,.33]]:[]),
  ...[0,1,2].map(i=>[production.neighborhood.extras[i+4],'V15QueueFolder'+i,i===2?.40:.33,.26]),
 ];
 for(const [owner,name,width,height] of pairs){
 const paper=props.group.getObjectByName(name);
 const inverse=paper.matrixWorld.clone().invert();let closest=Infinity,contact=null,hits=0;
 owner.model.figure.traverse(m=>{if(!m.isSkinnedMesh||!m.visible||m.userData.avatarSlot!=='skin')return;
  const indices=m.skeleton.bones.map((b,i)=>/^(hand|thumb|index|middle|ring|little)/.test(b.name)?i:-1).filter(i=>i>=0);
  for(let i=0;i<m.geometry.attributes.position.count;i++){
   let weight=0;for(let j=0;j<4;j++)if(indices.includes(m.geometry.attributes.skinIndex.getComponent(i,j)))weight+=m.geometry.attributes.skinWeight.getComponent(i,j);
   if(weight<.7)continue;
   const p=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld).applyMatrix4(inverse);
   if(Math.abs(p.x)<width/2&&Math.abs(p.y)<height/2&&Math.abs(p.z)<.014){intersections++;hits++;}
   const d=Math.hypot(Math.max(0,Math.abs(p.x)-width/2),Math.max(0,Math.abs(p.y)-height/2),Math.max(0,Math.abs(p.z)-.011));if(d<closest){closest=d;contact=p.toArray();}
  }
 });
 closestGrip=Math.min(closestGrip,closest);assert.ok(closest<.045,name+' detached from actual fingers: '+closest+' '+JSON.stringify(contact));
 if(hits)console.log('Penetration',name,t,hits);
 }
}
console.log('Paper/skin intersections',intersections,'nearest contact',closestGrip,'samples',inspectionTimes.length);
assert.equal(intersections,0,'Actual finger vertices must not pierce held paper panels');
applyFrame(EPISODE_EVENTS.write+1);
const pen=props.group.getObjectByName('V15WritingPen');
const tip=new THREE.Vector3(0,.05,0).applyMatrix4(pen.matrixWorld);
console.log('Pen tip height',tip.y);assert.ok(tip.y>.91&&tip.y<.985,'Pen must meet desk form without penetrating the tabletop');
const repeated=pen.matrixWorld.clone();applyFrame(EPISODE_EVENTS.write+1);
assert.ok(pen.matrixWorld.elements.every((x,i)=>Math.abs(x-repeated.elements[i])<1e-8),'Repeated/paused frame must preserve posed grip');
props.resetExtras();assert.deepEqual(production.neighborhood.extras.map(e=>e.root.visible),originalExtraVisibility);
props.dispose();assert.equal(production.cast.length,originalCount);
console.log('PASS V15: exact script/audio, 18 cuts, 6 scenes, deterministic rigs/props, speaker gating, seated work payoff, resource disposal.');
