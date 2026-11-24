// Local HTTP regression for the real PHP/Apache session and static-file gate.
// Creates only two fresh test sessions; never reads deployment credentials.
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=new URL(process.argv[2]||'http://localhost/project/');
assert.ok(['localhost','127.0.0.1','[::1]'].includes(base.hostname),'This test only writes sessions for a local server.');
const manifest=JSON.parse(await readFile(resolve(root,'assets/game/.vite/manifest.json'),'utf8'));
assert.ok(manifest['game-src/main.js']&&manifest['game-src/admin-main.js'],'Build both entries first.');
function reachable(entry){const seen=new Set(),pending=[entry];while(pending.length){const key=pending.pop();if(seen.has(key))continue;assert.ok(manifest[key],key);seen.add(key);pending.push(...manifest[key].imports||[],...manifest[key].dynamicImports||[]);}return seen;}
function files(keys){return new Set([...keys].flatMap(key=>[manifest[key].file,...manifest[key].css||[],...manifest[key].assets||[]]).filter(Boolean));}
const publicFiles=files(reachable('game-src/main.js')),adminFiles=files(reachable('game-src/admin-main.js'));
const privateFiles=[...adminFiles].filter(file=>!publicFiles.has(file));
assert.ok(privateFiles.length>1,'Expect separate admin and production modules.');
const sessions=[];
const request=async(path,options={})=>{
  const result=await fetch(new URL(path,base),{redirect:'manual',...options});
  for(const value of result.headers.getSetCookie()){
    const sid=/^ci_session=([a-zA-Z0-9,-]{26,128})(?:;|$)/.exec(value)?.[1];
    if(sid)sessions.push(resolve(root,'application/cache/sessions','ci_session'+sid));
  }
  return result;
};
async function createSession(admin){
  const result=await request('game-src/production-day2.js');assert.equal(result.status,403);
  await result.arrayBuffer();
  const cookie=result.headers.getSetCookie().find(value=>value.startsWith('ci_session='))?.split(';')[0];
  assert.ok(cookie,'Application must issue its own fresh session.');
  const sid=cookie.slice('ci_session='.length);assert.match(sid,/^[a-zA-Z0-9,-]{26,128}$/);
  const sessionDir=resolve(root,'application/cache/sessions'),file=resolve(sessionDir,'ci_session'+sid);
  assert.ok(file.startsWith(sessionDir+sep),'Session path stays within the configured local directory.');
  // Reading this one newly issued session checks that HTTP uses this workspace.
  const original=await readFile(file,'utf8');assert.doesNotMatch(original,/semesta_admin\|b:1/);
  sessions.push(file);
  await writeFile(file,`__ci_last_regenerate|i:${Math.floor(Date.now()/1000)};semesta_admin|b:${admin?1:0};citizen_id|i:987654321;`);
  return cookie;
}
try{
  const guestCookie=await createSession(false),adminCookie=await createSession(true);
  const privatePaths=['game-src/admin-main.js','game-src/production-day2.js','game-src/production-day2-audio.json','assets/game/.vite/manifest.json','docs/script/002-day-2-concept.md',...privateFiles.map(file=>'assets/game/'+file)];
  const clips=JSON.parse(await readFile(resolve(root,'game-src/production-day2-audio.json'),'utf8'));
  const clip=clips['day2r3-narrator-03'];
  privatePaths.push('public/audio/produksi/day-2/'+clip.file,'assets/game/audio/produksi/day-2/'+clip.file);
  const day3=JSON.parse(await readFile(resolve(root,'game-src/production-day3-audio.json'),'utf8'));
  privatePaths.push('game-src/production-day3.js','game-src/production-day3-audio.json','public/audio/produksi/day-3/'+day3['day3r2-i00'].file,'assets/game/audio/produksi/day-3/'+day3['day3r2-i00'].file);
  privatePaths.push('game-src/production-day3-r3.js');
  for(const key of ['day3r3-i00','day3r3-d24'])privatePaths.push('public/audio/produksi/day-3/'+day3[key].file,'assets/game/audio/produksi/day-3/'+day3[key].file);
  for(const path of privatePaths){
    const denied=await request(path,{headers:{Cookie:guestCookie}});assert.equal(denied.status,403,'Non-admin: '+path);assert.match(denied.headers.get('cache-control'),/no-store/);await denied.arrayBuffer();
    const allowed=await request(path,{headers:{Cookie:adminCookie}});assert.equal(allowed.status,200,'Admin: '+path);assert.match(allowed.headers.get('cache-control'),/private.*no-store/);assert.equal(allowed.headers.get('x-content-type-options'),'nosniff');
    const expected=await readFile(resolve(root,path));assert.deepEqual(Buffer.from(await allowed.arrayBuffer()),expected,'Exact served bytes: '+path);
  }
  for(const file of publicFiles){
    const result=await request('assets/game/'+file,{headers:{Cookie:guestCookie}});assert.equal(result.status,200,'Public graph: '+file);
    assert.match(result.headers.get('content-type'),file.endsWith('.css')?/text\/css/:/javascript|json|image/);
    await result.arrayBuffer();
  }
  for(const path of ['game-src/republic-world-layout.js','game-src/republic-capital-scene.js','public/models/characters/v15/male-balanced.glb'])assert.equal((await request(path,{method:'HEAD',headers:{Cookie:guestCookie}})).status,200,'Shared asset: '+path);
  const recording='docs/record/oke gas.aac';
  assert.equal((await request(recording,{method:'HEAD',headers:{Cookie:guestCookie}})).status,403,'Original recording stays private.');
  const recordingHead=await request(recording,{method:'HEAD',headers:{Cookie:adminCookie}});assert.equal(recordingHead.status,200);assert.equal(recordingHead.headers.get('content-type'),'audio/aac');
  const audioPath='public/audio/produksi/day-2/'+clip.file,source=await readFile(resolve(root,audioPath));
  const partial=await request(audioPath,{headers:{Cookie:adminCookie,Range:'bytes=4-19'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('content-type'),'audio/wav');assert.equal(partial.headers.get('content-range'),`bytes 4-19/${source.length}`);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),source.subarray(4,20));
  const badRange=await request(audioPath,{headers:{Cookie:adminCookie,Range:'bytes=999999999-'}});assert.equal(badRange.status,416);
  const head=await request(audioPath,{method:'HEAD',headers:{Cookie:adminCookie}});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),source.length);assert.equal((await head.arrayBuffer()).byteLength,0);
  const direct=await request('index.php/admin/production_asset/game-src/production-day2.js?asset=application/config/admin_credentials.php',{headers:{Cookie:adminCookie}});assert.equal(direct.status,200);assert.deepEqual(Buffer.from(await direct.arrayBuffer()),await readFile(resolve(root,'game-src/production-day2.js')));
  assert.equal((await request('admin/production_asset/application/config/admin_credentials.php',{headers:{Cookie:adminCookie}})).status,404);
  assert.equal((await request('assets/game/assets/not-a-current-bundle.js',{headers:{Cookie:adminCookie}})).status,404);
  assert.equal((await request('game-src/production-day2.js',{method:'POST',headers:{Cookie:adminCookie}})).status,405,'Asset routes accept read methods only.');
  await request('admin/logout/',{headers:{Cookie:adminCookie}});
  assert.equal((await request('game-src/production-day2.js',{headers:{Cookie:adminCookie}})).status,403,'Logout must revoke private asset access.');
  console.log(`PASS HTTP production access: ${privatePaths.length} private files require an admin session; ${publicFiles.size} public/shared graph files work; exact payloads, MIME, ranges, HEAD, traversal boundary, logout. No credentials used.`);
}finally{
  for(const file of new Set(sessions))await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
