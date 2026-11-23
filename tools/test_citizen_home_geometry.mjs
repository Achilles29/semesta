import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCitizenHomeGeometry,createCitizenRoomGeometry} from '../game-src/citizen-home-geometry.js';
import {HOME_LAYOUT} from '../game-src/citizen-home-layout.js';
import {CAPITAL_LAYOUT,moveWorldPosition,worldFloorHeight,distanceToSegment} from '../game-src/republic-world-layout.js';
import {createRepublicTerrainStream} from '../game-src/republic-capital-scene.js';
import {createWelcomeParcel} from '../game-src/citizen-home-parcel.js';

const scene=new THREE.Scene(),publicHome=createCitizenHomeGeometry({scene});
assert.equal(scene.children.length,1);assert.equal(publicHome.root.name,'CitizenHousingPublic');
assert.equal(publicHome.root.getObjectByName('WismaWarga').position.x,HOME_LAYOUT.x);
assert.equal(publicHome.root.getObjectByName('WargaClerkDesk').position.z,4.7,'Clerk desk is north of the NPC and clear of the arrival road');
const doorway=moveWorldPosition({x:38,y:0,z:3},{x:0,z:-2},{colliders:publicHome.colliders,surfaces:publicHome.surfaces});
assert.ok(doorway.z<1.1,'Entrance is open at avatar height');assert.equal(worldFloorHeight(38,0,{surfaces:publicHome.surfaces}),0,'Room threshold is at flat public ground');
const wall=moveWorldPosition({x:34,y:0,z:3},{x:0,z:-2},{colliders:publicHome.colliders,surfaces:publicHome.surfaces});
assert.ok(wall.z>2,'Visible front wings physically block walking');
const back=moveWorldPosition({x:38,y:0,z:-6},{x:0,z:-3},{colliders:publicHome.colliders,surfaces:publicHome.surfaces});assert.ok(back.z>-7.6,'Back wall cannot be walked through');
for(const collider of publicHome.colliders){
  for(const plot of CAPITAL_LAYOUT.housingPlots)assert.ok(collider.maxX<=plot.x-plot.width/2||collider.minX>=plot.x+plot.width/2||collider.maxZ<=plot.z-plot.depth/2||collider.minZ>=plot.z+plot.depth/2,'Housing must not consume one of the 24 P01–P24 plots');
  for(const road of CAPITAL_LAYOUT.roads){
    for(const [x,z] of [[collider.minX,collider.minZ],[collider.minX,collider.maxZ],[collider.maxX,collider.minZ],[collider.maxX,collider.maxZ]])assert.ok(distanceToSegment(x,z,road.from,road.to)>=road.width/2,'Public furniture and walls leave roads open');
  }
}
assert.ok(publicHome.occluders.some(mesh=>mesh.name==='Gable'));
const reserved={minX:HOME_LAYOUT.x-HOME_LAYOUT.width/2-3,maxX:HOME_LAYOUT.x+HOME_LAYOUT.width/2+3,minZ:HOME_LAYOUT.z-HOME_LAYOUT.depth/2-3,maxZ:HOME_LAYOUT.entrance.z+3};
const stream=createRepublicTerrainStream({parent:scene,reservedBounds:[reserved]});stream.update(38,3);
for(const collider of stream.colliders)assert.ok(collider.x<reserved.minX||collider.x>reserved.maxX||collider.z<reserved.minZ||collider.z>reserved.maxZ,'Streamed trees/rocks cannot spawn in the new lodge');
stream.dispose();
const parcel=createWelcomeParcel({scene}),actor={figure:new THREE.Group()};actor.figure.position.set(9,0,6);actor.figure.rotation.y=Math.PI/2;
parcel.update(actor,true);assert.equal(parcel.root.visible,true);const parcelAt=parcel.root.position.clone();actor.figure.position.x+=3;parcel.update(actor,true);assert.ok(Math.abs(parcel.root.position.x-parcelAt.x-3)<1e-9,'The carried delivery parcel travels with its owner');
parcel.update(actor,false);assert.equal(parcel.root.visible,false);parcel.dispose();parcel.dispose();
const privateScene=new THREE.Scene(),room=createCitizenRoomGeometry({scene:privateScene});
assert.equal(publicHome.root.getObjectByName('CitizenPrivateRoom'),undefined,'Private room geometry never joins the public world');
for(const name of ['BasicBed','BasicDesk','WindowSky','WovenRug','WelcomeShelf'])assert.ok(room.root.getObjectByName(name),name+' exists in the default room');
assert.equal(room.plant.visible,false);room.applyState({decorationPlaced:true});assert.equal(room.plant.visible,true);room.applyState({decorationPlaced:false});assert.equal(room.plant.visible,false);
let slotMeshes=0;room.slot.traverse(object=>{if(object.isMesh){slotMeshes++;assert.equal(object.userData.slotId,HOME_LAYOUT.slotId);}});assert.ok(slotMeshes>5,'Every plant/shelf part can resolve to the same single decoration slot');
const resources=root=>{const geometries=new Set(),materials=new Set();root.traverse(object=>{if(object.isMesh){geometries.add(object.geometry);materials.add(object.material);}});return {geometries,materials};};
let disposedGeometry=0,disposedMaterial=0;const all=[resources(publicHome.root),resources(room.root)];
for(const resource of all){for(const geometry of resource.geometries)geometry.addEventListener('dispose',()=>disposedGeometry++);for(const material of resource.materials)material.addEventListener('dispose',()=>disposedMaterial++);}
publicHome.dispose();publicHome.dispose();room.dispose();room.dispose();
assert.equal(scene.children.length,0);assert.equal(privateScene.children.length,0);assert.equal(publicHome.colliders.length,0);assert.equal(publicHome.occluders.length,0);assert.equal(publicHome.surfaces.length,0);
assert.equal(disposedGeometry,all.reduce((sum,value)=>sum+value.geometries.size,0));assert.equal(disposedMaterial,all.reduce((sum,value)=>sum+value.materials.size,0));
console.log('PASS citizen home geometry: separate public/private scenes, finished room furniture, one slot, walkable entrance, solid walls, ground height, roads/24 plots preserved, resource disposal.');
