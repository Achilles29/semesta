import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import roster from '../game-src/citizen-roster.json' with {type:'json'};
import designs from '../game-src/citizen-accessory-designs.json' with {type:'json'};
import manifest from '../game-src/avatar-v15-runtime-manifest.json' with {type:'json'};
import {catalog,presets,validateAvatarConfig} from '../game-src/avatar-v15-config.js';
import {attachCitizenAccessories} from '../game-src/citizen-accessories.js';
import {loadAvatarProfile,createHumanModel,disposeAvatar,animateAvatar} from '../game-src/avatar-runtime.js';
import {createAvatarV15} from '../game-src/avatar-v15.js';

const expectedNames = [
  'demian','zizi','arsen','asila','DD','cecil','veysha','azril_zeroeight',
  'climenzo_jr','aku.ardhyy','angel','4ku_fek.smail','tazinho.cc','naraevelync',
  'fale','faikal','sheaza','wkwk','livia','zine','aca','Qiyya','Dinda','Ell',
  'caramella','nopal','Znou','Reva','Xel','Sy4_iii','avdzib','pii','jojo',
  'Atha','ammarhddhhjj3','bisma.1.1.1','Faris','aulia.talita2','ranriany20',
  'resa','frnsisc44','eqa','tio',"damy's",'Muhammad Hatta','Faras','sheena','SANKIBOYy',
];
const {citizens} = roster;
const presetById = new Map(presets.map(p=>[p.id,p]));
const citizenByName = new Map(citizens.map(c=>[c.name,c]));
assert.equal(roster.sourceEntryCount,49);
assert.equal(citizens.length,48);
assert.deepEqual(citizens.map(c=>c.name),expectedNames,'Keep the submitted names and order; merge DD only once.');
assert.equal(new Set(citizens.map(c=>c.id)).size,48);
assert.equal(new Set(citizens.map(c=>c.presetId)).size,48);
assert.equal(citizenByName.size,48);
assert.deepEqual(citizens.filter(c=>c.followStatus==='not_following').map(c=>c.name),['zizi']);
assert.ok(citizens.filter(c=>c.name!=='zizi').every(c=>c.followStatus==='unknown'),'No inferred follower status.');
assert.deepEqual(citizens.filter(c=>c.gender==='unspecified').map(c=>c.name),['arsen','faikal','nopal']);
assert.equal(citizenByName.get('DD').role,'Kapolri');
assert.match(citizenByName.get('DD').requestedRole,/polisi.*KAPOLRI/);
assert.match(citizenByName.get('DD').sourceNotes,/Dua entri/);
assert.match(citizenByName.get('climenzo_jr').requestedRole,/5 T/);
assert.match(citizenByName.get('climenzo_jr').sourceNotes,/bukan verifikasi/);
assert.match(citizenByName.get('Reva').requestedRole,/penghibut/);
assert.match(citizenByName.get('pii').personality,/Jomblo Motor Keliling Republik/);
assert.equal(citizenByName.get('jojo').productionProp,'guitar');

// Preserve the approved art direction when presets are edited later. These are
// role requirements, not a snapshot of every styling choice in the roster.
const appearanceFor=name=>presetById.get(citizenByName.get(name).presetId).config.appearance;
for(const name of ['zizi','DD','tazinho.cc','bisma.1.1.1','Faris','sheena']){
  const a=appearanceFor(name);
  assert.equal(a.topStyle,'police',`${name}: recognizable police uniform`);
  assert.equal(a.bottomStyle,'police');
}
for(const name of ['aku.ardhyy','Xel']){
  const a=appearanceFor(name);
  assert.equal(a.topStyle,'operator');
  assert.equal(a.shoeStyle,'workBoots');
  assert.ok(citizenByName.get(name).accessories.includes('hardhat'));
}
assert.equal(appearanceFor('fale').topStyle,'racing');
assert.equal(appearanceFor('fale').bottomStyle,'racing');
assert.equal(appearanceFor('fale').accessoryWaist,'off','A racing suit must not inherit a bulky leather belt.');
assert.equal(appearanceFor('ammarhddhhjj3').topStyle,'firefighter');
assert.equal(appearanceFor('ammarhddhhjj3').bottomStyle,'firefighter');
assert.equal(appearanceFor('Ell').topStyle,'pilot');
assert.equal(appearanceFor('Ell').bottomStyle,'pilot');
for(const name of ['cecil','Znou','frnsisc44']){
  assert.equal(appearanceFor(name).topStyle,'labcoat');
  assert.ok(citizenByName.get(name).accessories.includes('stethoscope'));
}
const priorityWomen=['angel','naraevelync','Reva','Sy4_iii','jojo','aulia.talita2','livia','aca'];
for(const name of priorityWomen){
  const a=appearanceFor(name);
  assert.ok(['light','warm'].includes(a.skinTone),`${name}: preserve the requested light/warm design direction`);
  assert.ok(['longStraight','longWavy','longPonytail','braided'].includes(a.hairStyle),`${name}: use actual long hair`);
  assert.equal(a.accessoryChest,'off','A harness must not obscure the tailored neckline.');
}
assert.ok(new Set(priorityWomen.map(name=>appearanceFor(name).topStyle)).size>=4,'Stage, office and casual women need distinct wardrobes.');

const profiles = new Set(), visualIdentities = new Set(), usedAccessories = new Set();
for(const citizen of citizens){
  const preset = presetById.get(citizen.presetId);
  assert.ok(preset,`Missing preset for ${citizen.name}`);
  assert.equal(preset.name,citizen.name,'Names must remain available wherever a character is displayed.');
  assert.equal(preset.config.presetId,preset.id);
  assert.deepEqual(validateAvatarConfig(preset.config),preset.config,`${citizen.name}: invalid or incomplete choices`);
  assert.ok(citizen.role?.trim()&&citizen.requestedRole?.trim());
  assert.ok(citizen.designNotes?.length>50&&citizen.personality?.length>30);
  assert.equal(citizen.ageCategory,'adult');
  if(citizen.gender==='unspecified'){
    assert.equal(citizen.genderStatus,'unspecified_provisional_visual');
    assert.equal(citizen.provisionalVisualGender,'male');
  }else{
    assert.equal(citizen.genderStatus,'user_supplied');
    assert.ok(preset.config.profileId.startsWith(citizen.gender+'-'));
  }
  profiles.add(preset.config.profileId);
  visualIdentities.add(JSON.stringify([preset.config.profileId,preset.config.appearance]));
  assert.ok(Array.isArray(citizen.accessories));
  assert.equal(new Set(citizen.accessories).size,citizen.accessories.length);
  for(const kind of citizen.accessories){
    const definition=designs.accessories[kind];
    assert.ok(definition,`${citizen.name}: unrecognized accessory ${kind}`);
    assert.ok(['head','chest'].includes(definition.bone));
    assert.ok(definition.parts.length);
    assert.ok(designs.profiles[preset.config.profileId][definition.bone].every(Number.isFinite));
    usedAccessories.add(kind);
    if(['hardhat','firefighterHelmet'].includes(kind)){
      assert.equal(preset.config.appearance.headAccessory,'none','Do not place a cap inside a helmet.');
      assert.ok(['short','crop','crew','none'].includes(preset.config.appearance.hairStyle));
    }
  }
}
assert.equal(visualIdentities.size,48,'Every citizen needs an individually identifiable visual combination.');
assert.deepEqual([...profiles].sort(),catalog.profiles.map(p=>p.id).sort());
assert.deepEqual([...usedAccessories].sort(),['artistBrooch','firefighterHelmet','hardhat','headset','lapelPin','stethoscope'].sort());
for(const [kind,definition] of Object.entries(designs.accessories)){
  for(const part of definition.parts){
    assert.ok(['box','hemisphere','cylinder','tube','ellipsoid'].includes(part.shape),`${kind}: unsupported shared primitive`);
    assert.match(part.color,/^#[\da-f]{6}$/i);
    for(const key of ['position','rotation','scale'])if(part[key]){
      assert.equal(part[key].length,3);
      assert.ok(part[key].every(Number.isFinite));
    }
    if(part.scale)assert.ok(part.scale.every(n=>n>0));
    if(part.shape==='tube'){
      assert.ok(part.radius>0&&part.points.length>=2);
      assert.ok(part.points.every(point=>point.length===3&&point.every(Number.isFinite)));
    }
  }
}
if(process.argv.includes('--data-only')){
  console.log({passed:true,citizens:48,uniqueVisualConfigs:visualIdentities.size,catalogValidated:true,assetGeometryVerified:false});
  process.exit(0);
}

// Exercise the real GLB skeletons without a browser, server, or GPU. Only image
// decoding is stubbed; meshes, skinning, bones, clips and bind poses are genuine.
const requestedProfile=process.argv.find(arg=>arg.startsWith('--profile='))?.split('=')[1];
if(requestedProfile)assert.ok(catalog.profiles.some(p=>p.id===requestedProfile),'Unknown requested test profile.');
const testProfiles=catalog.profiles.filter(p=>!requestedProfile||p.id===requestedProfile);
const testedCitizens=citizens.filter(c=>testProfiles.some(p=>p.id===presetById.get(c.presetId).config.profileId));
const sourceAssets=process.argv.includes('--source-assets');
globalThis.ProgressEvent ||= class {constructor(type,init){Object.assign(this,{type},init);}};
const originalLoad=GLTFLoader.prototype.loadAsync;
let profilesLoaded=0,attachmentCases=0,rigidFollowCases=0,disposedProps=0,wardrobeCases=0,coverageCases=0,tintCases=0,multiPrimitiveCases=0,footwearCases=0;
GLTFLoader.prototype.loadAsync=async function(url){
  const profileId=Object.keys(manifest).find(id=>new URL(url).pathname.endsWith('/'+manifest[id]));
  assert.ok(profileId,`Unexpected asset request: ${url}`);
  const assetPath=sourceAssets?`../ilustrasi/avatar-v2/farmer-v15-proportions/${profileId}/avatar.glb`:`../public/models/characters/v15/${profileId}.glb`;
  const binary=await fs.readFile(new URL(assetPath,import.meta.url));
  this.register(()=>({name:'CPU_CITIZEN_TEXTURE_STUB',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  profilesLoaded++;
  return this.parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
};
const finiteMatrix=m=>m.elements.every(Number.isFinite);
const matrixClose=(actual,expected,message)=>{
  assert.ok(actual.elements.every((v,i)=>Math.abs(v-expected.elements[i])<1e-7),message);
};
function watchOwned(groups){
  const meshes=groups.flatMap(group=>group.children.filter(n=>n.isMesh));
  return [...new Set(meshes.flatMap(m=>[m.geometry,m.material]))].map(resource=>{
    const record={resource,count:0};
    resource.addEventListener('dispose',()=>record.count++);
    return record;
  });
}
const materialsOf=mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material];
const sameColor=(actual,expected)=>actual.toArray().every((value,i)=>Math.abs(value-expected[i])<1e-6);
const coverageOf=mesh=>typeof mesh.userData.avatarVisibleFor==='string'?JSON.parse(mesh.userData.avatarVisibleFor):mesh.userData.avatarVisibleFor;
function checkMultiPrimitiveGarment(asset){
  // GLTFLoader puts node extras on a Group when a garment has several material
  // primitives. The old bug left every cloth/cuff child visible in other outfits.
  let sourceGroup,fixtureAsset=asset;
  asset.scene.traverse(node=>{
    if(!sourceGroup&&node.isGroup&&node.userData.avatarVariantGroup==='bottomStyle'&&node.children.filter(n=>n.isMesh).length>1)sourceGroup=node;
  });
  if(!sourceGroup){
    // Retain this regression if a future exporter combines the current cuffs.
    // Use real rig/garment geometry with the same Group shape GLTFLoader emits.
    const scene=cloneSkeleton(asset.scene);
    let cloth;
    scene.traverse(n=>{if(!cloth&&n.isSkinnedMesh&&n.userData.avatarVariantGroup==='bottomStyle'&&n.userData.avatarFixedColor)cloth=n;});
    assert.ok(cloth,'A real uniform garment is needed for the multi-primitive fixture.');
    sourceGroup=new THREE.Group();sourceGroup.name='WardrobeMultiPrimitiveRegression';
    sourceGroup.userData={...cloth.userData};
    cloth.parent.add(sourceGroup);sourceGroup.add(cloth);
    const cuff=cloth.clone();
    cloth.name='RegressionCloth';cuff.name='RegressionCuff';
    cloth.userData={};cuff.userData={};
    sourceGroup.add(cuff);
    fixtureAsset={...asset,scene};
  }
  const actor=createAvatarV15(THREE,fixtureAsset);
  const group=actor.figure.getObjectByName(sourceGroup.name);
  const parts=group.children.filter(n=>n.isMesh);
  assert.ok(parts.length>=2,'Exercise separate cloth/cuff drawables, not a single-material mesh.');
  const style=sourceGroup.userData.avatarVariant;
  const other=style==='straight'?'racing':'straight';
  actor.figure.userData.customization.set({bottomStyle:other,palette:'cream'});
  assert.ok(parts.every(n=>!n.visible),'Multi-primitive trousers must disappear when another bottom is selected.');
  actor.figure.userData.customization.set({bottomStyle:style,palette:'cream'});
  assert.ok(parts.every(n=>n.visible),'Selecting the uniform must restore every cloth/cuff primitive.');
  const colors=parts.flatMap(n=>materialsOf(n).map(mat=>({mat,color:mat.color.toArray()})));
  actor.figure.userData.customization.set({palette:'rose'});
  for(const {mat,color} of colors)assert.ok(sameColor(mat.color,color),'Uniform cloth and cuff colors must both survive a casual palette change.');
  actor.figure.userData.customization.set({bottomStyle:other});
  assert.ok(parts.every(n=>!n.visible),'Switching back must not leave a cuff or reflector floating on the next outfit.');
  disposeAvatar(actor);
  multiPrimitiveCases++;
}
function checkWardrobe(actor,citizen,config){
  const meshes=[];
  actor.figure.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push(mesh);});
  const a=config.appearance;
  for(const field of ['topStyle','bottomStyle','shoeStyle','hairStyle']){
    if(a[field]==='none')continue;
    const parts=meshes.filter(m=>m.userData.avatarVariantGroup===field&&m.userData.avatarVariant===a[field]);
    assert.ok(parts.length,`${citizen.name}: selected ${field}=${a[field]} is absent from the actual GLB`);
    assert.ok(parts.every(m=>m.geometry.attributes.position.count>0),`${citizen.name}: empty garment or hair geometry`);
    const hiddenHair=field==='hairStyle'&&catalog.hairCoveringHeadwear.includes(a.headAccessory);
    assert.ok(parts.every(m=>m.visible===!hiddenHair),`${citizen.name}: selected ${field} must have correct visibility`);
    assert.ok(meshes.filter(m=>m.userData.avatarVariantGroup===field&&m.userData.avatarVariant!==a[field]).every(m=>!m.visible),`${citizen.name}: old ${field} variants overlap the selected outfit`);
  }
  const patches=meshes.filter(m=>m.userData.avatarVisibleFor);
  const needsArms=['officeBlazer','fittedBlouse','satinTop','stageTop'].includes(a.topStyle);
  const needsLegs=['pencilSkirt','aLineSkirt','miniSkirt'].includes(a.bottomStyle);
  for(const [field,needed] of [['topStyle',needsArms],['bottomStyle',needsLegs]]){
    // Feet may also be required by an open shoe with trousers. They are a
    // separate region from the leg coverage which only skirts need.
    const relevant=patches.filter(m=>coverageOf(m)[field]&&!coverageOf(m).shoeStyle);
    if(needed)assert.ok(relevant.some(m=>m.visible&&m.geometry.attributes.position.count>0),`${citizen.name}: missing skin beneath open garment ${a[field]}`);
    if(!needed)assert.ok(relevant.every(m=>!m.visible),`${citizen.name}: optional body coverage must switch off with closed clothing`);
    if(needed)coverageCases++;
  }
  const feet=patches.filter(m=>coverageOf(m).shoeStyle?.includes('heels'));
  const needsFeet=needsLegs||a.shoeStyle==='heels';
  assert.ok(feet.length,`${citizen.name}: missing independently selectable foot skin`);
  assert.ok(feet.every(m=>m.visible===needsFeet),`${citizen.name}: foot skin must follow both shoe and skirt coverage`);
  const visible=meshes.filter(m=>m.visible);
  const top=visible.filter(m=>m.userData.avatarSlot==='top');
  const bottom=visible.filter(m=>m.userData.avatarSlot==='bottom');
  const containsColor=(parts,hex)=>parts.some(m=>materialsOf(m).some(mat=>sameColor(mat.color,new THREE.Color(hex).toArray())));
  if(a.topStyle==='operator'){
    assert.ok(containsColor(top,'#F56B20'),'Operator clothing needs the orange safety vest, not just a helmet.');
    assert.ok(containsColor(top,'#DCE3DF'),'The safety vest needs its reflective strip material.');
  }
  if(a.topStyle==='police'){
    assert.ok(containsColor(top,'#A58C72'),'Police shirt must use the approved warm brown.');
    assert.ok(containsColor(bottom,'#30241C'),'Police trousers must remain darker brown.');
  }
  if(a.topStyle==='racing'){
    assert.ok(containsColor(top,'#CB2638')&&containsColor(top,'#ECEFEB'),'The race suit needs red panels and white piping.');
    assert.ok(top.concat(bottom).every(m=>m.userData.avatarFixedColor),'Race livery must not be tinted by casual palettes.');
  }
  const fixed=visible.filter(m=>m.userData.avatarFixedColor).flatMap(m=>materialsOf(m).map(mat=>({mat,color:mat.color.toArray()})));
  const personal=visible.filter(m=>['skin','hair','brows'].includes(m.userData.avatarSlot)).flatMap(m=>materialsOf(m).map(mat=>({mat,color:mat.color.toArray()})));
  const alternative=a.palette==='rose'?'cream':'rose';
  actor.figure.userData.customization.set({palette:alternative});
  for(const {mat,color} of fixed)assert.ok(sameColor(mat.color,color),`${citizen.name}: a casual palette changed a fixed uniform/accessory color`);
  for(const {mat,color} of personal)assert.ok(sameColor(mat.color,color),`${citizen.name}: garment tint leaked into skin/hair`);
  for(const mesh of visible){
    const {avatarSlot:slot,avatarTintMode:mode,avatarFixedColor:fixedColor}=mesh.userData;
    const target=slot==='hair'||slot==='brows'?catalog.hairColors[a.hairColor].absolute:catalog.palettes[alternative].absolute?.[slot];
    if(mode!=='absolute'||fixedColor||!target)continue;
    for(const mat of materialsOf(mesh))assert.ok(sameColor(mat.color,target),`${citizen.name}: ${slot} must use its absolute target, not multiply a previously colored base`);
    tintCases++;
  }
  actor.figure.userData.customization.set({palette:a.palette});
  for(const {mat,color} of fixed.concat(personal))assert.ok(sameColor(mat.color,color),'Restoring a palette must preserve identity and professional colors.');
  wardrobeCases++;
}
function checkFootwearSelections(actor,profileId){
  const customization=actor.figure.userData.customization,original=customization.get();
  const meshes=[];
  actor.figure.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push(mesh);});
  const patches=meshes.filter(mesh=>mesh.userData.avatarVisibleFor);
  const feet=patches.filter(mesh=>coverageOf(mesh).shoeStyle?.includes('heels'));
  const legs=patches.filter(mesh=>coverageOf(mesh).bottomStyle&&!coverageOf(mesh).shoeStyle);
  assert.ok(feet.length&&legs.length,`${profileId}: foot and leg coverage must be independent`);
  for(const foot of feet){
    foot.geometry.computeBoundingBox();
    assert.ok(foot.geometry.attributes.position.count>0&&foot.geometry.boundingBox.max.y<.4,
      `${profileId}: selecting heels must restore feet, not a second full leg/body mesh`);
  }
  customization.set({topStyle:'satinTop',bottomStyle:'fitted',shoeStyle:'heels'});
  assert.ok(feet.every(mesh=>mesh.visible),`${profileId}: heels with trousers need skin in the open instep`);
  assert.ok(legs.every(mesh=>!mesh.visible),`${profileId}: trousers must not enable skirt-only leg skin`);
  coverageCases++;
  const identity=meshes.filter(mesh=>mesh.visible&&['skin','hair','brows'].includes(mesh.userData.avatarSlot))
    .flatMap(mesh=>materialsOf(mesh).map(mat=>({mat,color:mat.color.toArray()})));
  const heelUpper=meshes.filter(mesh=>mesh.visible&&mesh.userData.avatarVariantGroup==='shoeStyle'&&
    mesh.userData.avatarVariant==='heels'&&!mesh.userData.avatarFixedColor);
  const satin=meshes.filter(mesh=>mesh.visible&&mesh.userData.avatarSlot==='top'&&!mesh.userData.avatarFixedColor);
  assert.ok(heelUpper.length&&satin.length,`${profileId}: exercise real configurable shoe and clothing materials`);
  for(const palette of ['indigo','forest','wine']){
    customization.set({palette});
    for(const mesh of heelUpper)for(const mat of materialsOf(mesh)){
      assert.ok(sameColor(mat.color,catalog.palettes[palette].absolute.footwear),
        `${profileId}: ${palette} heels must use absolute.footwear even without a legacy footwear factor`);
    }
    for(const mesh of satin)for(const mat of materialsOf(mesh)){
      assert.ok(sameColor(mat.color,catalog.palettes[palette].absolute.top),
        `${profileId}: shoe tint must not replace the separately selected clothing color`);
    }
    for(const {mat,color} of identity)assert.ok(sameColor(mat.color,color),
      `${profileId}: footwear/clothing palette changes must preserve skin and hair`);
    footwearCases++;
  }
  customization.set({shoeStyle:'dress'});
  assert.ok(feet.every(mesh=>!mesh.visible)&&legs.every(mesh=>!mesh.visible),
    `${profileId}: ordinary closed shoes and trousers must hide optional foot/leg skin`);
  coverageCases++;
  customization.set({bottomStyle:'miniSkirt'});
  assert.ok(feet.every(mesh=>mesh.visible)&&legs.every(mesh=>mesh.visible),
    `${profileId}: skirts still require complete leg/foot coverage with ordinary shoes`);
  coverageCases++;
  customization.set(original);
}
try{
  for(const profile of testProfiles){
    const asset=await loadAvatarProfile(profile.id);
    checkMultiPrimitiveGarment(asset);
    const cohort=citizens.filter(c=>presetById.get(c.presetId).config.profileId===profile.id);
    const actor=createHumanModel(THREE,{avatarConfig:presetById.get(cohort[0].presetId).config});
    checkFootwearSelections(actor,profile.id);
    const baseGeometries=new Set();
    actor.figure.traverse(n=>{if(n.isSkinnedMesh)baseGeometries.add(n.geometry);});
    assert.ok(baseGeometries.size>0);
    let baseDisposals=0;
    const onBaseDispose=()=>baseDisposals++;
    for(const geometry of baseGeometries)geometry.addEventListener('dispose',onBaseDispose);
    // A second actor shares source geometry but must not share role props.
    const survivor=createHumanModel(THREE,{avatarConfig:presetById.get(cohort[0].presetId).config});
    let previous=actor.figure.userData.citizenAccessoryGroups||[];
    let previousResources=watchOwned(previous);
    for(const citizen of cohort){
      const config=presetById.get(citizen.presetId).config;
      const previousId=actor.figure.userData.citizenAccessoryPreset;
      actor.figure.userData.avatarConfig=config;
      actor.figure.userData.customization.set(config.appearance);
      checkWardrobe(actor,citizen,config);
      // Switching after motion has begun must still use bind-pose fitting.
      animateAvatar(actor,1.44,.173);
      attachCitizenAccessories(THREE,actor,citizen.presetId);
      const groups=actor.figure.userData.citizenAccessoryGroups;
      if(previousId!==citizen.presetId){
        for(const group of previous)assert.equal(group.parent,null,'Previous role props must leave the skeleton.');
        for(const record of previousResources){assert.equal(record.count,1,'Removed prop resources must be disposed exactly once.');disposedProps++;}
      }
      assert.equal(groups.length,citizen.accessories.length,`${citizen.name}: missing role accessory`);
      assert.deepEqual(groups.map(g=>g.userData.citizenAccessory),citizen.accessories);
      const stableGroups=[...groups],stableResources=groups.flatMap(g=>g.children.map(m=>m.geometry));
      attachCitizenAccessories(THREE,actor,citizen.presetId);
      assert.deepEqual(actor.figure.userData.citizenAccessoryGroups,stableGroups,'Repeated attachment must be idempotent.');
      assert.deepEqual(groups.flatMap(g=>g.children.map(m=>m.geometry)),stableResources);
      for(const group of groups){
        const definition=designs.accessories[group.userData.citizenAccessory];
        const bone=actor.figure.getObjectByName(definition.bone);
        assert.equal(group.parent,bone);
        assert.ok(bone.isBone&&finiteMatrix(group.matrix));
        let skeleton;
        actor.figure.traverse(n=>{if(!skeleton&&n.isSkinnedMesh)skeleton=n.skeleton;});
        matrixClose(group.matrix,skeleton.boneInverses[skeleton.bones.indexOf(bone)],'Mid-animation switches must fit against the bind pose, not the moving bone pose.');
        assert.equal(group.children.length,definition.parts.length);
        actor.figure.updateMatrixWorld(true);
        const mesh=group.children[0],before=mesh.matrixWorld.clone();
        const relative=bone.matrixWorld.clone().invert().multiply(before);
        const rotation=bone.quaternion.clone();
        bone.rotateZ(.23);
        actor.figure.updateMatrixWorld(true);
        const expected=bone.matrixWorld.clone().multiply(relative);
        matrixClose(mesh.matrixWorld,expected,`${citizen.name}: role prop must follow ${definition.bone} rigidly`);
        assert.ok(mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-before.elements[i])>1e-5),'The prop must actually move with its bone.');
        assert.ok(finiteMatrix(mesh.matrixWorld));
        bone.quaternion.copy(rotation);
        actor.figure.updateMatrixWorld(true);
        matrixClose(mesh.matrixWorld,before,'Restoring the bone must restore accessory placement.');
        rigidFollowCases++;
      }
      assert.equal(baseDisposals,0,'Changing outfits must not dispose shared avatar geometry.');
      previous=groups;
      previousResources=watchOwned(previous);
      attachmentCases++;
    }
    disposeAvatar(actor);
    for(const record of previousResources){assert.equal(record.count,1,'Actor cleanup must dispose its current role props.');disposedProps++;}
    assert.equal(baseDisposals,0,'Actor cleanup must keep shared geometry usable.');
    animateAvatar(survivor,1.44,.2);
    survivor.figure.updateMatrixWorld(true);
    assert.ok(finiteMatrix(survivor.figure.matrixWorld));
    assert.ok(survivor.figure.userData.citizenAccessoryGroups.every(group=>group.parent?.isBone));
    disposeAvatar(survivor);
    assert.equal(baseDisposals,0);
    for(const geometry of baseGeometries)geometry.removeEventListener('dispose',onBaseDispose);
  }
}finally{
  GLTFLoader.prototype.loadAsync=originalLoad;
}
assert.equal(profilesLoaded,testProfiles.length);
assert.equal(attachmentCases,testedCitizens.length);
assert.equal(wardrobeCases,testedCitizens.length);
assert.equal(multiPrimitiveCases,testProfiles.length);
assert.equal(footwearCases,testProfiles.length*3);
if(!requestedProfile)assert.ok(coverageCases>0&&tintCases>0,'Exercise new garment coverage and absolute material tinting on real assets.');
assert.equal(rigidFollowCases,testedCitizens.reduce((sum,c)=>sum+c.accessories.length,0));
console.log({passed:true,catalogCitizens:48,assetCitizens:testedCitizens.length,profiles:profilesLoaded,assetSource:sourceAssets?'authoring-export':'public',wardrobeCases,coverageCases,tintCases,multiPrimitiveCases,footwearCases,accessoryTypes:usedAccessories.size,attachmentCases,rigidFollowCases,disposedPropResources:disposedProps,browserRenderingVerified:false});
