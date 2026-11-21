import legacy from './production-day1-legacy.json' with {type:'json'};
import legacyV2 from './production-day1-legacy-v2.json' with {type:'json'};
import legacyV3 from './production-day1-legacy-v3.json' with {type:'json'};
import audio from './production-day1-audio.json' with {type:'json'};
import {day1Scenario,day1Caption} from './production-day1.js';

const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
// The old loader padded spoken shots to .35s and immediately autosaved them.
// These measured v2 clip durations are pinned from d94a771, the audio used by v3.
// Reproduce that exact saved document; never broadly ignore duration differences.
const legacyV3Durations={
  'narrator-01':2.629002267573696,'narrator-02':3.0560090702947846,'narrator-03':2.8860090702947847,
  'prabowow-01':1.8180045351473924,'prabowow-02':1.945986394557823,'prabowow-03':1.563015873015873,
  'prabowow-04':4.2509977324263035,'prabowow-05':3.8670068027210887,'prabowow-06':3.6780045351473922,
  'prabowow-07':6.47,'prabowow-08':4.785011337868481,'prabowow-09':4.038004535147392,'prabowow-10':7,
  'sari-01':2.671995464852608,'sari-02':.9649886621315192,'sari-03':1.0509977324263038,'sari-04':2.0319954648526077,
  'joko-01':1.7329931972789117,'joko-02':1.306984126984127,'joko-03':1.563015873015873,
};
function oldAutosave(scenario,durations){
  const saved=structuredClone(scenario);
  for(const shot of saved.shots)if(shot.speech&&durations[shot.speech]!==undefined)
    shot.duration=Math.max(shot.duration,(shot.speechOffset??.3)+durations[shot.speech]+.35);
  return saved;
}
function oldVoiceRefresh(scenario){
  const saved=structuredClone(scenario);
  for(const shot of saved.shots){
    if(shot.speech&&(!audio[shot.speech]||shot.caption!==day1Caption(shot.speech))){delete shot.speech;delete shot.speechOffset;}
    else if(shot.speech)shot.duration=Math.max(shot.duration,(shot.speechOffset??.3)+audio[shot.speech].duration+.35);
  }
  return saved;
}
const savedLegacyV3=oldAutosave(legacyV3,legacyV3Durations);
// Opening the voice refresh once could strip stale clips before autosaving again.
// Match only that exact generated document, including all text, positions and cuts.
const legacyDocuments=new Set([legacy,legacyV2,legacyV3,savedLegacyV3,oldVoiceRefresh(savedLegacyV3)].map(canonical));
/** Upgrade only a pristine shipped episode. Preserve every authored shot/text. */
export function migrateProductionDraft(input){
  const fingerprint=canonical(input),current=day1Scenario();
  const previousCurrent=oldAutosave(current,Object.fromEntries(Object.entries(audio).map(([key,clip])=>[key,clip.duration])));
  if(legacyDocuments.has(fingerprint)||fingerprint===canonical(current)||fingerprint===canonical(previousCurrent))return current;
  const draft=structuredClone(input);
  for(const shot of draft.shots||[]){
    if(shot.speech&&!audio[shot.speech]){delete shot.speech;delete shot.speechOffset;}
    if(shot.speech&&audio[shot.speech]){
      if(shot.caption!==day1Caption(shot.speech)){delete shot.speech;delete shot.speechOffset;}
      else {
        const minimum=(shot.speechOffset??.3)+audio[shot.speech].duration+.32;
        if(minimum-shot.duration>1e-9)shot.duration=minimum;
      }
    }
  }
  return draft;
}
