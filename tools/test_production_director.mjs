import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {mountProductionDirector} from '../game-src/production-director.js';
import {EPISODE_DURATION} from '../game-src/production-v16-episode.js';

// Load the avatar module through the exact specifier used by the game entry.
// A query-string variant is a different module and splits its asset registry.
const entry=readFileSync('game-src/main.js','utf8');
const avatarSpecifier=entry.match(/from\s+['"](\.\/avatar-character-3d\.js[^'"]*)['"]/)[1];
const {createHumanModel,setFarmerAsset}=await import(new URL('../game-src/'+avatarSpecifier.slice(2),import.meta.url));

// Exercise the real director, cast, rigs and props. DOM, audio device and GPU
// alone are mocked: this is an integration test, not a browser/render test.
class Element extends EventTarget {
  constructor(){super();this.children=[];this.nodes=new Map();this.value='';this.style={};this.hidden=false;
    const names=new Set();this.classList={add:(s)=>names.add(s),remove:(s)=>names.delete(s),contains:(s)=>names.has(s)};}
  append(node){this.children.push(node);}
  querySelector(selector){if(!this.nodes.has(selector)){const node=new Element();node.value=selector.includes('aspect')?'portrait':selector.includes('volume')?'1':'';this.nodes.set(selector,node);}return this.nodes.get(selector);}
  remove(){} blur(){}
}
globalThis.window=new Element();globalThis.document=new Element();
document.body=new Element();document.baseURI='http://localhost/project/';document.createElement=()=>new Element();document.hidden=false;
globalThis.innerWidth=960;globalThis.innerHeight=720;
let ctx;
globalThis.AudioContext=class {
  constructor(){ctx=this;this.currentTime=0;this.state='suspended';this.destination={};}
  async resume(){this.state='running';} async close(){this.state='closed';}
  createGain(){return{gain:{value:1},connect(){},disconnect(){}};}
  async decodeAudioData(){return{duration:EPISODE_DURATION};}
  createBufferSource(){return{connect(){},disconnect(){},start(){},stop(){}};}
};
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
setFarmerAsset(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
const world=new THREE.Group(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,4/3,.05,200);scene.add(world);
const production=buildProductionDistrict(THREE,{world,makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
let renders=0;
const renderer={autoClear:true,getClearColor:c=>c.set('#aaa'),getClearAlpha:()=>1,setClearColor(){},setScissorTest(){},setViewport(){},setScissor(){},clear(){},render(){renders++;}};
const panel=new Element(),abort=new AbortController();
const director=mountProductionDirector({THREE,production,world,camera,renderer,scene,panel,signal:abort.signal});
for(const id of ['v15-young','v15-father','v15-leader']){
  const actor=world.getObjectByName(id);assert.ok(actor,'Extra actor exists: '+id);
  for(const bone of ['handL','handR','upper_armL','upper_armR'])assert.ok(actor.getObjectByName(bone)?.isBone,'Loaded game avatar rig: '+id+' '+bone);
}
const controls=panel.children[0];
const subtitleOverlay=document.body.children.find(node=>node.className==='production-subtitles');
assert.equal(subtitleOverlay.className,'production-subtitles');
assert.equal(subtitleOverlay.hidden,true);
const originalCastVisibility=production.cast.map(n=>n.root.visible);
controls.querySelector('[data-film-play]').dispatchEvent(new Event('click'));
await new Promise(resolve=>setImmediate(resolve));
assert.ok(director.active,controls.querySelector('[data-film-status]').textContent);
director.update(0);
ctx.currentTime=1.2;director.update(1200); // First WebGL frame can compile shaders slowly.
assert.equal(subtitleOverlay.hidden,false,'Subtitles appear with speech, outside the hidden HUD');
assert.ok(subtitleOverlay.children[0].children[1].textContent.includes('Warga sini minta'));
assert.equal(subtitleOverlay.style.left,'480px','Subtitles centered inside portrait viewport');
controls.querySelector('[data-film-subtitles]').checked=false;
director.update(1201);assert.equal(subtitleOverlay.hidden,true);
controls.querySelector('[data-film-subtitles]').checked=true;
director.update(1202);assert.equal(subtitleOverlay.hidden,false);
const stalledCamera=camera.position.clone();
ctx.currentTime=9.2;director.update(1250);
assert.ok(camera.position.distanceTo(stalledCamera)>0.001,'Playback must advance again after a slow frame, not silently pause forever');
director.stop();
assert.equal(subtitleOverlay.hidden,true,'Stop clears captions');
controls.querySelector('[data-film-play]').dispatchEvent(new Event('click'));
await new Promise(resolve=>setImmediate(resolve));
const startedAt=ctx.currentTime;
for(let t=0;t<EPISODE_DURATION;t+=.25){ctx.currentTime=startedAt+t+.25;director.update(t*1000);assert.ok(director.active,'Director failed at '+t+': '+controls.querySelector('[data-film-status]').textContent);}
assert.ok(renders>=Math.floor(EPISODE_DURATION/.25));assert.ok(document.body.classList.contains('production-filming'));
// Hidden tabs pause explicitly; a visible resume button can recover playback.
const pausePanel=document.body.children.find(node=>node.className==='production-pause-panel');
document.hidden=true;director.update(70000);assert.equal(pausePanel.hidden,false);
assert.equal(subtitleOverlay.hidden,true,'Pause controls never overlap subtitles');
document.hidden=false;
pausePanel.querySelector('[data-film-resume]').dispatchEvent(new Event('click'));
await new Promise(resolve=>setImmediate(resolve));assert.equal(pausePanel.hidden,true);
// A renderer/scene exception must restore controls instead of leaving a black HUD.
const realRender=renderer.render,realError=console.error;let caughtError=false;
renderer.render=()=>{throw new Error('Simulated renderer failure');};console.error=()=>{caughtError=true;};
try{director.update(70100);}finally{renderer.render=realRender;console.error=realError;}
assert.ok(caughtError);assert.equal(director.active,false);
assert.ok(controls.querySelector('[data-film-status]').textContent.includes('Simulated renderer failure'));
director.stop();assert.equal(director.active,false);assert.ok(!document.body.classList.contains('production-filming'));
assert.deepEqual(production.cast.map(n=>n.root.visible),originalCastVisibility,'Game cast restored after playback/error');
abort.abort();
console.log('PASS: real game entry avatar registry, director Play, full V16 timeline, actual cast/rig/props, stall recovery, renderer errors, Stop and disposal.');
