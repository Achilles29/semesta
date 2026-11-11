import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export const FARMER_V8_CONTRACT = 'semesta-farmer-v8-legacy19';
export const FARMER_V8_CAPABILITIES = Object.freeze({
  outfit: ['overalls', 'tee'], headwear: ['cap', 'none'],
  accessory: ['satchel', 'none'], gloves: ['work', 'none'], hairStyle: ['short', 'none'],
  colors: ['skin', 'hair', 'shirt', 'trousers', 'footwear', 'headwearColor', 'gloveColor', 'pack'],
});
const DEFAULT_COLORS = {
  skin: '#c18b60', hair: '#483024', shirt: '#ddd7c9', trousers: '#354f79',
  footwear: '#70482e', headwearColor: '#344f7c', gloveColor: '#a42a29', pack: '#79502d',
};
const CHANNELS = { skin: 'skin', hair: 'hair', shirt: 'shirt', trousers: 'trousers',
  footwear: 'footwear', headwear: 'headwearColor', gloves: 'gloveColor', pack: 'pack' };

export function isFarmerV8(scene) {
  let found = false;
  scene?.traverse((node) => { if (node.userData.avatarContract === FARMER_V8_CONTRACT) found = true; });
  return found;
}

const FACE_DEFAULTS = { faceShape: 'oval', eyeStyle: 'almond', noseStyle: 'defined', mouthStyle: 'smile',
  bodyFrame: 'male', bodyType: 'slender', bottomStyle: 'relaxed', footwearStyle: 'sandals' };

function readMetadata(figure, key, fallback) {
  let result = fallback;
  figure.traverse(node => {
    const value = node.userData[key];
    if (!value) return;
    try { result = typeof value === 'string' ? JSON.parse(value) : value; }
    catch { /* Older models without metadata keep the V8 contract. */ }
  });
  return result;
}

export function normalizeFarmerAppearance(options = {}, capabilities = FARMER_V8_CAPABILITIES) {
  const warnings = [];
  const choose = (key, value, aliases, fallback) => {
    if (value === undefined || value === null) return fallback;
    const mapped = aliases[value] || value;
    if (capabilities[key]?.includes(mapped)) return mapped;
    warnings.push(`${key}: ${String(value)} belum tersedia; memakai ${fallback}.`);
    return fallback;
  };
  return {
    outfit: choose('outfit', options.outfit ?? options.topStyle, { petani: 'overalls', kaos: 'tee' }, 'overalls'),
    headwear: choose('headwear', options.headwear, { topi: 'cap', tanpa: 'none' }, 'cap'),
    accessory: choose('accessory', options.accessory, { 'tas-anyaman': 'satchel', selempang: 'satchel', tanpa: 'none' }, 'satchel'),
    gloves: choose('gloves', options.gloves, { tanpa: 'none' }, 'work'),
    hairStyle: choose('hairStyle', options.hairStyle, { pendek: 'short', botak: 'none' }, 'short'),
    ...Object.fromEntries(Object.entries(FACE_DEFAULTS).filter(([key]) => capabilities[key])
      .map(([key, fallback]) => [key, choose(key, options[key], {}, fallback)])),
    colors: Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([key, fallback]) => {
      const color = options[key] ?? options.colors?.[key] ?? fallback;
      if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) return [key, color];
      warnings.push(`${key}: warna tidak valid; memakai ${fallback}.`);
      return [key, fallback];
    })),
    warnings,
  };
}

/** Changes an instance only. Geometry/skeleton bindings stay intact across swaps. */
export function applyFarmerAppearance(figure, options = {}) {
  const appearance = normalizeFarmerAppearance(options, figure.userData.avatarCapabilities || FARMER_V8_CAPABILITIES);
  const morphs = figure.userData.avatarMorphs || {};
  const bodyMorphs = figure.userData.avatarBodyMorphs || {};
  const selectedBody = bodyMorphs[`${appearance.bodyFrame}/${appearance.bodyType}`];
  figure.traverse((node) => {
    const { avatarSlot: slot, avatarChoice: choice, avatarChoices: choices } = node.userData;
    if (slot) node.visible = (Array.isArray(choices) ? choices : [choice]).includes(appearance[slot === 'hair' ? 'hairStyle' : slot]);
    // Preserve the chosen hair in the configuration; hide it underneath a hijab.
    if (slot === 'hair' && appearance.headwear === 'hijab') node.visible = false;
    if (!node.isMesh) return;
    for (const name of Object.values(bodyMorphs)) {
      const index = node.morphTargetDictionary?.[name];
      if (index !== undefined) node.morphTargetInfluences[index] = name === selectedBody ? 1 : 0;
    }
    for (const [field, values] of Object.entries(morphs)) {
      for (const [option, name] of Object.entries(values)) {
        const index = node.morphTargetDictionary?.[name];
        if (index !== undefined) node.morphTargetInfluences[index] = appearance[field] === option ? 1 : 0;
      }
    }
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      const channel = material.userData.avatarColor || material.name.replace(/^V8_/, '');
      const option = CHANNELS[channel];
      if (option && material.color) material.color.set(appearance.colors[option]);
    }
  });
  figure.userData.appearance = appearance;
  return appearance;
}

export function createFarmerV8(THREE, asset, options = {}) {
  const figure = cloneSkeleton(asset.scene);
  // Capabilities are asset-specific: old V8/V9 models must not advertise V10 slots.
  figure.userData.avatarCapabilities = readMetadata(asset.scene, 'avatarCapabilities', FARMER_V8_CAPABILITIES);
  figure.userData.avatarMorphs = readMetadata(asset.scene, 'avatarMorphs', {});
  figure.userData.avatarBodyMorphs = readMetadata(asset.scene, 'avatarBodyMorphs', {});
  const materials = new Map();
  figure.traverse((node) => {
    if (!node.isMesh) return;
    node.userData.sharedCharacterGeometry = true;
    if (node.morphTargetInfluences) node.morphTargetInfluences = [...node.morphTargetInfluences];
    node.castShadow = node.receiveShadow = true;
    const owned = (source) => {
      if (!materials.has(source)) materials.set(source, source.clone());
      return materials.get(source);
    };
    node.material = Array.isArray(node.material) ? node.material.map(owned) : owned(node.material);
  });
  applyFarmerAppearance(figure, options);
  figure.userData.setAppearance = (next) => applyFarmerAppearance(figure, next);
  figure.userData.animations = asset.animations || [];
  figure.scale.setScalar(options.scale || 1);
  const bone = (name) => figure.getObjectByName(name);
  const mixer = new THREE.AnimationMixer(figure);
  const actions = Object.fromEntries((asset.animations || []).map((clip) => [clip.name, mixer.clipAction(clip)]));
  actions.Idle?.play();
  return { figure, arms: [bone('upper_arm.L'), bone('upper_arm.R')],
    legs: [bone('thigh.L'), bone('thigh.R')], head: bone('head'), eyes: [],
    backpack: null, shirt: null, trousers: null, skin: null,
    mixer, actions, activeAction: actions.Idle ? 'Idle' : null };
}
