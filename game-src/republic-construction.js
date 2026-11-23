import {createConstructionGeometry} from './republic-construction-geometry.js';
import {createConstructionCarryPose} from './republic-construction-pose.js';
import {getSharedWorldSnapshot,applySharedWorldSnapshot,WORLD_STATE_EVENT} from './republic-world-state.js';

export function constructionTime(value){if(typeof value==='number')return value<1e12?value*1000:value;const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:0;}
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
const requestId=()=>globalThis.crypto?.randomUUID?.()||`work-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** A proposed action only. All inventory and installed totals come from the server. */
export function constructionOpportunity({project,player,position,now=Date.now()}={}){
  if(!project||project.status==='draft')return null;
  const common={projectId:project.id,target:project.workPoint,radius:Number(project.radius)||3};
  if(Number(player?.inventory?.constructionKit)>0&&player.carryingProjectId===project.id){
    const surplus=Number(project.delivered)>=Number(project.required)||project.status!=='active';
    return {...common,step:'deliver',action:'deliver',label:surplus?'Kembalikan bahan sisa':'Antar kit ke petak P01',description:surplus?'Proyek sudah cukup bahan atau sedang dijeda. Kembalikan kit di titik kerja; inventaris akan dikosongkan tanpa XP tambahan.':'Bawa kit bahan ke lingkaran kerja di depan rumah contoh.'};
  }
  if(project.status==='completed')return {...common,step:'complete',label:'Rumah contoh selesai',description:'Terima kasih! Hasil kerja bersama sudah menjadi bagian kota.'};
  if(project.status==='paused')return {...common,step:'paused',label:'Pembangunan dijeda',description:'Bahan dan kontribusi tetap tersimpan. Tunggu proyek dibuka kembali.'};
  if(player?.installation?.projectId===project.id&&Number(project.delivered)>Number(project.installed)){const remaining=Math.max(0,constructionTime(player.installation.readyAt)-now);return {...common,step:'assembly',action:remaining?'wait':'install',remaining,label:remaining?'Memasang komponen…':'Selesaikan pemasangan',description:remaining?'Tetap dekat titik kerja sampai komponen siap.':'Komponen siap. Selesaikan pemasangan di titik kerja.'};}
  if(Number(player?.inventory?.constructionKit)>0){
    if(player.carryingProjectId!==project.id)return {...common,step:'held-other',label:'Kit untuk proyek lain',description:'Kit tetap tersimpan di inventaris akun.'};
    return {...common,step:'deliver',action:'deliver',label:'Antar kit ke petak P01',description:'Bawa kit bahan ke lingkaran kerja di depan rumah contoh.'};
  }
  if(Number(project.delivered)>Number(project.installed))return {...common,step:'assemble',action:'start_install',label:'Pasang komponen',description:'Bahan tersedia. Mulai pemasangan singkat di titik kerja.'};
  return {...common,target:project.depot,step:'pickup',action:'pickup',label:'Ambil satu kit bahan',description:'Datangi depot bahan, lalu bawa kit ke petak rumah contoh.'};
}

/** Shared construction UI. Mount does not create a second public polling loop. */
export function mountConstruction({scene,ui,canvas,getPosition,getCitizen,getYaw=()=>0,beforeAction=async()=>{},apiUrl,events,fetchImpl=globalThis.fetch,now=Date.now}={}){
  const abort=new AbortController(),signal=abort.signal,external=events?.signal||events;
  const geometry=createConstructionGeometry({scene});
  let disposed=false,privateAbort=null,identity=Number(getCitizen?.()?.id)||0,epoch=0,loading=false,busy=false,player=null,csrfToken='',snapshot={projects:[]},error='',notice='',retryRequest=null,clockOffset=0,autoFinish=false,lastRender=-Infinity,posedActor=null,carryPose=null;
  const host=document.createElement('section');host.className='republic-construction';host.hidden=true;host.setAttribute('aria-label','Pembangunan bersama');ui.append(host);
  if(!document.querySelector('link[data-republic-construction-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./republic-construction.css',import.meta.url).href;link.dataset.republicConstructionStyle='';document.head.append(link);}
  host.innerHTML='<details class="rc-card" open><summary><span>PROYEK WARGA</span><strong data-project-name></strong></summary><div class="rc-content"><div class="rc-project-progress"><progress data-progress max="12" value="0" aria-label="Komponen terpasang"></progress><span data-totals></span></div><p class="rc-step" data-step></p><p data-instruction></p><p class="rc-direction"><b data-direction aria-hidden="true">↑</b><span data-distance></span></p><div class="rc-inventory"><span data-kit></span><span data-xp></span></div><progress data-assembly max="2" value="0" aria-label="Waktu pemasangan" hidden></progress><p data-notice role="status" aria-live="polite"></p><button type="button" data-refresh hidden>Coba sinkronkan lagi</button></div></details><button class="rc-action" type="button" data-work-action hidden></button>';
  const $=selector=>host.querySelector(selector),button=$('[data-work-action]');
  let actionVisible=true;
  const publicRows=data=>Array.isArray(data?.projects)?data.projects:[];
  const project=()=>publicRows(snapshot).find(p=>p.id==='jakartawa-home-01')||publicRows(snapshot).find(p=>p.status!=='draft');
  const serverNow=()=>now()+clockOffset;
  const opportunity=()=>constructionOpportunity({project:project(),player,position:getPosition?.(),now:serverNow()});
  function applySnapshot(data){
    if(disposed||!data)return;
    const merged=data.world&&Array.isArray(data.projects)?applySharedWorldSnapshot(data):null;
    if(merged&&merged!==snapshot){snapshot=merged;geometry.applySnapshot(snapshot);}
    if(data.player&&Number(data.player.id)===identity){player=structuredClone(data.player);if(data.csrfToken)csrfToken=data.csrfToken;}
    if(data.serverTime){const timestamp=constructionTime(data.serverTime);if(timestamp)clockOffset=timestamp-now();}
    render();
  }
  async function readResponse(response){
    const body=await response.json().catch(()=>({})),serverDate=response.headers?.get?.('Date');
    if(!body.serverTime&&serverDate){const timestamp=Date.parse(serverDate);if(Number.isFinite(timestamp))clockOffset=timestamp-now();}
    if(!response.ok){const problem=new Error(body.error||`Aksi belum berhasil (${response.status}).`);problem.status=response.status;throw problem;}
    return body;
  }
  async function refreshPlayer(){
    if(disposed||!identity)return;const token=epoch;privateAbort?.abort();privateAbort=new AbortController();loading=true;error='';render();
    try{const url=new URL(apiUrl,document.baseURI);url.searchParams.set('resource','world_work');const response=await fetchImpl(url.href,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store',signal:privateAbort.signal});const data=await readResponse(response);if(disposed||epoch!==token)return;applySnapshot(data);}
    catch(problem){if(!disposed&&epoch===token&&problem.name!=='AbortError')error=problem.message;}
    finally{if(!disposed&&epoch===token){loading=false;render();}}
  }
  function resetIdentity(){
    const next=Number(getCitizen?.()?.id)||0;if(next===identity)return;identity=next;epoch++;privateAbort?.abort();loading=busy=false;player=null;csrfToken='';retryRequest=null;autoFinish=false;error=notice='';if(next)void refreshPlayer();render();
  }
  async function perform(){
    resetIdentity();if(disposed||busy||loading)return false;
    const work=opportunity();if(!work)return false;
    if(!identity){document.getElementById('profileButton')?.click();return true;}
    if(!player||!csrfToken){void refreshPlayer();return true;}
    if(!work.action||work.action==='wait'||distance(getPosition?.(),work.target)>work.radius)return false;
    const token=epoch,action=work.action;
    const command=retryRequest?.action===action&&retryRequest.projectId===work.projectId?retryRequest:{action,projectId:work.projectId,requestId:requestId()};retryRequest=command;busy=true;error='';notice='';render();
    try{
      await beforeAction();if(disposed||epoch!==token)return false;
      // Check the target again after a slow presence request; never submit a work
      // action at the old location if the player has walked away.
      if(distance(getPosition?.(),work.target)>work.radius)throw new Error('Kembali ke titik kerja untuk melanjutkan.');
      privateAbort?.abort();privateAbort=new AbortController();
      const response=await fetchImpl(apiUrl,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({resource:'world_work',...command,csrfToken}),signal:privateAbort.signal});
      const data=await readResponse(response);if(disposed||epoch!==token)return false;
      retryRequest=null;applySnapshot(data);
      autoFinish=action==='start_install';notice=typeof data.message==='string'?data.message:action==='deliver'&&work.label==='Kembalikan bahan sisa'?'Bahan sisa dikembalikan. Inventaris kembali kosong.':{pickup:'Kit diambil. Bawa ke petak P01.',deliver:'Kit masuk stok bersama. Sekarang pasang komponennya.',start_install:'Pemasangan dimulai. Tetap di lingkaran kerja.',install:'Komponen terpasang. Kontribusi dan kemampuan tersimpan.'}[action]||'';
      return true;
    }catch(problem){if(!disposed&&epoch===token&&problem.name!=='AbortError'){error=problem.message;autoFinish=false;if(problem.status&&problem.status<500)retryRequest=null;}return false;}
    finally{if(!disposed&&epoch===token){busy=false;render();}}
  }
  function render(){
    if(disposed)return;const p=project(),work=opportunity(),position=getPosition?.();
    const visible=!!work&&(distance(position,p.depot)<150||!!player?.carryingProjectId||!!player?.installation);host.hidden=!visible;if(!visible){button.hidden=true;return;}
    $('[data-project-name]').textContent=p.name||'Rumah contoh P01';
    const installed=Number(p.installed)||0,required=Number(p.required)||12,stock=Math.max(0,(Number(p.delivered)||0)-installed);
    $('[data-progress]').max=required;$('[data-progress]').value=installed;$('[data-totals]').textContent=`${installed}/${required} komponen · ${stock} kit tersedia`;
    $('[data-step]').textContent=work.label;$('[data-instruction]').textContent=work.description;
    const meters=distance(position,work.target),near=meters<=work.radius;
    $('[data-distance]').textContent=work.step==='complete'?'Rumah contoh milik proyek bersama':`${work.step==='pickup'?'Depot bahan':'Titik kerja'} · ${Number.isFinite(meters)?Math.ceil(meters):'—'} m${near?' · sudah dekat':''}`;
    const angle=position?Math.atan2(work.target.x-position.x,work.target.z-position.z)-getYaw():0;$('[data-direction]').style.transform=`rotate(${angle}rad)`;
    $('[data-kit]').textContent=player?.inventory?.constructionKit?'Bawaan: 1 kit':'Bawaan: kosong';$('[data-xp]').textContent=identity?`Kemampuan bangun: ${Number(player?.constructionXp)||0} XP`:'Masuk untuk berkontribusi';
    const assembling=work.step==='assembly';$('[data-assembly]').hidden=!assembling;$('[data-assembly]').value=assembling?Math.max(0,2-work.remaining/1000):0;
    $('[data-notice]').textContent=error||notice;$('[data-notice]').classList.toggle('is-error',!!error);$('[data-refresh]').hidden=!error||!identity;
    button.hidden=!actionVisible||!work.action||work.step==='complete'||work.step==='paused';
    button.disabled=busy||loading||identity&&(!near||work.action==='wait');
    button.textContent=!identity?'Masuk untuk membantu':loading?'Menyinkronkan…':busy?'Menyimpan aksi…':!near?`Dekati ${work.step==='pickup'?'depot bahan':'titik kerja'}`:work.action==='wait'?`Memasang · ${Math.max(1,Math.ceil(work.remaining/1000))} dtk`:`${{pickup:'Ambil kit',deliver:'Serahkan kit',start_install:'Mulai pasang',install:'Selesaikan pasang'}[work.action]} · E`;
  }
  function tick(time=now()){
    if(disposed)return;resetIdentity();const work=opportunity(),position=getPosition?.();
    if(work?.step==='assembly'&&distance(position,work.target)>work.radius)autoFinish=false;
    geometry.tick({position,yaw:getYaw(),carryingProjectId:player?.inventory?.constructionKit?player.carryingProjectId:null,installing:work?.step==='assembly'&&work.remaining>0&&distance(position,work.target)<=work.radius,now:time});
    if(time-lastRender>=150){lastRender=time;render();}
    if(autoFinish&&work?.action==='install'&&!busy&&!loading){autoFinish=false;void perform();}
  }
  function consumeInteraction(){const work=opportunity();if(!work?.action||distance(getPosition?.(),work.target)>work.radius)return false;void perform();return true;}
  function wantsInteraction(){const work=opportunity();return !!work?.action&&distance(getPosition?.(),work.target)<=work.radius;}
  function setActionVisible(value){const next=!!value;if(next!==actionVisible){actionVisible=next;render();}}
  function resetActorPose(){carryPose?.restore();}
  function applyActorPose(actor){if(disposed)return;if(actor!==posedActor){carryPose?.dispose();posedActor=actor;carryPose=actor?createConstructionCarryPose(actor):null;}carryPose?.apply(!!player?.inventory?.constructionKit);}
  function dispose(){if(disposed)return;disposed=true;epoch++;privateAbort?.abort();abort.abort();carryPose?.dispose();carryPose=null;posedActor=null;geometry.dispose();host.remove();}
  button.addEventListener('click',()=>void perform(),{signal});$('[data-refresh]').addEventListener('click',()=>void refreshPlayer(),{signal});
  window.addEventListener(WORLD_STATE_EVENT,event=>applySnapshot(event.detail?.snapshot||event.detail),{signal});
  window.addEventListener('semesta:citizen-change',()=>queueMicrotask(resetIdentity),{signal});
  if(external){if(external.aborted){dispose();return {tick,applySnapshot,dispose,consumeInteraction,wantsInteraction,setActionVisible,geometry,resetActorPose,applyActorPose};}external.addEventListener('abort',dispose,{once:true,signal});}
  applySnapshot(getSharedWorldSnapshot());if(identity)void refreshPlayer();
  return {tick,applySnapshot,dispose,consumeInteraction,wantsInteraction,setActionVisible,geometry,resetActorPose,applyActorPose};
}
