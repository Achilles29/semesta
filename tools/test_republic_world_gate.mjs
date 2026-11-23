// Actual public entry and template, with controllable API failures. No WebGL,
// browser automation, account mutation, or live server request is involved.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const win=new Window({url:'http://localhost/project/',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
const restoreScenario=process.argv.includes('--restore');
for(const name of ['window','document','navigator','localStorage','Event','CustomEvent','HTMLElement','Element','location','history','Audio','ResizeObserver'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
globalThis.Option=function(text,value){const option=document.createElement('option');option.textContent=text;option.value=value;return option;};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
localStorage.setItem('republic-world-phase-v1',JSON.stringify({phase:'after-day2'}));
if(restoreScenario)localStorage.setItem('republik-wkwkwk-state-v2',JSON.stringify({screen:'explore',lastMap:'region',destination:'jakarta',district:'urban-jakartawa',worldLayoutVersion:2,playerPosition:{x:0,y:0,z:8},playerYaw:0}));
const project={id:'jakartawa-home-01',name:'Rumah contoh P01',plotId:'P01',city:'jakarta',position:{x:29,z:-28},workPoint:{x:29,z:-21.5},depot:{x:22,z:-10},radius:3,required:12,delivered:0,installed:0,version:1,status:'draft'};
let mode='pending',releaseInitial,reads=0;
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(body)});
const snapshot={world:{id:'republic',version:3,phase:'after-day2',publishedAt:'2026-11-23T00:00:00Z'},projects:[project]};
globalThis.fetch=async(url,options={})=>{
  assert.notEqual(options.method,'POST','Opening, navigating and retrying maps never mutates the server');
  if(new URL(url,location.href).searchParams.get('resource')!=='world_state')return response({citizen:null,options:{}});
  reads++;assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
  if(mode==='pending')return new Promise(resolve=>{releaseInitial=resolve;});
  if(mode==='offline')return response({error:'World unavailable'},503);
  if(mode==='invalid')return response({...snapshot,world:{...snapshot.world,phase:'unpublished-preview'}});
  return response(snapshot);
};
window.SEMESTA_API_URL='http://localhost/project/api';
const html=(await readFile(new URL('../application/views/game.php',import.meta.url),'utf8')).replace(/<\?php[\s\S]*?\?>|<\?=[\s\S]*?\?>/g,'').replace(/<script[\s\S]*?<\/script>/g,'');document.write(html);
const $=selector=>document.querySelector(selector),active=id=>$('#'+id).classList.contains('active');
const waitFor=async(predicate,message)=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail(message);};
await import('../game-src/main.js');
await waitFor(()=>!!releaseInitial,'Initial world request begins');
const {getSharedWorldSnapshot,applySharedWorldSnapshot}=await import('../game-src/republic-world-state.js');
try{
  if(restoreScenario){
    assert.ok(active('regionScreen'),'A stored exploration waits on its map for the first server snapshot');
    assert.equal(active('exploreScreen'),false);
    $('#backToWorldFromRegion').click();$('[data-destination="bandung"]').click();
    assert.ok(active('regionScreen'));assert.match($('#regionTitle').textContent,/Bandunggul/);
    mode='online';releaseInitial(response(snapshot));
    await waitFor(()=>getSharedWorldSnapshot()?.world.version===3,'Delayed first success publishes the shared world');
    await Promise.resolve();
    assert.equal(active('exploreScreen'),false,'A delayed first success must not undo deliberate map navigation by restoring old exploration');
    assert.ok(active('regionScreen'));assert.match($('#regionTitle').textContent,/Bandunggul/);
    assert.equal($('#enterRegionalLocation').disabled,false);
    assert.equal(JSON.parse(localStorage.getItem('republik-wkwkwk-state-v2')).screen,'region');
    assert.equal($('.avatar-loading'),null,'Cancelled restoration never starts a WebGL world load');
  }else{
  assert.equal($('.build-notice'),null);assert.equal(getSharedWorldSnapshot(),null);
  assert.equal($('#enterLocation').disabled,true);assert.equal($('#enterRegionalLocation').disabled,true);
  assert.equal($('#sharedWorldNotice').hidden,false);assert.equal($('#retrySharedWorld').hidden,true);
  assert.equal($('[data-world-phase]'),null,'Public phase publication controls are absent');
  $('[data-destination="bandung"]').click();assert.ok(active('regionScreen'));assert.match($('#regionTitle').textContent,/Bandunggul/);
  $('[data-district="bandung-forest"]').click();assert.match($('#regionLocationTitle').textContent,/Hutan Bandunggul/);
  $('#enterRegionalLocation').dispatchEvent(new Event('click'));
  assert.equal(active('exploreScreen'),false,'The handler also gates exploration when a disabled button event is dispatched');
  $('#backToWorldFromRegion').click();$('[data-destination="jakarta"]').click();$('#openCapitalPlan').click();
  assert.ok(active('cityScreen'),'Detailed map remains available while the server request is pending');
  assert.match($('#worldPhaseStatus').textContent,/MENUNGGU/);
  assert.equal($('#enterLocation').disabled,true,'A legacy local after-day2 phase cannot unlock the world');

  mode='offline';releaseInitial(response({error:'World unavailable'},503));
  await waitFor(()=>!$('#retrySharedWorld').hidden,'Failed first read offers a global retry');
  assert.equal(getSharedWorldSnapshot(),null);assert.equal($('[data-world-retry]').hidden,false);
  assert.match($('#sharedWorldNotice').textContent,/peta tetap dapat dibuka/i);assert.equal($('#enterLocation').disabled,true);
  $('#backToWorld').click();assert.ok(active('worldScreen'));$('[data-destination="makassar"]').click();assert.match($('#regionTitle').textContent,/Makasabar/);

  mode='invalid';let count=reads;$('#retrySharedWorld').click();
  await waitFor(()=>reads>count&&!$('#retrySharedWorld').hidden,'Invalid retry remains recoverable');
  assert.equal(getSharedWorldSnapshot(),null,'A malformed response cannot unlock exploration');
  assert.equal($('#enterRegionalLocation').disabled,true);

  mode='online';count=reads;$('#retrySharedWorld').click();
  await waitFor(()=>reads>count&&getSharedWorldSnapshot()?.world.version===3,'A successful retry publishes the server snapshot');
  assert.equal($('#enterRegionalLocation').disabled,false);assert.equal($('#enterLocation').disabled,false);assert.equal($('#sharedWorldNotice').hidden,true);
  assert.ok(active('regionScreen'),'Recovering the initial read does not unexpectedly leave the selected map');
  assert.match($('#regionTitle').textContent,/Makasabar/,'Retry preserves the selected destination');
  $('#backToWorldFromRegion').click();$('[data-destination="jakarta"]').click();$('#openCapitalPlan').click();
  assert.equal(document.querySelectorAll('#cityMapArt [data-built="true"]').length,3);
  $('[data-location="housing"]').click();
  applySharedWorldSnapshot({...snapshot,projects:[{...project,version:4,status:'active',delivered:2,installed:1}]});
  assert.match($('#locationTag').textContent,/P01 1\/12/);assert.equal($('#cityMapArt [data-plot="P01"]').dataset.installed,'1');
  applySharedWorldSnapshot({...snapshot,projects:[{...project,version:26,status:'completed',delivered:12,installed:12}]});
  assert.match($('#locationTag').textContent,/P01 SELESAI/);assert.equal($('#cityMapArt [data-plot="P01"]').dataset.projectStatus,'completed');

  // Back/forward cache preserves the JS page. Its polling/retry lifecycle must
  // remain usable when the page returns, while a real teardown still disposes.
  const cachedHide=new Event('pagehide');Object.defineProperty(cachedHide,'persisted',{value:true});window.dispatchEvent(cachedHide);
  const cachedShow=new Event('pageshow');Object.defineProperty(cachedShow,'persisted',{value:true});window.dispatchEvent(cachedShow);
  mode='offline';count=reads;$('[data-world-retry]').click();
  await waitFor(()=>reads>count&&!$('[data-world-retry]').hidden,'A page restored from back/forward cache can still refresh world state');
  assert.equal($('#enterLocation').disabled,false,'An outage after a valid snapshot retains exploration availability');
  assert.match($('#sharedWorldNotice').textContent,/Keadaan terakhir tetap ditampilkan/);
  assert.equal($('#cityMapArt [data-plot="P01"]').dataset.projectStatus,'completed','Offline retry retains already observed project progress');
  assert.equal(localStorage.getItem('republic-world-phase-v1'),JSON.stringify({phase:'after-day2'}),'Public synchronization never rewrites preview storage');
  }
}finally{
  window.dispatchEvent(new Event('pagehide'));await win.happyDOM.close();
}
console.log(restoreScenario?'PASS public world restore: delayed first success preserves deliberate map navigation and cancels old exploration restoration.':'PASS public world gate: pending/failing/malformed initial read, usable map navigation, explicit retry, server phase and project updates, preserved last snapshot, back/forward-cache lifecycle, and no server mutations.');
