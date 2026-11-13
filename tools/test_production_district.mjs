import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PRODUCTION_DISTRICT as site,PRODUCTION_CAST,insideProductionDistrict,productionReserved,productionEntry} from '../game-src/production-district.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {getDefaultWorldScene} from '../game-src/world-assets-3d-v2.js';
import {createHumanModel,setFarmerAsset} from '../game-src/avatar-character-3d.js';

assert.deepEqual(productionEntry(site.id,'kota'),site.spawn);
for(const region of ['desa','hutan'])assert.equal(productionEntry(site.id,region),null);
assert.equal(productionEntry('kampung','kota'),null);
assert.ok(insideProductionDistrict(site.spawn.x,site.spawn.z));
assert.ok(!insideProductionDistrict(0,18));
assert.equal(new Set(PRODUCTION_CAST.map(c=>c.id)).size,6);
const original=getDefaultWorldScene('kota');const snapshot=JSON.stringify(original);
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');setFarmerAsset(asset);
const sourceEyes=asset.scene.getObjectByName('Face_EyeWhite_L').geometry;
const sourceEyePositions=Array.from(sourceEyes.attributes.position.array);
const world=new THREE.Group(),colliders=[];
const result=buildProductionDistrict(THREE,{
  world,makeHuman(parent,options){const model=createHumanModel(THREE,options);parent.add(model.figure);return model;},
  makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},
  addCollider(x,z,halfX,halfZ,kind){const c={x,z,halfX,halfZ,kind};colliders.push(c);return c;},
  createWorldAsset(){return new THREE.Group();},
});
assert.equal(result.cast.length,6);assert.equal(JSON.stringify(original),snapshot);
assert.deepEqual(Array.from(sourceEyes.attributes.position.array),sourceEyePositions,'Portrait refinements never modify shared player geometry');
for(const id of ['bahlil','mama-ghufron']){
 const model=result.cast.find(n=>n.id===id).model;
 assert.notEqual(model.figure.getObjectByName('Face_EyeWhite_L').geometry,sourceEyes);
 assert.equal(model.figure.userData.productionPortrait.revision,'reference-study-v7');
}
const bahlil=result.cast.find(n=>n.id==='bahlil');
assert.equal(bahlil.model.figure.getObjectByName('BahlilCroppedHair').parent,bahlil.model.head);
assert.ok(bahlil.model.figure.getObjectByName('HighHairline').geometry.attributes.position.count>100);
assert.equal(result.neighborhood.extras.length,8);
assert.equal(result.neighborhood.buildings.length,5);
for(const extra of result.neighborhood.extras){
  assert.deepEqual(extra.model.figure.userData.appearance.warnings,[],extra.id);
  assert.ok(extra.model.actions.Idle&&extra.model.actions.Walk&&extra.model.actions.Interact);
}
result.updateAtmosphere(17);
const crowdSnapshot=result.neighborhood.extras.map(e=>[e.root.position.x,e.root.position.z,e.root.rotation.y]);
result.updateAtmosphere(50);result.updateAtmosphere(17);
assert.deepEqual(result.neighborhood.extras.map(e=>[e.root.position.x,e.root.position.z,e.root.rotation.y]),crowdSnapshot,'Crowd replays deterministically');
for(let t=0;t<90;t+=.5){
  result.updateAtmosphere(t);
  for(const e of result.neighborhood.extras){
    assert.ok(e.root.position.z<-102,'Extras never cross the foreground dialogue');
    assert.equal(e.collider.x,e.root.position.x);
    assert.ok([e.root.position.x,e.root.position.z,e.root.rotation.y].every(Number.isFinite));
  }
}
result.updateLabels(5.5);
assert.ok(result.cast.every(npc=>npc.root.children.filter(c=>c.isSprite).every(c=>!c.visible)));
result.updateLabels(24);
assert.ok(result.cast.every(npc=>npc.root.children.filter(c=>c.isSprite).every(c=>c.visible)));
for(const npc of result.cast){
  assert.ok(insideProductionDistrict(npc.root.position.x,npc.root.position.z));
  assert.deepEqual(npc.model.figure.userData.appearance.warnings,[],npc.id);
  assert.ok(npc.model.actions.Idle && npc.model.actions.Walk,npc.id);
  npc.model.mixer.update(.25);
  assert.ok(npc.lines.every(l=>typeof l==='string'&&l.length>0));
}
const ghufron=result.cast.find(n=>n.id==='mama-ghufron');
assert.equal(ghufron.model.figure.getObjectByName('MamaGhufronLongHair').parent,ghufron.model.head);
assert.equal(ghufron.model.figure.userData.appearance.headwear,'peci');
assert.equal(ghufron.model.figure.getObjectByName('Headwear_Peci').visible,true,'Peci remains visible with long hair');
const longHair=ghufron.model.figure.getObjectByName('MamaGhufronLongHair');
assert.ok(longHair.visible && longHair.children.length>=10,'Long locks remain present under the peci');
for(const clip of ['Idle','Walk','Interact']){
  ghufron.model.mixer.stopAllAction();ghufron.model.actions[clip].reset().play();ghufron.model.mixer.update(.35);
  ghufron.model.figure.updateMatrixWorld(true);
  assert.equal(longHair.parent,ghufron.model.head,`Long hair follows the animated head in ${clip}`);
  assert.ok(longHair.matrixWorld.elements.every(Number.isFinite));
  assert.ok(ghufron.model.figure.getObjectByName('Headwear_Peci').visible);
}
const blocked=(x,z)=>colliders.some(c=>Math.hypot(Math.max(Math.abs(x-c.x)-c.halfX,0),Math.max(Math.abs(z-c.z)-c.halfZ,0))<.38);
assert.ok(!blocked(site.spawn.x,site.spawn.z),'spawn clear');
for(const npc of result.cast)assert.ok(!blocked(npc.root.position.x,npc.root.position.z+2.2),`preview ${npc.id} clear`);
for(let i=1;i<site.route.length;i++){
  const a=site.route[i-1],b=site.route[i],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let step=0;step<=Math.ceil(distance*4);step++){
    const t=step/Math.ceil(distance*4),x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
    assert.ok(!blocked(x,z),`route blocked at ${x},${z}`);
    assert.ok(productionReserved(x,z),`tree reservation at ${x},${z}`);
  }
}
// Validate the route against the existing/default town and the current read-only API layout.
const dims={house:[3.4,2.8],house_village:[4.1,4.6],house_mid:[4.7,4.1],school_ruined:[7,6],sppg:[10.4,6.1],kopdes:[4.2,3],market:[2.8,2.2],hall:[5.2,4.6],tree:[.55,.55],tree_canopy:[.7,.7],lamp:[.25,.25],car_family:[2.45,1.2]};
function checkTown(entries){
  for(const e of entries){
    if(!dims[e.type])continue;
    const angle=(e.rotation||0)*Math.PI/180,s=e.scale||1,[w,d]=dims[e.type];
    const hx=(Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*d)*s,hz=(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*d)*s;
    for(let i=1;i<site.route.length;i++)for(let t=0;t<=1;t+=.005){
      const a=site.route[i-1],b=site.route[i],x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      assert.ok(Math.hypot(Math.max(Math.abs(x-e.x)-hx,0),Math.max(Math.abs(z-e.z)-hz,0))>=.38,`town blocker: ${e.id}`);
    }
  }
}
checkTown(original);
if(process.env.TEST_LOCAL_API==='1'){
  const response=await fetch('http://localhost/project/api?resource=world_scene&region=kota');assert.ok(response.ok);
  checkTown((await response.json()).objects);
}
const voice=JSON.parse(readFileSync('public/audio/produksi/episode-002/voice-plan.json','utf8'));
assert.equal(voice.status,'generated-awaiting-listening-review');assert.equal(voice.cues.length,19);
assert.ok(voice.cues.every(c=>PRODUCTION_CAST.some(p=>p.id===c.role)&&readFileSync(`public/audio/produksi/episode-002/${c.audio}`).toString('ascii',0,4)==='RIFF'));
assert.ok(voice.cues[0].spoken_text.includes('wekawekaweka'));
const source=readFileSync('game-src/main.js','utf8');
assert.ok(readFileSync('application/views/game.php','utf8').includes("base_url('game-src/production-district.css?v='"));
assert.ok(!source.includes("import './production-district.css'"),'Keep the original base stylesheet fallback intact');
assert.ok(source.includes('playerPosition: productionEntry(location, region)'));
assert.ok(source.includes('savedState.location === place.type'));
assert.ok(source.includes('runToken !== areaRunToken'));
assert.ok(source.includes('npcCharacters.push(...production.cast)'));
console.log('PASS: separate district, two-way walkable route, no old scene mutation, clear spawn and six preview positions, six V11 cast with no appearance warnings, animated long hair, 19 archived WAV cues.');
