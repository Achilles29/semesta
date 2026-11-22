import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync,unlinkSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from 'vite';
import viteConfig from '../vite.config.js';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sandbox=mkdtempSync(join(tmpdir(),'semesta-git-build-'));
const client=join(sandbox,'checkout with spaces'),server=join(sandbox,'server without build'),remote=join(sandbox,'remote.git');
function run(cwd,command,args=[],ok=true,options={}){
  const result=spawnSync(command,args,{cwd,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},maxBuffer:4*1024*1024,...options});
  const output=(result.stdout||'')+(result.stderr||'');
  if(ok)assert.equal(result.status,0,`${command} ${args.join(' ')}\n${output}`);
  return {...result,output};
}
const git=(cwd,...args)=>run(cwd,'git',args);
const node=(...args)=>run(client,process.execPath,['tools/git-auto-build.mjs',...args]);
const count=()=>Number(readFileSync(join(client,'build-count.txt'),'utf8'));
function commit(message){git(client,'add','.');return git(client,'-c','maintenance.auto=false','commit','-m',message);}
function manifest(cwd=client){return JSON.parse(readFileSync(join(cwd,'assets/game/.vite/manifest.json'),'utf8'));}
function verifyServer(version){
  const entry=manifest(server)['game-src/main.js'].file;
  assert.equal(readFileSync(join(server,'assets/game',entry),'utf8'),version);
  assert.ok(!existsSync(join(server,'node_modules')),'Receiving a release must never install dependencies');
  run(server,process.execPath,['tools/git-auto-build.mjs','--verify-release']);
}
try{
  // Exercise generated Vite preload URLs in root and subdirectory installs.
  const fixture=join(sandbox,'asset-paths');mkdirSync(fixture);
  writeFileSync(join(fixture,'main.js'),"globalThis.openStudio=()=>import('./studio.js');");
  writeFileSync(join(fixture,'studio.js'),"import './studio.css';export const ready=true;");
  writeFileSync(join(fixture,'studio.css'),'body{color:navy}');
  const built=await build({configFile:false,root:fixture,base:viteConfig.base,publicDir:false,logLevel:'silent',build:{write:false,minify:false,rollupOptions:{input:join(fixture,'main.js')}}});
  const entry=built.output.find(file=>file.type==='chunk'&&file.isEntry);
  const paths=JSON.parse(entry.code.match(/m\.f=([^)]*)\)\)\)/)[1]);
  const resolver=entry.code.match(/var assetsURL = function\(([^)]*)\) \{([\s\S]*?)\n\};/);
  assert.ok(resolver);
  const resolveAsset=new Function(...resolver[1].split(',').map(arg=>arg.trim()),resolver[2]);
  for(const prefix of ['/','/project/'])for(const asset of paths){
    const file=built.output.find(output=>output.fileName.endsWith(asset.replace(/^\.\//,'')));assert.ok(file);
    assert.equal(resolveAsset(asset,`http://localhost${prefix}assets/game/${entry.fileName}`),`http://localhost${prefix}assets/game/${file.fileName}`);
  }

  mkdirSync(client);git(sandbox,'init','--bare','--initial-branch=main',remote);git(client,'init','--initial-branch=main');
  git(client,'config','user.name','Build Test');git(client,'config','user.email','build-test@example.invalid');git(client,'config','core.autocrlf','false');
  for(const dir of ['tools','.githooks','game-src','public'])mkdirSync(join(client,dir));
  for(const name of ['tools/git-auto-build.mjs','tools/install-git-hooks.mjs','.githooks/pre-commit','.githooks/pre-push','.githooks/post-merge','.githooks/post-rewrite','.gitattributes','.gitignore'])copyFileSync(join(project,name),join(client,name));
  writeFileSync(join(client,'.gitignore'),readFileSync(join(client,'.gitignore'),'utf8')+'\nbuild-count.txt\n');
  const pkg={name:'git-build-fixture',version:'1.0.0',private:true,type:'module',scripts:{build:'node tools/fake-build.mjs',postbuild:'node tools/git-auto-build.mjs --record',prepare:'node tools/install-git-hooks.mjs --optional'}};
  writeFileSync(join(client,'package.json'),JSON.stringify(pkg,null,2));
  writeFileSync(join(client,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages:{'':{name:pkg.name,version:pkg.version}}}));
  writeFileSync(join(client,'game-src/main.js'),'version 1');writeFileSync(join(client,'public/model.txt'),'public asset');
  writeFileSync(join(client,'vite.config.js'),'export default {};');
  writeFileSync(join(client,'tools/fake-build.mjs'),`import {mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
const source=readFileSync('game-src/main.js','utf8');if(source==='FAIL'){console.error('EXPECTED_BUILD_FAILURE');process.exit(2);}
const hash=createHash('sha256').update(source).digest('hex').slice(0,8);
rmSync('assets/game/assets',{recursive:true,force:true});mkdirSync('assets/game/.vite',{recursive:true});mkdirSync('assets/game/assets',{recursive:true});
const files={main:'assets/main-'+hash+'.js',admin:'assets/admin-'+hash+'.js',map:'assets/map-'+hash+'.js'};
writeFileSync('assets/game/'+files.main,source);writeFileSync('assets/game/'+files.admin,'admin '+source);writeFileSync('assets/game/'+files.map,'map '+source);
writeFileSync('assets/game/.vite/manifest.json',JSON.stringify({'game-src/main.js':{file:files.main,dynamicImports:['game-src/map.js']},'game-src/admin-main.js':{file:files.admin},'game-src/map.js':{file:files.map}}));
writeFileSync('build-count.txt',String((existsSync('build-count.txt')?Number(readFileSync('build-count.txt','utf8')):0)+1));`);
  // Migrate the actual failure mode: an old server owns an ignored manifest.
  const releaseIgnore=readFileSync(join(client,'.gitignore'),'utf8');
  writeFileSync(join(client,'.gitignore'),'/assets/game/\n/node_modules/\nbuild-count.txt\n');
  commit('legacy ignored build');git(client,'remote','add','origin',remote);git(client,'push','-u','origin','main');
  git(sandbox,'clone',remote,server);mkdirSync(join(server,'assets/game/.vite'),{recursive:true});
  writeFileSync(join(server,'assets/game/.vite/manifest.json'),JSON.stringify({legacy:'old map'}));
  writeFileSync(join(client,'.gitignore'),releaseIgnore);
  git(client,'add','.');git(client,'update-index','--chmod=+x','.githooks/pre-commit','.githooks/pre-push','.githooks/post-merge','.githooks/post-rewrite');
  run(client,process.execPath,['tools/install-git-hooks.mjs']);commit('initial release');assert.equal(count(),1);
  git(client,'push');git(server,'pull','--ff-only');verifyServer('version 1');
  const fresh=join(sandbox,'fresh clone');git(sandbox,'clone',remote,fresh);
  assert.ok(existsSync(join(fresh,'assets/game',manifest(fresh)['game-src/main.js'].file)),'A fresh clone includes its built entry');
  assert.equal(run(server,'git',['config','--get','core.hooksPath'],false).status,1,'A fresh server needs no hook installation');

  writeFileSync(join(client,'game-src/main.js'),'version 2');commit('change map');assert.equal(count(),2);
  git(client,'push');git(server,'pull','--ff-only');verifyServer('version 2');
  writeFileSync(join(client,'README.md'),'docs');commit('docs only');assert.equal(count(),2,'Docs-only commit skips build');
  git(client,'push');git(server,'pull','--ff-only');verifyServer('version 2');

  writeFileSync(join(client,'game-src/main.js'),'version 3');git(client,'add','game-src/main.js');
  writeFileSync(join(client,'game-src/main.js'),'unstaged private experiment');
  const partial=run(client,'git',['commit','-m','partial source'],false);
  assert.notEqual(partial.status,0);assert.match(partial.output,/belum di-stage/);assert.equal(count(),2);
  assert.equal(readFileSync(join(client,'game-src/main.js'),'utf8'),'unstaged private experiment','Never alter user unstaged source');
  writeFileSync(join(client,'game-src/main.js'),'version 3');commit('complete source');assert.equal(count(),3);

  const beforeFailure=git(client,'rev-parse','HEAD').stdout;
  writeFileSync(join(client,'game-src/main.js'),'FAIL');git(client,'add','.');
  const failure=run(client,'git',['commit','-m','must fail'],false);assert.notEqual(failure.status,0);assert.match(failure.output,/EXPECTED_BUILD_FAILURE/);
  assert.equal(git(client,'rev-parse','HEAD').stdout,beforeFailure);
  writeFileSync(join(client,'game-src/main.js'),'version 4');commit('recover');assert.equal(count(),4);

  // Bypassing commit hooks must still be caught before publication. Push never
  // silently repairs only the working copy after the commit has already formed.
  writeFileSync(join(client,'game-src/main.js'),'version 5');git(client,'add','.');
  git(client,'-c','core.hooksPath=missing-hooks','commit','-m','stale release');
  const stale=run(client,'git',['push'],false);assert.notEqual(stale.status,0);assert.match(stale.output,/Sumber frontend dan rilis belum sama/);assert.equal(count(),4);
  node();assert.equal(count(),5);commit('include release');git(client,'push');git(server,'pull','--ff-only');verifyServer('version 5');

  // The lazy world chunk matters even when both entry files still exist.
  unlinkSync(join(client,'assets/game',manifest()['game-src/map.js'].file));node();assert.equal(count(),6,'Missing lazy map chunk rebuilds');
  writeFileSync(join(client,'assets/game/.vite/manifest.json'),JSON.stringify({'game-src/main.js':manifest()['game-src/main.js']}));
  node();assert.equal(count(),7,'Legacy single-entry manifest rebuilds');
  node();assert.equal(count(),7,'Matching release skips build');

  // Public models are tracked once, not copied into the generated release.
  mkdirSync(join(client,'assets/game/models'),{recursive:true});writeFileSync(join(client,'assets/game/models/unneeded.glb'),'duplicate');
  assert.equal(run(client,'git',['check-ignore','assets/game/models/unneeded.glb'],false).status,0);
  assert.equal(run(client,'git',['check-ignore','assets/game/.vite/manifest.json'],false).status,1);
  writeFileSync(join(client,'public/model.txt'),'updated public asset');commit('asset update');assert.equal(count(),8);
  git(client,'push');git(server,'pull','--ff-only');verifyServer('version 5');assert.equal(readFileSync(join(server,'public/model.txt'),'utf8'),'updated public asset');

  // Existing server hooks also tolerate a deployment machine with no Node.
  const shell=run(client,'git',['var','GIT_SHELL_PATH']).stdout.trim();
  for(const hook of ['post-merge','post-rewrite']){
    const noNode=run(client,shell,['.githooks/'+hook,...(hook==='post-rewrite'?['rebase']:[])],true,{env:{...process.env,PATH:''}});
    assert.match(noNode.output,/Tidak perlu build di server/);
  }
  git(client,'config','core.hooksPath','custom-hooks');const custom=run(client,process.execPath,['tools/install-git-hooks.mjs'],false);
  assert.notEqual(custom.status,0);assert.equal(git(client,'config','--get','core.hooksPath').stdout.trim(),'custom-hooks');
  console.log('PASS: relative lazy URLs, versioned release, automatic scoped staging, plain clone/pull without Node/install/hooks, partial staging protection, failed build, stale push rejection, lazy chunk integrity, public assets single source, custom hook preservation.');
}finally{
  const child=relative(resolve(tmpdir()),resolve(sandbox));
  assert.ok(child.startsWith('semesta-git-build-')&&!child.includes('..')&&!child.includes('/')&&!child.includes('\\'));
  rmSync(sandbox,{recursive:true,force:true});
}
