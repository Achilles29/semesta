// Roster selection, story identity and final-canvas labels; no real-browser GPU claim.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Window} from 'happy-dom';
import {citizens,citizenForPreset,castIdentity,selectCastPreset} from '../game-src/citizen-roster.js';
import {presets} from '../game-src/avatar-v15-config.js';
import {blankScenario,validateScenario,compileScenario,sampleScenario} from '../game-src/production-scenario.js';
import {characterLabelAnchors,layoutCharacterLabels} from '../game-src/production-character-labels.js';
import {day1Scenario} from '../game-src/production-day1.js';
import {mountAvatarStudio} from '../game-src/avatar-v15-studio.js';
import {mountProductionStudio} from '../game-src/production-studio.js';

assert.equal(citizens.length,48);
for(const citizen of citizens)assert.ok(presets.some(p=>p.id===citizen.presetId));
const day1=day1Scenario();
assert.deepEqual(day1.cast.map(c=>castIdentity(c,day1).name),['Pasca Bowow','Sari','Joko']);
const original=blankScenario();assert.deepEqual(validateScenario(original),original,'Validation must not rewrite old scenario identities');
const named=blankScenario();named.cast[0].name='Nama khusus';named.cast[0].role='Dokter';assert.equal(validateScenario(named).cast[0].name,'Nama khusus');
named.cast[0].name=' ';assert.throws(()=>validateScenario(named),/Nama pemeran/);
const jojo=citizens.find(c=>c.name==='jojo');
assert.equal(selectCastPreset(day1.cast[0],jojo.presetId).prop,'guitar');
assert.equal(selectCastPreset({name:'Sari',preset:'v15-laras'},'v15-arka').name,'Sari');

const camera=new THREE.PerspectiveCamera(35,9/16,.1,100);camera.position.set(0,1.1,6);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
const makeActor=x=>{const figure=new THREE.Group(),head=new THREE.Object3D();head.position.set(0,1.7,0);figure.add(head);figure.position.x=x;figure.updateMatrixWorld(true);return {figure,head};};
const actors=new Map([['a',makeActor(-.4)],['b',makeActor(.4)],['c',makeActor(30)]]);
const projectionStage={camera,actors,compiled:{scenario:day1}};
assert.deepEqual(characterLabelAnchors(projectionStage).map(c=>c.name),['Pasca Bowow','Sari'],'Offscreen cast has no floating label');
actors.get('b').figure.visible=false;
assert.deepEqual(characterLabelAnchors(projectionStage).map(c=>c.name),['Pasca Bowow'],'Hidden cast has no name label');
const terrain=new THREE.Mesh(new THREE.PlaneGeometry(10000,10000),new THREE.MeshBasicMaterial());
terrain.userData.backgroundTerrain=true;terrain.raycast=()=>{throw new Error('Distant terrain must not enter per-head triangle raycasts');};
projectionStage.occluders=[terrain];assert.equal(characterLabelAnchors(projectionStage).length,1);
const wall=new THREE.Mesh(new THREE.BoxGeometry(5,3,.2),new THREE.MeshBasicMaterial());wall.position.set(0,1.5,2);wall.updateMatrixWorld(true);
projectionStage.occluders=[terrain,wall];assert.equal(characterLabelAnchors(projectionStage).length,0,'A real wall still hides the head name');
wall.geometry.dispose();wall.material.dispose();terrain.geometry.dispose();terrain.material.dispose();
for(const [width,height] of [[1080,1920],[1920,1080],[1080,1080]]){
  const labels=layoutCharacterLabels(citizens.slice(0,6).map((c,i)=>({id:c.id,name:c.name,x:.5,y:.48})),{width,height,subtitleTop:height*.61,measure:(text,size)=>text.length*size*.56});
  assert.ok(labels.length>0&&labels.length<6,'Overlapping heads do not force displaced crowd labels');
  for(const [i,label] of labels.entries()){
    assert.ok(label.x>=0&&label.x+label.width<=width&&label.y>=height*.22&&label.y+label.height<height*.61,'Names remain inside safe frame and above subtitles');
    for(const other of labels.slice(i+1))assert.ok(label.x+label.width<=other.x||other.x+other.width<=label.x||label.y+label.height<=other.y||other.y+other.height<=label.y,'Name plates do not collide');
  }
}

const win=new Window({url:'http://localhost/project/admin/?view=avatars'});
for(const key of ['document','location','navigator','localStorage','HTMLElement','Event','Option','ResizeObserver','MutationObserver'])Object.defineProperty(globalThis,key,{value:win[key],configurable:true});
globalThis.window=win;globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
Object.defineProperty(globalThis,'Option',{configurable:true,value:function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;}});
win.SEMESTA_AVATAR_V15_BASE='http://localhost/project/public/models/characters/v15/';
globalThis.fetch=async()=>({ok:true,json:async()=>({presets:[]})});
document.body.innerHTML='<section id="adminView-avatars" class="active"></section><section class="admin-view active"><div id="production"></div></section>';
const gallery=document.getElementById('adminView-avatars');
await mountAvatarStudio(gallery,'/api');
const aq=s=>gallery.querySelector(s),input=(node,value,type='input')=>{node.value=value;node.dispatchEvent(new win.Event(type,{bubbles:true}));};
assert.equal(aq('[data-collection]').value,'citizens');assert.equal(gallery.querySelectorAll('[data-preset-id]').length,48);
input(aq('[data-search]'),'dokter');assert.equal(gallery.querySelectorAll('[data-preset-id]').length,3,'Profession search finds both doctors and forensic doctor');
input(aq('[data-search]'),'jojo');aq('[data-preset-id]').click();assert.equal(aq('[data-name]').textContent,'jojo');assert.match(aq('[data-role]').textContent,/musisi/i);assert.match(aq('[data-character-notes]').textContent,/gitar/i);
assert.ok(aq('[data-preset-id] img').src.includes(jojo.presetId));
input(aq('[data-search]'),'');input(aq('[data-filter]'),'female','change');assert.ok([...gallery.querySelectorAll('[data-preset-id]')].every(card=>presets.find(p=>p.id===card.dataset.presetId).config.profileId.startsWith('female-')));
input(aq('[data-filter]'),'all','change');input(aq('[data-collection]'),'all','change');assert.equal(gallery.querySelectorAll('[data-preset-id]').length,presets.length);
input(aq('[data-search]'),'no such citizen');assert.equal(gallery.querySelectorAll('[data-preset-id]').length,0);
win.dispatchEvent(new win.Event('pagehide'));

win.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,drawImage(){},save(){},restore(){},fillRect(){},strokeRect(){},fillText(){},setLineDash(){},createLinearGradient(){return {addColorStop(){}};},measureText:t=>({width:t.length*8})};};
const production=document.getElementById('production'),pq=s=>production.querySelector(s);
const studio=mountProductionStudio(production,{initialScenario:day1,persist:true,async createStage(s){let compiled=compileScenario(s);return {get compiled(){return compiled;},scene:{},camera:{},setScenario(n){compiled=compileScenario(n);},pose:t=>sampleScenario(compiled,t),dispose(){}};},createRenderer(){return {setSize(){},render(){},dispose(){}};}});
await new Promise(r=>setTimeout(r,0));
assert.deepEqual(['a','b','c'].map(id=>pq(`[data-cast-name="${id}"]`).value),['Pasca Bowow','Sari','Joko']);
assert.equal(pq('[data-cast="a"] optgroup').children.length,48);
input(pq('[data-cast-search]'),'jojo');assert.equal(pq('[data-cast="a"] option[value="'+jojo.presetId+'"]').textContent,`${jojo.name} — ${jojo.role}`);
input(pq('[data-cast="a"]'),jojo.presetId,'change');await new Promise(r=>setTimeout(r,0));
assert.equal(pq('[data-cast-name="a"]').value,'jojo');assert.equal(pq('[data-cast-prop="a"]').value,'guitar');
input(pq('[data-cast-name="a"]'),'<b>jojo</b>','change');assert.equal(pq('[data-cast-name="a"]').value,'<b>jojo</b>');assert.equal(production.querySelector('b')?.textContent,'Lembar cerita baru','Name input remains text, not markup');
assert.equal(JSON.parse(localStorage.getItem('semesta.production.workspace.v1')).cast[0].name,'<b>jojo</b>');
studio.dispose();await win.happyDOM.close();
console.log('PASS citizen UI: 48 searchable cards, professions, identity/prop selection, persistence, legacy names, offscreen visibility and collision-safe labels in three aspect ratios.');
