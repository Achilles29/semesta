import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatarV15,isAvatarV15} from './avatar-v15.js';
import {catalog,normalizeAvatarConfig} from './avatar-v15-config.js';
import manifest from './avatar-v15-runtime-manifest.json' with {type:'json'};
const assets=new Map(),pending=new Map();
const textures=new Map();
function shareTextures(gltf) {
  gltf.scene.traverse(node=>{
    if(!node.isMesh)return;
    for(const material of Array.isArray(node.material)?node.material:[node.material])for(const [slot,texture] of Object.entries(material)){
      if(!texture?.isTexture)continue;
      const index=gltf.parser.associations.get(texture)?.textures;
      const def=gltf.parser.json.textures?.[index],uri=gltf.parser.json.images?.[def?.source]?.uri;
      if(!uri)continue;
      const key=JSON.stringify([uri,def.sampler,texture.colorSpace,texture.flipY,texture.channel,texture.wrapS,texture.wrapT,texture.magFilter,texture.minFilter,texture.offset.toArray(),texture.repeat.toArray(),texture.rotation]);
      if(textures.has(key)){if(textures.get(key)!==texture)texture.dispose();material[slot]=textures.get(key);}else textures.set(key,texture);
    }
  });
}
export async function loadAvatarProfile(profileId=catalog.defaultProfile) {
  if(!catalog.profiles.some(p=>p.id===profileId))throw new Error('Profil avatar tidak dikenal.');
  if(assets.has(profileId))return assets.get(profileId);
  if(!pending.has(profileId))pending.set(profileId,(async()=>{
    try{
      const base=new URL(globalThis.window?.SEMESTA_AVATAR_V15_BASE || 'public/models/characters/v15/',globalThis.location?.href || 'http://localhost/project/');
      const gltf=await new GLTFLoader().loadAsync(new URL(`runtime/${manifest[profileId]}`,base).href);
      if(!isAvatarV15(gltf.scene))throw new Error('Aset situs bukan model V15.');
      shareTextures(gltf);
      assets.set(profileId,gltf);return gltf;
    }finally{pending.delete(profileId);}
  })());
  return pending.get(profileId);
}
export const preloadAvatars = () => Promise.all(catalog.profiles.map(p=>loadAvatarProfile(p.id)));
export function createHumanModel(THREE,options={}) {
  const config=normalizeAvatarConfig(options.avatarConfig || options);
  const asset=assets.get(config.profileId);
  if(!asset)throw new Error(`Aset ${config.profileId} belum dimuat.`);
  const actor=createAvatarV15(THREE,asset,{...options,customization:config.appearance});
  // Archived shot scripts retain their action names while using the new rig/clips.
  for(const [alias,clip] of Object.entries({Interact:'Point',Talk:'Point',Carry:'Hold'}))actor.actions[alias]=actor.actions[clip];
  actor.figure.userData.avatarConfig=config;return actor;
}
export function disposeAvatar(actor) {
  if(!actor)return;actor.mixer?.stopAllAction();actor.mixer?.uncacheRoot(actor.figure);actor.figure.removeFromParent();
  const materials=new Set(),skeletons=new Set();actor.figure.traverse(n=>{if(n.skeleton)skeletons.add(n.skeleton);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m));});
  materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());
}
export function avatarSpeed(actor,clip='Walk') {
  return (actor?.figure.userData.locomotion?.[clip]?.recommendedForwardSpeed || (clip==='Run'?2.77:1.44))*(actor?.figure.scale.x||1);
}
/** Metres/second in world space; animation cadence follows actual displacement. */
export function animateAvatar(actor,speed,dt) {
  if(!actor?.mixer)return false;
  const name=speed>.06?(speed>(avatarSpeed(actor,'Walk')+avatarSpeed(actor,'Run'))/2?'Run':'Walk'):'Idle';
  if(actor.activeAction!==name){actor.actions[actor.activeAction]?.fadeOut(.18);actor.actions[name]?.reset().fadeIn(.18).play();actor.activeAction=name;}
  const rate=name==='Idle'?1:Math.max(.05,Math.min(1.8,speed/avatarSpeed(actor,name)));
  actor.actions[name]?.setEffectiveTimeScale(rate);actor.mixer.update(dt);
  actor.figure.userData.expressionController?.update({time:actor.mixer.time});
  return true;
}
