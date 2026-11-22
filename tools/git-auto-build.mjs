import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const releaseRoot='assets/game/';
const stateName=releaseRoot+'.semesta-build.json',manifestName=releaseRoot+'.vite/manifest.json';
const releasePaths=[releaseRoot+'assets',manifestName,stateName];
const inputs=['game-src/','public/','package.json','package-lock.json','vite.config.js',
  '.githooks/','tools/git-auto-build.mjs','tools/install-git-hooks.mjs','.gitignore','.gitattributes'];
const sha=data=>createHash('sha256').update(data).digest('hex');

function git(args,{binary=false,allowFailure=false}={}){
  const result=spawnSync('git',args,{cwd:root,encoding:binary?undefined:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
  if(result.status!==0&&!allowFailure)throw new Error(String(result.stderr||result.error?.message||'Git tidak tersedia.'));
  return result.status===0?result.stdout:null;
}
function read(name,tree='worktree'){
  if(tree==='worktree'){try{return readFileSync(resolve(root,name));}catch{return null;}}
  return git(['show',(tree==='index'?':':tree+':')+name],{binary:true,allowFailure:true});
}
function json(name,tree='worktree'){try{return JSON.parse(read(name,tree));}catch{return null;}}
function sourceSnapshot(tree='worktree'){
  const indexed=tree==='worktree'||tree==='index';
  const listing=git(indexed?['ls-files','--stage','-z','--',...inputs]:['ls-tree','-r','-z',tree,'--',...inputs]);
  const blobs=new Map();
  for(const entry of listing.split('\0').filter(Boolean)){
    const tab=entry.indexOf('\t'),header=entry.slice(0,tab).split(' '),name=entry.slice(tab+1);
    if(indexed&&header[2]!=='0')throw new Error('Selesaikan konflik Git sebelum membuat rilis.');
    blobs.set(name,indexed?header[1]:header[2]);
  }
  if(tree==='worktree'){
    const changed=git(['diff','--name-only','-z','--',...inputs]);
    const untracked=git(['ls-files','--others','--exclude-standard','-z','--',...inputs]);
    for(const name of new Set((changed+untracked).split('\0').filter(Boolean))){
      if(existsSync(resolve(root,name)))blobs.set(name,git(['hash-object','--',name]).trim());
      else blobs.delete(name);
    }
  }
  return sha([...blobs].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,hash])=>name+'\0'+hash+'\0').join(''));
}
function outputFiles(tree='worktree'){
  const manifest=json(manifestName,tree);
  if(!manifest?.['game-src/main.js']?.file||!manifest?.['game-src/admin-main.js']?.file)
    throw new Error('Manifest rilis harus berisi entry game dan admin.');
  const names=new Set([manifestName]);
  for(const entry of Object.values(manifest)){
    for(const key of [...entry.imports||[],...entry.dynamicImports||[]])if(!manifest[key])throw new Error('Dependency manifest hilang: '+key);
    for(const file of [entry.file,...entry.css||[],...entry.assets||[]].filter(Boolean)){
      if(!/^assets\/[a-zA-Z0-9_.-]+$/.test(file))throw new Error('Path output rilis tidak valid: '+file);
      names.add(releaseRoot+file);
    }
  }
  return [...names].sort();
}
function inspect(tree='worktree'){
  try{
    const record=json(stateName,tree);
    if(record?.version!==2||record.sourceHash!==sourceSnapshot(tree))throw new Error('Sumber frontend dan rilis belum sama.');
    for(const name of outputFiles(tree)){
      const data=read(name,tree);
      if(!data||record.outputs?.[name]!==sha(data))throw new Error('Bundle hilang atau berbeda: '+name);
    }
    return {ready:true};
  }catch(error){return {ready:false,reason:error.message};}
}
function record(){
  const outputs={};
  for(const name of outputFiles()){
    const data=read(name);
    if(!data)throw new Error('Build belum lengkap: '+name);
    outputs[name]=sha(data);
  }
  writeFileSync(resolve(root,stateName),JSON.stringify({version:2,sourceHash:sourceSnapshot(),outputs},null,2)+'\n');
}
function dependenciesReady(){
  const pkg=json('package.json');
  return Object.keys({...pkg.dependencies,...pkg.devDependencies}).every(name=>existsSync(resolve(root,'node_modules',name,'package.json')));
}
function dependencyHash(){return sha(Buffer.concat([readFileSync(resolve(root,'package.json')),readFileSync(resolve(root,'package-lock.json'))]));}
function npm(command){
  const result=spawnSync(command,{cwd:root,shell:true,stdio:['ignore','inherit','inherit'],windowsHide:true});
  if(result.status!==0)throw new Error(`${command} gagal (${result.status??result.error?.message}).`);
}
function build(){
  const pkg=json('package.json'),hasDependencies=Object.keys({...pkg.dependencies,...pkg.devDependencies}).length>0;
  if(!dependenciesReady()||(hasDependencies&&json('node_modules/.semesta-dependencies.json')?.hash!==dependencyHash())){
    npm('npm ci --include=dev --no-audit --no-fund');
    writeFileSync(resolve(root,'node_modules/.semesta-dependencies.json'),JSON.stringify({hash:dependencyHash()})+'\n');
  }
  console.log('[frontend] Membuat rilis frontend untuk disertakan dalam Git...');
  npm('npm run build');
  const result=inspect();
  if(!result.ready)throw new Error(result.reason);
}
function verify(tree){
  const result=inspect(tree);
  if(!result.ready)throw new Error(result.reason+' Jalankan npm run build, lalu git add assets/game dan commit hasilnya bersama sumber.');
}

try{
  if(process.argv.includes('--record')){
    if(git(['rev-parse','--show-toplevel'],{allowFailure:true})===null){
      console.log('[frontend] Build selesai tanpa metadata Git (paket deploy).');
    }else record();
  }else if(process.argv.includes('--stage-release')){
    if(inspect('index').ready){
      console.log('[frontend] Rilis dalam staging sudah sesuai.');
    }else{
      if(sourceSnapshot('index')!==sourceSnapshot())throw new Error('Ada sumber frontend yang belum di-stage. Stage semua perubahan frontend yang akan dirilis, atau stash perubahan tersebut sebelum commit; build tidak akan memasukkan perubahan lain diam-diam.');
      if(!inspect().ready)build();
      // Only generated release files are staged, never source files or user work.
      git(['add','-A','--',...releasePaths]);
      verify('index');
      console.log('[frontend] Rilis frontend sudah disertakan dalam commit ini.');
    }
  }else if(process.argv.includes('--verify-push')){
    // Validate every pushed local ref, not merely HEAD. Never mutate during push.
    const lines=readFileSync(0,'utf8').trim().split('\n').filter(Boolean);
    const revisions=lines.length?lines.map(line=>line.split(/\s+/)[1]).filter(id=>!/^0+$/.test(id)):['HEAD'];
    for(const revision of new Set(revisions))verify(revision);
    console.log('[frontend] Commit yang dikirim sudah memuat rilis frontend yang cocok.');
  }else if(process.argv.includes('--verify-release')){
    verify('HEAD');
    const record=json(stateName,'HEAD');
    for(const [name,hash] of Object.entries(record.outputs))if(sha(read(name)||'')!==hash)throw new Error('Output checkout berbeda dari commit: '+name+'. Pulihkan berkas rilis dari Git sebelum membuka aplikasi.');
    console.log('[frontend] Rilis dari Git lengkap; server tidak perlu build.');
  }else{
    if(inspect().ready)console.log('[frontend] Build sudah sesuai; tidak perlu build ulang.');
    else build();
  }
}catch(error){
  console.error('[frontend] '+error.message);
  console.error('[frontend] Tidak ada commit atau push otomatis. Jika ini terjadi setelah pull, perubahan Git sudah masuk; periksa pesan di atas.');
  process.exitCode=1;
}
