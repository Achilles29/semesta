import {chmodSync,existsSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const optional=process.argv.includes('--optional');
function git(args){return spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});}
try{
  if(git(['rev-parse','--show-toplevel']).status!==0){
    if(!optional)throw new Error('Jalankan dari checkout Git project.');
    console.log('[frontend] Tanpa checkout Git; pemasangan hook dilewati.');
  }else{
    const configured=git(['config','--get','core.hooksPath']).stdout.trim();
    if(configured&&resolve(root,configured)!==resolve(root,'.githooks'))
      throw new Error(`core.hooksPath sudah memakai ${configured}. Gabungkan hook yang ada secara manual; konfigurasi tersebut tidak ditimpa.`);
    if(!configured){
      const directory=resolve(root,git(['rev-parse','--git-path','hooks']).stdout.trim());
      const active=existsSync(directory)?readdirSync(directory).filter(name=>!name.endsWith('.sample')&&!name.startsWith('.')):[];
      if(active.length)throw new Error(`Hook Git lama ditemukan (${active.join(', ')}); gabungkan secara manual agar tetap berjalan.`);
    }
    for(const name of ['pre-commit','pre-push','post-merge','post-rewrite'])chmodSync(resolve(root,'.githooks',name),0o755);
    const result=git(['config','--local','core.hooksPath','.githooks']);
    if(result.status!==0)throw new Error(result.stderr||'Gagal memasang hook.');
    console.log('[frontend] Build dan staging rilis otomatis aktif sebelum commit; push memeriksa rilis. Server cukup pull tanpa Node.js.');
  }
}catch(error){
  console.error(`[frontend] ${error.message}`);
  if(!optional)process.exitCode=1;
}
