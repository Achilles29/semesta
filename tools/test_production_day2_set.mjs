import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDay2Set,DAY2_ANCHORS} from '../game-src/production-day2-set.js';

const owned=new THREE.Group(),geometries=new Set(),materials=new Set(),textures=new Set();
const set=createDay2Set({owned,geometries,materials,textures});
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
const find=name=>owned.getObjectByName(name);
function cue(progress,props={},id='S16',elapsed=.5,duration=1,interior){return {shot:{id,duration,buildProgress:progress,props,interior},elapsed,actors:{}};}
const actors=new Map();
for(const [id,x] of [['pasca',-5],['climenzo',-3.7],['eqa',-.5],['aulia',1],['sheaza',2],['xel',6],['ardhy',9]]){
  const figure=new THREE.Group();figure.position.set(x,id==='pasca'?.6:0,0);const sockets={};
  for(const [hand,side] of [['handL',-1],['handR',1]]){const socket=new THREE.Object3D();socket.position.set(side*.3,1.1,.3);figure.add(socket);sockets[hand]=socket;}
  figure.userData.getGrip=hand=>sockets[hand];actors.set(id,{figure});
}
function pose(sample){set.pose(sample,sample.elapsed,actors);owned.updateMatrixWorld(true);}
pose(cue(0,{},'S01'));
assert.equal(set.buildings.length,2);
for(const building of set.buildings){assert.ok(!visible(building.getObjectByName(building.userData.building+'_floor_slab')));assert.deepEqual(building.scale.toArray(),[1,1,1]);}
assert.ok(visible(find('StageWoodDeck')));assert.ok(Math.abs(new THREE.Box3().setFromObject(find('StageWoodDeck')).max.y-.6)<1e-9);
assert.ok(!visible(find('ExcavatorVisibleSpoilPile')),'No spoil pile before excavation');
pose(cue(1));assert.ok(visible(find('koplak_stake_0')));assert.ok(!visible(find('koplak_trench_floor_0')));
pose(cue(2));assert.ok(!visible(find('koplak_unbroken_ground_0')));assert.ok(visible(find('koplak_trench_floor_0')));assert.ok(visible(find('ExcavatorVisibleSpoilPile')));
pose(cue(3));assert.ok(visible(find('koplak_foundation_0')));assert.ok(!visible(find('koplak_masonry_0_0')));
pose(cue(4));assert.ok(visible(find('koplak_masonry_0_0')));assert.ok(!visible(find('Koplak_metal_roof_panel_0')));
pose(cue(5));assert.ok(visible(find('Koplak_metal_roof_panel_0')));assert.ok(visible(find('SPPG_pitched_roof_-1_0')));assert.ok(!visible(find('Koplak_name')));
pose(cue(6));assert.ok(visible(find('Koplak_name')));assert.ok(visible(find('SPPG_name')));assert.ok(!visible(find('koplak_masonry_0_0')));assert.ok(!visible(find('Koplak_checkout')));
pose(cue(7));assert.ok(visible(find('Koplak_checkout')));assert.ok(visible(find('SPPG_long_extractor_hood')));
pose(cue(8));assert.ok(!visible(find('Day2WorksiteSupplies')));assert.ok(!visible(find('Day2SafetyBoundary')));assert.ok(visible(find('koplak_apron')));
const koplakRoof=find('koplak_roof'),sppgRoof=find('sppg_roof');
pose(cue(7,{},'S21A',.4,1,'koplak'));assert.ok(!visible(koplakRoof));assert.ok(visible(sppgRoof));assert.ok(visible(find('Koplak_checkout')));assert.ok(!visible(find('koplak_glazing_and_frames')));
pose(cue(8));assert.ok(visible(koplakRoof));assert.ok(visible(find('koplak_glazing_and_frames')),'Leaving an insert restores exterior surfaces');
// One absolute table journey crosses three technical shots without resets.
const endpoints=[];
for(const range of [[0,.3],[.3,.5],[.5,1]])for(const elapsed of [0,1]){pose(cue(8,{table:'moving',tableProgress:range},'S22',elapsed));endpoints.push(set.props.table.position.toArray());}
assert.deepEqual(endpoints[1],endpoints[2]);assert.deepEqual(endpoints[3],endpoints[4]);assert.deepEqual(endpoints[0],DAY2_ANCHORS.stageTable);assert.ok(new THREE.Vector3(...endpoints.at(-1)).distanceTo(new THREE.Vector3(...DAY2_ANCHORS.ceremonyTable))<1e-9);
pose(cue(8,{ribbon:{from:'ready',to:'cut',at:.7,until:.9},scissors:'hand'},'S23',.6));assert.ok(Math.abs(find('RibbonLeft').rotation.z)<1e-9);
pose(cue(8,{ribbon:{from:'ready',to:'cut',at:.7,until:.9},scissors:'hand'},'S23',1));assert.ok(find('RibbonLeft').rotation.z<-.6);assert.ok(find('RibbonRight').rotation.z>.6);
pose(cue(8,{ribbon:'ready'},'S23',0));assert.ok(Math.abs(find('RibbonLeft').rotation.z)<1e-9,'Seeking before cut restores an intact ribbon');
pose(cue(2,{excavator:'digging'},'S16',1.2,5));
assert.ok(actors.get('ardhy').figure.position.distanceTo(set.excavator.operatorAnchor.getWorldPosition(new THREE.Vector3()))<1e-9,'Operator tracks actual cab movement');
assert.ok(actors.get('ardhy').figure.position.y>1&&actors.get('ardhy').figure.position.y<1.3);
pose(cue(2,{excavator:'digging'},'S16',.5,5));
const tooth=set.excavator.bucket.localToWorld(new THREE.Vector3(0,-.32,.72)),trench=new THREE.Box3().setFromObject(find('Koplak_internal_trench'));
assert.ok(tooth.y>trench.max.y&&tooth.y<.05,'Dig tooth stays above trench floor');assert.ok(tooth.x>trench.min.x&&tooth.x<trench.max.x&&tooth.z>trench.min.z&&tooth.z<trench.max.z,'Bucket digs the visible internal foundation trench');
const bucketA=set.excavator.bucket.getWorldPosition(new THREE.Vector3());pose(cue(2,{excavator:'digging'},'S16',3.1,5));const bucketB=set.excavator.bucket.getWorldPosition(new THREE.Vector3());assert.ok(bucketA.distanceTo(bucketB)>1,'Bucket performs a visible lift/slew cycle');
const snapshot=sample=>{pose(sample);const state=[];owned.traverse(o=>state.push([o.name,o.visible,...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]));return state;};
for(const sample of [cue([1,2],{},'S15',.3),cue(2,{excavator:'digging'},'S16',3.1,5),cue(7,{},'S21B',.4,1,'sppg'),cue(8,{table:'moving',tableProgress:[.3,.5]},'S22B',.7),cue(8,{folder:{from:'closed',to:'open',at:.2,until:.8}},'S28',.5)]){
  const expected=snapshot(sample);snapshot(cue(0,{},'S01'));snapshot(cue(8,{ribbon:'cut'},'S29'));assert.deepEqual(snapshot(sample),expected,`Absolute seek ${sample.shot.id}`);
}
let meshes=0;owned.traverse(o=>{if(o.isMesh){meshes++;assert.ok(geometries.has(o.geometry));for(const m of Array.isArray(o.material)?o.material:[o.material])assert.ok(materials.has(m));for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));assert.ok(o.matrixWorld.elements.every(Number.isFinite));}});
assert.ok(meshes>350&&meshes<2200,`Bounded set mesh budget (${meshes})`);assert.ok(geometries.size<40,'Repeated building elements share geometry');
assert.ok(set.occluders.every(o=>o.isMesh&&!o.material.transparent),'Transparent cabin/glass does not incorrectly suppress names');
assert.equal(find('SymbolicDonation').userData.signLines[1],'5 T');assert.equal(find('Koplak_name').userData.signLines[0],'KOPLAK DESA');assert.equal(find('SPPG_name').userData.signLines[0],'SPPG');
console.log(`Day 2 set PASS: ${meshes} meshes, ${geometries.size} geometries; 9 construction states, prop continuity, cabin and seeking.`);
