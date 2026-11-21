import legacy from './production-day1-legacy.json' with {type:'json'};
import audio from './production-day1-audio.json' with {type:'json'};
import {day1Scenario,day1Caption} from './production-day1.js';

const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
/** Upgrade only a pristine shipped episode. Preserve every authored shot/text. */
export function migrateProductionDraft(input){
  if(canonical(input)===canonical(legacy))return day1Scenario();
  const draft=structuredClone(input);
  for(const shot of draft.shots||[]){
    if(shot.speech&&audio[shot.speech]){
      if(shot.caption!==day1Caption(shot.speech)){delete shot.speech;delete shot.speechOffset;}
      else shot.duration=Math.max(shot.duration,(shot.speechOffset??.3)+audio[shot.speech].duration+.35);
    }
  }
  return draft;
}
