// Execute the actual world mount with CPU scene/actor adapters. This checks
// control/presence wiring; it is deliberately not a WebGL/browser acceptance test.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import * as Three from 'three';
import * as layout from '../game-src/republic-world-layout.js';
import {createRepublicPresence} from '../game-src/republic-presence.js';
import {mountCitizenHome} from '../game-src/citizen-home.js';
import {HOME_LAYOUT} from '../game-src/citizen-home-layout.js';
import {createStoryHomes} from '../game-src/citizen-story-homes-geometry.js';
import {STORY_NEIGHBORHOOD} from '../game-src/citizen-story-homes.js';
import {createWelcomeParcel} from '../game-src/citizen-home-parcel.js';
import * as hud from '../game-src/republic-world-hud.js';
import {presets,normalizeAvatarConfig} from '../game-src/avatar-v15-config.js';
const win=new Window({url:'http://localhost/project/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
for(const name of ['window','document','navigator','Event','CustomEvent','ResizeObserver'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
globalThis.getComputedStyle=win.getComputedStyle.bind(win);globalThis.devicePixelRatio=1;
let nextFrame;globalThis.requestAnimationFrame=callback=>{nextFrame=callback;return 1;};globalThis.cancelAnimationFrame=()=>{};
const template=(await readFile(new URL('../application/views/game.php',import.meta.url),'utf8')).replace(/<\?php[\s\S]*?\?>|<\?=[\s\S]*?\?>/g,'').replace(/<script[\s\S]*?<\/script>/g,'');document.write(template);
const canvas=document.getElementById('world');canvas.getBoundingClientRect=()=>({width:390,height:844,left:0,top:0});
const account={id:73,display_name:'Warga uji'},commands=[],states=[];
let snapshot={playerId:73,version:3,mission:{status:'completed',clerk:{x:9,z:6},deliveryPoint:{x:38,z:3},radius:3},home:{id:'home-73',address:'Wisma Warga 73',unlocked:true,inside:true,decorationPlaced:false,slotId:'welcome-shelf'},inventory:{welcomePlant:1},csrfToken:'test-token'};
globalThis.fetch=async(url,options={})=>{
  let data;
  if(options.method==='POST'){
    const body=JSON.parse(options.body);commands.push(body);
    if(body.resource==='citizen_chat')data={players:[],messages:[],canChat:false};
    else{assert.equal(body.resource,'citizen_home');snapshot.version++;if(body.action==='leave_home')snapshot.home.inside=false;else if(body.action==='enter_home')snapshot.home.inside=true;else assert.fail(body.action);data=snapshot;}
  }else{assert.equal(new URL(url).searchParams.get('resource'),'citizen_home');data=snapshot;}
  return {ok:true,status:200,json:async()=>structuredClone(data)};
};
class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}dispose(){}}
const sceneAdapter=()=>({colliders:[],surfaces:[],occluders:[],count:0,setPhase(){},update(){},dispose(){}});
let constructionVisible=true,constructionInteractions=0;
const dependencies={THREE:{...Three,WebGLRenderer:Renderer},...layout,...hud,HOME_LAYOUT,STORY_NEIGHBORHOOD,createStoryHomes,presets,normalizeAvatarConfig,createRepublicPresence,createWelcomeParcel,
  preloadRepublicBuildingLogo:async()=>{},createCapitalContext:sceneAdapter,createRepublicTerrainStream:sceneAdapter,
  mountConstruction:()=>({geometry:sceneAdapter(),tick(){},dispose(){},resetActorPose(){},applyActorPose(){},consumeInteraction(){constructionInteractions++;return false;},wantsInteraction:()=>false,setActionVisible:value=>constructionVisible=value}),
  mountCitizenHome:options=>mountCitizenHome({...options,createInteriorView:()=>({applyState(){},dispose(){}})}),
  loadAvatarProfile:async()=>{},createHumanModel:()=>({figure:new Three.Group(),mixer:{setTime(){}}}),disposeAvatar:actor=>actor?.figure.removeFromParent(),animateAvatar(){},avatarSpeed:(actor,mode)=>mode==='Run'?3:1.4,
};
const source=(await readFile(new URL('../game-src/republic-openworld.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const mount=new Function(...Object.keys(dependencies),source+'\nreturn mountRepublicOpenWorld;')(...Object.values(dependencies));
const flush=async()=>{for(let i=0;i<7;i++)await new Promise(resolve=>setImmediate(resolve));};
const controller=await mount({canvas,city:'jakarta',entry:{x:38,z:5},apiUrl:'http://localhost/project/api',activeCitizen:account,onState:value=>states.push(value)});await flush();
assert.ok(document.body.classList.contains('citizen-home-open'),'Restored private session opens the room');
assert.equal(document.querySelector('.explore-top').inert,true);assert.equal(document.querySelector('.game-hud').inert,true);
const frame=time=>nextFrame(time),syncCount=()=>commands.filter(c=>c.resource==='citizen_chat'&&c.action==='sync').length;
frame(2000);await flush();assert.equal(syncCount(),0,'No public heartbeat while in the restored private room');
assert.equal(document.querySelector('.republic-world-overlay').style.visibility,'','The private modal must not be hidden with public movement');
const before=controller.getState().position;
window.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyW'}));frame(2050);assert.deepEqual(controller.getState().position,before);
assert.equal(controller.teleport({x:0,z:0}),false,'Minimap/programmatic teleport cannot move an occupied room');
document.querySelector('[data-home-exit]').click();await flush();assert.equal(document.body.classList.contains('citizen-home-open'),false);
assert.equal(document.querySelector('.explore-top').inert,false);assert.equal(document.querySelector('.game-hud').inert,false);
assert.equal(controller.getState().position.x,38);assert.equal(controller.getState().position.z,5);
frame(3000);await flush();assert.equal(syncCount(),1,'Leaving resumes presence at the public doorway');
assert.equal(constructionVisible,false,'Housing owns the shared action near its door');
const run=document.querySelector('.rw-run');run.click();assert.equal(run.getAttribute('aria-pressed'),'true');
window.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyW'}));frame(3050);assert.ok(controller.getState().position.z<5);
window.dispatchEvent(new win.KeyboardEvent('keyup',{code:'KeyW'}));document.body.classList.add('capture-mode');
window.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyE'}));await flush();
assert.equal(constructionInteractions,0,'Door interaction takes priority over project/chat');assert.equal(run.getAttribute('aria-pressed'),'false');
assert.equal(document.body.classList.contains('capture-mode'),false,'Entering cannot strand a hidden room in capture mode');
const count=syncCount();frame(5000);await flush();assert.equal(syncCount(),count);
window.dispatchEvent(new CustomEvent('semesta:citizen-change',{detail:{citizen:null}}));await flush();frame(5100);
assert.equal(document.querySelector('.ch-room').hidden,true,'Logout clears the private room');assert.equal(document.body.classList.contains('citizen-home-open'),false);
controller.dispose();assert.equal(document.querySelector('.republic-world-overlay'),null);assert.equal(document.querySelector('.rw-tools'),null);assert.ok(document.querySelector('.explore-top>.explore-top-actions'),'Original toolbar restored');
assert.equal(canvas.parentElement.classList.contains('rw-hud-active'),false);
await win.happyDOM.close();console.log('PASS home/world integration: actual mount with CPU adapters, restore/leave, public presence pause, movement/run reset, shared E action, capture exit, identity and disposal.');
