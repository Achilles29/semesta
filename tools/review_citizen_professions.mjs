/** Export runtime recommendations for the existing offline GLB portrait renderer. */
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {professions,professionRecommendation} from '../game-src/citizen-professions.js';
const output=path.resolve(process.argv[2]||'C:/tmp/republic-professions/recommendations.json');
const presets=Object.keys(professions).flatMap(role=>['male','female'].map(gender=>{
  const suggestion=professionRecommendation(role,gender);
  return {id:suggestion.config.presetId,name:suggestion.name,config:suggestion.config};
}));
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(presets,null,2)+'\n');
console.log(`Exported ${presets.length} runtime recommendations to ${output}`);
