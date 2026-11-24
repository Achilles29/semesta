import {STORY_CLIPS} from '../game-src/production-audio-catalog.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {day3Scenario,DAY3_SCRIPT} from '../game-src/production-day3.js';
import {day2Scenario} from '../game-src/production-day2.js';
import {compileScenario,sampleScenario,validateScenario} from '../game-src/production-scenario.js';
import {resolveProductionDraft} from '../game-src/production-draft-migration.js';
import {CIVIC_FACILITIES,DEVELOPMENT_ROADS,developmentGroundHeight} from '../game-src/civic-development-layout.js';
import {STORY_HOMES} from '../game-src/citizen-story-homes.js';
import {CAPITAL_LAYOUT,getWorldPhase} from '../game-src/republic-world-layout.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {characterLabelAnchors} from '../game-src/production-character-labels.js';
import {drawDay3Panel} from '../game-src/production-day3-panels.js';
import {loadStoryAudio,hasStoryAudio} from '../game-src/production-story-audio.js';
import oldDay3 from './fixtures/day3-r2-before-r3.json' with {type:'json'};
const scenario=day3Scenario(),compiled=compileScenario(scenario),phase=getWorldPhase();
const address=STORY_CLIPS[scenario.shots.find(s=>s.id==='D24').speeches[0].key];
assert.ok(address.spokenText.includes('wekawekaweka dot kom'));
assert.ok(address.words.some(w=>w.text==='dot'),'Replacement audio has measured dot timing');
assert.ok(compiled.duration>=105&&compiled.duration<=125,'R3 stays around two minutes at natural voice speed');assert.equal(compiled.shots.length,33);
assert.equal(DAY3_SCRIPT.website,'https://republikwkwkwk.com');
assert.equal(scenario.shots.filter(s=>s.speeches?.length).length,21);
assert.ok(scenario.shots.every(s=>!s.plannedVoice),'No silent placeholder dialogue');
assert.equal(scenario.shots.filter(s=>s.sound==='okeGas').reduce((n,s)=>n+s.duration,0),20);
assert.ok(scenario.shots.filter(s=>s.sound).every(s=>!s.speeches),'Montage leaves room for music');
assert.equal(scenario.shots.filter(s=>s.speeches?.some(c=>STORY_CLIPS[c.key].speaker==='narrator')).length,3);
assert.equal(scenario.shots[0].id,'I00');assert.equal(scenario.shots[0].frame.motion.type,'descent');
for(const s of scenario.shots.filter(s=>s.id==='D01'||s.id==='D04')){const id=s.id==='D01'?'climenzo':'eqa',a=s.actors[id];assert.ok(Math.cos(a.yaw)<0,'Citizen faces the stage');}
assert.equal(scenario.worldPhaseOnComplete,undefined);
assert.equal(resolveProductionDraft(null).episode,'day3');
assert.deepEqual(resolveProductionDraft(oldDay3),scenario,'Pristine four-minute draft upgrades to R3');
const authoredOld=structuredClone(oldDay3);authoredOld.title='My old cut';
assert.equal(resolveProductionDraft(authoredOld).shots.length,42,'Authored old cut remains editable');
assert.equal(resolveProductionDraft(day2Scenario(),{preferredEpisode:'day2'}).episode,'day2');
const edited=day2Scenario();edited.title='Suntingan saya';assert.deepEqual(resolveProductionDraft(edited),edited);
const edited3=day3Scenario();edited3.shots[0].caption='Ujaran baru';const migrated=resolveProductionDraft(edited3);assert.equal(migrated.shots[0].caption,'Ujaran baru');assert.equal(migrated.shots[0].speeches,undefined,'Changed caption removes obsolete voice');assert.deepEqual(migrated.shots.slice(1),edited3.shots.slice(1));
const bad=day3Scenario();bad.shots[0].development.facilities.masjid=2;assert.throws(()=>validateScenario(bad),/Tahap fasilitas/);
assert.equal(CIVIC_FACILITIES.filter(f=>f.category==='worship').length,6);
assert.equal(CIVIC_FACILITIES.filter(f=>f.category==='economy').length,5);
const rect=f=>({minX:f.x-f.width/2,maxX:f.x+f.width/2,minZ:f.z-f.depth/2,maxZ:f.z+f.depth/2});
const overlap=(a,b)=>a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ;
for(const [i,f] of CIVIC_FACILITIES.entries()){
  const bounds=rect(f);
  for(const other of [...CIVIC_FACILITIES.slice(i+1),...STORY_HOMES,...CAPITAL_LAYOUT.housingPlots])assert.ok(!overlap(bounds,rect(other)),`${f.id} overlaps ${other.id}`);
  for(const r of DEVELOPMENT_ROADS){const vertical=r.from[0]===r.to[0],b={minX:Math.min(r.from[0],r.to[0])-(vertical?r.width/2:0),maxX:Math.max(r.from[0],r.to[0])+(vertical?r.width/2:0),minZ:Math.min(r.from[1],r.to[1])-(vertical?0:r.width/2),maxZ:Math.max(r.from[1],r.to[1])+(vertical?0:r.width/2)};assert.ok(!overlap(bounds,b),`${f.id} intersects road`);}
  for(const x of [bounds.minX,bounds.maxX])for(const z of [bounds.minZ,bounds.maxZ])assert.equal(developmentGroundHeight(x,z),0,'Graded parcel has no floating corners');
}
await loadTestAvatars();const stage=await createProductionStage(scenario);
assert.equal(stage.scene.fog,null);assert.equal(stage.development.homes.length,48);
const visible=node=>{for(let n=node;n;n=n.parent)if(!n.visible)return false;return true;};
const count=()=>{let n=0;stage.development.root.traverse(o=>{if(o.isMesh&&visible(o))n++;});return n;};
stage.pose(0);assert.equal(count(),0);
const homeShot=compiled.shots.find(s=>s.id==='M08');stage.pose(homeShot.start+homeShot.duration*.4);const mid=count();assert.ok(mid>0);
stage.pose(compiled.duration);assert.ok(count()>mid);
for(const home of stage.development.homes){const sign=home.house.getObjectByName('ResidentName');assert.ok(visible(sign));assert.ok(sign.userData.signLines[0].includes(STORY_HOMES[home.index].name));}
const snapshot=t=>{stage.pose(t);const out=[...stage.camera.matrixWorld.elements];stage.scene.traverse(o=>{if(o.isBone||o.isGroup)out.push(Number(o.visible),...o.matrixWorld.elements);});assert.ok(out.every(Number.isFinite));return out;};
// Verify actual rig movement, not just the presence of a gesture string.
for(const id of ['D00','D01','D02','D30','E02']){
  const shot=stage.compiled.shots.find(s=>s.id===id),track=shot.tracks.pasca;
  const t=shot.start+track.gestureDelay+.65,gesture=track.gesture;
  const acted=snapshot(t);track.gesture='talk';
  const neutral=snapshot(t);track.gesture=gesture;
  assert.notDeepEqual(acted,neutral,id+' gesture moves the rig');
  snapshot(0);assert.deepEqual(snapshot(t),acted,id+' gesture survives backward seek');
  const before=shot.start+track.gestureDelay*.5,delayed=snapshot(before);
  track.gesture='talk';assert.deepEqual(snapshot(before),delayed,id+' respects gesture delay');track.gesture=gesture;
}
const insert=compiled.shots.find(s=>s.id==='H00');
const demianHome=stage.development.homes.find(h=>STORY_HOMES[h.index].name.toLowerCase()==='demian');
stage.pose(insert.start+1);
const sign=demianHome.house.getObjectByName('ResidentName'),center=sign.getWorldPosition(new THREE.Vector3());
assert.ok(visible(sign));assert.ok(sign.userData.signLines[0].toLowerCase().includes('demian'));
for(const aspect of [9/16,16/9,1]){
  stage.pose(insert.start+1,aspect);
  const projected=center.clone().project(stage.camera);
  assert.ok(Math.abs(projected.x)<.7&&Math.abs(projected.y)<.6,'Nameplate centered in every ratio');
  const distance=stage.camera.position.distanceTo(center),ray=new THREE.Raycaster(stage.camera.position,center.clone().sub(stage.camera.position).normalize(),.01,distance-.04);
  const meshes=[];stage.scene.traverse(o=>{if(o.isMesh&&visible(o))meshes.push(o);});
  assert.equal(ray.intersectObjects(meshes,false).length,0,'No neighboring roof/wall blocks nameplate');
}
const end=compiled.shots.at(-1).development.facilities;
const waiting=compiled.shots.find(s=>s.id==='W00');
for(const fraction of [0,.5,1])for(const actor of Object.values(sampleScenario(compiled,waiting.start+waiting.duration*fraction-.00001).actors).filter(a=>a.visible)){
  assert.ok(!STORY_HOMES.some(h=>Math.abs(actor.position[0]-h.x)<4&&Math.abs(actor.position[1]-h.z)<4),'Waiting crowd walks along the lane, outside homes');
}
assert.ok(CIVIC_FACILITIES.filter(f=>f.category!=='economy').every(f=>end[f.id]===1));
assert.ok(CIVIC_FACILITIES.filter(f=>f.category==='economy').every(f=>end[f.id]===0),'No accidental economic feature promise');
for(const shot of compiled.shots){
  const t=shot.start+shot.duration*.55,expected=snapshot(t);snapshot(0);snapshot(compiled.duration);assert.deepEqual(snapshot(t),expected,shot.id+' deterministic seek');
  for(const aspect of [9/16,16/9,1]){stage.pose(t,aspect);assert.ok(stage.camera.projectionMatrix.elements.every(Number.isFinite));assert.ok(characterLabelAnchors(stage).every(l=>l.name));}
}
for(const panelShot of compiled.shots.filter(s=>s.day3Panel)){
  const lines=[],ctx={canvas:{width:1080,height:1920},save(){},restore(){},translate(){},beginPath(){},roundRect(){},fill(){},createLinearGradient(){return {addColorStop(){}};},fillRect(){},fillText(t){lines.push(t);}};
  drawDay3Panel(ctx,sampleScenario(compiled,panelShot.end-.01));
  if(panelShot.day3Panel==='economy-plan')assert.ok(lines.includes('DALAM PENGEMBANGAN'));
  if(panelShot.day3Panel==='starter-plan')assert.ok(lines.includes('1.000 Koin Republik'));
}
assert.ok(hasStoryAudio(scenario));const urls=[];
const tracks=await loadStoryAudio(scenario,{decodeAudioData:async()=>({duration:37})},{fetcher:async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
assert.equal(urls.length,23,'21 measured voices plus Oke Gas and instrumental');
assert.equal(tracks.filter(t=>!t.kind).length,21);
assert.equal(tracks.filter(t=>t.kind==='okeGas').length,1,'Music continues through eight construction cuts');
assert.equal(tracks.find(t=>t.kind==='okeGas').duration,20);
assert.ok(Math.abs(tracks.filter(t=>t.kind==='background').reduce((n,t)=>n+t.duration,0)-(compiled.duration-21.5))<.001);
assert.equal(getWorldPhase(),phase,'No playback/seek publishes public buildings');stage.dispose();
console.log(`PASS Day 3 R3: ${compiled.duration.toFixed(2)}s, 33 shots, 21 voices, 20s continuous Oke Gas, clear Demian sign, gestures/seek, 3 ratios, draft migration and no world publication.`);
