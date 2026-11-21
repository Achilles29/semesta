import { createAnatomicalAvatar, metadata } from './avatar-arka-v14.js';
import {catalog,defaults,validateAvatarConfig} from './avatar-v15-config.js';
export { catalog as AVATAR_V15_CATALOG };
export const isAvatarV15 = root => metadata(root, 'avatarContract', null) === catalog.contract;
export function createAvatarV15(THREE, asset, options = {}) {
  if (!isAvatarV15(asset.scene)) throw new Error('Kontrak avatar V15 tidak ditemukan.');
  const actor = createAnatomicalAvatar(THREE, asset, options);
  const profile = metadata(asset.scene, 'avatarProfile', {});
  const materials = new Map();
  const slotMaterials = new Map();
  actor.figure.traverse(node => {
    if (!node.isMesh) return;
    const slot=node.userData.avatarSlot;
    const ownForSlot=mat=>{
      if(!slotMaterials.has(mat))slotMaterials.set(mat,new Map());
      const slots=slotMaterials.get(mat);
      if(!slots.has(slot))slots.set(slot,slots.size?mat.clone():mat);
      return slots.get(slot);
    };
    node.material=Array.isArray(node.material)?node.material.map(ownForSlot):ownForSlot(node.material);
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.set(mat, mat.color.clone());
  });
  let state = defaults();
  actor.figure.userData.profile = profile;
  actor.figure.userData.fixedAppearance = false;
  const morphs={faceShape:{round:'faceRound',angular:'faceAngular',square:'faceSquare',long:'faceLong',senior:'faceSenior',prabowow:'facePrabowow'},eyeShape:{almond:'eyeAlmond',round:'eyeRound'},noseShape:{broad:'noseBroad',defined:'noseDefined'},mouthShape:{wide:'mouthWide',full:'mouthFull'},earShape:{prominent:'earProminent',tapered:'earTapered'}};
  actor.figure.userData.customization = {
    get: () => ({...state}),
    set(patch) {
      // Accept the original preview's three boolean toggles when reading old demos.
      patch={...patch};
      for(const key of ['accessoryChest','accessoryWaist'])if(typeof patch[key]==='boolean')patch[key]=patch[key]?'on':'off';
      if('outerwear' in patch){patch.outerwearStyle=patch.outerwear?'vest':'none';delete patch.outerwear;}
      state=validateAvatarConfig({model:'v15',profileId:profile.id||catalog.defaultProfile,appearance:{...state,...patch}}).appearance;
      for (const [mat,color] of materials) mat.color.copy(color);
      actor.figure.traverse(node => {
        if (!node.isMesh) return;
        const {avatarSlot:slot,avatarVariantGroup:group,avatarVariant:variant}=node.userData;
        node.visible=group?state[group]===variant:['accessoryChest','accessoryWaist'].includes(slot)?state[slot]==='on':true;
        // Cap and bulky hair are fitted separately. Keep a close crop beneath the cap.
        if(slot==='hair' && catalog.hairCoveringHeadwear.includes(state.headAccessory))node.visible=false;
        // A full jacket covers the underlying vest/harness rather than letting
        // those fitted pieces cut through its fabric. Preserve saved selections.
        if(catalog.coveredTopStyles.includes(state.topStyle) && ['outerwear','accessoryChest','accessoryWaist'].includes(slot))node.visible=false;
        for(const [name,index] of Object.entries(node.morphTargetDictionary||{}))if(name.startsWith('Id_'))node.morphTargetInfluences[index]=0;
        for(const [key,map] of Object.entries(morphs)){
          const index=node.morphTargetDictionary?.[`Id_${map[state[key]]}`];
          if(index!==undefined)node.morphTargetInfluences[index]=1;
        }
        // The longer vest is slightly fuller; float the fitted harness above it.
        const fit=node.morphTargetDictionary?.Id_OuterwearFit;
        if(fit!==undefined)node.morphTargetInfluences[fit]=state.outerwearStyle==='longVest'?1:0;
        for (const mat of Array.isArray(node.material)?node.material:[node.material]) {
          if(slot==='skin')mat.color.fromArray(catalog.skinTones[state.skinTone].factor);
          else if(slot==='hair' || slot==='brows')mat.color.copy(materials.get(mat)).multiply(new THREE.Color().fromArray(catalog.hairColors[state.hairColor].factor));
          else if(!node.userData.avatarFixedColor && catalog.palettes[state.palette][slot]) {
            const factor=catalog.palettes[state.palette][slot];
            mat.color.copy(materials.get(mat)).multiply(new THREE.Color().fromArray(factor));
          }
        }
      });
    },
  };
  actor.figure.userData.customization.set(options.customization || {});
  return actor;
}
