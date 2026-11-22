import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatarV15} from '../game-src/avatar-v15.js';
import {catalog,defaults} from '../game-src/avatar-v15-config.js';
import {metadata} from '../game-src/avatar-arka-v14.js';
const results=[];
const skirtStyles=['pencilSkirt','aLineSkirt','miniSkirt'];
const coverageOf=mesh=>typeof mesh.userData.avatarVisibleFor==='string'?JSON.parse(mesh.userData.avatarVisibleFor):mesh.userData.avatarVisibleFor;
function restPoints(mesh){
  const points=[],p=new THREE.Vector3();mesh.skeleton.update();
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
    mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);points.push(p.clone());
  }
  return points;
}
function shellPrimitives(mesh){
  // One exported garment can contain smaller cuff/reflector primitives. Include
  // them when measuring the hem instead of stopping at the main cloth material.
  const parent=mesh.parent;
  if(parent?.isGroup&&parent.userData.avatarVariantGroup==='bottomStyle'){
    return parent.children.filter(child=>child.isSkinnedMesh);
  }
  return [mesh];
}
// glTF splits vertices at UV seams. Weld positions for the connectivity audit
// so one sewn skirt is not mistaken for disconnected triangles at that seam.
function connectedComponents(mesh){
  const positions=mesh.geometry.attributes.position,keys=new Map(),welded=[];
  for(let i=0;i<positions.count;i++){
    const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
    if(!keys.has(key))keys.set(key,keys.size);
    welded.push(keys.get(key));
  }
  const parents=Array.from({length:keys.size},(_,i)=>i);
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const link=(a,b)=>{parents[find(a)]=find(b);};
  const index=mesh.geometry.index,count=index?.count||positions.count;
  const vertex=i=>welded[index?index.getX(i):i];
  for(let i=0;i<count;i+=3){link(vertex(i),vertex(i+1));link(vertex(i),vertex(i+2));}
  return new Set(parents.map((_,i)=>find(i))).size;
}
for(const profile of catalog.profiles.filter(p=>!process.argv[2]||p.id===process.argv[2])){
  const bytes=await fs.readFile(`ilustrasi/avatar-v2/farmer-v15-proportions/${profile.id}/avatar.glb`);
  const loader=new GLTFLoader();loader.register(()=>({name:'CPU_TEXTURE_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const actor=createAvatarV15(THREE,gltf),meshes=[];
  assert.equal(metadata(gltf.scene,'avatarVariationRevision'),catalog.variationRevision,'Runtime must use current wardrobe geometry');
  actor.mixer.stopAllAction();actor.figure.traverse(n=>{if(n.isSkinnedMesh){meshes.push(n);n.skeleton.pose();}});actor.figure.updateMatrixWorld(true);
  const section={};
  for(const style of Object.keys(catalog.fields.bottomStyle.options)){
    actor.figure.userData.customization.set({...defaults(),bottomStyle:style});
    const garments=meshes.filter(m=>m.visible&&m.userData.avatarSlot==='bottom'&&m.geometry.attributes.position.count>1000);
    assert.equal(garments.length,1,`${profile.id}/${style}: one complete garment shell`);
    const points=garments.flatMap(shellPrimitives).flatMap(restPoints);
    const h=profile.sex==='female'?1.68/1.78:1;
    const hem=Math.min(...points.map(p=>p.y));
    if(skirtStyles.includes(style)){
      const bone=name=>actor.figure.getObjectByName(name+'L')||actor.figure.getObjectByName(name+'.L');
      const hip=bone('thigh').getWorldPosition(new THREE.Vector3()).y;
      const knee=bone('calf').getWorldPosition(new THREE.Vector3()).y;
      const aboveKnee=hem-knee;
      assert.ok(hem<hip-.18*h,`${profile.id}/${style}: skirt must cover the upper thigh`);
      assert.ok(aboveKnee>-.065*h&&aboveKnee<.20*h,`${profile.id}/${style}: intended knee/above-knee hem, ${aboveKnee}`);
      if(style==='miniSkirt')assert.ok(aboveKnee>.055*h,'Stage skirt is shorter than the office silhouettes.');
      assert.equal(connectedComponents(garments[0]),1,`${profile.id}/${style}: a skirt must be one connected shell, not two trouser legs`);
      const lower=points.filter(p=>p.y<hem+.04*h);
      assert.ok(lower.some(p=>p.x<-.08*h)&&lower.some(p=>p.x>.08*h),'Skirt hem must surround both legs.');
      assert.ok(lower.some(p=>Math.abs(p.x)<.025*h&&p.z>.06*h)&&lower.some(p=>Math.abs(p.x)<.025*h&&p.z<-.04*h),'A joined front and back must bridge the space between the legs.');
      const coverage=meshes.filter(m=>m.visible&&coverageOf(m)?.bottomStyle?.includes(style));
      assert.ok(coverage.length,`${profile.id}/${style}: leg coverage mesh is required below the skirt`);
      const legs=coverage.flatMap(restPoints);
      assert.ok(Math.min(...legs.map(p=>p.y))<hem-.15*h&&Math.max(...legs.map(p=>p.y))>hem+.025*h,'Skin must extend both below and inside the hem.');
      for(const sign of [-1,1])assert.ok(legs.filter(p=>p.x*sign>.025*h&&p.y<hem).length>20,'Both lower legs need visible skin geometry.');
      section[style]={hem,aboveKnee,connectedShell:true,legCoverageVertices:legs.length};
      continue;
    }
    assert.ok(meshes.filter(m=>coverageOf(m)?.bottomStyle).every(m=>!m.visible),`${profile.id}/${style}: skirt-only skin must hide under trousers`);
    const calf=points.filter(p=>p.x>.03&&p.y>.22*h&&p.y<.35*h);
    assert.ok(calf.length>20,'Sample the actual calf mesh');
    const width=Math.max(...calf.map(p=>p.x))-Math.min(...calf.map(p=>p.x));
    assert.ok(hem<.17*h&&hem>.07*h,`${profile.id}/${style}: hem must cover the ankle, ${hem}`);
    section[style]={calfWidth:width,hem};
    if(style==='cargo')assert.ok(meshes.filter(m=>m.visible&&/cargo.*pocket/i.test(m.name)).length>=4,'Two bellows pockets and two flaps');
  }
  console.log(profile.id,section);
  assert.ok(section.straight.calfWidth>section.fitted.calfWidth*1.025,`${profile.id}: regular straight retains more calf room than tapered`);
  assert.ok(section.wide.calfWidth>section.straight.calfWidth*1.15,`${profile.id}: wide-leg silhouette must be visibly wider`);
  assert.ok(section.slim.calfWidth<section.fitted.calfWidth*.96,'Slim must differ from regular tapered');
  assert.ok(section.jeansSlim.calfWidth<section.jeans.calfWidth*.95,'Denim has two actual fits');
  assert.ok(section.civilService.calfWidth<section.relaxed.calfWidth*.85,'PNS is regular, not baggy');
  assert.ok(section.miniSkirt.hem>section.pencilSkirt.hem+.07,'Stage skirt and office skirt must have distinct lengths.');
  assert.ok(section.aLineSkirt.hem>section.pencilSkirt.hem,'A-line hem stays distinct from the pencil cut.');
  for(const hat of catalog.hairCoveringHeadwear){
    actor.figure.userData.customization.set({...defaults(),headAccessory:hat,hairStyle:'ponytail'});
    assert.ok(meshes.filter(m=>m.userData.avatarSlot==='hair').every(m=>!m.visible),'Covered hair must not pierce crown');
  }
  const peci=meshes.find(m=>m.userData.avatarVariant==='peci');
  assert.equal(peci.userData.avatarFitRevision,'scalp-peci-1');
  assert.ok(peci.userData.avatarFitClearance>.003&&peci.userData.avatarFitClearance<.007);
  actor.figure.userData.customization.set({...defaults(),headAccessory:'peci',faceShape:'prabowow'});
  const bounds=new THREE.Box3(),v=new THREE.Vector3();peci.skeleton.update();
  for(let i=0;i<peci.geometry.attributes.position.count;i++)bounds.expandByPoint(peci.getVertexPosition(i,v).applyMatrix4(peci.matrixWorld));
  const scalp=new THREE.Box3();
  for(const skin of meshes.filter(m=>m.userData.avatarSlot==='skin')){skin.skeleton.update();for(let i=0;i<skin.geometry.attributes.position.count;i++){skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld);if(v.y>=bounds.min.y+.004&&v.y<=bounds.min.y+.025)scalp.expandByPoint(v);}}
  assert.ok(!scalp.isEmpty(),'Measure the actual scalp at the cap band');
  for(const axis of ['x','z']){const clearance=(bounds.max[axis]-bounds.min[axis])-(scalp.max[axis]-scalp.min[axis]);assert.ok(clearance>0&&clearance<.035,`${profile.id}: peci must fit scalp, ${axis} extra ${clearance}`);}
  const weights=peci.geometry.attributes.skinWeight,indices=peci.geometry.attributes.skinIndex;
  for(let i=0;i<weights.count;i++){assert.equal(weights.getX(i),1);assert.equal(peci.skeleton.bones[indices.getX(i)].name,'head','Peci must follow the head without slipping during gestures');}
  for(const topStyle of catalog.coveredTopStyles){
    actor.figure.userData.customization.set({...defaults(),topStyle,outerwearStyle:'longVest',accessoryChest:'on',accessoryWaist:'on'});
    assert.ok(meshes.filter(m=>['outerwear','accessoryChest','accessoryWaist'].includes(m.userData.avatarSlot)).every(m=>!m.visible),'Uniform covers fitted underlayers');
  }
  for(const uniform of ['tactical','camo','civilService','safariWhite','police','racing','firefighter','pilot']){
    actor.figure.userData.customization.set({...defaults(),topStyle:uniform,bottomStyle:uniform,palette:'indigo'});
    const parts=meshes.filter(m=>m.visible&&['top','bottom'].includes(m.userData.avatarSlot));
    assert.ok(parts.length>5,'Uniform must contain tailored details');
    assert.ok(parts.every(m=>m.userData.avatarFixedColor),'Uniform colour is independent of the casual palette');
    const colors=parts.map(m=>m.material.color.toArray());
    actor.figure.userData.customization.set({palette:'wine'});
    assert.deepEqual(parts.map(m=>m.material.color.toArray()),colors,'Changing palette must preserve white, khaki and camouflage');
    if(uniform==='camo')assert.ok(parts.some(m=>m.material.map),'Camouflage must export an actual base-colour texture');
    assert.ok(section[uniform].calfWidth>=section.slim.calfWidth*1.04,'Formal and utility trousers keep more room than slim fit');
  }
  results.push({profile:profile.id,section});
}
console.log(JSON.stringify({passed:true,profiles:results},null,2));
if(!process.argv[2])await fs.writeFile('ilustrasi/avatar-v2/farmer-v15-proportions/wardrobe-test.json',JSON.stringify({passed:true,profiles:results},null,2));
