import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {catalog,presets,defaults,normalizeAvatarConfig,validateAvatarConfig,avatarCharacterOptions} from '../game-src/avatar-v15-config.js';
import {loadAvatarProfile,preloadAvatars,createHumanModel,disposeAvatar,animateAvatar,avatarSpeed} from '../game-src/avatar-runtime.js';
import {FARMER_PRESETS as legacyPresets} from '../game-src/avatar-farmer-presets.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createV15Props} from '../game-src/production-v15-props.js';
globalThis.ProgressEvent ||= class { constructor(type,init){Object.assign(this,{type},init);} };
globalThis.window={SEMESTA_AVATAR_V15_BASE:'http://localhost/project/public/models/characters/v15/'};
globalThis.location=new URL('http://localhost/project/');
const original=GLTFLoader.prototype.loadAsync;let requests=0;
GLTFLoader.prototype.loadAsync=function(url){
  requests++;this.register(()=>({name:'CPU_TEXTURE_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  return original.call(this,url);
};
assert.equal(presets.length,24);assert.equal(new Set(presets.map(p=>p.id)).size,24);
assert.equal(new Set(presets.map(p=>JSON.stringify(p.config.appearance))).size,24);
assert.equal(new Set(presets.map(p=>p.config.profileId)).size,6);
const configs=presets.map(p=>p.config);
for(const p of catalog.profiles)for(const [field,definition] of Object.entries(catalog.fields))for(const value of Object.keys(definition.options))configs.push({model:'v15',profileId:p.id,appearance:{...defaults(),[field]:value}});
configs.push(...legacyPresets.map(p=>normalizeAvatarConfig(p.config)));
const invalid=[{model:'v11',profileId:'male-balanced',appearance:{}},{model:'v15',profileId:'female-unknown',appearance:{}},{model:'v15',profileId:'male-balanced',appearance:{headAccessory:'unreleased'}},{model:'v15',profileId:'male-balanced',appearance:{earShape:true}},{model:'v15',profileId:'male-balanced',appearance:{unknown:'none'}},{...presets[0].config,presetId:'<script>'}];
const php=spawnSync('C:/xampp/php/php.exe',['tools/test_avatar_v15_config.php'],{input:JSON.stringify([...configs,...invalid]),encoding:'utf8',maxBuffer:8*1024*1024});
assert.equal(php.status,0,php.stderr);assert.equal(php.stderr,'');const roundtrips=JSON.parse(php.stdout);
configs.forEach((c,i)=>assert.deepEqual(roundtrips[i],validateAvatarConfig(c),`PHP/JS ${i}`));invalid.forEach((c,i)=>{assert.equal(roundtrips[configs.length+i],false);assert.throws(()=>validateAvatarConfig(c));});
await Promise.all([loadAvatarProfile('male-balanced'),loadAvatarProfile('male-balanced'),preloadAvatars()]);assert.equal(requests,6,'One load per profile, even with concurrent requests');
const fieldMorph={faceShape:'face',eyeShape:'eye',noseShape:'nose',mouthShape:'mouth',earShape:'ear'};let cases=0;
for(const profile of catalog.profiles){
  const a=createHumanModel(THREE,avatarCharacterOptions({model:'v15',profileId:profile.id,appearance:defaults()}));
  const b=createHumanModel(THREE,avatarCharacterOptions({model:'v15',profileId:profile.id,appearance:defaults()}));
  const meshes=[];a.figure.traverse(n=>{if(n.isMesh)meshes.push(n);});
  assert.ok(meshes.every(m=>m.isSkinnedMesh));
  for(const [field,definition] of Object.entries(catalog.fields))for(const value of Object.keys(definition.options)){
    a.figure.userData.customization.set({...defaults(),[field]:value});
    assert.equal(a.figure.userData.customization.get()[field],value);
    assert.deepEqual(b.figure.userData.customization.get(),defaults(),'Instances must not share choices');
    const variantMeshes=meshes.filter(m=>m.userData.avatarVariantGroup===field);
    if(variantMeshes.length){const visible=variantMeshes.filter(m=>m.visible);if(value==='none')assert.equal(visible.length,0);else{assert.ok(visible.length,`${profile.id}/${field}/${value} missing mesh`);assert.ok(visible.every(m=>m.userData.avatarVariant===value));}}
    if(fieldMorph[field]&&value!==definition.default){
      const skin=meshes.find(m=>m.userData.avatarSlot==='skin');const keys=Object.entries(skin.morphTargetDictionary).filter(([k,i])=>k.startsWith('Id_'+fieldMorph[field])&&skin.morphTargetInfluences[i]>0);assert.equal(keys.length,1);
      const morph=skin.geometry.morphAttributes.position[keys[0][1]];assert.ok(Array.from(morph.array).some(v=>Math.abs(v)>1e-5),'Identity must change real vertices');
      a.figure.userData.expressionController.update({expression:'happy',blink:.8});assert.equal(skin.morphTargetInfluences[keys[0][1]],1,'Expression must preserve identity');
    }
    cases++;
  }
  for(const preset of presets.filter(p=>p.config.profileId===profile.id)){
    a.figure.userData.customization.set(preset.config.appearance);
    for(const clip of ['Idle','Walk','Run','Idle']){const speed=clip==='Idle'?0:avatarSpeed(a,clip);animateAvatar(a,speed,.1);assert.equal(a.activeAction,clip);assert.equal(a.actions[a.activeAction].getEffectiveTimeScale(),1);}
    a.figure.updateMatrixWorld(true);
    for(const mesh of meshes.filter(m=>m.visible)){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i+=97){const p=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(p.toArray().every(Number.isFinite));assert.ok(p.length()<3);}}
  }
  disposeAvatar(a);assert.ok(b.figure.children.length);animateAvatar(b,1.44,.1);disposeAvatar(b);
}
await loadAvatarProfile('male-balanced');assert.equal(requests,6,'Disposed actors must not invalidate shared asset cache');
const production=buildProductionDistrict(THREE,{world:new THREE.Group(),makeHuman(parent,options){const actor=createHumanModel(THREE,options);parent.add(actor.figure);return actor;},makeText(){return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1)}));},addCollider(x,z){return {x,z};},createWorldAsset(){return new THREE.Group();}});
const film=createV15Props(THREE,production);
const cast=[...production.cast,...production.neighborhood.extras,...film.extraCast];
for(const person of cast){assert.equal(person.model.figure.userData.avatarConfig.model,'v15');assert.ok(person.model.figure.userData.getGrip('handR'));animateAvatar(person.model,avatarSpeed(person.model),.1);}
production.updateAtmosphere(1);production.updateAtmosphere(2);film.dispose();
for(const person of [...production.cast,...production.neighborhood.extras])disposeAvatar(person.model);
const main=await fs.readFile('game-src/main.js','utf8');assert.ok(main.includes('moveX * movementSpeed * dt'));assert.ok(!main.includes('person.position.y = .025 + Math.abs(step)'));
for(const name of ['main.js','avatar-catalog-thumbnails.js','production-district-scene.js','production-neighborhood.js','production-v14-props.js','production-v15-props.js']){const text=await fs.readFile('game-src/'+name,'utf8');assert.ok(!text.includes("from './avatar-character-3d.js'"));}
const report={passed:true,presets:24,profiles:6,variationCases:cases,phpRoundtrips:configs.length,invalidRejected:invalid.length,assetRequests:requests,productionActors:cast.length,legacyPresetsMigrated:legacyPresets.length,browserInteractionVerified:false,gpuFPSMeasured:false};
await fs.writeFile('ilustrasi/avatar-v2/farmer-v15-proportions/integration-test.json',JSON.stringify(report,null,2));console.log(report);
