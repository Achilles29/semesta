import roster from './citizen-roster.json' with {type:'json'};
import {presets,catalog} from './avatar-v15-config.js';

export const citizens=roster.citizens;
const byPreset=new Map(citizens.map(c=>[c.presetId,c]));
export const citizenForPreset=id=>byPreset.get(id);
const storyIdentities={
  'v15-prabowo-inspired':{name:'Pasca Bowow',role:'Presiden'},
  'v15-joko-rockstar':{name:'Joko',role:'Musisi',productionProp:'guitar'},
};
/** Story names belong to the cast, independently of its visual preset. */
export function castIdentity(cast,scenario){
  if(cast.name)return {name:cast.name,role:cast.role||''};
  const identity=byPreset.get(cast.preset)||storyIdentities[cast.preset];
  // Sari's established visual identity is Laras; old scenarios have no name field.
  if(!identity&&cast.preset==='v15-laras'&&cast.id==='b'&&scenario?.set==='republic')return {name:'Sari',role:'Warga'};
  return {name:identity?.name||presets.find(p=>p.id===cast.preset)?.name||cast.id,role:cast.role??identity?.role??''};
}
export function selectCastPreset(cast,presetId){
  const next={...cast,preset:presetId},citizen=byPreset.get(presetId),story=storyIdentities[presetId];
  // Selecting a roster citizen means casting that identity. General presets
  // remain a wardrobe/appearance change for an already named character.
  if(citizen||story){const identity=citizen||story;next.name=identity.name;next.role=identity.role;if(identity.productionProp)next.prop=identity.productionProp;else delete next.prop;}
  return next;
}
export function citizenDescription(citizen){
  return [citizen?.role,Array.isArray(citizen?.designNotes)?citizen.designNotes.join(' '):citizen?.designNotes].filter(Boolean).join(' · ');
}
export function characterSearch(preset,query){
  const citizen=byPreset.get(preset.id),words=[preset.name,citizen?.name,citizen?.role,citizen?.requestedRole,catalog.profiles.find(p=>p.id===preset.config.profileId)?.label].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
  return words.includes(query.trim().toLocaleLowerCase('id-ID'));
}
