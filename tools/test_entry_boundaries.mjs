import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('.');
async function sourceGraph(entry){
  const files=new Set(),queue=[path.resolve(root,entry)];
  while(queue.length){
    const file=queue.pop();if(files.has(file))continue;files.add(file);
    if(!file.endsWith('.js'))continue;
    const source=await readFile(file,'utf8');
    const imports=/\b(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"](\.[^'"]+)['"]|\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    for(const match of source.matchAll(imports))queue.push(path.resolve(path.dirname(file),(match[1]||match[2]).split('?')[0]));
  }
  return new Set([...files].map(file=>path.relative(root,file).replaceAll('\\','/')));
}
const publicGraph=await sourceGraph('game-src/main.js'),adminGraph=await sourceGraph('game-src/admin-main.js');
assert.ok(publicGraph.has('game-src/republic-openworld.js'),'Follow lazy imports as well as the public entry');
assert.ok(publicGraph.has('game-src/republic-civic-center.js'),'Shared civic geometry stays accessible in the game');
for(const file of publicGraph)assert.doesNotMatch(file,/(?:^|\/)(?:production-|admin-)|audio\/produksi|docs\/script/,'No production or admin module belongs to the public dependency graph');
assert.ok(adminGraph.has('game-src/production-studio.js'));
assert.ok(adminGraph.has('game-src/production-day2.js'));
assert.ok(adminGraph.has('game-src/production-audio-catalog.js'));
const [gameTemplate,adminTemplate]=await Promise.all(['game','admin'].map(name=>readFile(`application/views/${name}.php`,'utf8')));
assert.doesNotMatch(gameTemplate,/data-open-production|production-map-player|production-studio|admin-main/);
assert.match(adminTemplate,/game-src\/admin-main\.js/);assert.match(adminTemplate,/id="adminProductionStudio"/);
assert.doesNotMatch(adminTemplate,/game-src\/main\.js/);

// After a build, verify the actual Vite manifest has separate reachable graphs.
const manifest=JSON.parse(await readFile('assets/game/.vite/manifest.json','utf8'));
assert.ok(manifest['game-src/main.js']);assert.ok(manifest['game-src/admin-main.js'],'Build both entries before delivery');
function builtGraph(entry){const seen=new Set(),queue=[entry];while(queue.length){const key=queue.pop();if(seen.has(key))continue;seen.add(key);const chunk=manifest[key];assert.ok(chunk,`Manifest dependency ${key} exists`);queue.push(...chunk.imports||[],...chunk.dynamicImports||[]);}return seen;}
const publicBuilt=builtGraph('game-src/main.js'),adminBuilt=builtGraph('game-src/admin-main.js');
assert.ok([...adminBuilt].some(key=>key.includes('production-studio')));
for(const key of publicBuilt)assert.doesNotMatch(key,/production-|admin-main/);
console.log(`PASS entry boundaries: ${publicGraph.size} public source modules exclude episodes; ${adminGraph.size} admin modules retain production. Built public/admin graphs are separate. Server authentication is checked by the asset-gate tests.`);
