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
const scenario=day3Scenario(),compiled=compileScenario(scenario),phase=getWorldPhase();
assert.equal(compiled.duration,206);assert.equal(compiled.shots.length,33);
assert.equal(DAY3_SCRIPT.website,'https://republikwkwkwk.com');
assert.ok(scenario.shots.every(s=>s.plannedSpeech&&!s.speech));
assert.equal(scenario.worldPhaseOnComplete,undefined);
assert.equal(resolveProductionDraft(null).episode,'day3');
assert.equal(resolveProductionDraft(day2Scenario(),{preferredEpisode:'day2'}).episode,'day2');
const edited=day2Scenario();edited.title='Suntingan saya';assert.deepEqual(resolveProductionDraft(edited),edited);
const edited3=day3Scenario();edited3.shots[0].caption='Ujaran baru';assert.deepEqual(resolveProductionDraft(edited3),edited3);
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
const homeShot=compiled.shots.find(s=>s.id==='D17');stage.pose(homeShot.start+homeShot.duration*.4);const mid=count();assert.ok(mid>0);
stage.pose(compiled.duration);assert.ok(count()>mid);
for(const home of stage.development.homes){const sign=home.house.getObjectByName('ResidentName');assert.ok(visible(sign));assert.ok(sign.userData.signLines[0].includes(STORY_HOMES[home.index].name));}
const snapshot=t=>{stage.pose(t);const out=[...stage.camera.matrixWorld.elements];stage.scene.traverse(o=>{if(o.isBone||o.isGroup)out.push(Number(o.visible),...o.matrixWorld.elements);});assert.ok(out.every(Number.isFinite));return out;};
for(const shot of compiled.shots){
  const t=shot.start+shot.duration*.55,expected=snapshot(t);snapshot(0);snapshot(compiled.duration);assert.deepEqual(snapshot(t),expected,shot.id+' deterministic seek');
  for(const aspect of [9/16,16/9,1]){stage.pose(t,aspect);assert.ok(stage.camera.projectionMatrix.elements.every(Number.isFinite));assert.ok(characterLabelAnchors(stage).every(l=>l.name));}
}
for(const panelShot of compiled.shots.filter(s=>s.day3Panel)){
  const lines=[],ctx={canvas:{width:1080,height:1920},save(){},restore(){},fillRect(){},fillText(t){lines.push(t);}};
  drawDay3Panel(ctx,sampleScenario(compiled,panelShot.end-.01));
  if(panelShot.day3Panel==='economy-plan')assert.ok(lines.includes('DALAM PENGEMBANGAN'));
  if(panelShot.day3Panel==='starter-plan')assert.ok(lines.includes('1.000 Koin Republik'));
}
assert.ok(hasStoryAudio(scenario));const urls=[];
const tracks=await loadStoryAudio(scenario,{decodeAudioData:async()=>({duration:37})},{fetcher:async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
assert.equal(urls.length,1,'Only existing instrumental is requested; pending speech is never fabricated');
assert.ok(tracks.length>0&&tracks.every(t=>t.kind==='background'));
assert.ok(Math.abs(tracks.reduce((n,t)=>n+t.duration,0)-206)<.001);
assert.equal(getWorldPhase(),phase,'No playback/seek publishes public buildings');stage.dispose();
console.log('PASS Day 3: 33 shots / 206s, 17 clear parcels, six worship buildings, 48 named homes, stage/rig deterministic seeks, 3 camera ratios, planned-feature labels, music only, draft preservation and no world publication.');
