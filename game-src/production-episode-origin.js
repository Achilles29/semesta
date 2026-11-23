const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).filter(key=>key!=='builtInOrigin').sort().map(key=>[key,item[key]])):item);
// Two independent integer streams identify the exact generated document. A
// changed title, duration, position or cue invalidates the original signature.
const signature=value=>{let a=2166136261,b=5381;for(const char of canonical(value)){a=Math.imul(a^char.charCodeAt(0),16777619);b=Math.imul(b,33)^char.charCodeAt(0);}return `${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`;};
export function markBuiltInEpisode(scenario){scenario.builtInOrigin={episode:scenario.episode,signature:signature(scenario)};return scenario;}
export const isUneditedBuiltInEpisode=scenario=>!!scenario?.builtInOrigin&&['day1','day2','day3'].includes(scenario.builtInOrigin.episode)&&scenario.builtInOrigin.signature===signature(scenario);
