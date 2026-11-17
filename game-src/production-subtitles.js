import subtitles from '../public/audio/produksi/episode-002/release-v16-r3/subtitles.json' with {type:'json'};

export const SUBTITLE_CUES=subtitles.cues;
export function subtitleAt(time){
  return SUBTITLE_CUES.find(cue=>time>=cue.start&&time<cue.end)??null;
}

/** A screen-recordable overlay, outside hidden game HUD, driven by the audio clock.
 * No timers or CSS animation: pause, replay and seeking sample the same schedule.
 * This is not burned into the WebGL canvas; capture the browser/window, not canvas alone.
 */
export function createProductionSubtitles(){
  const root=document.createElement('div');root.className='production-subtitles';root.hidden=true;
  root.setAttribute?.('aria-label','Subtitle dialog');
  root.style.cssText='position:fixed;z-index:9000;pointer-events:none;box-sizing:border-box;text-align:center;transform:translateX(-50%);font-family:Arial,sans-serif;color:white;white-space:pre-line;line-height:1.15;font-weight:700;';
  const plate=document.createElement('span');
  plate.style.cssText='display:inline-block;box-sizing:border-box;max-width:100%;border-radius:.3em;padding:.22em .3em;background:rgba(12,21,27,.80);text-shadow:0 1px 2px #000;';
  const speaker=document.createElement('span');
  speaker.style.cssText='display:block;font-size:.56em;line-height:1.3;margin-bottom:.16em;letter-spacing:.035em;color:#ffe297;';
  const words=document.createElement('span');words.style.cssText='display:block;';
  plate.append(speaker);plate.append(words);root.append(plate);document.body.append(root);
  let previous=null;
  function clear(){root.hidden=true;words.textContent='';speaker.textContent='';previous=null;}
  return {
    update(time,{x,y,w,h},visible=true){
      const cue=visible?subtitleAt(time):null;
      if(!cue){clear();return;}
      root.hidden=false;
      root.style.left=`${x+w/2}px`;
      root.style.top=`${y+h*.19}px`;
      root.style.width=`${w*.60}px`;
      root.style.fontSize=`${Math.min(w*52/1080,h*.055)}px`;
      if(previous!==cue.id){
        words.textContent=cue.lines.join('\n');
        speaker.textContent=cue.speaker==='bahlil'?'BAHLIL':cue.speaker==='mama-ghufron'?'GUFRON':'';
        speaker.style.display=cue.speaker==='narator'?'none':'block';
        previous=cue.id;
      }
    },
    clear,
    dispose(){clear();root.remove();},
  };
}
