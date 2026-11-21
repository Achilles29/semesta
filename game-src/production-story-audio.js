import clips from './production-day1-audio.json' with {type:'json'};
import music from './production-day1-music.json' with {type:'json'};
import background from './production-day1-background.json' with {type:'json'};
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
  const useBed=useMusic&&scenario.set==='republic'&&compiled.shots.some(s=>s.speech);
  if(useMusic)keys.push('okeGas');
  if(useBed)keys.push('background');
  await Promise.all(keys.map(async key=>{
    if(!cache.has(key))cache.set(key,(async()=>{const response=await fetcher(key==='background'?assetUrl(background.file):key==='okeGas'?assetUrl(music.file):storyAudioUrl(key));if(!response.ok)throw new Error(`Audio ${key} gagal dimuat (${response.status}).`);return context.decodeAudioData(await response.arrayBuffer());})().catch(error=>{cache.delete(key);throw error;}));
    await cache.get(key);
  }));
  const tracks=[],musicTracks=[];
  for(const shot of compiled.shots){
    if(voices&&shot.speech)tracks.push({buffer:await cache.get(shot.speech),offset:shot.start+(shot.speechOffset??.3),volume:.95});
    if(useMusic&&shot.sound){
      const prior=musicTracks.at(-1),volume=shot.musicVolume??.55,sourceOffset=shot.musicOffset||0;
      // Carry the same source across cuts without resetting or fading every line.
      if(prior&&Math.abs(prior.offset+prior.duration-shot.start)<.001&&Math.abs(prior.sourceOffset+prior.duration-sourceOffset)<.001&&prior.volume===volume)prior.duration+=shot.duration;
      else musicTracks.push({buffer:await cache.get('okeGas'),offset:shot.start,sourceOffset,duration:shot.duration,volume,kind:'okeGas'});
    }
  }
  if(useBed){
    let start=0;
    for(const interval of [...musicTracks,{offset:compiled.duration,duration:0}]){
      if(interval.offset-start>.01)tracks.push({buffer:await cache.get('background'),offset:start,sourceOffset:0,duration:interval.offset-start,volume:.55,kind:'background',fade:.4});
      start=interval.offset+interval.duration;
    }
  }
  const speech=voices?compiled.shots.filter(s=>s.speech).map(s=>({start:s.start+(s.speechOffset??.3),end:s.start+(s.speechOffset??.3)+clips[s.speech].duration})):[];
  for(const track of [...tracks.filter(t=>t.kind),...musicTracks])track.volumePoints=duckMusic(track,speech);
  return [...tracks,...musicTracks];
}

/** Gain automation in track-relative seconds, shared by preview and export. */
export function duckMusic(track,speech){
  const end=track.offset+track.duration,low=track.kind==='okeGas'?Math.min(track.volume,.19):track.volume*.6;
  const points=[{time:0,volume:track.volume}];
  // Merge close turns so music does not pump between sentences.
  const spans=[];
  for(const voice of speech){
    if(voice.end<track.offset||voice.start>end)continue;
    const start=Math.max(0,voice.start-track.offset-.12),stop=Math.min(track.duration,voice.end-track.offset+.12),last=spans.at(-1);
    if(last&&start-last.end<.45)last.end=Math.max(last.end,stop);else spans.push({start,end:stop});
  }
  for(const span of spans){points.push({time:Math.max(0,span.start-.12),volume:track.volume},{time:span.start,volume:low},{time:span.end,volume:low},{time:Math.min(track.duration,span.end+.3),volume:track.volume});}
  return points;
}
