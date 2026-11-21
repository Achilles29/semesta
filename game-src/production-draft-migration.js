import legacy from './production-day1-legacy.json' with {type:'json'};
import legacyV2 from './production-day1-legacy-v2.json' with {type:'json'};
import legacyV3 from './production-day1-legacy-v3.json' with {type:'json'};
import audio from './production-day1-audio.json' with {type:'json'};
import {day1Scenario,day1Caption} from './production-day1.js';

const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
/** Upgrade only a pristine shipped episode. Preserve every authored shot/text. */
export function migrateProductionDraft(input){
  if([legacy,legacyV2,legacyV3].some(version=>canonical(input)===canonical(version)))return day1Scenario();
  const draft=structuredClone(input);
  for(const shot of draft.shots||[]){
    if(shot.speech&&!audio[shot.speech]){delete shot.speech;delete shot.speechOffset;}
    if(shot.speech&&audio[shot.speech]){
      if(shot.caption!==day1Caption(shot.speech)){delete shot.speech;delete shot.speechOffset;}
      else shot.duration=Math.max(shot.duration,(shot.speechOffset??.3)+audio[shot.speech].duration+.35);
    }
  }
  return draft;
}
