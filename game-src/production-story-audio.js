import {STORY_CLIPS as clips} from './production-audio-catalog.js';
import music from './production-day1-music.json' with {type:'json'};
import background from './production-day1-background.json' with {type:'json'};
import {compileScenario} from './production-scenario.js';
import {speechCues} from './production-speech-cues.js';

const cache=new Map();
export const hasStoryAudio=scenario=>scenario.shots.some(s=>speechCues(s).length||s.sound||s.protest);
function assetUrl(file,directory='day-1'){
  const avatarBase=new URL(globalThis.window?.SEMESTA_AVATAR_V15_BASE||'../public/models/characters/v15/',globalThis.location?.href||'http://localhost/project/admin/');
  return new URL('../../../audio/produksi/'+directory+'/'+file,avatarBase).href;
}
export function storyAudioUrl(key){
  if(!Object.hasOwn(clips,key))throw new Error('Klip suara tidak dikenal.');
  return assetUrl(clips[key].file,clips[key].directory);
}
export async function loadStoryAudio(scenario,context,{rhythm=true,voices=true,fetcher=globalThis.fetch}={}){
  const compiled=compileScenario(scenario),cues=compiled.shots.flatMap(shot=>speechCues(shot).map(cue=>({...cue,start:shot.start+(cue.offset??.3)})));
  const keys=voices?[...new Set(cues.map(c=>c.key))]:[];
  const useMusic=rhythm&&compiled.shots.some(s=>s.sound);
  const useBed=rhythm&&['republic','construction'].includes(scenario.set)&&cues.length>0&&(useMusic||compiled.shots.some(s=>s.musicBedVolume!==undefined));
  if(useMusic)keys.push('okeGas');
  if(useBed)keys.push('background');
  await Promise.all(keys.map(async key=>{
    if(!cache.has(key))cache.set(key,(async()=>{
      const response=await fetcher(key==='background'?assetUrl(background.file):key==='okeGas'?assetUrl(music.file):storyAudioUrl(key));
      if(!response.ok)throw new Error('Audio '+key+' gagal dimuat ('+response.status+').');
      return context.decodeAudioData(await response.arrayBuffer());
    })().catch(error=>{cache.delete(key);throw error;}));
    await cache.get(key);
  }));
  const tracks=[],musicTracks=[];
  if(voices)for(const cue of cues)tracks.push({buffer:await cache.get(cue.key),offset:cue.start,volume:cue.volume??.95,key:cue.key,castId:clips[cue.key].castId});
  for(const shot of compiled.shots){
    if(useMusic&&shot.sound){
      const prior=musicTracks.at(-1),volume=shot.musicVolume??.55,sourceOffset=shot.musicOffset||0;
      // Carry the same source across cuts without resetting or fading every line.
      if(prior&&Math.abs(prior.offset+prior.duration-shot.start)<.001&&Math.abs(prior.sourceOffset+prior.duration-sourceOffset)<.001&&prior.volume===volume)prior.duration+=shot.duration;
      else musicTracks.push({buffer:await cache.get('okeGas'),offset:shot.start,sourceOffset,duration:shot.duration,volume,kind:'okeGas'});
    }
  }
  if(useBed){
    const bedTracks=[],buffer=await cache.get('background'),sourceDuration=buffer.duration||background.duration;
    let sourceOffset=0;
    for(const shot of compiled.shots){
      if(shot.sound){sourceOffset=0;continue;}
      const volume=shot.musicBedVolume??.55;
      let elapsed=0;
      while(elapsed<shot.duration-.000001){
        if(sourceOffset>=sourceDuration-.000001)sourceOffset=0;
        const duration=Math.min(shot.duration-elapsed,sourceDuration-sourceOffset),offset=shot.start+elapsed,prior=bedTracks.at(-1);
        if(volume>0){
          if(prior&&Math.abs(prior.offset+prior.duration-offset)<.001&&Math.abs(prior.sourceOffset+prior.duration-sourceOffset)<.001&&prior.volume===volume)prior.duration=offset+duration-prior.offset;
          else bedTracks.push({buffer,offset,sourceOffset,duration,volume,kind:'background',fade:.4});
        }
        sourceOffset+=duration;elapsed+=duration;
      }
    }
    tracks.push(...bedTracks);
  }
  const speech=voices?cues.map(c=>({start:c.start,end:c.start+clips[c.key].duration})):[];
  for(const track of [...tracks.filter(t=>t.kind),...musicTracks])track.volumePoints=duckMusic(track,speech);
  if(rhythm&&scenario.set==='construction')tracks.push(...constructionSounds(compiled,context));
  return [...tracks,...musicTracks];
}

/** Gain automation in track-relative seconds, shared by preview and export. */
export function duckMusic(track,speech){
  const end=track.offset+track.duration,low=track.kind==='okeGas'?Math.min(track.volume,.19):track.volume*.6;
  const points=[{time:0,volume:track.volume}],spans=[];
  // Sort first: multi-speaker protests may overlap or be authored out of order.
  for(const voice of [...speech].sort((a,b)=>a.start-b.start)){
    if(voice.end<track.offset||voice.start>end)continue;
    const start=Math.max(0,voice.start-track.offset-.12),stop=Math.min(track.duration,voice.end-track.offset+.12),last=spans.at(-1);
    if(last&&start-last.end<.45)last.end=Math.max(last.end,stop);else spans.push({start,end:stop});
  }
  for(const span of spans)points.push({time:Math.max(0,span.start-.12),volume:track.volume},{time:span.start,volume:low},{time:span.end,volume:low},{time:Math.min(track.duration,span.end+.3),volume:track.volume});
  return points;
}

/** Original deterministic Foley only: no generated words or recycled speech.
 * The same buffers/times feed preview and MP4. Subjective mix review is pending.
 */
function constructionSounds(compiled,context){
  if(typeof context.createBuffer!=='function')return [];
  const buffers=new Map(),tracks=[];
  const sound=(kind,duration)=>{
    const key=kind+':'+duration;
    if(buffers.has(key))return buffers.get(key);
    const rate=24000,buffer=context.createBuffer(1,Math.ceil(duration*rate),rate),data=buffer.getChannelData(0);
    let seed=kind.split('').reduce((n,c)=>n+c.charCodeAt(0),73),smooth=0;
    for(let i=0;i<data.length;i++){
      seed=(1664525*seed+1013904223)>>>0;
      const noise=seed/2147483648-1,t=i/rate;
      smooth=.88*smooth+.12*noise;
      let value=0;
      if(kind==='step')value=(.5*smooth+.14*Math.sin(t*2*Math.PI*95))*Math.exp(-t*30);
      if(kind==='hammer')value=(.35*noise+.2*Math.sin(t*2*Math.PI*560))*Math.exp(-t*38);
      if(kind==='paper')value=(noise-smooth)*.18*Math.sin(Math.PI*t/duration)**2;
      if(kind==='scissors')value=(noise-smooth)*.5*Math.exp(-t*45);
      if(kind==='shuffle')value=smooth*.38*(.45+.55*Math.sin(t*2*Math.PI*2.1)**2)*Math.sin(Math.PI*t/duration)**2;
      if(kind==='engine')value=(smooth*.12+Math.sin(t*2*Math.PI*64)*.05+Math.sin(t*2*Math.PI*96)*.025)*Math.min(1,t*12,(duration-t)*12);
      if(kind==='applause'){
        // Three irregular hands: short broadband bursts, no vocal simulation.
        for(const [period,phase] of [[.31,.03],[.39,.17],[.46,.22]]){const local=(t+phase)%period;value+=noise*.17*Math.exp(-local*75);}
        value*=Math.min(1,t*12,(duration-t)*6);
      }
      data[i]=value;
    }
    buffers.set(key,buffer);return buffer;
  };
  const add=(kind,offset,duration,volume)=>tracks.push({buffer:sound(kind,duration),offset,duration,volume,kind:'foley',foley:kind,fade:.01});
  for(const shot of compiled.shots){
    const actors=Object.values(shot.actors);
    const walkers=actors.filter(a=>['Walk','Run','Carry'].includes(a.action)&&a.to&&a.visible!==false);
    // A group gets one restrained footstep layer, not twelve identical impacts.
    if(walkers.length){const delay=Math.min(...walkers.map(a=>a.delay||0)),end=Math.max(...walkers.map(a=>(a.delay||0)+(a.activeDuration??shot.duration)));for(let t=delay+.12;t<Math.min(shot.duration,end)-.18;t+=.48)add('step',shot.start+t,.18,Math.min(.4,.17+walkers.length*.025));}
    if(actors.some(a=>a.action==='Build'))for(let t=.3;t<shot.duration-.18;t+=.72)add('hammer',shot.start+t,.18,.22);
    if(shot.props?.excavator==='digging')add('engine',shot.start,shot.duration,.7);
    if(actors.some(a=>a.action==='Applaud'))add('applause',shot.start+.1,Math.min(1.6,shot.duration-.1),.7);
    const ribbon=shot.props?.ribbon;
    if(ribbon&&typeof ribbon==='object'&&ribbon.to==='cut')add('scissors',shot.start+shot.duration*ribbon.at,.15,.65);
    const folder=shot.props?.folder;
    if(folder&&typeof folder==='object')add('paper',shot.start+shot.duration*folder.at,.25,.4);
    if(shot.protest){const from=shot.protest.from??0,to=shot.protest.to??1;for(let t=from*shot.duration+.12;t+1.1<=to*shot.duration;t+=1.4)add('shuffle',shot.start+t,1.1,.18+shot.protest.level*.22);}
  }
  return tracks;
}
