import {EPISODE_DURATION as DEFAULT_DURATION,LEAD_IN} from './production-episode.js';

/** One decoded master, one active source. Audio time drives picture time. */
export function createProductionVoice({url,duration=DEFAULT_DURATION,leadIn=LEAD_IN,createContext=()=>new AudioContext(),load=async(url)=>{
  const response=await fetch(url);if(!response.ok)throw new Error(`Audio HTTP ${response.status}`);return response.arrayBuffer();
}}){
  const EPISODE_DURATION=duration;
  let context=null,buffer=null,source=null,gain=null,state='idle',generation=0;
  let floor=0,limit=EPISODE_DURATION,position=0,anchor=0,lastFrame=null,lastPresented=0,volume=1;
  const current=()=>state==='playing'?Math.min(limit,position+Math.max(0,context.currentTime-anchor)):position;
  const silence=()=>{if(source){try{source.stop();}catch{}source.disconnect();source=null;}};
  function schedule(){
    silence();anchor=context.currentTime;lastFrame=null;
    const delay=Math.max(0,floor-position),offset=Math.max(floor,position);
    if(offset>=limit){state='finished';return;}
    source=context.createBufferSource();source.buffer=buffer;source.connect(gain);
    source.start(context.currentTime+delay,offset,limit-offset);
    state='playing';
  }
  const api={
    get state(){return state;},get active(){return ['playing','paused','finished'].includes(state);},
    get time(){return Math.max(floor,current());},
    setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(gain)gain.gain.value=volume;},
    async start(start=0,end=EPISODE_DURATION){
      const run=++generation;silence();state='loading';
      try{
        // Resume inside the original click/keypress gesture, before fetch/decode.
        if(!context){context=createContext();gain=context.createGain();gain.connect(context.destination);gain.gain.value=volume;}
        await context.resume();
        if(!buffer)buffer=await context.decodeAudioData(await load(url));
        if(run!==generation)return false;
        if(context.state!=='running')throw new Error('Browser belum mengizinkan audio. Tekan Play lagi.');
        if(Math.abs(buffer.duration-EPISODE_DURATION)>.05)throw new Error('Master audio tidak cocok dengan timeline ('+EPISODE_DURATION.toFixed(2)+' detik). Muat ulang halaman.');
        floor=Math.max(0,start);limit=Math.min(EPISODE_DURATION,end);position=floor-Math.max(0,leadIn);lastPresented=position;
        schedule();return true;
      }catch(error){if(run!==generation)return false;state='idle';silence();throw error;}
    },
    tick(now,hidden=false){
      if(state!=='playing'){lastFrame=null;return;}
      // Backgrounding or a suspended audio device needs an explicit resume.
      if(hidden||context.state!=='running'){
        position=lastPresented;silence();state='paused';lastFrame=null;return;
      }
      // A slow foreground render must not silently pause or restart speech.
      // Like a video player, drop late picture frames and catch up to audio time.
      // This also keeps playing on devices consistently slower than 2 FPS.
      lastFrame=now;lastPresented=current();
      if(lastPresented>=limit){position=limit;silence();state='finished';}
    },
    async pause(){
      if(state==='playing'){position=current();silence();state='paused';lastFrame=null;}
      else if(state==='paused'){
        const run=generation;await context.resume();
        if(run!==generation||state!=='paused')return;
        if(context.state!=='running')throw new Error('Audio masih diblokir browser.');
        schedule();
      }
    },
    seek(seconds){
      const playing=state==='playing';silence();position=Math.max(floor,Math.min(limit,seconds));lastPresented=position;lastFrame=null;
      if(playing)schedule();else state=position>=limit?'finished':'paused';
    },
    stop(){++generation;silence();state='idle';lastFrame=null;},
    dispose(){api.stop();gain?.disconnect();context?.close().catch(()=>{});},
  };
  return api;
}
