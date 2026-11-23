import {applyPublishedWorldPhase,usePublishedWorldPhase} from './republic-world-layout.js';

export const WORLD_STATE_EVENT='republic:world-state';
export const WORLD_SYNC_EVENT='republic:world-sync';
const statuses=new Set(['draft','active','paused','completed']);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const point=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.z);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

/** Only public fields survive; world_work responses also contain private data. */
export function publicWorldSnapshot(value){
  const w=value?.world;
  if(w?.id!=='republic'||!integer(w.version)||!['before-day2','after-day2'].includes(w.phase)||!Array.isArray(value.projects))throw new Error('Data dunia server belum lengkap.');
  const ids=new Set();
  const projects=value.projects.map(p=>{
    if(!p||typeof p.id!=='string'||ids.has(p.id)||typeof p.name!=='string'||typeof p.plotId!=='string'||typeof p.city!=='string'||!statuses.has(p.status)||!integer(p.version)||!integer(p.required)||p.required<1||!integer(p.delivered)||!integer(p.installed)||p.installed>p.delivered||p.delivered>p.required||!point(p.position)||!point(p.workPoint)||!point(p.depot)||!Number.isFinite(p.radius)||p.radius<=0)throw new Error('Progres proyek server tidak valid.');
    ids.add(p.id);
    return {id:p.id,name:p.name,plotId:p.plotId,city:p.city,status:p.status,version:p.version,required:p.required,delivered:p.delivered,installed:p.installed,radius:p.radius,position:{...p.position},workPoint:{...p.workPoint},depot:{...p.depot}};
  });
  return freeze({world:{id:w.id,phase:w.phase,version:w.version,publishedAt:w.publishedAt||null},projects});
}

export function createWorldStateStore({onChange=()=>{}}={}){
  let snapshot=null;
  return {get:()=>snapshot,apply(value){
    const next=publicWorldSnapshot(value);
    if(snapshot&&next.world.version<snapshot.world.version)return snapshot;
    const prior=new Map(snapshot?.projects.map(p=>[p.id,p])||[]);
    const projects=next.projects.map(p=>prior.get(p.id)?.version>p.version?prior.get(p.id):p);
    // A delayed response cannot erase already observed projects at the same version.
    if(snapshot&&next.world.version===snapshot.world.version)for(const p of snapshot.projects)if(!projects.some(item=>item.id===p.id))projects.push(p);
    const merged=freeze({world:next.world,projects});
    if(JSON.stringify(merged)===JSON.stringify(snapshot))return snapshot;
    snapshot=merged;onChange(snapshot);return snapshot;
  }};
}

const emit=(type,detail)=>{const target=globalThis.window||globalThis;if(target.dispatchEvent&&globalThis.CustomEvent)target.dispatchEvent(new CustomEvent(type,{detail}));};
const shared=createWorldStateStore({onChange:snapshot=>{applyPublishedWorldPhase(snapshot.world.phase);emit(WORLD_STATE_EVENT,snapshot);}});
export const getSharedWorldSnapshot=()=>shared.get();
export const applySharedWorldSnapshot=value=>shared.apply(value);

/** One read at a time, abortable and disposable. No polling data is persisted in
 * localStorage; a newly opened page must obtain its first snapshot from PHP. */
export function startSharedWorldSync({apiUrl,fetcher=(...args)=>fetch(...args),interval=3000,timeout=10000,apply=applySharedWorldSnapshot,get=getSharedWorldSnapshot,onStatus=detail=>emit(WORLD_SYNC_EVENT,detail),scheduler=globalThis}={}){
  usePublishedWorldPhase();
  let disposed=false,timer=null,request=null,pending=null;
  function status(state,message=''){if(!disposed)onStatus({state,message,hasSnapshot:!!get()});}
  function refresh(){
    if(disposed)return Promise.resolve(null);
    if(pending)return pending;
    scheduler.clearTimeout(timer);status('loading');request=new AbortController();
    const signal=request.signal,deadline=scheduler.setTimeout(()=>request?.abort(),timeout);
    pending=(async()=>{
      try{
        const url=new URL(apiUrl,globalThis.location?.href||'http://localhost/');url.searchParams.set('resource','world_state');
        const response=await fetcher(url.href,{credentials:'same-origin',cache:'no-store',signal});
        if(!response.ok)throw new Error('Dunia server belum tersedia. Coba lagi.');
        const body=await response.json();if(disposed||signal.aborted)return null;
        const snapshot=apply(body);status('online');return snapshot;
      }catch(error){if(!disposed)status('offline',error.name==='AbortError'?'Koneksi dunia melewati batas waktu.':error.message);return null;}
      finally{scheduler.clearTimeout(deadline);pending=null;request=null;if(!disposed)timer=scheduler.setTimeout(refresh,interval);}
    })();return pending;
  }
  const ready=refresh();
  return {ready,refresh,dispose(){disposed=true;scheduler.clearTimeout(timer);request?.abort();}};
}
