import legacy from './production-day1-legacy.json' with {type:'json'};
import legacyV2 from './production-day1-legacy-v2.json' with {type:'json'};
import legacyV3 from './production-day1-legacy-v3.json' with {type:'json'};
import audio from './production-day1-audio.json' with {type:'json'};
import {day1Scenario,day1Caption} from './production-day1.js';
import {day2Scenario} from './production-day2.js';
import {STORY_CLIPS} from './production-audio-catalog.js';
import {displaySpeechText} from './production-speech-text.js';
import {isUneditedBuiltInEpisode} from './production-episode-origin.js';
import {blankScenario} from './production-scenario.js';

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
  if(isUneditedBuiltInEpisode(input)&&input.builtInOrigin.episode==='day2')return day2Scenario();
  const fingerprint=canonical(input),current=day1Scenario();
  const previousCurrent=oldAutosave(current,Object.fromEntries(Object.entries(audio).map(([key,clip])=>[key,clip.duration])));
  if(legacyDocuments.has(fingerprint)||fingerprint===canonical(current)||fingerprint===canonical(previousCurrent))return current;
  const draft=structuredClone(input);
  for(const shot of draft.shots||[]){
    if(shot.speech&&!STORY_CLIPS[shot.speech]){shot.plannedSpeech=shot.speech;delete shot.speech;delete shot.speechOffset;}
    if(shot.speech&&STORY_CLIPS[shot.speech]){
      if(shot.caption!==displaySpeechText(STORY_CLIPS[shot.speech].text)){delete shot.speech;delete shot.speechOffset;}
      else {
        const minimum=(shot.speechOffset??.3)+STORY_CLIPS[shot.speech].duration-(shot.speechTail||0);
        if(minimum-shot.duration>1e-9)shot.duration=minimum;
      }
    }
    if(shot.speeches?.length){
      const available=shot.speeches.filter(cue=>STORY_CLIPS[cue.key]);
      const missing=shot.speeches.filter(cue=>!STORY_CLIPS[cue.key]);
      if(missing.length)shot.plannedSpeeches=[...(shot.plannedSpeeches||[]),...missing];
      // An empty caption deliberately delegates the transcript to each timed
      // speech cue, including cuts where the final syllable bridges the edit.
      if(available.length&&(!shot.caption?.trim()||shot.caption===available.map(cue=>displaySpeechText(STORY_CLIPS[cue.key].text)).join(' '))){
        shot.speeches=available;
        shot.duration=Math.max(shot.duration,...available.map(cue=>(cue.offset??.3)+STORY_CLIPS[cue.key].duration-(shot.speechTail||0)));
      }else delete shot.speeches;
    }
  }
  return draft;
}

export function isPristineProductionDraft(input){
  if(!input)return false;
  if(isUneditedBuiltInEpisode(input))return true;
  const fingerprint=canonical(input),current=day1Scenario();
  const previousCurrent=oldAutosave(current,Object.fromEntries(Object.entries(audio).map(([key,clip])=>[key,clip.duration])));
  return legacyDocuments.has(fingerprint)||fingerprint===canonical(current)||fingerprint===canonical(previousCurrent);
}

/** A newer episode replaces only generated defaults; authored work wins. */
export function resolveProductionDraft(input,{emptyIntent=false,preferredEpisode}={}){
  if(!input)return day2Scenario();
  if(isPristineProductionDraft(input))return preferredEpisode==='day1'?day1Scenario():day2Scenario();
  if(!emptyIntent&&canonical(input)===canonical(blankScenario()))return day2Scenario();
  return migrateProductionDraft(input);
}
