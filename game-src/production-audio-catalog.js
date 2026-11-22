import day1 from './production-day1-audio.json' with {type:'json'};
import day2 from './production-day2-audio.json' with {type:'json'};

/** Existing Day 1 keys remain stable; every Day 2 key has its own prefix. */
export const STORY_CLIPS=Object.freeze({...day1,...day2});
export const clipFor=key=>Object.hasOwn(STORY_CLIPS,key)?STORY_CLIPS[key]:null;
export default STORY_CLIPS;
