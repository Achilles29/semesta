import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { createExpressionController } from './avatar-expression.js';
import { createHandController } from './avatar-hands.js';

export const ARKA_V14_CONTRACT = 'semesta-arka-v14';
export function metadata(root, key, fallback) {
  let value = fallback;
  root.traverse(node => {
    if (node.userData[key] === undefined) return;
    try { value = typeof node.userData[key] === 'string' && node.userData[key].startsWith('{') ? JSON.parse(node.userData[key]) : node.userData[key]; }
    catch { /* Invalid optional metadata does not change the fallback. */ }
  });
  return value;
}
export const isArkaV14 = root => metadata(root, 'avatarContract', null) === ARKA_V14_CONTRACT;

/** Fixed hero benchmark. It deliberately does not implement the V11 wardrobe. */
export function createArkaV14(THREE, asset, options = {}) {
  if (!isArkaV14(asset.scene)) throw new Error('Kontrak Arka V14 tidak ditemukan.');
  return createAnatomicalAvatar(THREE, asset, options);
}

export function createAnatomicalAvatar(THREE, asset, options = {}) {
  const figure = cloneSkeleton(asset.scene), materials = new Map();
  figure.traverse(node => {
    if (!node.isMesh) return;
    node.userData.sharedCharacterGeometry = true;
    node.castShadow = node.receiveShadow = true;
    if (node.morphTargetInfluences) node.morphTargetInfluences = [...node.morphTargetInfluences];
    const owned = source => {
      if (!materials.has(source)) {
        const copy = source.clone();
        // Textures belong to the cached asset; destroying one preview must not
        // dispose textures used by another instance or the next preview.
        copy.userData.sharedCharacterTexture = true;
        materials.set(source, copy);
      }
      return materials.get(source);
    };
    node.material = Array.isArray(node.material) ? node.material.map(owned) : owned(node.material);
  });
  const bone = name => figure.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const attachments = metadata(asset.scene, 'avatarAttachments', {});
  figure.userData.getAttachment = name => bone(attachments[name] || name);
  figure.userData.gripSockets = {};
  for (const [name, data] of Object.entries(metadata(asset.scene, 'avatarGripOffsets', {}))) {
    const socket = new THREE.Group(); socket.name = `Grip_${name}`;
    socket.position.fromArray(data.position); socket.rotation.fromArray([...data.rotation, 'XYZ']);
    socket.userData.basePosition = [...data.position];
    figure.userData.getAttachment(name).add(socket); figure.userData.gripSockets[name] = socket;
  }
  figure.userData.getGrip = name => figure.userData.gripSockets[name] || figure.userData.getAttachment(name);
  figure.userData.expressionController = createExpressionController(figure);
  figure.userData.handController = createHandController(figure);
  figure.userData.locomotion = metadata(asset.scene, 'avatarLocomotion', {});
  figure.userData.fixedAppearance = true;
  figure.userData.animations = asset.animations;
  figure.scale.setScalar(options.scale || 1);
  const mixer = new THREE.AnimationMixer(figure);
  const actions = Object.fromEntries(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  actions.Idle?.play();
  return { figure, mixer, actions, activeAction: 'Idle', head: bone('head'),
    arms: [bone('upper_arm.L'), bone('upper_arm.R')], legs: [bone('thigh.L'), bone('thigh.R')], eyes: [] };
}
