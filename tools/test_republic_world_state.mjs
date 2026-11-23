import assert from 'node:assert/strict';
import {createWorldStateStore,publicWorldSnapshot,startSharedWorldSync} from '../game-src/republic-world-state.js';
import {getWorldPhase,setWorldPhase,usePublishedWorldPhase,applyPublishedWorldPhase} from '../game-src/republic-world-layout.js';

const project={id:'jakartawa-home-01',name:'Rumah contoh P01',plotId:'P01',city:'jakarta',position:{x:29,z:-28},workPoint:{x:29,z:-21.5},depot:{x:22,z:-10},radius:3,required:12,delivered:0,installed:0,version:1,status:'draft'};
const snapshot=(v=1,phase='after-day2',p=project)=>({world:{id:'republic',version:v,phase,publishedAt:'2026-11-23T00:00:00Z'},projects:[p]});
let changes=0;const a=createWorldStateStore({onChange:()=>changes++}),b=createWorldStateStore();
a.apply(snapshot());b.apply(snapshot());assert.deepEqual(a.get(),b.get());
assert.equal(changes,1);a.apply(snapshot());assert.equal(changes,1,'Polling same snapshot must not rerender');
const next=snapshot(2,'after-day2',{...project,version:3,status:'active',delivered:2,installed:1});
a.apply({...next,player:{id:17,inventory:{constructionKit:1}},csrfToken:'secret'});b.apply(next);
assert.deepEqual(a.get(),b.get());assert.equal(a.get().player,undefined);assert.equal(a.get().csrfToken,undefined);
const reload=createWorldStateStore();reload.apply(next);assert.deepEqual(reload.get(),a.get(),'New client reload receives same state');
a.apply(snapshot());assert.deepEqual(a.get(),b.get(),'Old phase version cannot revert current state');
a.apply(snapshot(2,'after-day2',{...project,version:2,status:'active'}));assert.equal(a.get().projects[0].installed,1,'Late project read cannot rewind contribution');
assert.throws(()=>publicWorldSnapshot(snapshot(3,'bad')));
assert.throws(()=>publicWorldSnapshot(snapshot(3,'after-day2',{...project,installed:99})));
assert.throws(()=>{a.get().projects[0].installed=99;},TypeError);
usePublishedWorldPhase();applyPublishedWorldPhase('after-day2');
globalThis.localStorage={getItem:()=>JSON.stringify({phase:'before-day2'}),setItem:()=>{throw new Error('must not write');}};
assert.equal(getWorldPhase(),'after-day2');assert.equal(setWorldPhase('before-day2'),'after-day2','Public inspection cannot mutate published phase');

let server=next,calls=0,fail=false;const statuses=[];
const sync=startSharedWorldSync({apiUrl:'http://local/project/api?token=fixture',interval:60000,get:b.get,apply:b.apply,onStatus:s=>statuses.push(s),fetcher:async(url,options)=>{
  calls++;assert.equal(new URL(url).searchParams.get('resource'),'world_state');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
  if(fail)throw new Error('offline');return {ok:true,json:async()=>server};
}});
await sync.ready;assert.equal(calls,1);assert.equal(statuses.at(-1).state,'online');
fail=true;await sync.refresh();assert.equal(statuses.at(-1).state,'offline');assert.ok(statuses.at(-1).hasSnapshot);assert.deepEqual(b.get(),a.get());
fail=false;server=snapshot(3,'before-day2',{...project,version:4,status:'paused',delivered:2,installed:1});await sync.refresh();assert.equal(b.get().world.phase,'before-day2');sync.dispose();
let resolveRead;const late=createWorldStateStore(),disposable=startSharedWorldSync({apiUrl:'http://local/api',apply:late.apply,get:late.get,onStatus:()=>{},fetcher:()=>new Promise(resolve=>resolveRead=resolve)});
const again=disposable.refresh();assert.equal(again,disposable.ready,'One in-flight request shared');disposable.dispose();resolveRead({ok:true,json:async()=>next});await again;assert.equal(late.get(),null,'No disposed update');
console.log('PASS shared world: two clients/reload, version reconciliation, private data stripping, published authority, retry, abort/dispose and one in-flight poll.');
