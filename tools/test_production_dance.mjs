import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {createProductionStage} from '../game-src/production-stage.js';
import {day1OpeningScenario} from '../game-src/production-day1-opening.js';
import {compileScenario,validateScenario} from '../game-src/production-scenario.js';

await loadTestAvatars();
for(const preset of ['v15-prabowo-inspired','v15-arka','v15-laras']){
  const scenario=day1OpeningScenario();scenario.cast[0].preset=preset;
  const stage=await createProductionStage(scenario),actor=stage.actors.get('a');
  const bone=name=>actor.figure.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const snapshot=t=>{stage.pose(t);const values=[];actor.figure.traverse(n=>{if(n.isBone)values.push(...n.matrixWorld.elements);});return values;};
  const feet={};stage.pose(0);for(const side of ['L','R'])feet[side]=bone('foot.'+side).getWorldPosition(new THREE.Vector3());
  const headQ=actor.head.getWorldQuaternion(new THREE.Quaternion());
  let lift=0,pump=0;
  for(let frame=8;frame<100;frame++){
    const t=frame/30,expected=snapshot(t);snapshot(6);snapshot(.1);assert.deepEqual(snapshot(t),expected,`${preset}: deterministic dance ${t}`);assert.ok(expected.every(Number.isFinite));
    assert.ok(actor.head.getWorldQuaternion(new THREE.Quaternion()).angleTo(headQ)<1e-5,'Head must stay upright, without inherited torso roll');
    for(const side of ['L','R']){
      const foot=bone('foot.'+side).getWorldPosition(new THREE.Vector3());
      assert.ok(foot.y>=feet[side].y-.002&&foot.y<=feet[side].y+.038,'Low steps must not sink below the planted ankle or hop high');
      assert.ok(Math.abs(foot.z-feet[side].z)<.002,'Planted feet do not slide forward');
      lift=Math.max(lift,foot.y-feet[side].y);
      const hand=bone('hand.'+side).getWorldPosition(new THREE.Vector3());assert.ok(hand.z>.25&&hand.z<.42,'Fists pump in front of chest');pump=Math.max(pump,hand.y);
    }
  }
  assert.ok(lift>.025&&pump>1.2,'Dance actually moves feet and fists');
  // Leaving Dance must restore the same Idle pose as a scenario without Dance.
  const after=snapshot(6);const neutral=structuredClone(scenario);neutral.shots[0].actors.a={action:'Idle',yaw:0};stage.setScenario(neutral);assert.deepEqual(snapshot(6),after,'No procedural transforms leak into subsequent clips');
  stage.dispose();
}
const input=day1OpeningScenario();assert.equal(input.cast.length,1);assert.equal(input.cast[0].preset,'v15-prabowo-inspired');assert.match(input.notice,/PARODI/);
assert.ok(compileScenario(input).duration<9);
for(const bpm of [NaN,0,69,181,Infinity]){const invalid=structuredClone(input);invalid.shots[0].actors.a.bpm=bpm;assert.throws(()=>validateScenario(invalid));}
console.log('PASS: Prabowow/Arka/Laras dance on actual V15 rigs: deterministic replay, low planted steps, fists in front, upright head, no pose leakage, tempo validation. Choreography is stylized, not mocap; visual browser check pending.');
