import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WORLD_DESTINATIONS,WORLD_LANDMASSES,REGIONAL_LAYOUT,WORLD_DISTRICTS,WORLD_ROUTES,getRegionalLayout,shoreDistance,WORLD_PHASE_KEY,CAPITAL_LAYOUT,getWorldPhase,setWorldPhase,projectWorldPoint,terrainHeight,terrainChunkKeys,moveWorldPosition,worldFloorHeight} from '../game-src/republic-world-layout.js';
import {createCapitalContext,createRepublicTerrainStream} from '../game-src/republic-capital-scene.js';
import {worldResidents,worldAvatarConfig,WORLD_RESIDENT_LIMIT,clampWorldZoom,worldLabelVisible} from '../game-src/republic-openworld.js';
import {DAY2_ANCHORS} from '../game-src/production-day2-set.js';
import {validateAvatarConfig} from '../game-src/avatar-v15-config.js';

const storage={value:null,getItem(key){assert.equal(key,WORLD_PHASE_KEY);return this.value;},setItem(key,value){assert.equal(key,WORLD_PHASE_KEY);this.value=value;}};
assert.equal(getWorldPhase(storage),'before-day2');setWorldPhase('after-day2',{storage,source:'canonical-day2-completed'});assert.equal(getWorldPhase(storage),'after-day2');
assert.equal(JSON.parse(storage.value).source,'canonical-day2-completed');setWorldPhase('before-day2',{storage});assert.equal(getWorldPhase(storage),'before-day2');
storage.value='{broken';assert.equal(getWorldPhase(storage),'before-day2');assert.equal(getWorldPhase({getItem(){throw Error('Blocked storage');}}),'before-day2');
assert.deepEqual(Object.keys(WORLD_DESTINATIONS),['jakarta','bandung','semarang','surabaya','makassar']);
assert.deepEqual(Object.values(WORLD_DESTINATIONS).map(d=>d.name),['Jakartawa','Bandunggul','Semarame','Surabawow','Makasabar']);
assert.equal(WORLD_LANDMASSES.length,3);assert.equal(Object.values(WORLD_DESTINATIONS).filter(d=>d.landmass==='mainland').length,3);
for(const d of Object.values(WORLD_DESTINATIONS))assert.equal(terrainHeight(d.spawn.x,d.spawn.z),0,'Global city spawn stays on level land');
for(const m of WORLD_LANDMASSES)for(const [x,z] of m.outline)assert.ok(Math.abs(shoreDistance(x,z))<1e-9,'Atlas coastline comes from the actual terrain shoreline');
for(const route of WORLD_ROUTES)for(let j=1;j<route.points.length;j++){const a=route.points[j-1],b=route.points[j];for(let n=0;n<=60;n++){const x=a[0]+(b[0]-a[0])*n/60,z=a[1]+(b[1]-a[1])*n/60;assert.ok(terrainHeight(x,z)>=0,'Road never crosses sea or an invented bridge');}}
assert.equal(terrainHeight(700,-1000),-3,'Sea separates Semarame from mainland');
assert.equal(clampWorldZoom(.01),2.2);assert.equal(clampWorldZoom(100),24);assert.equal(clampWorldZoom(8),8);assert.equal(clampWorldZoom(NaN),7.2);
assert.ok(worldLabelVisible({distance:9,screenX:.3}));assert.ok(!worldLabelVisible({distance:24,screenX:0}));assert.ok(!worldLabelVisible({distance:4,screenX:.9}));assert.ok(!worldLabelVisible({distance:4,screenX:0,self:true}));
for(const city of Object.keys(WORLD_DESTINATIONS)){const region=getRegionalLayout(city);assert.equal(region.city,city);assert.equal(new Set(region.districts.map(d=>d.kind)).size,5,'Every city region exposes urban, village, countryside, forest and mountains');assert.ok(region.districts.every(d=>d.city===city));assert.ok(region.bounds.maxX-region.bounds.minX<2000,'Regional viewport is not the national atlas');for(const d of region.districts){assert.ok(terrainHeight(d.entry.x,d.entry.z)>=0,'District entrance is on physical land');assert.ok(d.entry.x>=region.bounds.minX&&d.entry.x<=region.bounds.maxX&&d.entry.z>=region.bounds.minZ&&d.entry.z<=region.bounds.maxZ);}}
assert.equal(CAPITAL_LAYOUT.housingPlots.length,24);assert.equal(CAPITAL_LAYOUT.housingPlots.reduce((s,p)=>s+p.capacity,0),48);
assert.deepEqual(projectWorldPoint(CAPITAL_LAYOUT.bounds.minX,CAPITAL_LAYOUT.bounds.minZ),{x:0,y:0});assert.deepEqual(projectWorldPoint(CAPITAL_LAYOUT.bounds.maxX,CAPITAL_LAYOUT.bounds.maxZ),{x:100,y:100});
for(const key of ['stage','koplak','sppg']){assert.equal(CAPITAL_LAYOUT[key].x,DAY2_ANCHORS[key][0]);assert.equal(CAPITAL_LAYOUT[key].z,DAY2_ANCHORS[key][2]);}

const scene=new THREE.Scene(),geometries=new Set(),materials=new Set(),textures=new Set(),context=createCapitalContext({parent:scene,geometries,materials,textures,includeCore:true});
const visible=o=>{if(!o)return false;for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const find=name=>context.root.getObjectByName(name),snapshot=()=>{const values=[];context.root.traverse(o=>values.push([o.name,visible(o),...o.position.toArray(),...o.quaternion.toArray()]));return values;};
assert.equal(context.phase,'before-day2');assert.ok(visible(find('Day2WelcomeStage')));assert.ok(!visible(find('Koplak_name')));assert.ok(!visible(find('SPPG_name')));assert.ok(!visible(find('Day2Excavator')));assert.ok(!visible(find('Day2DonationBoard')));
assert.equal(context.root.getObjectByName('CapitalHousingFoundations').children.length,24);
assert.ok(!find('FinishedHouse'),'Foundations are not secretly complete houses');
const before=snapshot();context.setPhase('after-day2');assert.ok(visible(find('Koplak_name')));assert.ok(visible(find('SPPG_name')));assert.ok(visible(find('Koplak_checkout')));assert.ok(!visible(find('Day2Excavator')));assert.ok(!find('Day2DonationBoard'),'Public civic geometry excludes episode donation props');
assert.ok(context.colliders.some(c=>c.name?.includes('finished_wall')),'Finished walls have actual collisions');
assert.equal(context.colliders.filter(c=>c.name==='Koplak_retail_shelf').length,3);assert.equal(context.colliders.filter(c=>c.name==='SPPG_stainless_worktop').length,3,'Worktop fixtures also obstruct walking');
const collisionOptions=()=>({colliders:context.colliders,surfaces:context.surfaces,city:'jakarta'});
// Front door is a physical gap and a .24m floor step, not a solid building box.
let p={x:2.7,y:0,z:-3.3};p=moveWorldPosition(p,{x:0,z:-2},collisionOptions());assert.ok(p.z< -5&&Math.abs(p.y-.24)<1e-9,'Koplak entrance is traversable');
const rear=moveWorldPosition({x:2.7,y:.24,z:-8.8},{x:0,z:-3},collisionOptions());assert.ok(rear.z> -9.5,'Rear wall prevents walking through the building');
const sppg=moveWorldPosition({x:-5.4,y:0,z:-5},{x:0,z:-2.5},collisionOptions());assert.ok(sppg.z< -7&&Math.abs(sppg.y-.24)<1e-9,'SPPG front entrance is traversable');
const upstairs=moveWorldPosition({x:-1.1,y:0,z:-.3},{x:-4,z:0},collisionOptions());assert.ok(upstairs.x< -4.9&&Math.abs(upstairs.y-.615)<1e-9,'Four real .15m stairs lead onto stage');
const noClimb=moveWorldPosition({x:-5,y:0,z:1.2},{x:0,z:-2},collisionOptions());assert.ok(noClimb.z>=.5,'A .6m stage edge is not an invisible ramp');
assert.equal(worldFloorHeight(-5,-1,collisionOptions()),.615);
context.setPhase('before-day2');assert.deepEqual(snapshot(),before,'Phase seeks restore exact geometry/prop state');
assert.ok(!context.colliders.some(c=>c.name?.includes('finished_wall')),'Future walls do not obstruct the initial empty site');
const production=createCapitalContext({includeCore:false});production.root.updateMatrixWorld(true);assert.ok(!production.root.getObjectByName('Day2WelcomeStage'),'Production context cannot duplicate the stage');
const ray=new THREE.Raycaster(new THREE.Vector3(4,10,-7),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(production.root.getObjectByName('RepublicLandform')).length,0,'Backdrop cannot fill filmed excavation holes');
const roadRay=new THREE.Raycaster(new THREE.Vector3(50,10,10),new THREE.Vector3(0,-1,0));const flatLand=roadRay.intersectObject(production.root.getObjectByName('RepublicLandform'));assert.ok(flatLand.length&&Math.abs(flatLand[0].point.y+.002)<1e-6,'Flat backdrop meets road bases within two millimetres');
assert.equal(production.root.children.filter(o=>o.name.startsWith('RepublicDistantIsland_')).length,0,'Cities share one continuous global terrain');
assert.equal(production.root.children.filter(o=>o.name.startsWith('RegionalRoute_')).length,WORLD_ROUTES.length);
const roadMeshes=production.root.children.filter(o=>o.name.startsWith('RegionalRoute_'));
assert.equal(new Set(WORLD_ROUTES.map(road=>road.elevation)).size,WORLD_ROUTES.length,'Crossing road surfaces cannot be coplanar');
for(const city of Object.values(WORLD_DESTINATIONS).filter(city=>city.id!=='jakarta')){
  const {x,z}=city.spawn,hits=new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0)).intersectObjects(roadMeshes);
  assert.ok(hits.length&&Math.abs(hits[0].point.y-worldFloorHeight(x,z))<1e-6,'The walking floor follows the highest visible road at each city junction');
}
assert.ok(!context.occluders.some(o=>o.userData.backgroundTerrain),'Background terrain is not scanned for every character label');
assert.equal(find('SPPG_official_BGN_emblem').userData.source,'https://www.bgn.go.id/logo-bgn.png');

let meshCount=0;context.root.updateMatrixWorld(true);context.root.traverse(o=>{if(o.isMesh){meshCount++;assert.ok(geometries.has(o.geometry));assert.ok(o.matrixWorld.elements.every(Number.isFinite));for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});assert.ok(meshCount<1900,`Shared city mesh budget ${meshCount}`);
const stream=createRepublicTerrainStream({parent:scene});assert.ok(stream.update(0,0));assert.equal(stream.count,25);assert.equal(stream.update(4,6),false);assert.equal(new Set(terrainChunkKeys(0,0)).size,25);
let disposedChunks=0;for(const chunk of stream.chunks.values())chunk.geometry.addEventListener('dispose',()=>disposedChunks++);
stream.update(640,640);assert.equal(stream.count,25);assert.equal(disposedChunks,25,'Evicted terrain GPU geometry is disposed');
assert.ok(stream.colliders.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.z)));
stream.dispose();stream.dispose();assert.equal(stream.count,0);assert.equal(stream.root.parent,null);
assert.equal(terrainHeight(0,0),0);assert.equal(terrainHeight(104,-82),0);assert.ok(terrainHeight(2500,0)<-.17,'The remote coast is physical water');
const distant=moveWorldPosition({x:260,y:terrainHeight(260,100),z:100},{x:4,z:1});assert.ok(distant.x>263,'Exploration is not clamped to the planning/map rectangle');
const wallSlide=moveWorldPosition({x:0,y:0,z:0},{x:8,z:5},{colliders:[{minX:1,maxX:2,minZ:-10,maxZ:10,maxY:4}]});assert.ok(wallSlide.x<1&&wallSlide.z>4.9,'Swept steps prevent tunneling while allowing sliding');

const roster=worldResidents();assert.equal(roster.length,1,'Episode cast must not crowd public exploration');assert.equal(roster[0].id,'pasca-bowow');assert.ok(WORLD_RESIDENT_LIMIT>=roster.length);
for(const c of roster){assert.ok(c.name&&c.role);validateAvatarConfig(worldAvatarConfig(c));assert.ok(Number.isFinite(c.home.x)&&Number.isFinite(c.home.z));}
for(const city of Object.keys(WORLD_DESTINATIONS).filter(id=>id!=='jakarta')){assert.equal(worldResidents(city).length,1,'Walking to the capital reveals only the deliberate NPC');const marker=find('FutureCityLandmark_'+city);assert.ok(marker);const d=WORLD_DESTINATIONS[city];assert.equal(marker.position.x,d.center.x);assert.equal(marker.position.z,d.center.z);assert.ok(!marker.getObjectByName('Day2WelcomeStage'),'Planned city has no duplicated capital');}

context.dispose();context.dispose();assert.equal(context.root.parent,null);production.dispose();for(const sets of [{geometries,materials,textures},production.resources])for(const set of Object.values(sets))for(const resource of set)resource.dispose();
console.log(`Republic world PASS: ${meshCount} shared meshes; one intentional NPC and no episode crowd, 24 foundations, phase continuity, entrances/stairs/collision, distant land and 25 bounded streamed chunks.`);
