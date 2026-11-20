import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFarmerV8 } from '../game-src/avatar-farmer-v8.js';
import { createCastPerformance } from '../game-src/production-performance.js';
const folder=new URL('../ilustrasi/avatar-v2/farmer-v13-body/',import.meta.url);
async function load(path){const bytes=await fs.readFile(path);return {bytes,asset:await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')};}
const {bytes,asset}=await load(new URL('farmer-v13-body.glb',folder));
const {asset:previous}=await load(new URL('../ilustrasi/avatar-v2/farmer-v12-expression/farmer-v12-expression.glb',import.meta.url));
const opts={outfit:'tee',headwear:'none',accessory:'none',gloves:'none',bodyType:'slender',mouthStyle:'neutral'};
const a=createFarmerV8(THREE,asset,opts),b=createFarmerV8(THREE,asset,opts),old=createFarmerV8(THREE,previous,opts);
const meshes=[];a.figure.traverse(n=>{if(n.isMesh)meshes.push(n);});
const bones=[];a.figure.traverse(n=>{if(n.isBone)bones.push(n);});assert.equal(bones.length,49);
const hand=a.figure.userData.handController;assert.ok(hand);assert.ok(a.figure.userData.expressionController);
for(const name of ['Sit','Point','Hold'])assert.ok(a.actions[name]);
let legacySamples=0,maxLegacyDrift=0,maxPreservedDrift=0;
for(const clip of previous.animations)for(const phase of [0,.25,.5,.75,1]){
  for(const model of [a,old]){model.mixer.stopAllAction();model.actions[clip.name].reset().play();model.actions[clip.name].time=clip.duration*phase;model.mixer.update(0);model.figure.updateMatrixWorld(true);}
  for(const key of ['handL','handR','head','back']){
    const x=a.figure.userData.getAttachment(key).matrixWorld.elements,y=old.figure.userData.getAttachment(key).matrixWorld.elements;
    const delta=Math.max(...x.map((v,i)=>Math.abs(v-y[i])));maxLegacyDrift=Math.max(maxLegacyDrift,delta);
    // Report migration drift explicitly. Task-specific clips may be deliberately refined.
    if(!['Walk','Run'].includes(clip.name)){maxPreservedDrift=Math.max(maxPreservedDrift,delta);assert.ok(delta<.0001,`Legacy attachment changed: ${clip.name}/${key} ${delta}`);}
    legacySamples++;
  }
}
a.mixer.stopAllAction();a.figure.updateMatrixWorld(true);
const other=[];b.figure.traverse(n=>{if(n.isBone)other.push([n,n.quaternion.toArray()]);});
const morphology=meshes.map(n=>[...(n.morphTargetInfluences||[])]);
const wrist=a.figure.userData.getAttachment('handL').quaternion.clone();
let vertexSamples=0;const point=new THREE.Vector3();
for(const pose of Object.keys(hand.contract.poses)){
  hand.update({pose});a.figure.updateMatrixWorld(true);
  for(const m of meshes.filter(n=>n.visible&&n.name.startsWith('Hands'))){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,point);assert.ok(Number.isFinite(point.length())&&point.length()<2);vertexSamples++;}}
  assert.ok(wrist.equals(a.figure.userData.getAttachment('handL').quaternion));
}
for(const [bone,q] of other)assert.deepEqual(bone.quaternion.toArray(),q,'Finger gesture leaked across instances');
for(let i=0;i<meshes.length;i++)assert.deepEqual(meshes[i].morphTargetInfluences||[],morphology[i],'Gesture changed identity');
hand.update({pose:'point'});const index=a.figure.getObjectByName('index01L'),middle=a.figure.getObjectByName('middle01L');assert.ok(index.quaternion.angleTo(middle.quaternion)>.2,'Point must separate index from other fingers');
hand.reset();
const restJoints=new Map(Object.keys(hand.contract.bones).map(name=>{const bone=a.figure.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));return [name,{position:bone.position.clone(),quaternion:bone.quaternion.clone()}];}));
let fittedPivotChecks=0,gripFitSamples=0,referenceGripOffset;
const bare=meshes.find(n=>n.name==='Hands_Bare');assert.ok(bare);
for(const bodyFrame of ['male','female'])for(const bodyType of a.figure.userData.avatarCapabilities.bodyType){
  a.figure.userData.setAppearance({...opts,bodyFrame,bodyType});
  const key=a.figure.userData.avatarBodyMorphs[`${bodyFrame}/${bodyType}`];
  hand.update({pose:'open'});a.figure.updateMatrixWorld(true);bare.skeleton.update();
  const palmCenter=new THREE.Vector3();let palmVertices=0;
  for(let i=0;i<bare.geometry.attributes.position.count;i++){
    bare.getVertexPosition(i,point).applyMatrix4(bare.matrixWorld);
    if(point.x>.25&&point.y>.73&&point.y<.78){palmCenter.add(point);palmVertices++;}
  }
  assert.ok(palmVertices>10);palmCenter.divideScalar(palmVertices);
  const gripOffset=a.figure.userData.getGrip('handL').getWorldPosition(new THREE.Vector3()).sub(palmCenter);
  if(!referenceGripOffset)referenceGripOffset=gripOffset.clone();
  assert.ok(gripOffset.distanceTo(referenceGripOffset)<.012,'Grip socket must follow morphed palm');gripFitSamples++;
  for(const pose of ['open','point','grip']){
    hand.update({pose});
    for(const [name,info] of Object.entries(hand.contract.bones)){
      const bone=a.figure.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)),rest=restJoints.get(name);
      const offset=new THREE.Vector3(...info.bodyOffsets[key]);
      const actual=offset.clone().applyQuaternion(bone.quaternion).add(bone.position);
      const expected=offset.clone().applyQuaternion(rest.quaternion).add(rest.position);
      assert.ok(actual.distanceTo(expected)<1e-7,`Body-fitted finger pivot ${key}/${name}/${pose}`);fittedPivotChecks++;
    }
  }
}
a.figure.userData.setAppearance(opts);hand.reset();
// A pause/switch must not retain the sitting pelvis or a previous hand override.
for(const name of ['Sit','Hold','Idle']){a.mixer.stopAllAction();a.actions[name].reset().play();a.mixer.update(0);}
old.mixer.stopAllAction();old.actions.Idle.reset().play();old.mixer.update(0);
a.figure.updateMatrixWorld(true);old.figure.updateMatrixWorld(true);
assert.ok(a.figure.userData.getAttachment('handL').getWorldPosition(new THREE.Vector3()).distanceTo(old.figure.userData.getAttachment('handL').getWorldPosition(new THREE.Vector3()))<.00001);
// Verify baked stance against the declared path, and calculate actual sole heights.
let locomotion;asset.scene.traverse(n=>{if(n.userData.avatarLocomotion)locomotion=JSON.parse(n.userData.avatarLocomotion);});assert.ok(locomotion);
const gait=[];
for(const [name,data] of Object.entries(locomotion)){
  let maxTargetError=0,minSoleHeight=Infinity,maxStanceSoleHeight=-Infinity,stanceSamples=0;
  a.mixer.stopAllAction();const action=a.actions[name].reset().play();
  const count=Math.round(data.duration*24);
  for(let frame=0;frame<count;frame++){
    action.time=frame/24;a.mixer.update(0);a.figure.updateMatrixWorld(true);
    for(const [side,offset] of [['L',0],['R',.5]]){
      const phase=(frame/count+offset)%1;if(phase>=data.stanceFraction)continue;
      const foot=a.figure.getObjectByName('foot'+side);const p=foot.getWorldPosition(new THREE.Vector3());
      const expectedZ=data.strideDistance/2-data.strideDistance*phase/data.stanceFraction;
      maxTargetError=Math.max(maxTargetError,Math.abs(p.y-.133),Math.abs(p.z-expectedZ));
      for(const mesh of meshes.filter(n=>n.name.startsWith('Sandal_Sole')&&n.name.includes(side))){
        mesh.skeleton.update();let minimum=Infinity;
        for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,point.y);}
        minSoleHeight=Math.min(minSoleHeight,minimum);maxStanceSoleHeight=Math.max(maxStanceSoleHeight,minimum);
      }
      stanceSamples++;
    }
  }
  assert.ok(maxTargetError<.002,`Foot stance path ${name}: ${maxTargetError}`);
  assert.ok(minSoleHeight>-.004&&maxStanceSoleHeight<.004,`Sole ground contact ${name}: ${minSoleHeight}..${maxStanceSoleHeight}`);
  gait.push({clip:name,stanceSamples,maxTargetError,minSoleHeight,maxStanceSoleHeight,recommendedForwardSpeed:data.recommendedForwardSpeed});
}
// Production cue reaches both the face and the hand extension on the same actor.
const npc={id:'v13',model:a};const performance=createCastPerformance(THREE,[npc]);
performance.update(npc,{handPose:'grip',expression:'happy',viseme:'AA'});
assert.ok(meshes.some(n=>n.morphTargetInfluences?.[n.morphTargetDictionary?.expr_jawOpen]>.5));
performance.dispose();
const visible=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;};
const active=meshes.filter(visible);
const morphArrays=new Set(active.flatMap(n=>(n.geometry.morphAttributes.position||[]).map(a=>a.array)));
const morphPositionBytes=[...morphArrays].reduce((sum,a)=>sum+a.byteLength,0);
const report={passed:true,bytes:bytes.length,bones:bones.length,clips:asset.animations.map(c=>c.name),activeTriangles:active.reduce((s,n)=>s+(n.geometry.index?.count||n.geometry.attributes.position.count)/3,0),estimatedDrawCalls:active.reduce((s,n)=>s+Math.max(1,n.geometry.groups.length),0),activeMorphPositionBytes:morphPositionBytes,activeMorphPositionArrays:morphArrays.size,vertexSamples,fittedPivotChecks,gripFitSamples,legacyAttachmentSamples:legacySamples,maxPreservedAttachmentDrift:maxPreservedDrift,maxChangedLocomotionAttachmentDrift:maxLegacyDrift,gait,independentInstances:true,identityPreserved:true,limitations:'CPU checks and draw-call estimates; morph position bytes are decoded arrays, not measured GPU allocation or FPS; not collision certification'};
await fs.writeFile(new URL('hand-test.json',folder),JSON.stringify(report,null,2));console.log(report);
