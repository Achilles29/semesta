import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatarV15} from '../game-src/avatar-v15.js';
import {catalog,defaults} from '../game-src/avatar-v15-config.js';
import {metadata} from '../game-src/avatar-arka-v14.js';
const results=[];
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
    const pants=meshes.filter(m=>m.visible&&m.userData.avatarSlot==='bottom'&&m.geometry.attributes.position.count>1000);
    assert.equal(pants.length,1,`${profile.id}/${style}: one complete trouser shell`);
    const points=[],p=new THREE.Vector3();
    for(const mesh of pants){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);points.push(p.clone());
    }}
    const h=profile.sex==='female'?1.68/1.78:1;
    const calf=points.filter(p=>p.x>.03&&p.y>.22*h&&p.y<.35*h);
    assert.ok(calf.length>20,'Sample the actual calf mesh');
    const width=Math.max(...calf.map(p=>p.x))-Math.min(...calf.map(p=>p.x));
    const hem=Math.min(...points.map(p=>p.y));
    assert.ok(hem<.17*h&&hem>.07*h,`${profile.id}/${style}: hem must cover the ankle, ${hem}`);
    section[style]={calfWidth:width,hem};
    if(style==='cargo')assert.ok(meshes.filter(m=>m.visible&&/cargo.*pocket/i.test(m.name)).length>=4,'Two bellows pockets and two flaps');
  }
  console.log(profile.id,section);
  assert.ok(section.straight.calfWidth>section.fitted.calfWidth*1.06,`${profile.id}: straight silhouette must be visibly wider`);
  assert.ok(section.wide.calfWidth>section.straight.calfWidth*1.15,`${profile.id}: wide-leg silhouette must be visibly wider`);
  for(const hat of catalog.hairCoveringHeadwear){
    actor.figure.userData.customization.set({...defaults(),headAccessory:hat,hairStyle:'ponytail'});
    assert.ok(meshes.filter(m=>m.userData.avatarSlot==='hair').every(m=>!m.visible),'Covered hair must not pierce crown');
  }
  for(const topStyle of catalog.coveredTopStyles){
    actor.figure.userData.customization.set({...defaults(),topStyle,outerwearStyle:'longVest',accessoryChest:'on',accessoryWaist:'on'});
    assert.ok(meshes.filter(m=>['outerwear','accessoryChest','accessoryWaist'].includes(m.userData.avatarSlot)).every(m=>!m.visible),'Uniform covers fitted underlayers');
  }
  for(const uniform of ['tactical','camo','civilService','safariWhite']){
    actor.figure.userData.customization.set({...defaults(),topStyle:uniform,bottomStyle:uniform,palette:'indigo'});
    const parts=meshes.filter(m=>m.visible&&['top','bottom'].includes(m.userData.avatarSlot));
    assert.ok(parts.length>5,'Uniform must contain tailored details');
    assert.ok(parts.every(m=>m.userData.avatarFixedColor),'Uniform colour is independent of the casual palette');
    const colors=parts.map(m=>m.material.color.toArray());
    actor.figure.userData.customization.set({palette:'wine'});
    assert.deepEqual(parts.map(m=>m.material.color.toArray()),colors,'Changing palette must preserve white, khaki and camouflage');
    if(uniform==='camo')assert.ok(parts.some(m=>m.material.map),'Camouflage must export an actual base-colour texture');
    assert.ok(section[uniform].calfWidth>=section.straight.calfWidth*.99,'Uniform trousers retain loose cloth volume');
  }
  results.push({profile:profile.id,section});
}
console.log(JSON.stringify({passed:true,profiles:results},null,2));
if(!process.argv[2])await fs.writeFile('ilustrasi/avatar-v2/farmer-v15-proportions/wardrobe-test.json',JSON.stringify({passed:true,profiles:results},null,2));
