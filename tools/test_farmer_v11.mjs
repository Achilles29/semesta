import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHumanModel, setFarmerAsset } from '../game-src/avatar-character-3d.js';

const folder = new URL('../ilustrasi/avatar-v2/farmer-v11-body-wardrobe/', import.meta.url);
const bytes = await fs.readFile(new URL('farmer-v11-body-wardrobe.glb', folder));
const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
setFarmerAsset(asset);
const a = createHumanModel(THREE, { ps2Farmer: true });
const b = createHumanModel(THREE, { ps2Farmer: true });
a.mixer.stopAllAction(); b.mixer.stopAllAction();
const caps = a.figure.userData.avatarCapabilities;
const bodyMorphs = a.figure.userData.avatarBodyMorphs;
assert.equal(Object.keys(bodyMorphs).length, 16);
assert.equal(caps.outfit.length, 10);
assert.equal(caps.bottomStyle.length, 4);
const meshes = []; a.figure.traverse(n => { if (n.isMesh) meshes.push(n); });
const nodes = []; a.figure.traverse(n => nodes.push(n));
const isVisible = node => { for (let p = node; p; p = p.parent) if (!p.visible) return false; return true; };
const sourceMeshes = []; asset.scene.traverse(n => { if (n.isMesh) sourceMeshes.push(n); });
const bMeshes = []; b.figure.traverse(n => { if (n.isMesh) bMeshes.push(n); });
const frozenB = bMeshes.map(n => [...(n.morphTargetInfluences || [])]);
let maxWeightError = 0, vertices = 0, triangles = 0;
for (const mesh of meshes) {
  assert.ok(mesh.isSkinnedMesh, mesh.name);
  vertices += mesh.geometry.attributes.position.count;
  triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
  const weight = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < weight.count; i++) {
    const sum = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i);
    maxWeightError = Math.max(maxWeightError, Math.abs(sum - 1));
    assert.ok(Math.abs(sum - 1) < .0001, `Bad weights: ${mesh.name}`);
  }
  const source = sourceMeshes.find(n => n.name === mesh.name);
  const sibling = bMeshes.find(n => n.name === mesh.name);
  assert.equal(mesh.geometry, source.geometry);
  assert.notEqual(mesh.material, sibling.material);
  assert.notEqual(mesh.skeleton, sibling.skeleton);
  if (mesh.morphTargetInfluences) assert.notEqual(mesh.morphTargetInfluences, sibling.morphTargetInfluences);
}
const slotOf = field => field === 'hairStyle' ? 'hair' : field;
function validateSelection(config) {
  const state = a.figure.userData.setAppearance(config);
  assert.equal(state.warnings.length, 0);
  const bodyName = bodyMorphs[`${state.bodyFrame}/${state.bodyType}`];
  let activeTriangles = 0;
  for (const node of nodes) {
    const slot = node.userData.avatarSlot;
    const field = slot === 'hair' ? 'hairStyle' : slot;
    if (slot) {
      let expected = (node.userData.avatarChoices || [node.userData.avatarChoice]).includes(state[field]);
      if (slot === 'hair' && state.headwear === 'hijab') expected = false;
      assert.equal(node.visible, expected, `${node.name} visibility`);
    }
    if (!node.isMesh) continue;
    const names = Object.values(bodyMorphs).filter(name => node.morphTargetDictionary?.[name] !== undefined);
    if (names.length) {
      assert.equal(names.length, 16, `Incomplete body fitting: ${node.name}`);
      for (const name of names) assert.equal(node.morphTargetInfluences[node.morphTargetDictionary[name]], name === bodyName ? 1 : 0);
    }
    if (isVisible(node)) activeTriangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
  }
  for (const field of ['outfit', 'bottomStyle', 'footwearStyle']) {
    assert.ok(nodes.some(n => isVisible(n) && n.userData.avatarSlot === slotOf(field)), `Empty ${field}: ${JSON.stringify(config)}`);
  }
  return activeTriangles;
}
let wardrobeBodyCombinations = 0, minActiveTriangles = Infinity, maxActiveTriangles = 0;
for (const bodyFrame of caps.bodyFrame) for (const bodyType of caps.bodyType)
for (const outfit of caps.outfit) for (const bottomStyle of caps.bottomStyle) for (const footwearStyle of caps.footwearStyle) {
  const count = validateSelection({ bodyFrame, bodyType, outfit, bottomStyle, footwearStyle });
  minActiveTriangles = Math.min(minActiveTriangles, count); maxActiveTriangles = Math.max(maxActiveTriangles, count);
  wardrobeBodyCombinations++;
}
let headAccessoryCombinations = 0;
for (const headwear of caps.headwear) for (const hairStyle of caps.hairStyle) for (const accessory of caps.accessory) for (const gloves of caps.gloves) {
  validateSelection({ headwear, hairStyle, accessory, gloves }); headAccessoryCombinations++;
}
// Stored appearance must roundtrip including body frame/type and separate footwear color/style.
const config = { bodyFrame: 'female', bodyType: 'plus', outfit: 'kebaya', bottomStyle: 'skirt', footwearStyle: 'sandals',
  footwear: '#654321', skin: '#704020', headwear: 'hijab', faceShape: 'round', mouthStyle: 'grin' };
const state = a.figure.userData.setAppearance(config);
assert.deepEqual(a.figure.userData.setAppearance(JSON.parse(JSON.stringify(state))), state);
assert.ok(meshes.filter(n => n.userData.avatarSlot === 'hair').every(n => !n.visible));
a.figure.userData.setAppearance({ ...config, headwear: 'none', hairStyle: 'bob' });
assert.ok(meshes.some(n => n.userData.avatarSlot === 'hair' && n.visible), 'Restore hair after hijab');
for (let i = 0; i < bMeshes.length; i++) assert.deepEqual(bMeshes[i].morphTargetInfluences || [], frozenB[i], 'Body shape leaked between instances');
assert.ok(sourceMeshes.every(n => !n.morphTargetInfluences || n.morphTargetInfluences.every(v => v === 0)), 'Source morph mutated');
assert.ok(asset.animations.every(c => c.tracks.every(t => !t.name.includes('morphTargetInfluences'))), 'Animation overwrites wardrobe morphs');
assert.deepEqual(Object.keys(a.actions).sort(), ['Idle','Walk','Run','Interact','Wave','Hoe','Watering','Harvest'].sort());

// Sample visible vertices with actual morph + skinning for all 16 bodies and eight
// clips. Alternate skirt/sarong and long/short sleeves; not an all-frame collision proof.
let sampledVertices = 0;
const poseReports = [], point = new THREE.Vector3();
for (const bodyFrame of caps.bodyFrame) for (const bodyType of caps.bodyType) {
  validateSelection({ bodyFrame, bodyType, outfit: bodyFrame === 'female' ? 'tunic' : 'koko',
    bottomStyle: bodyFrame === 'female' ? 'skirt' : 'sarong', footwearStyle: 'sandals', headwear: 'none' });
  const box = new THREE.Box3();
  for (const clip of asset.animations) {
    a.mixer.stopAllAction(); a.actions[clip.name].reset().play();
    for (let frame = 0; frame < 5; frame++) {
      a.actions[clip.name].time = clip.duration * frame / 4; a.mixer.update(0); a.figure.updateMatrixWorld(true);
      for (const mesh of meshes) {
        if (!isVisible(mesh)) continue;
        mesh.skeleton.update();
        for (let i = 0; i < mesh.geometry.attributes.position.count; i += 3) {
          mesh.getVertexPosition(i, point); point.applyMatrix4(mesh.matrixWorld);
          assert.ok(Number.isFinite(point.x + point.y + point.z) && point.length() < 3.3, `Exploded morph/skin: ${bodyFrame}/${bodyType}/${clip.name}/${mesh.name}`);
          box.expandByPoint(point); sampledVertices++;
        }
      }
    }
  }
  poseReports.push({ bodyFrame, bodyType, min: box.min.toArray(), max: box.max.toArray() });
}
const report = { passed: true, engine: THREE.REVISION, wardrobeBodyCombinations, headAccessoryCombinations,
  bodyVariants: 16, animationClips: 8, poseSamplesPerClip: 5, vertexStride: 3, sampledVertices,
  meshes: meshes.length, vertices, triangles, activeTriangleRangeInWardrobeTest: [minActiveTriangles, maxActiveTriangles],
  maxWeightError, independentInstances: true, appearanceRoundtrip: true, poseReports,
  limits: 'Numerical morph/skinning and selection tests. Does not certify every wardrobe combination is collision-free or all costumes culturally exhaustive.' };
await fs.writeFile(new URL('runtime-test.json', folder), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, poseReports: `${poseReports.length} body bounds in runtime-test.json` }, null, 2));
