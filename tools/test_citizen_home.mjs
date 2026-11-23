import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import * as THREE from 'three';
import {citizenHomeOpportunity,mountCitizenHome} from '../game-src/citizen-home.js';
import {HOME_LAYOUT} from '../game-src/citizen-home-layout.js';

let clock=Date.parse('2026-11-23T12:00:00Z');
const makeState=id=>({playerId:id,version:0,mission:{status:'not_started',acceptedAt:null,completedAt:null,clerk:{x:9,z:6},deliveryPoint:{x:38,z:3},radius:3},
  home:{id:'home-'+id,address:`Wisma Warga · Kamar ${String(id).padStart(4,'0')}`,unlocked:false,inside:false,decorationPlaced:false,slotId:HOME_LAYOUT.slotId},inventory:{welcomePlant:0},csrfToken:'home-session-'+id,serverTime:clock});
assert.equal(citizenHomeOpportunity().action,'accept_delivery');
assert.equal(citizenHomeOpportunity({snapshot:{...makeState(9),home:{unlocked:true,inside:false}}}).action,'enter_home');
assert.equal(citizenHomeOpportunity({snapshot:{...makeState(9),home:{inside:true}}}),null);
assert.equal(citizenHomeOpportunity({snapshot:{...makeState(9),mission:{status:'carrying',acceptedAt:clock}},now:clock+500}).remaining,1500);

const win=new Window({url:'http://localhost/project/'});
for(const name of ['window','document','Event','CustomEvent'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
document.body.innerHTML='<button id="profileButton">Masuk</button><div id="ui"></div><canvas id="world"></canvas>';
const ui=document.getElementById('ui'),canvas=document.getElementById('world');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
let auth={id:9},position={x:9,y:0,z:6},server=makeState(9),readCount=0,failAfterCommit=false,failBeforeCommit=false,invalidNext=false;
let giftCount=0,roomCreates=0,roomDisposes=0,roomRenderStates=[],interiorChanges=[],orders=[],commands=[],seen=new Set(),beforeMove=false;
const response=data=>({ok:true,status:200,json:async()=>structuredClone(data)});
const fetchImpl=async(url,options={})=>{
  if(options.method!=='POST'){
    readCount++;assert.equal(new URL(url).searchParams.get('resource'),'citizen_home');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
    if(invalidNext){invalidNext=false;return response({...server,playerId:404});}
    return response({...server,serverTime:clock});
  }
  const body=JSON.parse(options.body);commands.push(body);orders.push('post');
  assert.equal(body.resource,'citizen_home');assert.equal(body.csrfToken,server.csrfToken);assert.match(body.requestId,/^[a-zA-Z0-9_-]{16,80}$/);
  for(const field of ['playerId','version','inside','welcomePlant','position'])assert.equal(body[field],undefined,'Private state and position are not client-authoritative writes');
  if(failBeforeCommit)throw new Error('Koneksi terputus');
  if(!seen.has(body.requestId)){
    seen.add(body.requestId);server.version++;
    switch(body.action){
      case 'accept_delivery':assert.equal(server.mission.status,'not_started');server.mission.status='carrying';server.mission.acceptedAt=clock;break;
      case 'deliver':assert.equal(server.mission.status,'carrying');assert.ok(clock-server.mission.acceptedAt>=2000);server.mission.status='completed';server.mission.completedAt=clock;server.home.unlocked=true;server.inventory.welcomePlant=1;giftCount++;break;
      case 'enter_home':assert.equal(server.home.unlocked,true);server.home.inside=true;break;
      case 'leave_home':server.home.inside=false;break;
      case 'place_decoration':assert.equal(server.home.inside,true);assert.equal(body.slotId,HOME_LAYOUT.slotId);assert.equal(server.inventory.welcomePlant,1);server.inventory.welcomePlant=0;server.home.decorationPlaced=true;break;
      case 'remove_decoration':assert.equal(server.home.inside,true);assert.equal(body.slotId,HOME_LAYOUT.slotId);assert.equal(server.home.decorationPlaced,true);server.inventory.welcomePlant=1;server.home.decorationPlaced=false;break;
      default:assert.fail('Unknown action '+body.action);
    }
  }
  if(failAfterCommit){failAfterCommit=false;throw new Error('Jawaban server hilang');}
  return response({...server,serverTime:clock});
};
const createInteriorView=()=>{roomCreates++;return {applyState(state){roomRenderStates.push(structuredClone(state));},dispose(){roomDisposes++;}};};
const mount=extra=>mountCitizenHome({scene:new THREE.Scene(),ui,canvas,getPosition:()=>position,getCitizen:()=>auth,getYaw:()=>0,apiUrl:'http://localhost/project/api',fetchImpl,now:()=>clock,
  beforeAction:async()=>{orders.push('presence');if(beforeMove)position={x:100,y:0,z:100};},createInteriorView,onInteriorChange:value=>interiorChanges.push(value),...extra});
const action=()=>ui.querySelector('[data-home-action]'),slot=()=>ui.querySelector('[data-home-slot]'),exit=()=>ui.querySelector('[data-home-exit]');
let activity=mount();await flush();assert.equal(readCount,1);assert.equal(activity.isInside(),false);assert.equal(action().disabled,false);
assert.equal(activity.wantsInteraction(),true);activity.setActionVisible(false);assert.equal(action().hidden,true);activity.setActionVisible(true);
beforeMove=true;activity.consumeInteraction();await flush();assert.equal(commands.length,0,'Slow presence cannot submit using an old interaction position');assert.match(ui.textContent,/Kembali ke titik/);
beforeMove=false;position={x:9,y:0,z:6};activity.tick(clock+200);activity.consumeInteraction();await flush();assert.deepEqual(orders.slice(-2),['presence','post']);assert.equal(server.mission.status,'carrying');assert.match(ui.textContent,/Bawaan: paket/);
assert.equal(activity.wantsInteraction(),false,'The next action moves to the lodge, not the previous NPC');
position={...HOME_LAYOUT.entrance,y:0};activity.tick(clock+400);assert.equal(action().disabled,true,'A visible journey countdown cannot finish early');
clock+=2100;activity.tick(clock);assert.equal(action().disabled,false);
failAfterCommit=true;action().click();await flush();assert.equal(giftCount,1);assert.equal(activity.opportunity().action,'deliver','A lost response does not optimistically award or unlock');
const deliveryId=commands.at(-1).requestId;action().click();await flush();assert.equal(commands.at(-1).requestId,deliveryId);assert.equal(giftCount,1);assert.equal(activity.opportunity().action,'enter_home');
action().click();await flush();assert.equal(activity.isInside(),true);assert.ok(ui.classList.contains('citizen-home-interior'));assert.equal(roomCreates,1);assert.deepEqual(interiorChanges,[true]);assert.equal(exit().hidden,false);assert.equal(action().hidden,true);
const presenceCalls=orders.filter(item=>item==='presence').length;
failAfterCommit=true;slot().click();await flush();assert.equal(server.home.decorationPlaced,true);assert.equal(roomRenderStates.at(-1).decorationPlaced,false,'Plant is not drawn until acknowledged');
const plantId=commands.at(-1).requestId;slot().click();await flush();assert.equal(commands.at(-1).requestId,plantId);assert.equal(roomRenderStates.at(-1).decorationPlaced,true);assert.equal(slot().textContent,'Ambil tanaman');
slot().click();await flush();assert.equal(server.inventory.welcomePlant,1);assert.equal(server.home.decorationPlaced,false);assert.equal(orders.filter(item=>item==='presence').length,presenceCalls,'Private decoration never publishes an interior position');
failBeforeCommit=true;exit().dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flush();assert.equal(activity.isInside(),true);assert.equal(roomDisposes,0);assert.match(ui.textContent,/Koneksi terputus/);
const leaveId=commands.at(-1).requestId;failBeforeCommit=false;exit().click();await flush();assert.equal(commands.at(-1).requestId,leaveId);assert.equal(activity.isInside(),false);assert.equal(roomDisposes,1);assert.deepEqual(interiorChanges,[true,false]);assert.equal(orders.filter(item=>item==='presence').length,presenceCalls);
assert.equal(readCount,1,'No private polling loop is added during ordinary play');

// A GET can reconcile a committed write whose response was lost. The NEXT visit
// or furnishing cycle must use a new ID, not replay that earlier successful one.
failAfterCommit=true;action().click();await flush();const firstEnter=commands.at(-1).requestId;
assert.equal(activity.isInside(),false);ui.querySelector('[data-home-sync]').click();await flush();assert.equal(activity.isInside(),true);
exit().click();await flush();action().click();await flush();assert.notEqual(commands.at(-1).requestId,firstEnter);assert.equal(activity.isInside(),true);
failAfterCommit=true;slot().click();await flush();const firstPlace=commands.at(-1).requestId;
ui.querySelector('[data-home-room-sync]').click();await flush();assert.equal(slot().textContent,'Ambil tanaman');
slot().click();await flush();slot().click();await flush();assert.notEqual(commands.at(-1).requestId,firstPlace);assert.equal(server.home.decorationPlaced,true);
exit().click();await flush();

// GET restores the session-bound room and persisted decoration without mutating it.
activity.dispose();server.home.inside=true;server.home.decorationPlaced=true;server.inventory.welcomePlant=0;server.home.address='<img src=x onerror=alert(1)>';
const postsBeforeRestore=commands.length;activity=mount();await flush();assert.equal(activity.isInside(),true);assert.equal(ui.querySelector('img'),null);assert.equal(commands.length,postsBeforeRestore);assert.equal(roomRenderStates.at(-1).decorationPlaced,true);
assert.equal(exit().getAttribute('type'),'button');assert.equal(ui.querySelector('.ch-room').getAttribute('aria-modal'),'true');
// A failed leave cannot be bypassed by a local close; a refresh reconciles it.
failAfterCommit=true;exit().click();await flush();assert.equal(server.home.inside,false);assert.equal(activity.isInside(),true);
ui.querySelector('[data-home-room-sync]').click();await flush();assert.equal(activity.isInside(),false);

// Account changes discard old private snapshots, abort old reads, and never send a
// leave mutation on behalf of the account that was just replaced.
activity.dispose();auth={id:31};let finishOld,oldSignal,delayedReads=0;
activity=mount({fetchImpl:async(url,options)=>{
  assert.notEqual(options.method,'POST');delayedReads++;
  if(delayedReads===1){oldSignal=options.signal;return new Promise(resolve=>finishOld=resolve);}
  return response({...makeState(32),home:{...makeState(32).home,address:'Kamar akun baru'}});
}});
auth={id:32};window.dispatchEvent(new CustomEvent('semesta:citizen-change'));await flush();assert.equal(oldSignal.aborted,true);
finishOld(response({...makeState(31),home:{...makeState(31).home,inside:true,unlocked:true,address:'Kamar akun lama'}}));await flush();assert.equal(activity.isInside(),false);assert.doesNotMatch(ui.textContent,/Kamar akun lama/);
activity.dispose();

// Aborting an older read cannot enable actions while its replacement is pending.
auth={id:9};position={x:9,y:0,z:6};let finishNew,reads=0;
activity=mount({fetchImpl:async(url,options)=>{
  assert.notEqual(options.method,'POST');reads++;
  if(reads===1)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('cancel'),{name:'AbortError'}))));
  return new Promise(resolve=>finishNew=resolve);
}});
document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(reads,2);assert.equal(action().disabled,true,'Only the newest read may clear loading');
finishNew(response(makeState(9)));await flush();assert.equal(action().disabled,false);activity.dispose();

// A malformed or different-account initial snapshot never enables private actions.
auth={id:9};server=makeState(9);invalidNext=true;position={x:9,y:0,z:6};activity=mount();await flush();assert.match(ui.textContent,/Data kamar belum lengkap/);
const invalidPosts=commands.length;action().click();await flush();assert.equal(commands.length,invalidPosts);assert.equal(activity.opportunity().action,'accept_delivery');
assert.equal(ui.querySelector('[data-home-sync]').hidden,true,'Successful read clears the error and restores a valid action');activity.dispose();

// A stale lower-version response cannot undo an acknowledged room state.
auth={id:9};server={...makeState(9),version:20,home:{...makeState(9).home,inside:true,unlocked:true}};
let stale=false;activity=mount({fetchImpl:async()=>response(stale?{...server,version:19,home:{...server.home,inside:false}}:server)});await flush();assert.equal(activity.isInside(),true);
stale=true;document.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(activity.isInside(),true);activity.dispose();

// Logout while in a private room closes only local state, without leaking the old
// account's interior or creating a request for a replacement account.
server={...makeState(9),home:{...makeState(9).home,inside:true,unlocked:true}};auth={id:9};activity=mount();await flush();const preLogout=commands.length;
auth=null;activity.tick(clock+1000);await flush();assert.equal(activity.isInside(),false);assert.equal(commands.length,preLogout);assert.doesNotMatch(ui.textContent,/Kamar akun lama/);activity.dispose();

// Guest guidance works without private requests; leaving Jakartawa stays legible.
auth=null;let guestReads=0,login=0;document.getElementById('profileButton').onclick=()=>login++;
activity=mount({fetchImpl:async()=>{guestReads++;throw new Error('Guest must not read private state');}});action().click();await flush();assert.equal(login,1);assert.equal(guestReads,0);
position={x:-1100,y:0,z:-400};activity.tick(clock+1300);assert.match(ui.textContent,/Kegiatan ini ada di Jakartawa/);assert.equal(activity.wantsInteraction(),false);assert.equal(action().hidden,true);
const external=new AbortController();activity.dispose();activity=mount({events:external.signal});external.abort();assert.equal(ui.children.length,0);activity.dispose();assert.equal(roomCreates,roomDisposes);
await win.happyDOM.close();
console.log('PASS citizen home: complete solo delivery, authoritative reward/room/decor, fresh presence and radius, timer, replay retry, restore, account/stale-response isolation, accessible leave, guests, direction, and disposal.');
