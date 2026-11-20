import catalog from './avatar-v15-catalog.json' with {type:'json'};
import presets from './avatar-v15-presets.json' with {type:'json'};
export {catalog, presets};
export const defaults = () => Object.fromEntries(Object.entries(catalog.fields).map(([k,v])=>[k,v.default]));
export function validateAvatarConfig(config) {
  if(!config || config.model!=='v15' || !catalog.profiles.some(p=>p.id===config.profileId))throw new Error('Profil avatar V15 tidak valid.');
  if(!config.appearance || typeof config.appearance!=='object' || Array.isArray(config.appearance))throw new Error('Pilihan avatar tidak valid.');
  const appearance=defaults();
  for(const [key,value] of Object.entries(config.appearance)) {
    if(!catalog.fields[key] || typeof value!=='string' || !Object.hasOwn(catalog.fields[key].options,value))throw new Error(`Pilihan ${key} tidak valid.`);
    appearance[key]=value;
  }
  const clean={model:'v15',profileId:config.profileId,appearance};
  if(config.presetId!==undefined){if(typeof config.presetId!=='string'|| !/^[a-zA-Z0-9_-]{1,80}$/.test(config.presetId))throw new Error('ID avatar tidak valid.');clean.presetId=config.presetId;}
  return clean;
}
/** Read-time migration: legacy accounts keep their closest supported appearance. */
export function normalizeAvatarConfig(input={}) {
  let config=input;
  if(typeof config==='string'){try{config=JSON.parse(config);}catch{config={};}}
  config ||= {};
  if(config.model==='v15')return validateAvatarConfig(config);
  const old=config.farmer || config, appearance=defaults();
  const sex=old.bodyFrame==='female'?'female':'male';
  const body=['skinny','slender'].includes(old.bodyType)?'slim':['full','plus','mature','soft-mature'].includes(old.bodyType)?'heavy':'balanced';
  const choices={hairStyle:{short:'short',swept:'swept',curtain:'swept',tied:'ponytail',bob:'bob',none:'none',botak:'none',kuncir:'bun',cepak:'crop'},faceShape:{oval:'oval',round:'round',angular:'angular'},eyeShape:{almond:'almond',round:'round'},noseShape:{defined:'defined'},mouthShape:{grin:'wide'},headAccessory:{cap:'cap',topi:'cap',bandana:'headband',caping:'brimHat'},backAccessory:{backpack:'satchel',satchel:'satchel',ransel:'satchel','tas-anyaman':'satchel'}};
  const oldNames={eyeShape:'eyeStyle',noseShape:'noseStyle',mouthShape:'mouthStyle',headAccessory:'headwear',backAccessory:'accessory'};
  for(const [key,map] of Object.entries(choices))appearance[key]=map[old[oldNames[key]||key] || (key==='hairStyle'?config.hair:undefined)]||appearance[key];
  appearance.skinTone={pucat:'light',kuning:'light',sawo:'tan',zaitun:'tan',coklat:'brown',gelap:'deep'}[config.skin]||'warm';
  const color=old.colors?.skin;
  if(typeof color==='string' && /^#[\da-f]{6}$/i.test(color)){
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
    appearance.skinTone=Object.entries(catalog.skinTones).sort((a,b)=>a[1].factor.reduce((n,v,i)=>n+(Math.sqrt(v)-rgb[i])**2,0)-b[1].factor.reduce((n,v,i)=>n+(Math.sqrt(v)-rgb[i])**2,0))[0][0];
  }
  appearance.hairColor={uban:'silver',pirang:'gold',merah:'auburn',coklat:'brown'}[config.hairColor]||'dark';
  appearance.topStyle=['jacket','blazer','coat'].includes(old.outfit)?'jacket':['work-shirt','office-shirt','shirt'].includes(old.outfit)?'shirt':['tunic','koko','kebaya'].includes(old.outfit)?'tunic':'linen';
  appearance.shoeStyle=['shoes','sneakers'].includes(old.footwearStyle)?'sneakers':'travel';
  appearance.outerwearStyle=['tee','loose-tee','koko','kebaya'].includes(old.outfit)?'none':old.outfit==='blazer'?'longVest':'vest';
  appearance.bottomStyle=old.bottomStyle==='cargo'?'cargo':['relaxed','sarong','skirt'].includes(old.bottomStyle)?'relaxed':'straight';
  return {model:'v15',profileId:`${sex}-${body}`,appearance};
}
export const avatarCharacterOptions = config => ({avatarConfig:normalizeAvatarConfig(config)});
export function mountAvatarEditor(container,onChange) {
  const section=document.createElement('fieldset');section.className='farmer-editor v15-editor';
  const legend=document.createElement('legend');legend.textContent='Racik karakter V15';section.append(legend);
  const controls=new Map();
  for(const [key,field] of [['profileId',{label:'Jenis kelamin dan postur',options:Object.fromEntries(catalog.profiles.map(p=>[p.id,p.label]))}],...Object.entries(catalog.fields)]){
    const label=document.createElement('label');label.textContent=field.label;const select=document.createElement('select');select.name=`v15-${key}`;
    for(const [value,text] of Object.entries(field.options))select.add(new Option(text,value));label.append(select);section.append(label);controls.set(key,select);
  }
  const wardrobeNote=document.createElement('small');wardrobeNote.style.gridColumn='1 / -1';
  wardrobeNote.textContent='Palet mengubah pakaian kasual. Set taktis, loreng, PNS dan safari mempertahankan warna aslinya.';section.append(wardrobeNote);
  section.addEventListener('change',()=>onChange(api.get()));container.append(section);
  const api={set(config){const c=normalizeAvatarConfig(config);controls.get('profileId').value=c.profileId;for(const [k,v] of Object.entries(c.appearance))controls.get(k).value=v;},get(){return validateAvatarConfig({model:'v15',profileId:controls.get('profileId').value,appearance:Object.fromEntries([...controls].filter(([k])=>k!=='profileId').map(([k,el])=>[k,el.value]))});},element:section};
  api.set(presets[0].config);return api;
}
