/** CPU audit of the actual GLB. Texture upload/GPU rendering is not simulated. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createArkaV14, isArkaV14 } from '../game-src/avatar-arka-v14.js';
const folder = new URL('../ilustrasi/avatar-v2/farmer-v14-jrpg/', import.meta.url);
const bytes = await fs.readFile(new URL('arka-v14.glb', folder));
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
for(const [name,factor] of [['Dark swept hair',.22],['Arka skin · CC0 diffuse',.76]]) {
  const material=document.materials.find(m=>m.name===name);
  assert.ok(Math.abs(material?.pbrMetallicRoughness?.baseColorFactor?.[0]-factor)<.001,`Lost authored texture tint: ${name}`);
}
const imageBytes = [];
for (const image of document.images || []) {
  assert.ok(Number.isInteger(image.bufferView), 'All textures must be embedded');
  const view = document.bufferViews[image.bufferView];
  assert.ok(view.byteLength > 100);
  imageBytes.push({ name: image.name, mimeType: image.mimeType, bytes: view.byteLength });
}
// GLTFLoader extension allows the CPU skinning audit in Node without pretending
// to decode/upload pixels. Blender round-trip renders verify the actual textures.
const loader = new GLTFLoader();
loader.register(parser => ({ name: 'CPU_TEXTURE_AUDIT', loadTexture(index) {
  const texture = new THREE.Texture(); texture.name = parser.json.textures[index].name || `texture_${index}`;
  return Promise.resolve(texture);
} }));
const asset = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
assert.ok(isArkaV14(asset.scene));
const a = createArkaV14(THREE, asset), b = createArkaV14(THREE, asset);
assert.equal(a.figure.userData.fixedAppearance, true);
assert.equal(a.figure.userData.setAppearance, undefined, 'V11 wardrobe must not be advertised');
const meshes = [], bones = [];
a.figure.traverse(n => { if (n.isMesh) meshes.push(n); if (n.isBone) bones.push(n); });
assert.equal(bones.length, 49);
assert.deepEqual(Object.keys(a.actions).sort(), ['Hold', 'Idle', 'Point', 'Run', 'Sit', 'Walk', 'Wave']);
assert.ok(!meshes.some(n => /Anatomy_Source|ReviewFloor/.test(n.name)), 'Authoring-only meshes must not ship');
let weightSamples = 0, maxWeightError = 0;
for (const m of meshes) {
  assert.ok(m.isSkinnedMesh, `Unbound mesh: ${m.name}`);
  const w = m.geometry.attributes.skinWeight, indices = m.geometry.attributes.skinIndex;
  for (let i = 0; i < w.count; i++) {
    const sum = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i);
    maxWeightError = Math.max(maxWeightError, Math.abs(1 - sum));
    assert.ok(Math.abs(1 - sum) < .0001, `${m.name} invalid weight`);
    for (const j of [indices.getX(i), indices.getY(i), indices.getZ(i), indices.getW(i)]) assert.ok(j < m.skeleton.bones.length);
    weightSamples++;
  }
}
let vertexSamples = 0;const p = new THREE.Vector3();const clips = [];
for (const clip of asset.animations) {
  a.mixer.stopAllAction();const action = a.actions[clip.name].reset().play();
  const bounds = new THREE.Box3();
  for (let f = 0; f <= 12; f++) {
    action.time = clip.duration * f / 12; a.mixer.update(0); a.figure.userData.handController.update({ pose: 'clip' }); a.figure.updateMatrixWorld(true);
    for (const m of meshes) {
      m.skeleton.update();
      for (let i = 0; i < m.geometry.attributes.position.count; i += 3) {
        m.getVertexPosition(i, p).applyMatrix4(m.matrixWorld);
        assert.ok(p.toArray().every(Number.isFinite), `Non-finite ${clip.name}/${m.name}`);
        assert.ok(Math.abs(p.x) < 2 && p.y > -.12 && p.y < 2.3 && Math.abs(p.z) < 1.5, `Exploding ${clip.name}/${m.name}: ${p.toArray()}`);
        bounds.expandByPoint(p);vertexSamples++;
      }
    }
  }
  clips.push({ name: clip.name, seconds: clip.duration, bounds: [bounds.min.toArray(), bounds.max.toArray()] });
}
a.mixer.stopAllAction();a.actions.Idle.reset().play();a.mixer.update(0);
const other = new Map();b.figure.traverse(n => { if(n.isBone)other.set(n,n.quaternion.toArray()); });
let gestureSamples=0;
for(const pose of ['open','relaxed','point','grip','fist']) {
  a.figure.userData.handController.update({pose});a.figure.updateMatrixWorld(true);
  const skin=meshes.find(m=>m.name==='Arka_Skin');skin.skeleton.update();
  for(let i=0;i<skin.geometry.attributes.position.count;i++) {
    skin.getVertexPosition(i,p);assert.ok(p.toArray().every(Number.isFinite));gestureSamples++;
  }
}
for(const [n,q] of other)assert.deepEqual(n.quaternion.toArray(),q,'Shared skeleton mutation');
const ca=a.figure.userData.expressionController, cb=b.figure.userData.expressionController;
assert.ok(ca && cb);ca.update({expression:'happy',viseme:'AA',autoBlink:false});
let expressionBindings=0;
a.figure.traverse(n=>{if(n.morphTargetDictionary?.Expr_smile!==undefined){assert.ok(n.morphTargetInfluences[n.morphTargetDictionary.Expr_smile]>.1);expressionBindings++;}});
b.figure.traverse(n=>{if(n.morphTargetInfluences)assert.ok(n.morphTargetInfluences.every(v=>v===0));});
assert.ok(expressionBindings>=2);
ca.reset();a.figure.traverse(n=>{if(n.morphTargetInfluences)assert.ok(n.morphTargetInfluences.every(v=>v===0));});
// Walk/Run ankle paths have declared treadmill speeds and ground heights.
let pathChecks=0,maxFootPathError=0;
a.mixer.stopAllAction();a.figure.updateMatrixWorld(true);
const restFeet={};for(const side of ['L','R'])restFeet[side]=a.figure.getObjectByName('foot'+side).getWorldPosition(new THREE.Vector3());
for(const [name,data] of Object.entries(a.figure.userData.locomotion)) {
  a.mixer.stopAllAction();const action=a.actions[name].reset().play();
  for(let f=0;f<Math.round(data.duration*24);f++) {
    action.time=f/24;a.mixer.update(0);a.figure.updateMatrixWorld(true);
    for(const [side,offset] of [['L',0],['R',.5]]) {
      const phase=(f/(data.duration*24)+offset)%1;
      if(phase>=data.stanceFraction)continue;
      const foot=a.figure.getObjectByName('foot'+side).getWorldPosition(p);
      const expected=restFeet[side].z+data.strideDistance/2-data.strideDistance*phase/data.stanceFraction;
      const error=Math.max(Math.abs(foot.y-restFeet[side].y),Math.abs(foot.z-expected));
      maxFootPathError=Math.max(maxFootPathError,error);assert.ok(error<.002,`${name}/${side} contact path ${error}`);pathChecks++;
    }
  }
}
const triangles=meshes.reduce((s,m)=>s+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
const materials=new Set(meshes.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]));
const report={passed:true,sha256:createHash('sha256').update(bytes).digest('hex'),glbBytes:bytes.length,bones:bones.length,meshPrimitives:meshes.length,triangles,materials:materials.size,embeddedImages:imageBytes,weightSamples,maxWeightError,vertexSamples,gestureSamples,expressionBindings,pathChecks,maxFootPathError,clips,instanceIsolation:true,texturePixelsDecodedByThisTest:false,gpuFPSMeasured:false,browserInteractionVerified:false};
await fs.writeFile(new URL('runtime-test.json',folder),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,embeddedImages:imageBytes.length,clips:clips.map(c=>c.name)},null,2));
