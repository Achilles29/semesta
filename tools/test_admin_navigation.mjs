import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const php=process.env.PHP_BINARY || (process.platform==='win32'?'C:/xampp/php/php.exe':'php');
const views=['overview','avatars','world','objects','ideas','citizens','visitors','settings'];
const main=readFileSync('game-src/main.js','utf8');
const loadRegion=main.slice(main.indexOf('function loadRegion('),main.indexOf('function loadRegion(')+900);
assert.ok(loadRegion.includes('updateAdminQuery({region})'),'Background region load only changes region');
assert.ok(!loadRegion.includes("set('view'"),'Background editor must not hijack active view');
for(const base of ['http://localhost/project/','http://localhost:8080/project/','http://127.0.0.1/project/','http://localhost/','https://example.test/','http://localhost/project/index.php/']) {
  const result=spawnSync(php,['tools/render_admin_test_fixture.php',base],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); assert.equal(result.stderr,'');
  const html=result.stdout;
  const nav=html.match(/<nav class="admin-nav"[\s\S]*?<\/nav>/)[0];
  for(const view of views) assert.ok(nav.includes(`href="${base}admin/?view=${view}"`),`${view}: ${base}`);
  assert.ok(html.includes('id="avatarStudioModel"')); assert.ok(html.includes('semesta-farmer-v11.glb'));
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('var validViews'));
  const handlers={}, winHandlers={}, storage=new Map(), frames=[], historyEntries=[];
  const makeNode=(view)=>({id:`adminView-${view}`,dataset:{adminView:view},textContent:view,hidden:false,attrs:{},
    classList:{active:false,toggle(key,on){this[key]=on;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
  const sections=views.map(makeNode), links=views.map(makeNode);
  const search={value:'',addEventListener(key,fn){handlers[`search:${key}`]=fn;},focus(){},blur(){}};
  const location=new URL(`${base}admin/?view=world&avatarQ=batik#old`);
  const window={scrollY:0,addEventListener(key,fn){winHandlers[key]=fn;},dispatchEvent(){},scrollTo({top}){this.scrollY=top;}};
  const context={window,location,URL,URLSearchParams,CustomEvent:class {constructor(type,opts){this.type=type;this.detail=opts.detail;}},
    requestAnimationFrame:fn=>frames.push(fn),sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)},
    history:{pushState(state,title,url){historyEntries.push(url.href);location.href=url.href;}},
    document:{querySelectorAll:selector=>selector==='.admin-view'?sections:links,getElementById:()=>search,addEventListener:(key,fn)=>{handlers[key]=fn;}}};
  const flush=()=>{while(frames.length)frames.shift()();};
  vm.runInNewContext(script,context); flush();
  assert.ok(sections[2].classList.active,'Initial deep link');
  for(const view of views) {
    let prevented=false;const target=links[views.indexOf(view)];
    handlers.click({button:0,target:{closest:()=>target},preventDefault(){prevented=true;}});flush();
    assert.ok(prevented);assert.equal(location.pathname,new URL(`${base}admin/`).pathname);
    assert.equal(location.searchParams.get('view'),view);assert.equal(location.searchParams.get('avatarQ'),'batik');assert.equal(location.hash,'');
    assert.equal(target.attrs['aria-current'],'page');assert.equal(sections.filter(n=>n.classList.active).length,1);
  }
  const count=historyEntries.length;window.semestaAdminNavigate('settings','push');flush();assert.equal(historyEntries.length,count,'No duplicate history entry');
  for(const flag of ['ctrlKey','metaKey','shiftKey','altKey']) {
    handlers.click({[flag]:true,button:0,target:{closest:()=>links[1]},preventDefault(){throw Error('Modified link must open natively');}});
    assert.equal(historyEntries.length,count);
  }
  location.search='?view=avatars';winHandlers.popstate();flush();assert.ok(sections[1].classList.active,'Back/forward');
  window.scrollY=275;window.semestaAdminNavigate('world','push');flush();assert.equal(storage.get('semesta.admin.scroll.avatars'),'275');
  search.value='avatars';handlers['search:input']();assert.equal(links.filter(n=>!n.hidden).length,1);
  handlers['search:keydown']({key:'Enter'});flush();assert.equal(location.searchParams.get('view'),'avatars');
}
console.log('PASS: rendered sidebar links and navigation across 6 deployment URLs; all 8 views, deep links, query retention, history, modified clicks, search and per-view scroll. Studio uses V11 asset and model selector.');
