import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const stateFile=resolve(root,'assets/game/.semesta-build.json');
const inputs=['game-src/','public/','package.json','package-lock.json','vite.config.*',
  '.githooks/','tools/git-auto-build.mjs','tools/install-git-hooks.mjs'];

function git(args){
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error(result.stderr||result.error?.message||'Git tidak tersedia.');
  return result.stdout.trim();
}
function readJson(path){try{return JSON.parse(readFileSync(path,'utf8'));}catch{return null;}}
function snapshot(){
  const dependencies=createHash('sha256');
  for(const name of ['package.json','package-lock.json'])dependencies.update(readFileSync(resolve(root,name)));
  return {version:1,sourceRevision:git(['log','-1','--format=%H','--',...inputs]),dependencies:dependencies.digest('hex')};
}
function outputReady(){
  const manifest=readJson(resolve(root,'assets/game/.vite/manifest.json'));
  const entry=manifest?.['game-src/main.js'];
  return Boolean(entry?.file&&existsSync(resolve(root,'assets/game',entry.file)));
}
function dependenciesReady(){
  const pkg=readJson(resolve(root,'package.json'));
  return Object.keys({...pkg.dependencies,...pkg.devDependencies})
    .every(name=>existsSync(resolve(root,'node_modules',name,'package.json')));
}
function npm(command){
  // These commands are fixed literals, never arguments received from Git or users.
  // A shell resolves npm.cmd on Windows and npm on Unix, including PATH from nvm.
  const result=spawnSync(command,{cwd:root,shell:true,stdio:['ignore','inherit','inherit'],windowsHide:true});
  if(result.status!==0)throw new Error(`${command} gagal (${result.status??result.error?.message}).`);
}

try{
  if(process.argv.includes('--record')&&spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,stdio:'ignore',windowsHide:true}).status!==0){
    console.log('[frontend] Build selesai tanpa metadata Git (paket deploy).');
    process.exit(0);
  }
  const current=snapshot();
  if(process.argv.includes('--record')){
    if(!outputReady())throw new Error('Manifest atau bundle frontend belum tersedia.');
    writeFileSync(stateFile,JSON.stringify(current,null,2)+'\n');
  }else{
    const previous=readJson(stateFile);
    if(previous?.version===current.version&&previous.sourceRevision===current.sourceRevision&&
      previous.dependencies===current.dependencies&&outputReady()&&dependenciesReady()){
      console.log('[frontend] Build sudah sesuai; tidak perlu build ulang.');
    }else{
      if(previous?.dependencies!==current.dependencies||!dependenciesReady()){
        console.log('[frontend] Menyesuaikan dependensi dengan package-lock.json...');
        npm('npm ci --include=dev --no-audit --no-fund');
      }
      console.log('[frontend] Membuat build untuk kode terbaru...');
      npm('npm run build');
      // postbuild records successful manual builds too. Never record a failed build.
      const recorded=readJson(stateFile);
      if(recorded?.sourceRevision!==current.sourceRevision||recorded?.dependencies!==current.dependencies)
        throw new Error('Status build belum tercatat; periksa script postbuild.');
      console.log('[frontend] Build terbaru siap digunakan.');
    }
  }
}catch(error){
  console.error(`[frontend] ${error.message}`);
  console.error('[frontend] Build otomatis gagal. Jika terjadi setelah pull, perubahan Git tetap masuk. Perbaiki error di atas, lalu jalankan npm run build.');
  process.exitCode=1;
}
