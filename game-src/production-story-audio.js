import clips from './production-day1-audio.json' with {type:'json'};
import music from './production-day1-music.json' with {type:'json'};
import {compileScenario} from './production-scenario.js';

const cache=new Map();
export const hasStoryAudio=scenario=>scenario.shots.some(s=>s.speech||s.sound);
function assetUrl(file){
  const avatarBase=new URL(globalThis.window?.SEMESTA_AVATAR_V15_BASE||'../public/models/characters/v15/',globalThis.location?.href||'http://localhost/project/admin/');
  return new URL('../../../audio/produksi/day-1/'+file,avatarBase).href;
}
export function storyAudioUrl(key){
  if(!Object.hasOwn(clips,key))throw new Error('Klip suara tidak dikenal.');
  return assetUrl(clips[key].file);
}
export async function loadStoryAudio(scenario,context,{rhythm=true,voices=true,fetcher=globalThis.fetch}={}){
  const compiled=compileScenario(scenario),keys=voices?[...new Set(compiled.shots.map(s=>s.speech).filter(Boolean))]:[];
  const useMusic=rhythm&&compiled.shots.some(s=>s.sound);
  if(useMusic)keys.push('okeGas');
  await Promise.all(keys.map(async key=>{
    if(!cache.has(key))cache.set(key,(async()=>{const response=await fetcher(key==='okeGas'?assetUrl(music.file):storyAudioUrl(key));if(!response.ok)throw new Error(`Audio ${key} gagal dimuat (${response.status}).`);return context.decodeAudioData(await response.arrayBuffer());})().catch(error=>{cache.delete(key);throw error;}));
    await cache.get(key);
  }));
  const tracks=[];
  for(const shot of compiled.shots){
    if(voices&&shot.speech)tracks.push({buffer:await cache.get(shot.speech),offset:shot.start+(shot.speechOffset??.3),volume:.95});
    if(useMusic&&shot.sound)tracks.push({buffer:await cache.get('okeGas'),offset:shot.start,sourceOffset:shot.musicOffset||0,duration:shot.duration,volume:shot.musicVolume??.55});
  }
  return tracks;
}
