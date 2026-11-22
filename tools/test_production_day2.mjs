import assert from 'node:assert/strict';
import * as THREE from 'three';
import {day2Scenario} from '../game-src/production-day2.js';
import {compileScenario,sampleScenario,validateScenario,srtFor} from '../game-src/production-scenario.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {activeSpeeches,speechCues} from '../game-src/production-speech-cues.js';
import {cameraFrameAt} from '../game-src/production-camera.js';
import {characterLabelAnchors,layoutCharacterLabels} from '../game-src/production-character-labels.js';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {citizens} from '../game-src/citizen-roster.js';

const scenario=day2Scenario(),compiled=compileScenario(scenario);
assert.equal(scenario.cast.length,49);assert.equal(new Set(compiled.shots.map(s=>s.editorialId)).size,30);
assert.deepEqual(new Set(scenario.cast.slice(1).map(c=>c.preset)),new Set(citizens.map(c=>c.presetId)));
assert.ok(compiled.duration>=100&&compiled.duration<=120);assert.equal(scenario.audioStatus,'recorded');
assert.equal(compiled.shots.flatMap(speechCues).length,27);
assert.ok(srtFor(scenario).includes('komentar'));
assert.ok(srtFor(scenario).includes('rumah ibadah'));
assert.match(srtFor(scenario),/lebih dari seratus orang pengin jadi warga/);
assert.match(srtFor(scenario),/Gantikan saya dong/);
assert.match(srtFor(scenario),/jalan dan transportasi umum/);
assert.deepEqual(scenario.shots.at(-1).survey.choices.map(c=>c.key),['A','B','C','D','E','F']);
assert.equal(scenario.shots.at(-1).survey.choices[4].label,'Rumah ibadah');
assert.equal(scenario.shots.at(-1).survey.choices[5].label,'Jalan & transportasi');
for(const shot of compiled.shots){
  const mid=sampleScenario(compiled,shot.start+shot.duration/2);
  for(const actor of Object.values(mid.actors))assert.ok([...actor.position,actor.height,actor.yaw].every(Number.isFinite));
  for(const cue of speechCues(shot)){
    const active=activeSpeeches(sampleScenario(compiled,shot.start+cue.offset+.05),scenario);
    assert.ok(active.some(v=>v.key===cue.key),'Audio starts in its shot and binds to a speaker');
  }
  if(shot.frame.motion){
    const start=cameraFrameAt(shot.frame,0,shot.duration),end=cameraFrameAt(shot.frame,shot.duration,shot.duration);
    assert.deepEqual(start.target,shot.frame.motion.from.target);
    end.target.forEach((v,i)=>assert.ok(Math.abs(v-shot.frame.motion.to.target[i])<1e-9));
  }
}
const invalid=structuredClone(scenario);invalid.shots[0].frame.motion.to.target[0]=Infinity;assert.throws(()=>validateScenario(invalid),/Lintasan kamera/);
const ceremony=compiled.shots.find(s=>s.id==='S21'),ribbonActor=ceremony.actors.pasca;
assert.equal(sampleScenario(compiled,ceremony.start+ribbonActor.delay-.01).actors.pasca.action,'Idle');
assert.equal(sampleScenario(compiled,ceremony.start+ribbonActor.delay+.2).actors.pasca.action,'CutRibbon');
const stairs=compiled.shots.find(s=>s.id==='S04');
assert.ok(sampleScenario(compiled,stairs.start+stairs.duration/2).actors.climenzo.height>0);
assert.equal(sampleScenario(compiled,stairs.end).actors.climenzo.height,.6);
const crowd=compiled.shots.find(s=>s.id==='S02');assert.equal(Object.values(sampleScenario(compiled,crowd.start+1).actors).filter(a=>a.visible).length,49);
const tail=activeSpeeches(sampleScenario(compiled,crowd.end+.01),scenario);assert.ok(tail.some(s=>s.key==='day2-nopal-01'),'Speech continues across the cut');
for(const [id,actor] of [['S18','kasir'],['S19','ardhy']]){const s=compiled.shots.find(s=>s.id===id);assert.equal(sampleScenario(compiled,s.start+.5).actors[actor].height,.24,'Interior feet rest on the floor slab');}

await loadTestAvatars();const stage=await createProductionStage(scenario);
function snapshot(t){
  stage.pose(t);const values=[...stage.camera.matrixWorld.elements];
  stage.scene.traverse(n=>{if(n.isBone||n.name.startsWith('Day2')||n.name.startsWith('Excavator'))values.push(...n.matrixWorld.elements,Number(n.visible));});
  assert.ok(values.every(Number.isFinite));return values;
}
assert.equal(stage.scene.fog,null);assert.ok(stage.capital);
for(const id of ['W00','W01','W02','S01','S02','S04','S09','S13','S16','S18','S19','S21','S23','S27']){
  const shot=compiled.shots.find(s=>s.id===id),t=shot.start+shot.duration*.57,expected=snapshot(t);
  snapshot(compiled.duration-.1);snapshot(.01);assert.deepEqual(snapshot(t),expected,`Deterministic real rigs and props after seeking: ${id}`);
  for(const aspect of [9/16,16/9,1]){
    stage.pose(t,aspect);assert.ok(stage.camera.projectionMatrix.elements.every(Number.isFinite));
    const labels=characterLabelAnchors(stage);assert.ok(labels.every(l=>l.name&&Number.isFinite(l.x)&&Number.isFinite(l.y)));
    if(id==='W01'||id==='W02'){
      const laid=layoutCharacterLabels(labels,{width:1080,height:1080/aspect,measure:(name,size)=>name.length*size*.53});
      assert.deepEqual(laid.map(l=>l.id),[id==='W01'?'dd':'asila'],'Intro singles identify each aspiring official without a crowd of labels');
    }
    if(id==='S02'||id==='S09'){
      assert.equal(labels.length,0,'Wide crowd composition suppresses name labels');
      const laid=layoutCharacterLabels(labels,{width:1080,height:1080/aspect,measure:(name,size)=>name.length*size*.53});
      for(let i=0;i<laid.length;i++)for(let j=i+1;j<laid.length;j++){const a=laid[i],b=laid[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Crowd names must not overlap');}
    }
    if(id==='S21')assert.ok(labels.some(l=>l.id==='pasca'),'President must stand in front of the facade at inauguration');
  }
}
stage.pose(compiled.shots.find(s=>s.id==='S13').start+2.8);
const seat=stage.construction.excavator.operatorAnchor.getWorldPosition(new THREE.Vector3());
assert.ok(stage.actors.get('ardhy').figure.position.distanceTo(seat)<1e-8,'Operator follows the rotating cabin');
stage.pose(ceremony.end-.2);assert.ok(stage.construction.props.ribbon.visible);
stage.dispose();
console.log(`PASS Day2: ${compiled.shots.length} shots, ${compiled.duration}s, all49 actual V15 rigs,27 timed voices, named intro singles, speech bridging, camera paths, stairs, construction and deterministic seeking.`);
