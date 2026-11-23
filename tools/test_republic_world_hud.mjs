import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {worldHudLayout,applyWorldHudLayout,bindRunToggle,WORLD_HUD_CSS} from '../game-src/republic-world-hud.js';

const win=new Window({url:'http://localhost/project/'});
for(const name of ['window','document','Event','CustomEvent'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
const overlaps=(a,b)=>a.x<b.x+b.width-.1&&b.x<a.x+a.width-.1&&a.y<b.y+b.height-.1&&b.y<a.y+a.height-.1;
const cases=[[320,568,true],[360,640,true],[390,844,true],[768,1024,true],[1366,768,false],[640,360,true],[844,390,true],[768,1024,false]];
for(const [width,height,coarse] of cases){
  const layout=worldHudLayout(width,height,{coarse}),r=layout.regions;
  const visible=['header','nav','minimap','online','home','activity','action','chatAction','run','zoom'];
  if(layout.touch)visible.push('joystick');if(!layout.phone&&!layout.landscape&&!layout.touch)visible.push('hint');
  for(const key of visible){const a=r[key];assert.ok(a.x>=0&&a.y>=0&&a.width>0&&a.height>0&&a.x+a.width<=width+.1&&a.y+a.height<=height+.1,`${width}x${height}: ${key} outside viewport`);}
  for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)assert.ok(!overlaps(r[visible[i]],r[visible[j]]),`${width}x${height}: ${visible[i]} overlaps ${visible[j]}`);
  for(const key of ['nav','action','chatAction','run','zoom'])assert.ok(r[key].height>=40,`${key} has a touch-sized target`);
  assert.ok(r.minimap.width>=88,'Minimap stays visible and usable');assert.ok(r.home.height>=60,'Home has its own reserved region');
  const parent=document.createElement('section');applyWorldHudLayout(parent,width,height,{coarse});
  assert.equal(parent.style.getPropertyValue('--rw-minimap-x'),`${r.minimap.x}px`);assert.equal(parent.style.getPropertyValue('--rw-action-y'),`${r.action.y}px`);
  assert.equal(parent.dataset.hudTouch,String(coarse||width<620));
}
const compact=document.createElement('section');compact.innerHTML='<details class="rc-card" open><summary>Proyek</summary><p>Rincian</p></details>';
applyWorldHudLayout(compact,360,640,{coarse:true});assert.equal(compact.firstChild.open,false,'Activity begins compact on a phone');
compact.firstChild.open=true;applyWorldHudLayout(compact,390,844,{coarse:true});assert.equal(compact.firstChild.open,true,'A player opening details is respected on subsequent layout updates');

const style=document.createElement('style');style.textContent=WORLD_HUD_CSS;document.head.append(style);
document.body.classList.add('exploring');const account=document.createElement('header');account.className='game-hud';account.innerHTML='<button class="profile-button">Akun warga</button>';document.body.append(account);
const parent=document.createElement('section');parent.innerHTML='<div class="republic-world-overlay"><button class="rw-run">LARI</button><button class="rw-talk" hidden>Sapa</button><section class="rw-card" hidden>Warga</section><div class="rw-zoom"><button>+</button><button>−</button></div></div><aside class="rm-live-minimap"></aside><section id="citizenChat" hidden></section>';document.body.append(parent);
applyWorldHudLayout(parent,1366,768,{coarse:false});
assert.equal(win.getComputedStyle(account).left,'auto','Account stays right when the hidden brand leaves one flex child');assert.equal(win.getComputedStyle(account).right,'12px');
const run=parent.querySelector('.rw-run'),abort=new AbortController();let enabled=false,paused=false;
const control=bindRunToggle(run,{signal:abort.signal,isPaused:()=>paused,onChange:value=>enabled=value});
assert.notEqual(win.getComputedStyle(run).display,'none','Desktop run button is visible');
assert.equal(win.getComputedStyle(parent.querySelector('.rw-talk')).display,'none');assert.equal(win.getComputedStyle(parent.querySelector('.rw-card')).display,'none');
assert.equal(run.type,'button');assert.equal(run.getAttribute('aria-pressed'),'false');run.click();assert.equal(enabled,true);assert.equal(run.getAttribute('aria-pressed'),'true');
run.dispatchEvent(new Event('pointerup'));assert.equal(enabled,true,'Toggle must not require keeping a finger held down');run.click();assert.equal(enabled,false);
run.click();window.dispatchEvent(new Event('blur'));assert.equal(enabled,false);assert.equal(run.getAttribute('aria-pressed'),'false');
run.click();run.dispatchEvent(new Event('pointercancel'));assert.equal(enabled,false);run.click();assert.equal(enabled,false,'Cancelled gesture cannot trigger a delayed toggle');
run.dispatchEvent(new Event('pointerdown'));run.click();assert.equal(enabled,true);control.reset();assert.equal(enabled,false);
paused=true;run.click();assert.equal(enabled,false);paused=false;run.click();assert.equal(enabled,true);
Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));assert.equal(enabled,false);
abort.abort();run.dispatchEvent(new Event('pointerdown'));run.click();assert.equal(enabled,false,'Disposed handlers no longer change running mode');

const source=await readFile(new URL('../game-src/republic-openworld.js',import.meta.url),'utf8');
assert.match(source,/zoomOut\.textContent='−'/);assert.match(source,/keys\.has\('ShiftLeft'\).*keys\.has\('ShiftRight'\).*runTouch/);
assert.match(source,/if\(interior\|\|formTarget\(e\)\|\|paused\(\)\)return/);assert.match(source,/focusin.*formTarget\(e\).*resetMovement/);
assert.match(source,/document\.hidden\|\|paused\(\).*resetMovement/);assert.match(source,/toolsMenu\.before\(topActions\)/,'Old toolbar DOM restores on dispose');
const construction=await readFile(new URL('../game-src/republic-construction.css',import.meta.url),'utf8');
for(const token of ['--rw-activity-x','--rw-activity-height','--rw-action-x','--rw-action-y'])assert.ok(construction.includes(token));
assert.match(WORLD_HUD_CSS,/#citizenChat:not\(\[hidden\]\).*\.rc-card/,'Chat owns the panel region while open');
await win.happyDOM.close();
console.log('PASS HUD: eight portrait/landscape/pointer layouts without reserved-region collisions, visible minimap/navigation/run, touch targets, toggle/blur/cancel/pause/disposal, form guards and shared action contracts. This is DOM/layout-contract QA, not a browser screenshot.');
