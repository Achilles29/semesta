import clips from './production-day1-audio.json' with {type:'json'};
import {compileScenario} from './production-scenario.js';

const cache=new Map();
export const hasStoryAudio=scenario=>scenario.shots.some(s=>s.speech||s.sound);
export function storyAudioUrl(key){
  if(!Object.hasOwn(clips,key))throw new Error('Klip suara tidak dikenal.');
  const avatarBase=new URL(globalThis.window?.SEMESTA_AVATAR_V15_BASE||'../public/models/characters/v15/',globalThis.location?.href||'http://localhost/project/admin/');
  return new URL(`../../../audio/produksi/day-1/${clips[key].file}`,avatarBase).href;
}
// Original percussion-only rehearsal rhythm. Not Oke Gas or a replacement recording.
function rehearsalBeat(context,duration){
  const rate=48000,buffer=context.createBuffer(2,Math.ceil(duration*rate),rate),beat=60/130;
  for(let channel=0;channel<2;channel++){
    const samples=buffer.getChannelData(channel);let seed=731;
    for(let i=0;i<samples.length;i++){
      const time=i/rate,phase=time%beat,half=time%(beat/2);seed=(seed*1664525+1013904223)>>>0;
      const kick=Math.sin(2*Math.PI*(48*phase+7*(1-Math.exp(-phase*30))))*Math.exp(-phase*22)*.24;
      const hat=(seed/4294967296*2-1)*Math.exp(-half*160)*.055;
      const fade=Math.min(1,time/.015,(duration-time)/.06);samples[i]=(kick+hat)*Math.max(0,fade);
    }
  }
  return buffer;
}
export async function loadStoryAudio(scenario,context,{rhythm=true,fetcher=globalThis.fetch}={}){
  const compiled=compileScenario(scenario),keys=[...new Set(compiled.shots.map(s=>s.speech).filter(Boolean))];
  await Promise.all(keys.map(async key=>{
    if(!cache.has(key))cache.set(key,(async()=>{const response=await fetcher(storyAudioUrl(key));if(!response.ok)throw new Error(`Audio ${key} gagal dimuat (${response.status}).`);return context.decodeAudioData(await response.arrayBuffer());})().catch(error=>{cache.delete(key);throw error;}));
    await cache.get(key);
  }));
  const tracks=[];
  for(const shot of compiled.shots){
    if(shot.speech)tracks.push({buffer:await cache.get(shot.speech),offset:shot.start+(shot.speechOffset??.3),volume:.95});
    if(rhythm&&shot.sound==='beat')tracks.push({buffer:rehearsalBeat(context,shot.duration),offset:shot.start,volume:.75});
  }
  return tracks;
}
