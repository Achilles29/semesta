import * as THREE from 'three';
import {createCapitalContext,createRepublicTerrainStream} from './republic-capital-scene.js';
import {WORLD_PHASE_EVENT,WORLD_PHASE_KEY,worldDestination,getWorldPhase,setWorldPhase as storeWorldPhase,normalizeWorldPhase,terrainHeight,citizenWorldPosition,moveWorldPosition,worldFloorHeight} from './republic-world-layout.js';
import {preloadRepublicBuildingLogo} from './republic-building-identity.js';
import {citizens} from './citizen-roster.js';
import {presets,normalizeAvatarConfig} from './avatar-v15-config.js';
import {loadAvatarProfile,createHumanModel,disposeAvatar,animateAvatar,avatarSpeed} from './avatar-runtime.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const presetMap=new Map(presets.map(p=>[p.id,p]));
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export const WORLD_RESIDENT_LIMIT=14;
export const WORLD_ZOOM_BOUNDS=Object.freeze({min:2.2,max:24});
export const clampWorldZoom=value=>clamp(Number.isFinite(value)?value:7.2,WORLD_ZOOM_BOUNDS.min,WORLD_ZOOM_BOUNDS.max);
export const worldLabelVisible=({distance,screenX,self=false})=>!self&&distance<=12&&Math.abs(screenX)<.72;
export function worldAvatarConfig(citizen){
  let input=citizen?.avatar_config||citizen?.avatarConfig||citizen?.config;
  if(!input&&citizen?.presetId)input=presetMap.get(citizen.presetId)?.config;
  if(!input)input=presetMap.get('v15-warga-aulia-talita2')?.config||presetMap.get('v15-laras')?.config||presets[0].config;
  const config=normalizeAvatarConfig(input);if(!config.presetId&&presetMap.has(citizen?.presetId))config.presetId=citizen.presetId;return config;
}
/** Stable 48 identities plus the president. Streaming limits detail, not the
 * roster or the accessible land. No server/global progress is implied. */
export function worldResidents(city='jakarta'){
  const assigned=[];
  const roster=citizens.map((citizen,i)=>{const home=citizenWorldPosition(citizen,i);while(assigned.some(p=>Math.hypot(p.x-home.x,p.z-home.z)<1.2))home.x-=2;assigned.push(home);return {...citizen,home,index:i};});
  return [...roster,{id:'pasca-bowow',name:'Pasca Bowow',role:'Presiden',presetId:'v15-prabowo-inspired',personality:'Usulan warga saya dengar. Keputusannya tetap lewat meja saya.',home:{x:-5,y:.615,z:-.1,yaw:0},index:48,stationary:true}];
}

/** No WebGL/browser globals are touched until mount. events accepts either an
 * AbortSignal or AbortController; all owned DOM/GPU resources are released. */
export async function mountRepublicOpenWorld({canvas,city,entry,events,apiUrl,activeCitizen,onState=()=>{},onError=()=>{}}={}){
  if(!canvas?.parentElement)throw new Error('Kanvas peta jelajah tidak tersedia.');
  const destination=worldDestination(city),cityId=destination.id,abort=new AbortController(),signal=abort.signal,external=events?.signal||events;
  let disposed=false,raf=0,player=null,playerVersion=0,phase=getWorldPhase(),yaw=0,pitch=.34,zoom=7.2,lastTime=0,lastState=0,lastLabels=0,lastPopulation=0,nearby=null,swapCitizen=activeCitizen;
  const start=Array.isArray(entry)?{x:entry[0],z:entry[1]}:entry||destination.spawn;
  const position={x:Number.isFinite(+start.x)?+start.x:destination.spawn.x,z:Number.isFinite(+start.z)?+start.z:destination.spawn.z,y:0};
  position.y=terrainHeight(position.x,position.z,cityId);if(position.y<-.17){Object.assign(position,destination.spawn);position.y=terrainHeight(position.x,position.z,cityId);}
  yaw=Number.isFinite(+start.cameraYaw)?+start.cameraYaw:0;
  const parent=canvas.parentElement,oldPosition=parent.style.position,oldTouch=canvas.style.touchAction,oldTabIndex=canvas.getAttribute('tabindex');
  if(getComputedStyle(parent).position==='static')parent.style.position='relative';canvas.style.touchAction='none';canvas.tabIndex=0;canvas.setAttribute('aria-label',`Jelajah ${destination.name}. WASD untuk berjalan, Shift berlari, geser untuk memutar kamera.`);
  const ui=document.createElement('div');ui.className='republic-world-overlay';parent.append(ui);
  const style=document.createElement('style');style.textContent=`
    .republic-world-overlay{position:absolute;inset:0;z-index:7;pointer-events:none;font-family:Inter,Arial,sans-serif;color:#fff;overflow:hidden}
    .rw-hint{position:absolute;left:18px;bottom:16px;padding:8px 12px;background:#173b43d9;backdrop-filter:blur(8px);border:1px solid #ffffff30;border-radius:12px;font-size:11px;letter-spacing:.02em;max-width:calc(100% - 160px)}
    .rw-zoom{position:absolute;right:22px;bottom:140px;display:flex;flex-direction:column;gap:5px;pointer-events:auto}.rw-zoom button{width:42px;height:42px;border:1px solid #ffffff80;border-radius:12px;color:#fff;background:#244d50ed;font:700 24px Arial;cursor:pointer}.rw-zoom button:disabled{opacity:.4;cursor:default}.rw-zoom button:focus-visible{outline:3px solid #f8d47e;outline-offset:3px}.rw-zoom output{text-align:center;font-size:10px;text-shadow:0 1px 4px #142f35}
    .rw-loading{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);background:#153b45ec;border:1px solid #ffffff3b;border-radius:16px;padding:18px 24px;text-align:center;font-size:14px}
    .rw-label{position:absolute;transform:translate(-50%,-100%);padding:4px 9px;border:1px solid #ffffff40;border-radius:7px;background:#18333ae8;box-shadow:0 2px 8px #0003;white-space:nowrap;text-align:center;font-size:12px;font-weight:700;text-shadow:0 1px 2px #0005;line-height:1.2}
    .rw-label small{display:block;color:#d4e6de;font-size:10px;font-weight:400;margin-top:2px}.rw-label[data-self=true]{background:#3d6357d9;border-color:#bdd4a5}
    .rw-talk{pointer-events:auto;position:absolute;left:50%;bottom:54px;transform:translateX(-50%);border:1px solid #f5df9f80;border-radius:24px;padding:10px 18px;background:#244d50ed;color:white;cursor:pointer;font-size:12px}
    .rw-card{pointer-events:auto;position:absolute;right:18px;top:100px;width:min(310px,calc(100% - 36px));background:#173a43f2;border:1px solid #ffffff40;border-radius:18px;padding:20px;box-shadow:0 12px 50px #10262e55;line-height:1.6}
    .rw-card h3{margin:0;font-size:20px}.rw-card p{font-size:13px;margin:9px 0 0}.rw-card small{color:#c7dfd4}.rw-card button{float:right;border:0;background:#ffffff1a;color:white;border-radius:50%;width:28px;height:28px;cursor:pointer}
    .rw-touch-pad{display:none;pointer-events:auto;position:absolute;left:24px;bottom:30px;width:112px;height:112px;border:1px solid #ffffff75;border-radius:50%;background:#24464c55;touch-action:none;box-shadow:inset 0 0 30px #ffffff10}
    .rw-touch-knob{position:absolute;left:34px;top:34px;width:44px;height:44px;border-radius:50%;background:#eaf2e6b8;border:2px solid #fff;box-shadow:0 3px 10px #173b4355}
    .rw-run{display:none;pointer-events:auto;position:absolute;right:28px;bottom:40px;width:72px;height:72px;border-radius:50%;border:1px solid #ffffff80;color:#fff;background:#254b56b8;font-weight:700;touch-action:none}
    .capture-mode .rw-zoom,.capture-mode .rw-hint,.capture-mode .rw-touch-pad,.capture-mode .rw-run,.capture-mode .rw-talk,.capture-mode .rw-card{display:none!important}
    @media(pointer:coarse){.rw-touch-pad,.rw-run{display:block}.rw-hint{bottom:156px;left:22px;max-width:200px;font-size:10px}.rw-talk{bottom:38px}.rw-card{top:85px}}
  `;ui.append(style);
  const labels=document.createElement('div');ui.append(labels);
  const hint=document.createElement('div');hint.className='rw-hint';hint.textContent='WASD / panah · Shift lari · Seret kamera · Gulir zoom · E sapa';ui.append(hint);
  const loading=document.createElement('div');loading.className='rw-loading';loading.setAttribute('role','status');loading.textContent='Membuka dunia dan karakter…';ui.append(loading);
  const talk=document.createElement('button');talk.className='rw-talk';talk.hidden=true;ui.append(talk);
  const card=document.createElement('section');card.className='rw-card';card.hidden=true;card.setAttribute('aria-live','polite');ui.append(card);
  const pad=document.createElement('div');pad.className='rw-touch-pad';pad.setAttribute('aria-label','Joystick jalan');const knob=document.createElement('div');knob.className='rw-touch-knob';pad.append(knob);ui.append(pad);
  const runButton=document.createElement('button');runButton.className='rw-run';runButton.textContent='LARI';runButton.setAttribute('aria-label','Tahan untuk berlari');ui.append(runButton);
  const zoomControls=document.createElement('div');zoomControls.className='rw-zoom';zoomControls.setAttribute('role','group');zoomControls.setAttribute('aria-label','Zoom kamera');
  const zoomIn=document.createElement('button'),zoomOut=document.createElement('button'),zoomValue=document.createElement('output');
  zoomIn.type=zoomOut.type='button';zoomIn.textContent='+';zoomOut.textContent='?';zoomIn.setAttribute('aria-label','Perbesar tampilan');zoomOut.setAttribute('aria-label','Perkecil tampilan');zoomIn.title='Perbesar (+)';zoomOut.title='Perkecil (?)';zoomValue.setAttribute('aria-live','polite');zoomControls.append(zoomIn,zoomValue,zoomOut);ui.append(zoomControls);
  function setZoom(value){zoom=clampWorldZoom(value);zoomValue.textContent=zoom.toFixed(1)+' m';zoomIn.disabled=zoom<=WORLD_ZOOM_BOUNDS.min;zoomOut.disabled=zoom>=WORLD_ZOOM_BOUNDS.max;}setZoom(zoom);
  const listen=(target,type,callback,options={})=>target?.addEventListener(type,callback,{...options,signal});
  listen(zoomIn,'click',()=>setZoom(zoom/1.22));listen(zoomOut,'click',()=>setZoom(zoom*1.22));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b5d5d5');scene.fog=new THREE.Fog('#b5d5d5',260,1500);
  const camera=new THREE.PerspectiveCamera(48,1,.08,4500),resources={geometries:new Set(),materials:new Set(),textures:new Set()};
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){ui.remove();parent.style.position=oldPosition;canvas.style.touchAction=oldTouch;throw error;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight('#e5f1ef','#8b8563',2.2));
  const sun=new THREE.DirectionalLight('#fff1d7',3.2);sun.position.set(20,35,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-26;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const context=createCapitalContext({parent:scene,...resources,phase,includeCore:true,city:cityId}),terrain=createRepublicTerrainStream({parent:scene,city:cityId});terrain.update(position.x,position.z);
  position.y=worldFloorHeight(position.x,position.z,{surfaces:context.surfaces,city:cityId});
  const roster=worldResidents(cityId),residents=new Map(),pending=new Set(),failed=new Set();let desired=new Set(),populationEpoch=0;
  const keys=new Set(),stick={x:0,z:0},pointer=new Map();let stickId=null,runTouch=false,pinchDistance=0,dragged=0;
  if(window.matchMedia?.('(pointer:coarse)').matches)hint.textContent='Joystick jalan · Tahan LARI · Seret kamera · Cubit zoom';
  const temp=new THREE.Vector3(),headPoint=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),raycaster=new THREE.Raycaster();let width=1,height=1;
  const makeLabel=(name,role,self=false)=>{const e=document.createElement('div');e.className='rw-label';e.hidden=true;e.dataset.self=String(self);e.textContent=name;const small=document.createElement('small');small.textContent=role;e.append(small);labels.append(e);return e;};
  let playerLabel=makeLabel(activeCitizen?.display_name||activeCitizen?.name||'Tamu','',true);
  function state(){return {city:cityId,phase,position:{x:position.x,y:position.y,z:position.z},yaw:player?.figure.rotation.y??0,cameraYaw:yaw,zoom,nearby:nearby?{id:nearby.id,name:nearby.name,role:nearby.role}:null,loadedChunks:terrain.count,citizensVisible:residents.size,citizensTotal:48};}
  function collisionResources(){return {colliders:[...context.colliders,...terrain.colliders,...[...residents.values()].map(c=>({x:c.actor.figure.position.x,z:c.actor.figure.position.z,radius:.28,maxY:c.actor.figure.position.y+1.8}))],surfaces:context.surfaces,city:cityId};}
  function showCitizen(citizen=nearby){
    if(!citizen)return;card.replaceChildren();const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Tutup profil warga');close.onclick=()=>{card.hidden=true;canvas.focus({preventScroll:true});};
    const name=document.createElement('h3');name.textContent=citizen.name;const role=document.createElement('small');role.textContent=citizen.role;
    const text=document.createElement('p');text.textContent=citizen.personality||'Warga pertama Republik Wkwkwk. Usulan dan cerita baru menanti di sini.';
    const place=document.createElement('p');place.textContent='Karakter cerita · Warga Gelombang 1';card.append(close,name,role,text,place);card.hidden=false;
  }
  listen(talk,'click',()=>showCitizen());
  async function replacePlayer(citizen){
    const version=++playerVersion;swapCitizen=citizen;const config=worldAvatarConfig(citizen);
    await loadAvatarProfile(config.profileId);if(disposed||version!==playerVersion)return;
    const next=createHumanModel(THREE,{avatarConfig:config});next.figure.position.set(position.x,position.y,position.z);next.figure.rotation.y=player?.figure.rotation.y??(Number.isFinite(+start.yaw)?+start.yaw:Math.PI);scene.add(next.figure);disposeAvatar(player);player=next;
    playerLabel.remove();playerLabel=makeLabel(citizen?.display_name||citizen?.name||'Tamu','',true);loading.remove();
  }
  function applyPhase(value,{persist=false,source='inspection'}={}){
    phase=normalizeWorldPhase(value);context.setPhase(phase);if(persist)storeWorldPhase(phase,{persist:true,source});
    // A completed slab can appear under the player when inspecting a phase.
    position.y=worldFloorHeight(position.x,position.z,collisionResources());
    player?.figure.position.set(position.x,position.y,position.z);onState(state());
  }
  function teleport(point){
    if(!point||!Number.isFinite(+point.x)||!Number.isFinite(+point.z))return false;
    const y=terrainHeight(+point.x,+point.z,cityId);if(y<-.17)return false;
    Object.assign(position,{x:+point.x,z:+point.z,y});terrain.update(position.x,position.z);
    position.y=worldFloorHeight(position.x,position.z,collisionResources());
    player?.figure.position.set(position.x,position.y,position.z);lastPopulation=0;onState(state());return true;
  }
  function focusCitizen(id){const c=roster.find(c=>c.id===id||c.name===id||c.presetId===id);if(!c)return false;teleport({x:c.home.x+2,z:c.home.z+3.2});yaw=.35;setZoom(5.3);showCitizen(c);return true;}
  async function populate(){
    if(disposed)return;const epoch=++populationEpoch;
    const nearest=roster.map(c=>({c,d:Math.hypot(position.x-c.home.x,position.z-c.home.z)})).filter(item=>item.d<43).sort((a,b)=>a.d-b.d).slice(0,WORLD_RESIDENT_LIMIT);
    desired=new Set(nearest.map(item=>item.c.id));
    for(const [id,entry] of residents)if(!desired.has(id)){entry.label.remove();disposeAvatar(entry.actor);residents.delete(id);}
    for(const {c} of nearest){
      if(residents.has(c.id)||pending.has(c.id)||failed.has(c.id))continue;pending.add(c.id);
      try{
        const preset=presetMap.get(c.presetId);if(!preset)throw new Error('Preset warga tidak tersedia: '+c.name);
        await loadAvatarProfile(preset.config.profileId);if(disposed||!desired.has(c.id))continue;
        const actor=createHumanModel(THREE,{avatarConfig:{...preset.config,presetId:c.presetId}});actor.figure.position.set(c.home.x,c.home.y??worldFloorHeight(c.home.x,c.home.z,{surfaces:context.surfaces,city:cityId}),c.home.z);actor.figure.rotation.y=c.home.yaw;scene.add(actor.figure);
        actor.mixer.setTime(c.index*.73);const label=makeLabel(c.name,c.role);residents.set(c.id,{...c,actor,label});
      }catch(error){if(!disposed){failed.add(c.id);console.warn('Karakter warga belum dapat dibuka.',c.name,error);}}
      finally{pending.delete(c.id);}
      // Yield before another large skeleton clone. A rapid route change cancels
      // stale work; already cached profile data can be reused by the next batch.
      await new Promise(resolve=>setTimeout(resolve,0));if(disposed||epoch!==populationEpoch)break;
    }
  }
  function resize(){const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const paused=()=>document.body.classList.contains('production-viewer-open')||!!document.querySelector('dialog[open],#avatarCustomizer:not([hidden])');
  const formTarget=e=>e.target?.closest?.('input,textarea,select,[contenteditable=true],[role=dialog]');
  listen(window,'keydown',e=>{if(formTarget(e)||paused())return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){keys.add(e.code);e.preventDefault();}if(['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(e.code)){setZoom(zoom*(['Equal','NumpadAdd'].includes(e.code)?1/1.22:1.22));e.preventDefault();}if(e.code==='KeyE'&&!e.repeat)showCitizen();if(e.code==='Escape')card.hidden=true;});
  listen(window,'keyup',e=>keys.delete(e.code));listen(window,'blur',()=>{keys.clear();runTouch=false;stick.x=stick.z=0;});
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(e.deltaY*.001));},{passive:false});
  listen(canvas,'pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=0;if(pointer.size===2){const p=[...pointer.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
  listen(canvas,'pointermove',e=>{const old=pointer.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;dragged+=Math.abs(dx)+Math.abs(dy);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointer.size===2){const p=[...pointer.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance)setZoom(zoom*pinchDistance/Math.max(10,d));pinchDistance=d;}else{yaw-=dx*.006;pitch=clamp(pitch+dy*.005,.08,1.14);}});
  const release=e=>{pointer.delete(e.pointerId);pinchDistance=0;};listen(canvas,'pointerup',release);listen(canvas,'pointercancel',release);
  const updateStick=e=>{const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.32),dz=(e.clientY-r.top-r.height/2)/(r.height*.32),length=Math.max(1,Math.hypot(dx,dz));stick.x=dx/length;stick.z=dz/length;knob.style.transform=`translate(${stick.x*35}px,${stick.z*35}px)`;};
  listen(pad,'pointerdown',e=>{e.preventDefault();stickId=e.pointerId;pad.setPointerCapture(e.pointerId);updateStick(e);});listen(pad,'pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
  const clearStick=e=>{if(e.pointerId!==stickId)return;stickId=null;stick.x=stick.z=0;knob.style.transform='';};listen(pad,'pointerup',clearStick);listen(pad,'pointercancel',clearStick);
  listen(runButton,'pointerdown',e=>{e.preventDefault();runButton.setPointerCapture(e.pointerId);runTouch=true;});listen(runButton,'pointerup',()=>runTouch=false);listen(runButton,'pointercancel',()=>runTouch=false);
  listen(window,WORLD_PHASE_EVENT,e=>applyPhase(e.detail?.phase));listen(window,'storage',e=>{if(e.key===WORLD_PHASE_KEY)applyPhase(getWorldPhase());});
  listen(window,'semesta:citizen-change',e=>replacePlayer(e.detail?.citizen).catch(error=>{if(!disposed)onError(error);}));
  listen(document,'visibilitychange',()=>{lastTime=0;keys.clear();});
  function labelAt(actor,label,roleVisible=true){
    if(actor.head?.getWorldPosition)actor.head.getWorldPosition(headPoint);else actor.figure.getWorldPosition(headPoint).add(temp.set(0,1.75,0));headPoint.y+=.31;
    const distance=camera.position.distanceTo(headPoint);const projected=headPoint.clone().project(camera);
    if(projected.z>1||projected.z< -1||Math.abs(projected.x)>1.06||Math.abs(projected.y)>1.05||!worldLabelVisible({distance,screenX:projected.x,self:label.dataset.self==='true'})){label.hidden=true;return;}
    raycaster.set(camera.position,temp.copy(headPoint).sub(camera.position).normalize());raycaster.far=distance-.25;
    const obscured=raycaster.intersectObjects(context.occluders,false).some(hit=>visible(hit.object)&&!(hit.object.material?.transparent&&hit.object.material.opacity<.6));
    label.hidden=obscured;if(obscured)return;label.style.left=`${(projected.x*.5+.5)*width}px`;label.style.top=`${(-projected.y*.5+.5)*height}px`;label.style.opacity=distance>35?'.72':'1';label.querySelector('small').hidden=!roleVisible||distance>13;
  }
  function tick(now){
    if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden||paused()){lastTime=0;keys.clear();stick.x=stick.z=0;runTouch=false;ui.style.visibility='hidden';return;}ui.style.visibility='';
    const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;
    let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x,dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+stick.z;
    const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}const moving=length>.08,speed=player?avatarSpeed(player,(keys.has('ShiftLeft')||keys.has('ShiftRight')||runTouch)?'Run':'Walk'):0;
    if(player){
      const wx=dx*Math.cos(yaw)+dz*Math.sin(yaw),wz=-dx*Math.sin(yaw)+dz*Math.cos(yaw),previous={...position};
      if(moving){Object.assign(position,moveWorldPosition(position,{x:wx*speed*dt,z:wz*speed*dt},collisionResources()));const goal=Math.atan2(wx,wz),delta=Math.atan2(Math.sin(goal-player.figure.rotation.y),Math.cos(goal-player.figure.rotation.y));player.figure.rotation.y+=delta*Math.min(1,dt*13);}
      const actual=dt?Math.hypot(position.x-previous.x,position.z-previous.z)/dt:0;player.figure.position.set(position.x,position.y,position.z);animateAvatar(player,actual,dt);
    }
    terrain.update(position.x,position.z);
    if(now-lastPopulation>700){lastPopulation=now;void populate();}
    nearby=null;let nearest=4.3;
    for(const resident of residents.values()){
      animateAvatar(resident.actor,0,dt);const d=Math.hypot(position.x-resident.actor.figure.position.x,position.z-resident.actor.figure.position.z);if(d<nearest){nearest=d;nearby=resident;}
    }
    talk.hidden=!nearby;talk.textContent=nearby?`Sapa ${nearby.name} · E`:'';
    cameraTarget.set(position.x,position.y+1.25,position.z);desiredCamera.set(position.x+Math.sin(yaw)*zoom*Math.cos(pitch),position.y+1.25+Math.sin(pitch)*zoom,position.z+Math.cos(yaw)*zoom*Math.cos(pitch));
    desiredCamera.y=Math.max(desiredCamera.y,terrainHeight(desiredCamera.x,desiredCamera.z,cityId)+.65);
    // Keep the orbit camera on the player's side of walls. Thin transparent
    // windows do not block it; landscape and solid geometry do.
    raycaster.set(cameraTarget,temp.copy(desiredCamera).sub(cameraTarget).normalize());raycaster.far=cameraTarget.distanceTo(desiredCamera);
    const obstruction=raycaster.intersectObjects(context.occluders,false).find(hit=>hit.distance>.25&&visible(hit.object)&&!(hit.object.material?.transparent&&hit.object.material.opacity<.6));
    if(obstruction)desiredCamera.copy(cameraTarget).addScaledVector(raycaster.ray.direction,Math.max(.7,obstruction.distance-.22));
    camera.position.copy(desiredCamera);camera.lookAt(cameraTarget);camera.updateMatrixWorld(true);
    sun.position.set(position.x+20,position.y+35,position.z+25);sun.target.position.set(position.x,position.y,position.z);sun.target.updateMatrixWorld();
    renderer.render(scene,camera);
    if(now-lastLabels>100){lastLabels=now;playerLabel.hidden=true;let shown=0;for(const resident of [...residents.values()].sort((a,b)=>a.actor.figure.position.distanceToSquared(camera.position)-b.actor.figure.position.distanceToSquared(camera.position))){if(shown>=4){resident.label.hidden=true;continue;}labelAt(resident.actor,resident.label);if(!resident.label.hidden)shown++;}}
    if(now-lastState>250){lastState=now;onState(state());}
  }
  function dispose(){
    if(disposed)return;disposed=true;playerVersion++;populationEpoch++;cancelAnimationFrame(raf);abort.abort();observer.disconnect();disposeAvatar(player);for(const c of residents.values())disposeAvatar(c.actor);residents.clear();terrain.dispose();context.dispose();
    for(const set of Object.values(resources))for(const r of set)r.dispose();sun.shadow.map?.dispose();renderer.dispose();ui.remove();parent.style.position=oldPosition;canvas.style.touchAction=oldTouch;if(oldTabIndex===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTabIndex);
  }
  if(external){if(external.aborted){dispose();return {dispose,setPhase:applyPhase,focusCitizen,teleport,getState:state};}listen(external,'abort',dispose,{once:true});}
  onState({...state(),loading:true});raf=requestAnimationFrame(tick);
  try{await Promise.all([replacePlayer(activeCitizen),preloadRepublicBuildingLogo().catch(error=>onError(error))]);if(!disposed)void populate();}catch(error){dispose();onError(error);throw error;}
  return {dispose,setPhase:applyPhase,focusCitizen,teleport,getState:state};
}
