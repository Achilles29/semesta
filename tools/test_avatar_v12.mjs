import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFarmerV8 } from '../game-src/avatar-farmer-v8.js';
import { createCastPerformance } from '../game-src/production-performance.js';
const folder=new URL('../ilustrasi/avatar-v2/farmer-v12-expression/',import.meta.url);
const bytes=await fs.readFile(new URL('farmer-v12-expression.glb',folder));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const opts={outfit:'tee',headwear:'none',accessory:'none',gloves:'none',hairStyle:'short',bodyFrame:'male',bodyType:'slender',mouthStyle:'neutral'};
const a=createFarmerV8(THREE,asset,opts),b=createFarmerV8(THREE,asset,opts);
const controller=a.figure.userData.expressionController;assert.ok(controller);
const collect=root=>{const list=[];root.traverse(n=>{if(n.isMesh)list.push(n);});return list;};
const meshes=collect(a.figure),sources=collect(asset.scene),other=collect(b.figure);
const frozen=other.map(n=>[...(n.morphTargetInfluences||[])]);
const identity=meshes.map(n=>Object.entries(n.morphTargetDictionary||{}).filter(([key])=>!key.startsWith('expr_')).map(([key,index])=>[index,n.morphTargetInfluences[index]]));
const point=new THREE.Vector3();let samples=0;
for(const expression of Object.keys(controller.contract.expressions))for(const viseme of Object.keys(controller.contract.visemes)){
  controller.update({expression,viseme,blink:.5,gaze:.5,time:1});
  a.figure.updateMatrixWorld(true);
  for(const n of meshes){
    if(!n.visible)continue;n.skeleton?.update();
    for(let i=0;i<n.geometry.attributes.position.count;i+=7){n.getVertexPosition(i,point);assert.ok(Number.isFinite(point.length())&&point.length()<3);samples++;}
  }
}
for(let i=0;i<meshes.length;i++)for(const [index,value] of identity[i])assert.equal(meshes[i].morphTargetInfluences[index],value,'Expression changed identity');
for(let i=0;i<other.length;i++)assert.deepEqual(other[i].morphTargetInfluences||[],frozen[i],'Expression leaked across instances');
assert.ok(sources.every(n=>(n.morphTargetInfluences||[]).every(v=>v===0)),'Source modified');
const changed=name=>meshes.some(n=>n.morphTargetInfluences?.[n.morphTargetDictionary?.[name]]>0);
controller.update({viseme:'AA',autoBlink:false});assert.ok(changed('expr_jawOpen'));
controller.update({blink:1,autoBlink:false});assert.ok(changed('expr_blinkL')&&changed('expr_blinkR'));assert.ok(!changed('expr_jawOpen'),'Stale viseme');
controller.reset();assert.ok(meshes.every(n=>Object.entries(n.morphTargetDictionary||{}).filter(([k])=>k.startsWith('expr_')).every(([,i])=>n.morphTargetInfluences[i]===0)));
// Production must use the declared facial rig, without adding the old oval.
const npc={id:'test',model:a};const performance=createCastPerformance(THREE,[npc]);
performance.update(npc,{viseme:'OH',visemeWeight:.8,expression:'surprised'});
assert.ok(changed('expr_mouthRound'));assert.equal(a.figure.getObjectByName('SpeechMouth'),undefined);
performance.reset();performance.dispose();
// Existing prop grips depend on hand transforms. Compare every inherited clip
// against V11 at three times, including rotations, not just finite vertices.
const originalBytes=await fs.readFile(new URL('../public/models/characters/semesta-farmer-v11.glb',import.meta.url));
const originalAsset=await new GLTFLoader().parseAsync(originalBytes.buffer.slice(originalBytes.byteOffset,originalBytes.byteOffset+originalBytes.byteLength),'');
const original=createFarmerV8(THREE,originalAsset,opts);let attachmentSamples=0;
for(const clip of asset.animations)for(const phase of [0,.4,.8]){
  for(const actor of [a,original]){actor.mixer.stopAllAction();actor.actions[clip.name].reset().play();actor.mixer.update(clip.duration*phase);actor.figure.updateMatrixWorld(true);}
  for(const bone of ['handL','handR']){
    const x=a.figure.userData.getAttachment(bone).matrixWorld.elements,y=original.figure.userData.getAttachment(bone).matrixWorld.elements;
    assert.ok(x.every((value,i)=>Math.abs(value-y[i])<1e-5),`Prop attachment drift: ${clip.name}/${bone}`);attachmentSamples++;
  }
}
const visible=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;};
const active=meshes.filter(visible);const triangles=active.reduce((sum,n)=>sum+(n.geometry.index?.count||n.geometry.attributes.position.count)/3,0);
const report={passed:true,bytes:bytes.length,activeTriangles:triangles,activeMeshPrimitives:active.length,estimatedDrawCalls:active.reduce((sum,n)=>sum+Math.max(1,n.geometry.groups.length),0),expressionPoseVertexSamples:samples,attachmentSamples,independentInstances:true,identityPreserved:true,legacyMouthNotAdded:true,limitations:'CPU Three.js deformation checks; draw calls estimated from visible primitives, not measured GPU FPS. Expression extremes are not a collision proof.'};
await fs.writeFile(new URL('expression-test.json',folder),JSON.stringify(report,null,2));console.log(report);
