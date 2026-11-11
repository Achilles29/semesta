import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStudioClock,createStudioAnimation} from '../game-src/avatar-studio-playback.js';
import {createFarmerV8} from '../game-src/avatar-farmer-v8.js';
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
for(const clip of asset.animations){
  let reference;
  for(const fps of [30,60,144,240,360]){
    const parts=createFarmerV8(THREE,asset),player=createStudioAnimation(parts),clock=createStudioClock();
    assert.ok(player.select(clip.name));clock.tick(0);
    for(let frame=1;frame<=fps*5;frame++)player.update(clock.tick(frame*1000/fps).delta);
    assert.ok(Math.abs(parts.mixer.time-5)<1e-9,`${clip.name} ${fps} FPS advances five seconds`);
    const time=parts.actions[clip.name].time;
    if(reference!==undefined)assert.ok(Math.abs(time-reference)<1e-8,`${clip.name}: FPS-independent phase`);
    reference=time;
    // Appearance swaps keep the same mixer and clip phase.
    parts.figure.userData.setAppearance({bodyFrame:'female',bodyType:'plus',outfit:'tunic'});
    assert.equal(parts.actions[clip.name].time,time);
    player.dispose();
  }
}
const clock=createStudioClock();clock.tick(0);assert.equal(clock.tick(100,{speed:.5}).delta,.05);
assert.equal(clock.tick(200,{paused:true}).delta,0);
assert.equal(clock.tick(100000,{active:false}).delta,0);
assert.equal(clock.tick(200000).delta,0,'No hidden-tab catch-up');
assert.equal(clock.tick(210000).delta,.1,'Long stall is clamped');
clock.reset();assert.equal(clock.tick(220000).delta,0);
const parts=createFarmerV8(THREE,asset),player=createStudioAnimation(parts);
for(const name of ['Walk','Run','Wave','Walk','Idle','Hoe','Walk']){
  assert.equal(player.select(name),true);player.update(.04);
  assert.equal(Object.values(parts.actions).filter(action=>action.isRunning()).length,1,'No accumulated clips');
  assert.equal(player.select(name,true),true);assert.equal(parts.actions[name].time,0,'Restart works while paused');
}
assert.equal(player.select('Missing'),false);assert.ok(parts.actions.Walk.isRunning());player.dispose();
const main=readFileSync('game-src/main.js','utf8').split('async function initAvatarStudio()')[1];
assert.ok(!main.includes('update(1/60)'));assert.ok(!main.includes('model.rotation.y=Math.sin'));
console.log('PASS: all 8 clips at 30/60/144/240/360 FPS; speed, pause, hidden-tab resume, stall clamp, restart, rapid clip changes, and appearance phase preservation.');
