import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {WORLD_DESTINATIONS,WORLD_LANDMASSES,REGIONAL_LAYOUT,CAPITAL_LAYOUT,getRegionalLayout,getWorldPhase,setWorldPhase,projectWorldPoint as canonicalProject} from '../game-src/republic-world-layout.js';
import {mountRepublicAtlas,mountRepublicRegionalMap,regionalLocation,regionalLabelLayout,mountRepublicSitePlan,mountRepublicMinimap,mountPhasePicker,projectWorldPoint,unprojectWorldPoint,mapLocation,sitePlanSvg} from '../game-src/republic-map.js';

const win=new Window({url:'http://localhost/project/'});
for(const name of ['window','document','localStorage','CustomEvent','Event'])Object.defineProperty(globalThis,name,{value:name==='window'?win:win[name],configurable:true});
document.body.innerHTML='<div id="atlas"></div><div id="regional"></div><div id="plan"></div><div id="mini"></div><div id="phase"></div>';
const host=id=>document.getElementById(id);
assert.equal(Object.keys(WORLD_DESTINATIONS).length,5);
assert.equal(WORLD_DESTINATIONS.jakarta.name,'Jakartawa');
assert.equal(WORLD_LANDMASSES.length,3);assert.equal(Object.values(WORLD_DESTINATIONS).filter(city=>city.landmass==='mainland').length,3);
assert.equal(getWorldPhase(),'before-day2');
let destination,location,phase;
const atlas=mountRepublicAtlas(host('atlas'),{onSelect:id=>destination=id});
assert.equal(host('atlas').querySelectorAll('[data-destination]').length,5);
assert.doesNotMatch(host('atlas').textContent,/\bJakarta\b|\bBandung\b|\bSemarang\b|\bSurabaya\b|\bMakassar\b|Indonesia|Sumatra|Kalimantan/i);
assert.equal(host('atlas').querySelectorAll('[data-landmass]').length,3,'The terrain coastlines draw one mainland and two islands');
for(const city of Object.values(WORLD_DESTINATIONS)){
  const button=host('atlas').querySelector(`[data-destination="${city.id}"]`);assert.match(button.textContent,new RegExp(city.name));
  button.click();assert.equal(destination,city.id);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(Number.parseFloat(button.style.left),city.map.x);assert.equal(Number.parseFloat(button.style.top),city.map.y);
}
const viewport=host('atlas').querySelector('.rm-viewport');viewport.getBoundingClientRect=()=>({width:900,height:500});
host('atlas').querySelector('[data-map-zoom="in"]').click();assert.ok(Number(viewport.dataset.zoom)>1);
host('atlas').querySelector('[data-map-zoom="reset"]').click();assert.equal(Number(viewport.dataset.zoom),1);

const plan=mountRepublicSitePlan(host('plan'),{onSelect:id=>location=id});
const regional=mountRepublicRegionalMap(host('regional'),{onSelect:id=>location=id});
assert.equal(host('regional').querySelectorAll('[data-district]').length,5,'A regional map shows one city and its surroundings, not the national atlas');
for(const city of Object.keys(WORLD_DESTINATIONS)){
  const data=getRegionalLayout(city);regional.update({city});
  assert.equal(host('regional').dataset.city,city);assert.equal(host('regional').querySelectorAll('[data-district]').length,5);
  assert.ok(data.bounds.maxX-data.bounds.minX<REGIONAL_LAYOUT.bounds.maxX-REGIONAL_LAYOUT.bounds.minX);
  assert.deepEqual(new Set(data.districts.map(d=>d.kind)),new Set(['urban','village','countryside','forest','mountains']));
  for(const district of data.districts){assert.equal(district.city,city);const pin=host('regional').querySelector(`[data-district="${district.id}"]`);assert.ok(pin);const projected=projectWorldPoint(district.rect.x,district.rect.z,data.bounds);assert.equal(Number.parseFloat(pin.style.left),projected.x);assert.equal(Number.parseFloat(pin.style.top),projected.y);}
for(const [width,height] of [[340,450],[850,500]]){
  const boxes=regionalLabelLayout(width,height,city);
  for(let i=0;i<boxes.length;i++){
    const a=boxes[i];assert.ok(a.left>=0&&a.right<=width&&a.top>=0&&a.bottom<=height,'Regional names remain inside a desktop or phone map');
    for(const b of boxes.slice(i+1))assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`Readable labels do not overlap: ${a.id}/${b.id}`);
  }
}
}
regional.update({city:'jakarta'});
host('regional').querySelector('[data-district="forest"]').click();assert.equal(location,'forest');assert.deepEqual(regionalLocation('forest').entry,REGIONAL_LAYOUT.districts.find(d=>d.id==='forest').entry);
host('regional').querySelector('[data-map-zoom="in"]').click();assert.ok(regional.getView().scale>1);
host('plan').querySelector('[data-map-zoom="in"]').click();assert.ok(plan.getView().scale>1);
const planZoom=plan.getView().scale;
assert.equal(host('plan').querySelectorAll('[data-plot]').length,24,'Only housing foundations, never completed houses');
assert.equal(host('plan').querySelectorAll('[data-structure][data-built="true"]').length,1,'Only the stage exists before Day 2');
assert.equal(host('plan').querySelectorAll('[data-location]').length,CAPITAL_LAYOUT.zones.length+6);
assert.equal(host('plan').querySelectorAll('[data-story-home]').length,48);
const homes=host('plan').querySelector('.rm-home-search select');assert.equal(homes.options.length,49);homes.value='founder-demian';homes.dispatchEvent(new win.Event('change',{bubbles:true}));assert.equal(location,'founder-demian');assert.equal(mapLocation('jakarta',location).name,'Rumah demian');
assert.equal(host('plan').querySelector('.rm-civic-detail details').open,false,'Five destinations do not cover the map before opening the list');
assert.ok(host('plan').querySelector('[data-game-facility="wisma-warga"]'),'Approved housing extension is distinct from episode structures');
host('plan').querySelector('[data-location="welcome"]').click();assert.equal(location,'welcome');assert.match(mapLocation('jakarta','welcome').description,/Bu Rani/);
host('plan').querySelector('[data-location="wisma"]').click();assert.equal(location,'wisma');assert.deepEqual(mapLocation('jakarta','wisma').entry,{x:38,z:5,yaw:Math.PI});
host('plan').querySelector('[data-location="housing"]').click();assert.equal(location,'housing');
assert.equal(plan.getView().scale,planZoom,'Selecting a plan point preserves zoom');
assert.match(mapLocation('jakarta','housing').tag,/FONDASI/);
plan.update({phase:'after-day2'});
assert.equal(host('plan').querySelectorAll('[data-structure][data-built="true"]').length,3,'After Day 2 adds only Koplak and SPPG');
assert.match(mapLocation('jakarta','koplak','after-day2').tag,/TERBANGUN/);
assert.match(mapLocation('jakarta','education','after-day2').tag,/BELUM DIBANGUN/);
for(const id of ['bandung','semarang','surabaya','makassar']){
  plan.update({city:id});assert.equal(host('plan').querySelectorAll('[data-structure],[data-plot]').length,0);
  assert.match(host('plan').textContent,/BELUM DIBANGUN/);assert.equal(mapLocation(id).id,'wilderness');
}
assert.doesNotMatch(sitePlanSvg(),/production|balai-produksi|school|rumah-warga/i);
for(const {x,z} of [...CAPITAL_LAYOUT.housingPlots,CAPITAL_LAYOUT.stage,CAPITAL_LAYOUT.koplak,CAPITAL_LAYOUT.sppg]){
  const p=projectWorldPoint(x,z);assert.deepEqual(projectWorldPoint(x,z,CAPITAL_LAYOUT.bounds),canonicalProject(x,z));const restored=unprojectWorldPoint(p.x,p.y);assert.ok(Math.abs(restored.x-x)<1e-8&&Math.abs(restored.z-z)<1e-8);
}
let opened=0,openedMode;const mini=mountRepublicMinimap(host('mini'),{onOpen:mode=>{opened++;openedMode=mode;}});mini.update({position:{x:4,z:-7},yaw:1});
const marker=host('mini').querySelector('.rm-player-dot'),p=projectWorldPoint(4,-7);assert.equal(Number.parseFloat(marker.style.left),p.x);assert.equal(Number.parseFloat(marker.style.top),p.y);
host('mini').querySelector('button').click();assert.equal(opened,1);assert.equal(openedMode,'city');
const project={id:'jakartawa-home-01',name:'Rumah contoh P01',plotId:'P01',city:'jakarta',depot:{x:22,z:-10},status:'active',required:12,delivered:7,installed:5};
plan.update({city:'jakarta',projects:[project]});mini.update({projects:[project]});
assert.equal(host('plan').querySelector('[data-plot="P01"]').dataset.installed,'5');
assert.equal(host('mini').querySelector('[data-plot="P01"]').dataset.installed,'5','Minimap mirrors shared project progress');
assert.equal(Number.parseFloat(host('mini').querySelector('.rm-player-dot').style.left),p.x,'Project refresh preserves player marker');
assert.match(mapLocation('jakarta','housing','after-day2',[project]).description,/5 dari 12/);
assert.deepEqual(mapLocation('jakarta','housing','after-day2',[project]).entry,{x:22,z:-8,yaw:Math.PI},'Housing entry leads to depot');
plan.update({projects:[{...project,status:'completed',installed:12}]});
assert.equal(host('plan').querySelector('[data-plot="P01"]').dataset.projectStatus,'completed');
assert.equal(host('plan').querySelectorAll('[data-project-status="foundation"]').length,23,'Only project plot changes; remaining homes stay foundations');
assert.match(mapLocation('jakarta','housing','after-day2',[{...project,status:'completed',installed:12}]).description,/kepemilikan dan perabot belum/);
mini.update({city:'bandung',position:WORLD_DESTINATIONS.bandung.spawn,yaw:0});host('mini').querySelector('button').click();assert.equal(openedMode,'regional','The distant player opens the regional map, not a false local capital plan');
const regionalPoint=projectWorldPoint(WORLD_DESTINATIONS.bandung.spawn.x,WORLD_DESTINATIONS.bandung.spawn.z,getRegionalLayout('bandung').bounds);
assert.equal(Number.parseFloat(host('mini').querySelector('.rm-player-dot').style.left),regionalPoint.x);
const picker=mountPhasePicker(host('phase'),{onChange:value=>phase=value});host('phase').querySelector('[data-world-phase="after-day2"]').click();
assert.equal(phase,'after-day2');assert.equal(getWorldPhase(),'after-day2');assert.equal(host('phase').querySelector('[data-world-phase="after-day2"]').getAttribute('aria-pressed'),'true');
setWorldPhase('before-day2');

const html=await readFile(new URL('../application/views/game.php',import.meta.url),'utf8');
assert.doesNotMatch(html,/indonesia-map|productionMapRoute|balai-produksi|map-building-school|village-home|kawasan-warga\.webp\?v=/);
for(const id of ['profileButton','citizenForm','avatarCustomizer','worldScreen','regionScreen','cityScreen','exploreScreen','enterCity','enterLocation','world','republicMinimap','worldPhasePicker','backToWorld','backToWorldFromRegion','backToRegion','backToCity'])assert.ok(html.includes(`id="${id}"`),`Preserve entry/account/navigation ${id}`);
assert.doesNotMatch(html,/data-open-production|production-studio|production-map-player|TONTON EPISODE/,'No production entry or stylesheet exists in public game');
atlas.dispose();regional.dispose();plan.dispose();mini.dispose();picker.dispose();await win.happyDOM.close();
console.log('PASS republic map: 3 landmasses/5 parody cities, city-specific regional bounds/districts + detailed zoom, canonical coordinates, readable phone labels, foundations/phase, no public production and preserved account/navigation DOM.');
