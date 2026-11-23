import professions from './citizen-professions.json' with { type: 'json' };
import { defaults, validateAvatarConfig } from './avatar-v15-config.js';

export { professions };
export const characterGender = value => ({'laki-laki':'male', perempuan:'female', male:'male', female:'female'})[value] || null;
export function professionRecommendation(occupation, gender) {
  const sex = characterGender(gender);
  if (!sex || !occupation) return null;
  const known = Object.hasOwn(professions, occupation);
  const role = professions[occupation] || professions.lainnya;
  // Rotate neutral appearance choices across the catalog, never infer a real
  // person's age or ethnicity from their occupation. Every field stays editable.
  const variation = Math.max(0, Object.keys(professions).indexOf(occupation)) + (sex === 'female' ? 3 : 0);
  const config = validateAvatarConfig({ model:'v15', profileId:`${sex}-${['balanced','slim','heavy'][variation % 3]}`, presetId:`profession-${known ? occupation : 'lainnya'}-${sex}`, appearance:{
    ...defaults(), skinTone:['warm','tan','brown','light','deep'][variation % 5],
    faceShape:['oval','round','angular','square','long'][variation % 5],
    eyeShape:['natural','almond','round'][variation % 3], noseShape:['natural','broad','defined'][variation % 3],
    hairColor:['dark','brown','dark','auburn'][variation % 4],
    hairStyle:sex === 'female' ? (role.hairFemale || ['ponytail','bobSoft','bun','braided'][variation % 4]) : (role.hairMale || ['sidePart','shortModern','crop','swept'][variation % 4]),
    topStyle:role.top, bottomStyle:role.bottom, palette:role.palette, shoeStyle:role.shoes,
    outerwearStyle:'none', accessoryChest:'off', accessoryWaist:'on', handAccessory:role.hand || 'watch',
    headAccessory:role.hat || 'none', backAccessory:role.bag || 'none', faceAccessory:role.glasses || 'none',
  }});
  return {config, avatar:role.avatar, name:`${known ? role.label : 'Gaya warga umum'} · ${sex === 'female' ? 'cewek' : 'cowok'}`, note:known ? role.note : 'Profesi ini belum memiliki set khusus. Racik sendiri gaya warga umum.', known};
}

/** A recommendation may never replace an explicitly chosen avatar. */
export function nextOnboardingAvatar(current, manuallyChosen, occupation, gender) {
  return manuallyChosen ? current : (professionRecommendation(occupation, gender)?.config || current);
}
