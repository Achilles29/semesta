import {day1Scenario} from './production-day1.js';
import {day2Scenario} from './production-day2.js';

export const PRODUCTION_EPISODES=Object.freeze({day2:'Day 2 · Sudah Dibangun, Baru Ditanya',day1:'Day 1 · Baru Buka, Sudah Ada Orang Dalam'});
export const LATEST_EPISODE='day2';
export const scenarioForEpisode=id=>id==='day1'?day1Scenario():day2Scenario();
export function episodeForScenario(scenario){
  if(Object.hasOwn(PRODUCTION_EPISODES,scenario?.episode))return scenario.episode;
  if(scenario?.set==='construction')return 'day2';
  if(scenario?.set==='republic'&&scenario.kind==='episode')return 'day1';
  return 'draft';
}
