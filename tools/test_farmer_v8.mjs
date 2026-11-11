import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHumanModel, setFarmerAsset } from '../game-src/avatar-character-3d.js';
import { isFarmerV8, normalizeFarmerAppearance } from '../game-src/avatar-farmer-v8.js';

const input=process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : new URL('../ilustrasi/avatar-v2/farmer-v8-modular/farmer-v8-modular.glb',import.meta.url);
const root=new URL('./',input);
const bytes=await fs.readFile(input);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.ok(isFarmerV8(gltf.scene));
setFarmerAsset(gltf);
const a=createHumanModel(THREE,{ps2Farmer:true});
const b=createHumanModel(THREE,{ps2Farmer:true});
const find=(figure,name)=>{const object=figure.getObjectByName(name);assert.ok(object,`Missing ${name}`);return object;};
const bySlot=(figure,slot)=>{const result=[];figure.traverse(n=>{if(n.userData.avatarSlot===slot)result.push(n);});return result;};
const shader=(figure,channel)=>{let mat;figure.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.userData.avatarColor===channel)mat=m;});assert.ok(mat,channel);return mat;};
const initial=shader(b.figure,'skin').color.getHex();
const sourceColor=shader(gltf.scene,'skin').color.getHex();
const aSkin=find(a.figure,'Body_Skin');const bSkin=find(b.figure,'Body_Skin');
assert.equal(aSkin.geometry,bSkin.geometry,'Geometry should be shared');
assert.notEqual(aSkin.skeleton,bSkin.skeleton,'Skeleton instances must be independent');
assert.notEqual(aSkin.skeleton.bones[0],bSkin.skeleton.bones[0]);
assert.notEqual(shader(a.figure,'skin'),shader(b.figure,'skin'));
a.figure.userData.setAppearance({outfit:'tee',headwear:'none',accessory:'none',gloves:'none',hairStyle:'none',skin:'#704020',shirt:'#258050'});
for(const slot of ['outfit','headwear','accessory','hair'])for(const n of bySlot(a.figure,slot)){
  const choice=slot==='outfit'?'tee':'none';
  assert.equal(n.visible,(n.userData.avatarChoices||[n.userData.avatarChoice]).includes(choice),`Visibility ${slot}/${n.name}`);
}
assert.ok(find(a.figure,'Hands_Bare').visible);assert.ok(!find(a.figure,'Hands_WorkGloves').visible);
assert.equal(shader(a.figure,'skin').color.getHexString(),'704020');
assert.equal(shader(b.figure,'skin').color.getHex(),initial);assert.equal(shader(gltf.scene,'skin').color.getHex(),sourceColor);
assert.ok(bySlot(b.figure,'headwear').filter(n=>n.userData.avatarChoice==='cap').every(n=>n.visible));
// Exhaustive garment/hair/accessory cross product advertised by this asset.
const capabilities=a.figure.userData.avatarCapabilities;
let combinations=0;
for(const outfit of capabilities.outfit)for(const headwear of capabilities.headwear)for(const accessory of capabilities.accessory)for(const gloves of capabilities.gloves)for(const hairStyle of capabilities.hairStyle){
  const p={outfit,headwear,accessory,gloves,hairStyle};const resolved=a.figure.userData.setAppearance(p);
  assert.equal(resolved.warnings.length,0);
  for(const slot of ['outfit','headwear','accessory','gloves','hair'])for(const n of bySlot(a.figure,slot))assert.equal(n.visible,(n.userData.avatarChoices||[n.userData.avatarChoice]).includes(p[slot==='hair'?'hairStyle':slot]));
  for(const slot of ['headwear','accessory','hair'])if(p[slot==='hair'?'hairStyle':slot]!=='none')assert.ok(bySlot(a.figure,slot).some(n=>n.visible),`Empty advertised slot: ${slot}`);
  assert.notEqual(find(a.figure,'Hands_Bare').visible,find(a.figure,'Hands_WorkGloves').visible);
  combinations++;
}
assert.ok(normalizeFarmerAppearance({outfit:'unsupported',headwear:'helm'}).warnings.length===2);
assert.equal(normalizeFarmerAppearance({topStyle:'kaos',headwear:'tanpa'}).outfit,'tee');
assert.equal(normalizeFarmerAppearance({topStyle:'petani',headwear:'topi'}).headwear,'cap');
let facialCombinations=0;
if(capabilities.faceShape){
  const dict=a.figure.userData.avatarMorphs;
  for(const [field,values] of Object.entries(dict))for(const name of Object.values(values)){
    let changed=false;
    a.figure.traverse(n=>{const index=n.morphTargetDictionary?.[name];if(index===undefined)return;
      const attr=n.geometry.morphAttributes.position[index];
      if(attr.array.some(value=>Math.abs(value)>1e-6))changed=true;
    });
    assert.ok(changed,`Missing or empty morph ${field}/${name}`);
  }
  for(const faceShape of capabilities.faceShape)for(const eyeStyle of capabilities.eyeStyle)for(const noseStyle of capabilities.noseStyle)for(const mouthStyle of capabilities.mouthStyle){
    const p={faceShape,eyeStyle,noseStyle,mouthStyle};a.figure.userData.setAppearance(p);
    a.figure.traverse(n=>{
      if(!n.morphTargetDictionary)return;
      for(const [field,values] of Object.entries(dict))for(const [option,name] of Object.entries(values)){
        const index=n.morphTargetDictionary[name];if(index!==undefined)assert.equal(n.morphTargetInfluences[index],p[field]===option?1:0);
      }
    });
    facialCombinations++;
  }
  a.figure.userData.setAppearance({faceShape:'round',eyeStyle:'round',noseStyle:'upturned',mouthStyle:'grin',skin:'#704020'});
  b.figure.traverse(n=>{if(n.morphTargetInfluences)assert.ok(n.morphTargetInfluences.every(v=>v===0),'Morph leaked into another instance');});
  gltf.scene.traverse(n=>{if(n.morphTargetInfluences)assert.ok(n.morphTargetInfluences.every(v=>v===0),'Morph leaked into source asset');});
  const serialized=JSON.parse(JSON.stringify(a.figure.userData.appearance));
  assert.deepEqual(a.figure.userData.setAppearance(serialized),serialized,'Appearance JSON roundtrip');
  assert.equal(shader(a.figure,'skin').color.getHexString(),'704020');
  assert.ok(normalizeFarmerAppearance({skin:'not-a-color'},capabilities).warnings.length===1);
  assert.ok(!gltf.animations.some(clip=>clip.tracks.some(track=>track.name.includes('morphTargetInfluences'))),'Body animation must not overwrite facial customization');
}
a.figure.userData.setAppearance({});
let vertices=0,triangles=0,meshes=0,maxWeightError=0;
a.figure.traverse(n=>{
  if(!n.isMesh)return;meshes++;
  const g=n.geometry;vertices+=g.attributes.position.count;triangles+=(g.index?.count||g.attributes.position.count)/3;
  assert.ok(n.isSkinnedMesh,`Unskinned ${n.name}`);
  const w=g.attributes.skinWeight;const indices=g.attributes.skinIndex;
  for(let i=0;i<w.count;i++){
    const sum=w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i);maxWeightError=Math.max(maxWeightError,Math.abs(sum-1));
    assert.ok(Math.abs(sum-1)<.0001,`Unnormalized ${n.name}:${i}`);
    for(let j=0;j<4;j++)assert.ok(indices.array[i*4+j]<n.skeleton.bones.length);
  }
});
const expected=['Idle','Walk','Run','Interact','Wave','Hoe','Watering','Harvest'];
assert.deepEqual([...Object.keys(a.actions)].sort(),[...expected].sort());
const samples=[];const point=new THREE.Vector3();let sampledVertices=0;
for(const clip of gltf.animations){
  a.mixer.stopAllAction();a.actions[clip.name].reset().play();
  const box=new THREE.Box3();
  for(let i=0;i<=24;i++){
    a.actions[clip.name].time=clip.duration*i/24;a.mixer.update(0);a.figure.updateMatrixWorld(true);
    a.figure.traverse(n=>{
      if(!n.isSkinnedMesh)return;n.skeleton.update();
      for(let v=0;v<n.geometry.attributes.position.count;v++){
        n.getVertexPosition(v,point);point.applyMatrix4(n.matrixWorld);
        assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z));
        assert.ok(point.length()<3.3,`Exploded skin ${clip.name}/${n.name}/${v}`);box.expandByPoint(point);sampledVertices++;
      }
    });
  }
  samples.push({clip:clip.name,frames:25,min:box.min.toArray(),max:box.max.toArray()});
}
// Uniform body/boot ankle weights: seam boundary must follow the same calf bone.
for(const n of ['Boot_Upper_L','Boot_Upper_R','Trouser_Cuff_L','Trouser_Cuff_R']){
  const mesh=find(a.figure,n);const pos=mesh.geometry.attributes.position;
  const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
  for(let i=0;i<pos.count;i++)if(pos.getY(i)>.30){
    let calf=0;for(let c=0;c<4;c++)if(mesh.skeleton.bones[indices.array[i*4+c]].name.startsWith('calf'))calf+=weights.array[i*4+c];
    assert.ok(calf>.999,`Ankle seam weight ${n}`);
  }
}
const report={passed:true,engine:THREE.REVISION,contract:'semesta-farmer-v8-legacy19',slotCombinations:combinations,facialCombinations,
  independentMaterialAndSkeletonInstances:true,meshes,vertices,triangles,maxWeightError,sampledVertices,animations:samples,
  limits:'Numerical skinning smoke test, not a guarantee of artistic quality or collision-free every-frame cloth. Review PNGs and WebGL preview.'};
await fs.writeFile(new URL('runtime-test.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
