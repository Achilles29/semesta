import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {constructionOpportunity,mountConstruction,constructionTime} from '../game-src/republic-construction.js';
import {createConstructionGeometry} from '../game-src/republic-construction-geometry.js';
import {createConstructionCarryPose} from '../game-src/republic-construction-pose.js';
import {applySharedWorldSnapshot,WORLD_STATE_EVENT} from '../game-src/republic-world-state.js';
import {moveWorldPosition,worldFloorHeight} from '../game-src/republic-world-layout.js';

const clone=value=>structuredClone(value);
const base={id:'jakartawa-home-01',name:'Rumah contoh P01',plotId:'P01',city:'jakarta',position:{x:29,z:-28},workPoint:{x:29,z:-21.5},depot:{x:22,z:-10},radius:3,required:12,delivered:0,installed:0,version:1,status:'active'};
const world=version=>({id:'republic',version,phase:'after-day2',publishedAt:'2026-11-23T00:00:00Z'});
let clock=Date.parse('2026-11-23T00:00:00Z');
const citizen=id=>({id,inventory:{constructionKit:0},carryingProjectId:null,constructionXp:0,installation:null});
const held={...citizen(9),inventory:{constructionKit:1},carryingProjectId:base.id};
const decide=(project=base,player=citizen(9))=>constructionOpportunity({project,player,now:clock});
assert.equal(decide({...base,status:'draft'}),null);
assert.equal(decide().action,'pickup');
assert.equal(decide(base,held).action,'deliver');
assert.equal(decide({...base,delivered:1}).action,'start_install');
assert.equal(decide({...base,delivered:1},{...citizen(9),installation:{projectId:base.id,readyAt:clock+2000}}).action,'wait');
assert.equal(decide({...base,delivered:1},{...citizen(9),installation:{projectId:base.id,readyAt:clock-1}}).action,'install');
assert.equal(decide(base,{...citizen(9),installation:{projectId:base.id,readyAt:clock-1}}).action,'pickup','A depleted stock must not trap a player behind a stale timer');
assert.equal(decide({...base,status:'paused'}).action,undefined);
assert.equal(decide({...base,status:'completed',delivered:12,installed:12}).action,undefined);
for(const status of ['paused','completed'])assert.equal(decide({...base,status},held).label,'Kembalikan bahan sisa');
assert.equal(decide({...base,delivered:12},held).action,'deliver');
assert.equal(decide(base,{...held,carryingProjectId:'other-project'}).action,undefined);
assert.equal(constructionTime(clock/1000),clock);
assert.equal(constructionTime('2026-11-23T00:00:00Z'),clock);

// Carry IK is temporary and arm-only; a walking mixer receives its own pose back.
const figure=new THREE.Group(),allBones=[];
for(const [side,sign] of [['L',1],['R',-1]]){
  const upper=new THREE.Bone(),lower=new THREE.Bone(),hand=new THREE.Bone();upper.name='upper_arm'+side;lower.name='forearm'+side;hand.name='hand'+side;
  upper.position.set(sign*.20,1.42,0);lower.position.set(sign*.29,-.12,0);hand.position.set(sign*.27,-.10,0);figure.add(upper);upper.add(lower);lower.add(hand);allBones.push(upper,lower,hand);
}
const head=new THREE.Bone(),leg=new THREE.Bone();head.name='head';leg.name='thighL';head.rotation.z=.07;leg.rotation.x=.3;figure.add(head,leg);
const original=allBones.map(bone=>bone.quaternion.clone()),headPose=head.quaternion.clone(),legPose=leg.quaternion.clone();
const carryPose=createConstructionCarryPose({figure});carryPose.apply(true);
for(const [side,index] of [[1,2],[-1,5]])assert.ok(allBones[index].getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(side*.35,1.07,.38))<.025,'Hands reach the sides of the visible kit');
assert.ok(head.quaternion.equals(headPose)&&leg.quaternion.equals(legPose));
carryPose.apply(false);allBones.forEach((bone,i)=>assert.ok(bone.quaternion.equals(original[i]),'Drop restores original locomotion rotations'));
allBones[0].rotation.y=.12;const walking=allBones[0].quaternion.clone();carryPose.apply(true);carryPose.restore();assert.ok(allBones[0].quaternion.equals(walking));
carryPose.apply(true);carryPose.dispose();assert.ok(allBones[0].quaternion.equals(walking),'Dispose restores pose, too');

// Real Three geometry: committed stages, collision, doorway, ground and cleanup.
const scene=new THREE.Scene(),geometry=createConstructionGeometry({scene});
geometry.applySnapshot({projects:[{...base,status:'draft'}]});
assert.equal(geometry.root.getObjectByName('Project_'+base.id).visible,false);
assert.equal(geometry.colliders.length,0);
geometry.applySnapshot({projects:[base]});
assert.equal(geometry.root.getObjectByName('Installed_1').visible,false);
assert.equal(geometry.colliders.length,1,'Active depot has a visible physical collider');
geometry.applySnapshot({projects:[{...base,delivered:4,installed:4}]});
assert.equal(geometry.root.getObjectByName('Installed_4').visible,true);
assert.equal(geometry.root.getObjectByName('Installed_6').visible,false);
assert.equal(geometry.colliders.length,5,'Early posts already block passage');
geometry.applySnapshot({projects:[{...base,delivered:12,installed:12,status:'completed'}]});
assert.equal(geometry.root.getObjectByName('ConstructionDepot_'+base.id).visible,false);
assert.equal(geometry.root.getObjectByName('Installed_0').visible,false,'Completed plot removes temporary site stakes');
assert.equal(geometry.occluders.filter(mesh=>mesh.name==='GableWall').length,2,'Front and back roof triangles are closed solid gables');
assert.ok(!geometry.colliders.some(c=>c.minX<22&&c.maxX>22&&c.minZ< -10&&c.maxZ> -10),'Hidden completed depot must not leave an invisible blocker');
assert.equal(worldFloorHeight(29,-25,{surfaces:geometry.surfaces}),.195,'Front step is walkable at its visible top');
assert.equal(worldFloorHeight(29,-28,{surfaces:geometry.surfaces}),.235);
const inside=moveWorldPosition({x:29,z:-24.8,y:.195},{x:0,z:-1.2},{colliders:geometry.colliders,surfaces:geometry.surfaces});
assert.ok(inside.z< -25.8,'Completed doorway remains passable');
geometry.tick({position:{x:29,y:.235,z:-28},yaw:Math.PI/2,carryingProjectId:base.id});
const carried=geometry.root.getObjectByName('CarriedConstructionKit');
assert.equal(carried.visible,true);assert.ok(Math.abs(carried.position.x-29.48)<1e-6);
geometry.tick({position:{x:29,z:-28}});assert.equal(carried.visible,false);
assert.equal(geometry.root.getObjectByName('AssemblyPoint_'+base.id).visible,false,'Completed idle project has no misleading work ring');
const meshes=[];geometry.root.traverse(node=>{if(node.isMesh)meshes.push(node);});
const geometries=new Set(meshes.map(m=>m.geometry)),materials=new Set(meshes.map(m=>m.material));
let geometryDisposes=0,materialDisposes=0;
for(const resource of geometries)resource.addEventListener('dispose',()=>geometryDisposes++);
for(const resource of materials)resource.addEventListener('dispose',()=>materialDisposes++);
for(let i=0;i<30;i++)geometry.applySnapshot({projects:[{...base,delivered:12,installed:12,status:'completed'}]});
let meshCount=0;geometry.root.traverse(node=>{if(node.isMesh)meshCount++;});assert.equal(meshCount,meshes.length,'Repeated polling does not rebuild meshes');
geometry.dispose();geometry.dispose();assert.equal(scene.children.length,0);assert.equal(geometryDisposes,geometries.size);assert.equal(materialDisposes,materials.size);

const win=new Window({url:'http://localhost/project/'});
for(const name of ['window','document','localStorage','Event','CustomEvent'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
document.body.innerHTML='<button id="profileButton">Masuk</button><div id="ui"></div><canvas></canvas>';
const ui=document.getElementById('ui'),canvas=document.querySelector('canvas'),flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
let auth={id:9},position={...base.depot,y:0},serverProject=clone(base),serverPlayer=citizen(9),serverWorld=world(10),orders=[],failAfterCommit=false,networkFail=false;
const commands=[],seen=new Set();let getCalls=0,postCalls=0;
const state=()=>({world:clone(serverWorld),projects:[clone(serverProject)],player:clone(serverPlayer),csrfToken:'session-'+serverPlayer.id,serverTime:clock});
const fetchImpl=async(url,options={})=>{
  if(options.method!=='POST'){
    getCalls++;assert.equal(new URL(url).searchParams.get('resource'),'world_work');assert.equal(options.credentials,'same-origin');
    return {ok:true,json:async()=>state()};
  }
  postCalls++;const body=JSON.parse(options.body);commands.push(body);orders.push('post');
  assert.equal(body.resource,'world_work');assert.equal(body.csrfToken,'session-'+serverPlayer.id);assert.ok(body.requestId);assert.equal(body.delivered,undefined,'Client cannot submit authoritative progress');
  if(networkFail)throw new Error('Koneksi terputus');
  let message='';
  if(!seen.has(body.requestId)){
    seen.add(body.requestId);
    if(body.action==='pickup'){serverPlayer.inventory.constructionKit=1;serverPlayer.carryingProjectId=base.id;}
    if(body.action==='deliver'){
      serverPlayer.inventory.constructionKit=0;serverPlayer.carryingProjectId=null;
      if(serverProject.status==='active'&&serverProject.delivered<12){serverProject.delivered++;serverProject.version++;serverPlayer.constructionXp+=2;}
      else message='Bahan sisa dikembalikan tanpa XP.';
    }
    if(body.action==='start_install')serverPlayer.installation={projectId:base.id,readyAt:clock+2000};
    if(body.action==='install'){assert.ok(clock>=serverPlayer.installation.readyAt);serverProject.installed++;serverProject.version++;serverPlayer.installation=null;serverPlayer.constructionXp+=3;}
  }
  if(failAfterCommit){failAfterCommit=false;throw new Error('Jawaban server hilang');}
  return {ok:true,json:async()=>({...state(),message:message||undefined})};
};
const mount=()=>mountConstruction({scene:new THREE.Scene(),ui,canvas,getPosition:()=>position,getCitizen:()=>auth,getYaw:()=>0,apiUrl:'http://localhost/project/api',fetchImpl,now:()=>clock,beforeAction:async()=>{orders.push('presence');}});
const button=()=>ui.querySelector('[data-work-action]');
let activity=mount();await flush();assert.equal(getCalls,1);assert.equal(ui.querySelector('.republic-construction').hidden,false);
assert.equal(button().disabled,false);assert.match(button().textContent,/Ambil kit/);
assert.ok(activity.consumeInteraction());await flush();assert.deepEqual(orders.slice(-2),['presence','post']);assert.equal(serverPlayer.inventory.constructionKit,1);assert.match(ui.textContent,/Bawaan: 1 kit/);
activity.tick(clock);assert.equal(activity.geometry.root.getObjectByName('CarriedConstructionKit').visible,true);
position={...base.workPoint,y:0};activity.tick(clock+200);button().click();await flush();assert.equal(serverProject.delivered,1);assert.match(button().textContent,/Mulai pasang/);
button().click();await flush();assert.equal(serverPlayer.installation.readyAt,clock+2000);assert.equal(button().disabled,true);assert.equal(serverProject.installed,0);
clock+=1999;activity.tick(clock);await flush();assert.equal(serverProject.installed,0,'Client countdown never installs early');
clock+=2;activity.tick(clock);await flush();assert.equal(serverProject.installed,1);assert.match(ui.textContent,/5 XP/);assert.equal(activity.geometry.root.getObjectByName('Installed_1').visible,true);
assert.equal(getCalls,1,'Activity does not start another public or private polling loop');

// Old public and private reads cannot revert the globally published version.
applySharedWorldSnapshot({world:world(11),projects:[{...serverProject,version:20,status:'paused'}]});
activity.applySnapshot({world:world(10),projects:[{...serverProject,version:99,status:'active'}]});
assert.match(ui.textContent,/Pembangunan dijeda/);assert.equal(activity.consumeInteraction(),false,'Paused/completed work must not swallow nearby chat E');
serverWorld=world(12);serverProject={...serverProject,version:21,status:'active'};
activity.applySnapshot(state());

// A lost response after commit retries the exact command id, without optimistic kit/XP.
position={...base.depot,y:0};clock+=200;activity.tick(clock);failAfterCommit=true;button().click();await flush();
assert.match(ui.textContent,/Jawaban server hilang/);assert.match(ui.textContent,/Bawaan: kosong/);const ambiguousId=commands.at(-1).requestId;
button().click();await flush();assert.equal(commands.at(-1).requestId,ambiguousId);assert.match(ui.textContent,/Bawaan: 1 kit/);

// A kit held through an admin pause remains returnable and displays server wording.
serverProject={...serverProject,status:'paused',version:22};activity.applySnapshot(state());position={...base.workPoint,y:0};clock+=200;activity.tick(clock);assert.match(ui.textContent,/Kembalikan bahan sisa/);
button().click();await flush();assert.equal(serverPlayer.inventory.constructionKit,0);assert.match(ui.textContent,/Bahan sisa dikembalikan tanpa XP/);assert.equal(serverProject.delivered,1);assert.equal(serverPlayer.constructionXp,5);

// Reload restores held inventory; leaving the work radius cancels automatic commit.
serverWorld=world(13);serverProject={...serverProject,status:'active',version:23};serverPlayer={...held,constructionXp:5};
activity.dispose();activity=mount();await flush();assert.match(ui.textContent,/Bawaan: 1 kit/);assert.equal(getCalls,2);
button().click();await flush();button().click();await flush();assert.ok(serverPlayer.installation);
position={x:100,y:0,z:100};clock+=1000;activity.tick(clock);clock+=1200;activity.tick(clock);await flush();assert.equal(serverProject.installed,1);
position={...base.workPoint,y:0};clock+=200;activity.tick(clock);assert.match(button().textContent,/Selesaikan pasang/);button().click();await flush();assert.equal(serverProject.installed,2);

// Public text is not executable markup, and an offline action changes no progress.
serverProject={...serverProject,name:'<img src=x onerror=alert(1)>',version:25};activity.applySnapshot(state());assert.equal(ui.querySelector('img'),null);
position={...base.depot,y:0};clock+=200;activity.tick(clock);networkFail=true;button().click();await flush();assert.match(ui.textContent,/Koneksi terputus/);assert.equal(serverPlayer.inventory.constructionKit,0);assert.equal(serverProject.installed,2);networkFail=false;
const priorCalls=postCalls;activity.dispose();activity.dispose();window.dispatchEvent(new CustomEvent(WORLD_STATE_EVENT,{detail:state()}));activity.tick(clock+5000);await flush();assert.equal(ui.children.length,0);assert.equal(postCalls,priorCalls);

// Account switches and unmount ignore an old, delayed authenticated read.
let pendingResolve,oldSignal;auth={id:31};serverPlayer=citizen(32);serverWorld=world(14);
const external=new AbortController();let delayedReads=0;
activity=mountConstruction({scene:new THREE.Scene(),ui,canvas,getPosition:()=>position,getCitizen:()=>auth,apiUrl:'http://localhost/project/api',events:external.signal,now:()=>clock,fetchImpl:async(url,options)=>{
  delayedReads++;if(delayedReads===1){oldSignal=options.signal;return new Promise(resolve=>pendingResolve=resolve);}
  return {ok:true,json:async()=>({...state(),player:{...citizen(32),constructionXp:17},csrfToken:'new-token'})};
}});
auth={id:32};window.dispatchEvent(new CustomEvent('semesta:citizen-change'));await flush();assert.equal(oldSignal.aborted,true);assert.match(ui.textContent,/17 XP/);
pendingResolve({ok:true,json:async()=>({...state(),player:{...citizen(31),constructionXp:999},csrfToken:'old-token'})});await flush();assert.doesNotMatch(ui.textContent,/999 XP/);
external.abort();assert.equal(ui.children.length,0);

// Guests can inspect shared progress and open login without a private API read.
auth=null;position={...base.depot,y:0};let guestCalls=0,login=0;document.getElementById('profileButton').onclick=()=>login++;
activity=mountConstruction({scene:new THREE.Scene(),ui,canvas,getPosition:()=>position,getCitizen:()=>auth,apiUrl:'http://localhost/project/api',fetchImpl:async()=>{guestCalls++;throw new Error('unexpected');},now:()=>clock});
assert.match(button().textContent,/Masuk untuk membantu/);button().click();await flush();assert.equal(login,1);assert.equal(guestCalls,0);activity.dispose();

// Another worker may consume shared stock while this player's timer still exists.
// This player can fetch replacement material without an endless stock_empty loop.
auth={id:9};serverWorld=world(20);serverProject={...clone(base),delivered:1,installed:0,version:30};
serverPlayer={...citizen(9),installation:{projectId:base.id,readyAt:clock+2000}};position={...base.workPoint,y:0};
activity=mount();await flush();assert.match(button().textContent,/Memasang/);
serverProject={...serverProject,installed:1,version:31};activity.applySnapshot(state());
assert.match(ui.textContent,/Ambil satu kit bahan/,'Other worker consuming stock restores the pickup objective');
position={...base.depot,y:0};clock+=2200;activity.tick(clock);button().click();await flush();assert.equal(commands.at(-1).action,'pickup');
position={...base.workPoint,y:0};clock+=200;activity.tick(clock);button().click();await flush();assert.equal(commands.at(-1).action,'deliver');
assert.match(button().textContent,/Selesaikan pasang/,'Already served server timer can be used once new stock arrives');
button().click();await flush();assert.equal(commands.at(-1).action,'install');assert.equal(serverProject.installed,2);
serverProject={...serverProject,status:'completed',delivered:12,installed:12,version:33};serverPlayer.installation={projectId:base.id,readyAt:clock-1};activity.applySnapshot(state());
assert.equal(button().hidden,true);assert.equal(activity.consumeInteraction(),false,'Completed projects cannot offer stale installation work');activity.dispose();
const integration=await readFile(new URL('../game-src/republic-openworld.js',import.meta.url),'utf8');
assert.match(integration,/syncPresence\(\{fresh:true\}\)/);assert.match(integration,/if\(home\.consumeInteraction\(\)\|\|construction\.consumeInteraction\(\)\).*?else if\(nearby\?\.kind==='player'\)/);
assert.match(integration,/construction\.dispose\(\)/);assert.match(integration,/construction\.geometry\.surfaces/);
await win.happyDOM.close();
console.log('PASS construction: server-only stages and inventory, complete kit/assembly flow, radius/timer, fresh presence, idempotent retry, paused return, version reconciliation, reload, account race, guest access, floor/collision and disposal.');
