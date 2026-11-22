import {clipFor} from './production-audio-catalog.js';

export const speechCues = shot => shot?.speeches || (shot?.speech ? [{key:shot.speech,offset:shot.speechOffset??.3}] : []);
export function speakerCastId(clip,scenario){
  if(!clip)return null;
  return clip.castId || (scenario.cast.some(c=>c.id===clip.speaker)?clip.speaker:{prabowow:'a',sari:'b',joko:'c'}[clip.speaker]) || null;
}
export function activeSpeeches(sample,scenario,{tail=0}={}){
  if(!sample)return [];
  return (sample.speechSources||speechCues(sample.shot)).flatMap(cue=>{
    const clip=clipFor(cue.key),local=cue.shotStart!==undefined?sample.time-cue.shotStart-(cue.offset??.3):sample.elapsed-(cue.offset??.3);
    return clip&&local>=0&&local<clip.duration+tail?[{...cue,clip,local,castId:speakerCastId(clip,scenario)}]:[];
  });
}
