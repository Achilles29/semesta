import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sandbox=mkdtempSync(join(tmpdir(),'semesta-git-build-'));
const seed=join(sandbox,'source'),client=join(sandbox,'checkout with spaces'),remote=join(sandbox,'remote.git');
function run(cwd,command,args=[],ok=true){
  const result=spawnSync(command,args,{cwd,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},maxBuffer:2*1024*1024});
  const output=(result.stdout||'')+(result.stderr||'');
  if(ok)assert.equal(result.status,0,`${command} ${args.join(' ')}\n${output}`);
  return {...result,output};
}
const git=(cwd,...args)=>run(cwd,'git',args);
function commit(cwd,message){git(cwd,'add','.');git(cwd,'-c','maintenance.auto=false','commit','-m',message);}
function identity(cwd){git(cwd,'config','user.name','Build Test');git(cwd,'config','user.email','build-test@example.invalid');git(cwd,'config','core.autocrlf','false');}
function count(){return Number(readFileSync(join(client,'build-count.txt'),'utf8'));}
function updateSource(path,content){git(seed,'pull','--ff-only','origin','main');writeFileSync(join(seed,path),content);commit(seed,'change '+path);git(seed,'push','origin','main');}
try{
  mkdirSync(seed);git(sandbox,'init','--bare','--initial-branch=main',remote);git(seed,'init','--initial-branch=main');identity(seed);
  for(const directory of ['tools','.githooks','game-src'])mkdirSync(join(seed,directory));
  for(const name of ['tools/git-auto-build.mjs','tools/install-git-hooks.mjs','.githooks/pre-push','.githooks/post-merge','.githooks/post-rewrite','.gitattributes'])copyFileSync(join(project,name),join(seed,name));
  const pkg={name:'git-build-fixture',version:'1.0.0',private:true,type:'module',scripts:{
    build:'node tools/fake-build.mjs',postbuild:'node tools/git-auto-build.mjs --record',prepare:'node tools/install-git-hooks.mjs --optional'}};
  writeFileSync(join(seed,'package.json'),JSON.stringify(pkg,null,2));
  writeFileSync(join(seed,'package-lock.json'),JSON.stringify({name:pkg.name,version:pkg.version,lockfileVersion:3,requires:true,packages:{'':{name:pkg.name,version:pkg.version}}}));
  writeFileSync(join(seed,'.gitignore'),'node_modules/\nassets/\nbuild-count.txt\n');
  writeFileSync(join(seed,'game-src/main.js'),'version 1');writeFileSync(join(seed,'README.md'),'fixture');
  writeFileSync(join(seed,'tools/fake-build.mjs'),`import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
const source=readFileSync('game-src/main.js','utf8');if(source==='FAIL'){console.error('EXPECTED_BUILD_FAILURE');process.exit(2);}
mkdirSync('assets/game/.vite',{recursive:true});mkdirSync('assets/game/assets',{recursive:true});
writeFileSync('assets/game/assets/main.js',source);
writeFileSync('assets/game/.vite/manifest.json',JSON.stringify({'game-src/main.js':{file:'assets/main.js'}}));
writeFileSync('build-count.txt',String((existsSync('build-count.txt')?Number(readFileSync('build-count.txt','utf8')):0)+1));`);
  git(seed,'add','.');git(seed,'update-index','--chmod=+x','.githooks/pre-push','.githooks/post-merge','.githooks/post-rewrite');commit(seed,'fixture');
  git(seed,'remote','add','origin',remote);git(seed,'push','-u','origin','main');git(sandbox,'clone',remote,client);identity(client);
  run(client,process.execPath,['tools/install-git-hooks.mjs']);run(client,process.execPath,['tools/git-auto-build.mjs']);assert.equal(count(),1);

  updateSource('game-src/main.js','version 2');git(client,'pull','--ff-only');assert.equal(count(),2,'Pull must build changed frontend');
  updateSource('README.md','documentation only');git(client,'pull','--ff-only');assert.equal(count(),2,'Docs-only pull must skip');
  unlinkSync(join(client,'assets/game/assets/main.js'));writeFileSync(join(client,'local.md'),'local');commit(client,'local docs');git(client,'push','origin','main');assert.equal(count(),3,'Push repairs missing output');

  writeFileSync(join(client,'rebase.md'),'local rebase');commit(client,'local docs to rebase');
  updateSource('game-src/main.js','version 3');git(client,'pull','--rebase','origin','main');assert.equal(count(),4,'Pull rebase must build');
  git(client,'push','origin','main');assert.equal(count(),4,'Push with matching build skips');

  pkg.description='changed package metadata';updateSource('package.json',JSON.stringify(pkg,null,2));
  const dependencies=git(client,'pull','--ff-only');assert.match(dependencies.output,/Menyesuaikan dependensi/);assert.equal(count(),5);
  const previous=readFileSync(join(client,'assets/game/.semesta-build.json'),'utf8');
  updateSource('game-src/main.js','FAIL');const failedPull=run(client,'git',['pull','--ff-only'],false);
  assert.match(failedPull.output,/EXPECTED_BUILD_FAILURE/);assert.match(failedPull.output,/perubahan Git tetap masuk/);
  assert.equal(readFileSync(join(client,'assets/game/.semesta-build.json'),'utf8'),previous,'Failed builds must not be marked ready');
  writeFileSync(join(client,'blocked.md'),'blocked');commit(client,'blocked push');
  const failedPush=run(client,'git',['push','origin','main'],false);assert.notEqual(failedPush.status,0);assert.match(failedPush.output,/EXPECTED_BUILD_FAILURE/);
  writeFileSync(join(client,'game-src/main.js'),'recovered');commit(client,'recovery');git(client,'push','origin','main');assert.equal(count(),6);
  assert.equal(git(remote,'rev-parse','main').stdout,git(client,'rev-parse','HEAD').stdout);

  git(client,'config','core.hooksPath','custom-hooks');const custom=run(client,process.execPath,['tools/install-git-hooks.mjs'],false);
  assert.notEqual(custom.status,0);assert.equal(git(client,'config','--get','core.hooksPath').stdout.trim(),'custom-hooks');
  console.log('PASS: real push/pull hooks, fast-forward, rebase, docs skip, missing output, dependency sync, failed build recovery, custom hook preservation, paths with spaces.');
}finally{
  // The only recursively removed path is the exact temporary fixture we created.
  const child=relative(resolve(tmpdir()),resolve(sandbox));
  assert.ok(child.startsWith('semesta-git-build-')&&!child.includes('..')&&!child.includes('/')&&!child.includes('\\'));
  rmSync(sandbox,{recursive:true,force:true});
}
