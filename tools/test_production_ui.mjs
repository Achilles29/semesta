// DOM interaction tests, not a real-browser or WebGL test.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {compileScenario,sampleScenario} from '../game-src/production-scenario.js';
import {mountProductionStudio} from '../game-src/production-studio.js';
const win=new Window({url:'http://localhost/project/admin/?view=production'});
for(const name of ['window','document','navigator','localStorage','Event','CustomEvent','HTMLElement'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
let clock=0,frame;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
globalThis.requestAnimationFrame=callback=>{frame=callback;return 1;};globalThis.cancelAnimationFrame=()=>{frame=null;};
win.HTMLCanvasElement.prototype.getContext=function(){return {canvas:this,drawImage(){},save(){},restore(){},fillRect(){},strokeRect(){},fillText(){},setLineDash(){},measureText:t=>({width:t.length*8})};};
win.document.body.innerHTML='<section class="admin-view active"><div id="studio"></div></section>';
const host=win.document.getElementById('studio'),q=s=>host.querySelector(s);
let creates=0,disposals=0,rendered=[],exportRequest,mode='complete',gpuSize=[];
let storyLoads=0;
globalThis.AudioContext=class{currentTime=0;async resume(){}async close(){}createBufferSource(){return {connect(){},start(){},stop(){},disconnect(){}};}};
const dependencies={
  async createStage(s){creates++;let compiled=compileScenario(s);return {scene:{},camera:{},get compiled(){return compiled;},setScenario(next){compiled=compileScenario(next);},pose(t){rendered.push(t);return sampleScenario(compiled,t);},dispose(){disposals++;}};},
  createRenderer(gpu){return {setSize(w,h){gpu.width=w;gpu.height=h;gpuSize.push([w,h]);},render(){},dispose(){}};},
  async encode(args){exportRequest=args;if(mode==='cancel')return new Promise((_,reject)=>args.signal.addEventListener('abort',()=>reject(new DOMException('cancel','AbortError'))));await args.renderFrame(.5);args.onProgress(1);return new Blob(['test'],{type:'video/mp4'});},
  async mixAudio(tracks){return tracks.length>2?{storyAudio:true}:null;},
  async loadStory(){storyLoads++;return [{buffer:{},volume:.95,offset:.3}];},
};
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const click=selector=>q(selector).click();
const change=(selector,value)=>{const node=q(selector);node.value=value;node.dispatchEvent(new win.Event('change',{bubbles:true}));};
let studio=mountProductionStudio(host,dependencies);await flush();
assert.equal(creates,0);assert.equal(q('[data-command="play"]').disabled,true);assert.equal(q('.ps-empty').hidden,false);
click('[data-command="rehearsal"]');await flush();assert.equal(creates,1);assert.equal(q('[data-command="play"]').disabled,false);assert.equal(q('.ps-empty').hidden,true);
assert.deepEqual(gpuSize.at(-1),[360,640],'Preview GPU must be sized even if display canvas already matches');
click('[data-command="play"]');assert.ok(q('[data-command="play"]').textContent.includes('Jeda'));clock=3;frame();assert.ok(q('[data-time]').textContent.startsWith('0:03.0'));
click('[data-command="play"]');assert.equal(frame,null);click('[data-jump="2"]');assert.equal(Number(q('[data-seek]').value),5);
change('[data-shot="0"] [data-shot-field="duration"]','4');assert.equal(Number(q('[data-seek]').max),12);assert.equal(Number(q('[data-seek]').value),0);
change('[data-format]','landscape');assert.ok(q('[data-preview]').width>q('[data-preview]').height);
click('[data-command="export"]');await flush();await flush();assert.equal(exportRequest.canvas.width,640,'Preview size must be restored after export');assert.equal(q('[data-download]').hidden,false);assert.ok(q('[data-download]').download.endsWith('landscape-1080p.mp4'));
change('[data-quality]','720');assert.equal(q('[data-download]').hidden,true,'Never offer stale export after settings change');
mode='cancel';click('[data-command="export"]');await flush();assert.equal(q('[data-command="cancel"]').hidden,false);assert.equal(q('[data-field="title"]').disabled,true);click('[data-command="cancel"]');await flush();assert.match(q('[data-status]').textContent,/dibatalkan/);assert.equal(q('[data-command="play"]').disabled,false);assert.equal(q('[data-download]').hidden,true);
click('[data-command="play"]');win.dispatchEvent(new win.CustomEvent('semesta:admin-view-change',{detail:{view:'world'}}));assert.equal(frame,null,'Leaving production pauses preview');
click('[data-command="add-cast"]');await flush();assert.ok(q('[data-cast="c"]'));assert.equal(host.querySelectorAll('[data-cast]').length,3);
click('[data-remove-cast="c"]');await flush();assert.equal(q('[data-cast="c"]'),null);
change('[data-field="title"]','<img src=x onerror=alert(1)>');assert.equal(host.querySelector('img'),null,'Draft text must never become HTML');
studio.dispose();assert.ok(disposals>=1);studio=mountProductionStudio(host,dependencies);await flush();assert.equal(q('[data-field="title"]').value,'<img src=x onerror=alert(1)>');
click('[data-command="new"]');await flush();assert.equal(q('[data-field="title"]').value,'Day 1');assert.equal(q('[data-command="play"]').disabled,true);assert.equal(q('.ps-empty').hidden,false);
click('[data-command="day1-opening"]');await flush();
assert.equal(host.querySelectorAll('[data-cast]').length,1);assert.equal(q('[data-shot="0"] [data-action="a"] option[selected]').getAttribute('value'),'Dance');assert.equal(q('[data-command="play"]').disabled,false);
change('[data-shot="0"] [data-bpm="a"]','120');
const opening=JSON.parse(localStorage.getItem('semesta.production.workspace.v1'));
assert.equal(opening.shots[0].actors.a.bpm,120);assert.match(opening.notice,/PARODI FIKTIF/);
change('[data-shot="0"] [data-action="a"]','Idle');assert.equal(q('[data-shot="0"] [data-bpm="a"]'),null,'Changing action must remove dance tempo');
click('[data-command="day1-full"]');await flush();assert.equal(host.querySelectorAll('[data-cast]').length,3);assert.equal(host.querySelectorAll('[data-shot]').length,26);
assert.match(q('[data-field="title"]').value,/Republik Wkwkwk/);assert.equal(q('[data-shot="0"] [data-visible="b"]').checked,false);
click('[data-command="play"]');await flush();assert.equal(storyLoads,1);assert.match(q('[data-command="play"]').textContent,/Jeda/);click('[data-command="play"]');
mode='complete';click('[data-command="export"]');await flush();await flush();assert.equal(exportRequest.audio.storyAudio,true,'Built-in voice must reach MP4 encoder');assert.ok(exportRequest.duration>85);assert.equal(storyLoads,1,'Preview and export reuse the same mix');
change('[data-shot="0"] [data-shot-field="caption"]','Narasi yang disunting');assert.equal(JSON.parse(localStorage.getItem('semesta.production.workspace.v1')).shots[0].speech,undefined,'Text edits must not leave mismatched old audio');assert.equal(q('[data-download]').hidden,true);
studio.dispose();await win.happyDOM.close();
console.log('PASS: DOM empty/rehearsal/edit/seek/play/pause/export/cancel/format/cast/draft/reset/XSS/lifecycle. Real browser graphics not exercised.');
