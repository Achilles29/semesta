import * as THREE from 'three';
import {createCapitalContext,createRepublicTerrainStream} from './republic-capital-scene.js';
import {WORLD_PHASE_EVENT,worldDestination,getWorldPhase,normalizeWorldPhase,terrainHeight,moveWorldPosition,worldFloorHeight} from './republic-world-layout.js';
import {preloadRepublicBuildingLogo} from './republic-building-identity.js';
import {createRepublicPresence} from './republic-presence.js';
import {mountConstruction} from './republic-construction.js';
import {mountCitizenHome} from './citizen-home.js';
import {HOME_LAYOUT} from './citizen-home-layout.js';
import {createWelcomeParcel} from './citizen-home-parcel.js';
import {WORLD_HUD_CSS,applyWorldHudLayout,bindRunToggle} from './republic-world-hud.js';
import {presets,normalizeAvatarConfig} from './avatar-v15-config.js';
import {loadAvatarProfile,createHumanModel,disposeAvatar,animateAvatar,avatarSpeed} from './avatar-runtime.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const presetMap=new Map(presets.map(p=>[p.id,p]));
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export const WORLD_RESIDENT_LIMIT=4;
export const WORLD_ZOOM_BOUNDS=Object.freeze({min:2.2,max:24});
export const clampWorldZoom=value=>clamp(Number.isFinite(value)?value:7.2,WORLD_ZOOM_BOUNDS.min,WORLD_ZOOM_BOUNDS.max);
export const worldLabelVisible=({distance,screenX,self=false})=>!self&&distance<=12&&Math.abs(screenX)<.72;
export function worldAvatarConfig(citizen){
  let input=citizen?.avatar_config||citizen?.avatarConfig||citizen?.config;
  if(!input&&citizen?.presetId)input=presetMap.get(citizen.presetId)?.config;
  if(!input)input=presetMap.get('v15-warga-aulia-talita2')?.config||presetMap.get('v15-laras')?.config||presets[0].config;
  const config=normalizeAvatarConfig(input);if(!config.presetId&&presetMap.has(citizen?.presetId))config.presetId=citizen.presetId;return config;
}
/** Story actors belong to episode production. Only deliberate NPCs live here. */
export function worldResidents(city='jakarta'){
  return [{id:'pasca-bowow',name:'Pasca Bowow',role:'NPC · Presiden',presetId:'v15-prabowo-inspired',personality:'Usulan warga saya dengar. Keputusannya tetap lewat meja saya.',home:{x:-5,y:.615,z:-.1,yaw:0},index:0,stationary:true},
    {id:'bu-rani',name:HOME_LAYOUT.clerk.name,role:HOME_LAYOUT.clerk.role,presetId:'v15-laras',personality:'Selamat datang! Kamar dasarmu sudah disiapkan di Wisma Warga. Bantu antar paket perlengkapan ini ke sana, lalu tanaman sambutannya boleh kamu taruh di kamar. Tekan tombol tugas untuk mulai.',home:{x:HOME_LAYOUT.clerk.x,z:HOME_LAYOUT.clerk.z,yaw:0},index:1,stationary:true}];
}

/** No WebGL/browser globals are touched until mount. events accepts either an
 * AbortSignal or AbortController; all owned DOM/GPU resources are released. */
export async function mountRepublicOpenWorld({canvas,city,entry,events,apiUrl,activeCitizen,onState=()=>{},onError=()=>{}}={}){
  if(!canvas?.parentElement)throw new Error('Kanvas peta jelajah tidak tersedia.');
  const destination=worldDestination(city),cityId=destination.id,abort=new AbortController(),signal=abort.signal,external=events?.signal||events;
  let disposed=false,raf=0,player=null,playerVersion=0,phase=getWorldPhase(),yaw=0,pitch=.34,zoom=7.2,lastTime=0,lastState=0,lastLabels=0,lastPopulation=0,lastPresence=0,presenceBusy=false,presenceEpoch=0,nearby=null,swapCitizen=activeCitizen,chatTarget=null,chatAfter=0,canChat=false;
  const presence=createRepublicPresence({apiUrl});
  let presencePromise=null,home=null,interior=false;
  const start=Array.isArray(entry)?{x:entry[0],z:entry[1]}:entry||destination.spawn;
  const position={x:Number.isFinite(+start.x)?+start.x:destination.spawn.x,z:Number.isFinite(+start.z)?+start.z:destination.spawn.z,y:0};
  position.y=terrainHeight(position.x,position.z,cityId);if(position.y<-.17){Object.assign(position,destination.spawn);position.y=terrainHeight(position.x,position.z,cityId);}
  yaw=Number.isFinite(+start.cameraYaw)?+start.cameraYaw:0;
  const parent=canvas.parentElement,oldPosition=parent.style.position,oldTouch=canvas.style.touchAction,oldTabIndex=canvas.getAttribute('tabindex');
  if(getComputedStyle(parent).position==='static')parent.style.position='relative';canvas.style.touchAction='none';canvas.tabIndex=0;canvas.setAttribute('aria-label',`Jelajah ${destination.name}. WASD untuk berjalan, Shift berlari, geser untuk memutar kamera.`);
  const ui=document.createElement('div');ui.className='republic-world-overlay';parent.append(ui);
  const style=document.createElement('style');style.textContent=WORLD_HUD_CSS;ui.append(style);
  const topActions=parent.querySelector('.explore-top-actions'),toolsMenu=document.createElement('details');toolsMenu.className='rw-tools';
  if(topActions){const summary=document.createElement('summary');summary.textContent='Alat';summary.setAttribute('aria-label','Alat jelajah, avatar, musik dan rekam');topActions.before(toolsMenu);toolsMenu.append(summary,topActions);}
  function disposeHud(){if(topActions&&toolsMenu.parentNode)toolsMenu.before(topActions);toolsMenu.remove();parent.classList.remove('rw-hud-active');delete parent.dataset.hudPhone;delete parent.dataset.hudLandscape;delete parent.dataset.hudTouch;for(const property of Array.from({length:parent.style.length},(_,index)=>parent.style.item(index)))if(property.startsWith('--rw-'))parent.style.removeProperty(property);}
  const labels=document.createElement('div');ui.append(labels);
  const hint=document.createElement('div');hint.className='rw-hint';hint.textContent='WASD / panah · Shift lari · Seret kamera · Gulir zoom · E sapa';ui.append(hint);
  const onlineBadge=document.createElement('div');onlineBadge.className='rw-online';onlineBadge.setAttribute('role','status');onlineBadge.textContent=swapCitizen?.id?'Mencari warga online…':'Masuk sebagai warga untuk bertemu pemain lain.';ui.append(onlineBadge);
  const loading=document.createElement('div');loading.className='rw-loading';loading.setAttribute('role','status');loading.textContent='Membuka dunia dan karakter…';ui.append(loading);
  const talk=document.createElement('button');talk.className='rw-talk';talk.hidden=true;ui.append(talk);
  const card=document.createElement('section');card.className='rw-card';card.hidden=true;card.setAttribute('aria-live','polite');ui.append(card);
  const pad=document.createElement('div');pad.className='rw-touch-pad';pad.setAttribute('aria-label','Joystick jalan');const knob=document.createElement('div');knob.className='rw-touch-knob';pad.append(knob);ui.append(pad);
  const runButton=document.createElement('button');runButton.className='rw-run';runButton.textContent='LARI';ui.append(runButton);
  const zoomControls=document.createElement('div');zoomControls.className='rw-zoom';zoomControls.setAttribute('role','group');zoomControls.setAttribute('aria-label','Zoom kamera');
  const zoomIn=document.createElement('button'),zoomOut=document.createElement('button'),zoomValue=document.createElement('output');
  zoomIn.type=zoomOut.type='button';zoomIn.textContent='+';zoomOut.textContent='−';zoomIn.setAttribute('aria-label','Perbesar tampilan');zoomOut.setAttribute('aria-label','Perkecil tampilan');zoomIn.title='Perbesar (+)';zoomOut.title='Perkecil (−)';zoomValue.setAttribute('aria-live','polite');zoomControls.append(zoomIn,zoomValue,zoomOut);ui.append(zoomControls);
  function setZoom(value){zoom=clampWorldZoom(value);zoomValue.textContent=zoom.toFixed(1)+' m';zoomIn.disabled=zoom<=WORLD_ZOOM_BOUNDS.min;zoomOut.disabled=zoom>=WORLD_ZOOM_BOUNDS.max;}setZoom(zoom);
  const listen=(target,type,callback,options={})=>target?.addEventListener(type,callback,{...options,signal});
  listen(zoomIn,'click',()=>setZoom(zoom/1.22));listen(zoomOut,'click',()=>setZoom(zoom*1.22));
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b5d5d5');scene.fog=new THREE.Fog('#b5d5d5',260,1500);
  const camera=new THREE.PerspectiveCamera(48,1,.08,4500),resources={geometries:new Set(),materials:new Set(),textures:new Set()};
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){disposeHud();ui.remove();parent.style.position=oldPosition;canvas.style.touchAction=oldTouch;throw error;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight('#e5f1ef','#8b8563',2.2));
  const sun=new THREE.DirectionalLight('#fff1d7',3.2);sun.position.set(20,35,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-26;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const context=createCapitalContext({parent:scene,...resources,phase,includeCore:true,city:cityId}),terrain=createRepublicTerrainStream({parent:scene,city:cityId,reservedBounds:[{minX:HOME_LAYOUT.x-HOME_LAYOUT.width/2-3,maxX:HOME_LAYOUT.x+HOME_LAYOUT.width/2+3,minZ:HOME_LAYOUT.z-HOME_LAYOUT.depth/2-3,maxZ:HOME_LAYOUT.entrance.z+3}]});terrain.update(position.x,position.z);
  const construction=mountConstruction({scene,ui,canvas,getPosition:()=>position,getCitizen:()=>swapCitizen,getYaw:()=>player?.figure.rotation.y||0,apiUrl,events:signal,beforeAction:async()=>{if(!await syncPresence({fresh:true}))throw new Error('Posisi belum tersinkron. Coba lagi saat koneksi kembali.');}});
  position.y=worldFloorHeight(position.x,position.z,{surfaces:context.surfaces,city:cityId});
  const roster=worldResidents(cityId),residents=new Map(),pending=new Set(),failed=new Set(),peers=new Map(),peerPending=new Set(),peerData=new Map();let desired=new Set(),populationEpoch=0;
  const chatPanel=document.getElementById('citizenChat'),chatLog=document.getElementById('citizenChatLog'),chatStatus=document.getElementById('citizenChatStatus'),chatInput=document.querySelector('#citizenChatForm input[name="message"]'),chatSend=document.querySelector('#citizenChatForm button[type="submit"]');
  const keys=new Set(),stick={x:0,z:0},pointer=new Map();let stickId=null,runTouch=false,pinchDistance=0,dragged=0;
  if(window.matchMedia?.('(pointer:coarse)').matches)hint.textContent='Joystick jalan · Tombol LARI · Seret kamera · Cubit zoom';
  const temp=new THREE.Vector3(),headPoint=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),raycaster=new THREE.Raycaster();let width=1,height=1;
  const makeLabel=(name,role,self=false)=>{const e=document.createElement('div');e.className='rw-label';e.hidden=true;e.dataset.self=String(self);e.textContent=name;const small=document.createElement('small');small.textContent=role;e.append(small);labels.append(e);return e;};
  let playerLabel=makeLabel(activeCitizen?.display_name||activeCitizen?.name||'Tamu','',true);
  function state(){return {city:cityId,phase,position:{x:position.x,y:position.y,z:position.z},yaw:player?.figure.rotation.y??0,cameraYaw:yaw,zoom,nearby:nearby?{id:nearby.id,name:nearby.name,role:nearby.role}:null,loadedChunks:terrain.count,npcsVisible:residents.size,onlineVisible:peers.size};}
  function collisionResources(){return {colliders:[...context.colliders,...terrain.colliders,...construction.geometry.colliders,...(home?.geometry.colliders||[]),...[...residents.values()].map(c=>({x:c.actor.figure.position.x,z:c.actor.figure.position.z,radius:.28,maxY:c.actor.figure.position.y+1.8}))],surfaces:[...context.surfaces,...construction.geometry.surfaces,...(home?.geometry.surfaces||[])],city:cityId};}
  const worldOccluders=()=>[...context.occluders,...construction.geometry.occluders,...(home?.geometry.occluders||[])];
  function showCitizen(citizen=nearby){
    if(!citizen)return;card.replaceChildren();const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Tutup profil warga');close.onclick=()=>{card.hidden=true;canvas.focus({preventScroll:true});};
    const name=document.createElement('h3');name.textContent=citizen.name;const role=document.createElement('small');role.textContent=citizen.role;
    const text=document.createElement('p');text.textContent=citizen.personality||'Warga pertama Republik Wkwkwk. Usulan dan cerita baru menanti di sini.';
    const place=document.createElement('p');place.textContent='Karakter cerita · NPC';card.append(close,name,role,text,place);card.hidden=false;
  }
  function closeChat(){chatPanel.hidden=true;chatTarget=null;chatAfter=0;canChat=false;chatSend.disabled=true;chatStatus.classList.remove('error');}
  function clearPeers(){for(const peer of peers.values()){peer.label.remove();disposeAvatar(peer.actor);}peers.clear();peerData.clear();onlineBadge.textContent=swapCitizen?.id?'Belum ada warga lain di sekitar.':'Masuk sebagai warga untuk bertemu pemain lain.';}
  function appendMessages(messages){
    for(const message of messages||[]){const id=Number(message.id)||0;if(!id||chatLog.querySelector(`[data-message-id="${id}"]`))continue;
      chatLog.querySelector('.citizen-chat-empty')?.remove();const bubble=document.createElement('article');bubble.className=`citizen-chat-message${Number(message.sender_id)===Number(swapCitizen?.id)?' mine':''}`;bubble.dataset.messageId=String(id);
      const by=document.createElement('b');by.textContent=Number(message.sender_id)===Number(swapCitizen?.id)?'KAMU':message.sender_name||chatTarget?.name||'WARGA';const body=document.createElement('span');body.textContent=message.message||'';bubble.append(by,body);chatLog.append(bubble);chatAfter=Math.max(chatAfter,id);
    }
    chatLog.scrollTop=chatLog.scrollHeight;
  }
  function openChat(peer){
    if(!swapCitizen?.id){document.getElementById('profileButton')?.click();return;}
    chatTarget={id:peer.id,name:peer.name};chatAfter=0;canChat=false;chatLog.replaceChildren();const empty=document.createElement('p');empty.className='citizen-chat-empty';empty.textContent='Sapa warga yang kamu temui di sini.';chatLog.append(empty);
    document.getElementById('citizenChatName').textContent=peer.name;chatStatus.textContent='Menghubungkan obrolan…';chatStatus.classList.remove('error');chatSend.disabled=true;card.hidden=true;chatPanel.hidden=false;chatInput.focus({preventScroll:true});lastPresence=0;void syncPresence();
  }
  function removePeer(id){const peer=peers.get(id);if(!peer)return;peer.label.remove();disposeAvatar(peer.actor);peers.delete(id);}
  async function mountPeer(data,epoch){
    const id=Number(data.id);if(peerPending.has(id))return;peerPending.add(id);
    try{const config=worldAvatarConfig(data);await loadAvatarProfile(config.profileId);const target=peerData.get(id);if(disposed||epoch!==presenceEpoch||!target||target.signature!==data.signature)return;
      const actor=createHumanModel(THREE,{avatarConfig:config});const y=worldFloorHeight(target.x,target.z,{surfaces:context.surfaces,city:cityId});actor.figure.position.set(target.x,y,target.z);scene.add(actor.figure);
      const label=makeLabel(target.name,'Warga online');peers.set(id,{actor,label,target,signature:target.signature});
    }catch(error){if(!disposed)console.warn('Avatar warga online belum dapat dimuat.',error);}finally{peerPending.delete(id);}
  }
  function updatePeers(players,epoch){
    const nearbyPlayers=(Array.isArray(players)?players:[]).filter(p=>Number.isFinite(+p.id)&&Number.isFinite(+p.x)&&Number.isFinite(+p.z)&&Number(p.id)!==Number(swapCitizen?.id)).sort((a,b)=>Number(a.distance)-Number(b.distance)).slice(0,12);
    const wanted=new Set(nearbyPlayers.map(p=>Number(p.id)));
    for(const id of peerData.keys())if(!wanted.has(id)){peerData.delete(id);removePeer(id);}
    for(const item of nearbyPlayers){const id=Number(item.id),signature=JSON.stringify(item.avatar_config||item.avatar||''),target={id,name:String(item.displayName||'Warga'),x:Number(item.x),z:Number(item.z),signature,avatar_config:item.avatar_config,avatar:item.avatar};peerData.set(id,target);
      const peer=peers.get(id);if(peer&&peer.signature!==signature)removePeer(id);else if(peer){peer.target=target;peer.label.firstChild.textContent=target.name;}
      if(!peers.has(id))void mountPeer(target,epoch);
    }
    onlineBadge.textContent=nearbyPlayers.length?`${nearbyPlayers.length} warga online di sekitar`:'Belum ada warga lain di sekitar.';
  }
  async function syncPresence({fresh=false}={}){
    if(disposed||interior||!swapCitizen?.id)return null;
    if(presencePromise){if(!fresh)return presencePromise;await presencePromise;if(disposed||interior||!swapCitizen?.id)return null;}
    presenceBusy=true;const epoch=presenceEpoch;
    presencePromise=(async()=>{try{const data=await presence.sync({x:position.x,z:position.z,targetId:chatTarget?.id||0,after:chatAfter,signal});if(disposed||epoch!==presenceEpoch)return null;
      updatePeers(data.players,epoch);
      if(chatTarget&&!chatPanel.hidden){appendMessages(data.messages);canChat=!!data.canChat;chatSend.disabled=!canChat;chatStatus.textContent=canChat?'Kalian berdekatan · pesan masuk langsung.':'Dekati lagi warga ini untuk mengobrol.';chatStatus.classList.toggle('error',!canChat);}
      return data;
    }catch(error){if(!disposed&&error.name!=='AbortError'){onlineBadge.textContent=error.message;chatStatus.textContent=error.message;chatStatus.classList.add('error');chatSend.disabled=true;}return null;}
    finally{presenceBusy=false;presencePromise=null;}})();
    return presencePromise;
  }
  listen(talk,'click',()=>nearby?.kind==='player'?openChat(nearby):showCitizen());
  listen(document.getElementById('citizenChatClose'),'click',()=>closeChat());
  listen(document.getElementById('citizenChatForm'),'submit',async event=>{
    event.preventDefault();if(!chatTarget||!canChat||!chatInput.value.trim())return;const message=chatInput.value.trim();chatSend.disabled=true;
    try{const result=await presence.send({targetId:chatTarget.id,message,signal});if(disposed)return;appendMessages([result.message]);chatInput.value='';chatStatus.textContent='Pesan terkirim.';chatStatus.classList.remove('error');}
    catch(error){if(!disposed){chatStatus.textContent=error.message;chatStatus.classList.add('error');}}
    finally{if(!disposed){chatSend.disabled=!canChat;chatInput.focus({preventScroll:true});}}
  });
  async function replacePlayer(citizen){
    const version=++playerVersion,previousId=Number(swapCitizen?.id)||0,nextId=Number(citizen?.id)||0;swapCitizen=citizen;
    if(previousId!==nextId){presenceEpoch++;clearPeers();closeChat();lastPresence=0;if(previousId&&!nextId)void presence.leave().catch(()=>{});}
    const config=worldAvatarConfig(citizen);
    await loadAvatarProfile(config.profileId);if(disposed||version!==playerVersion)return;
    const next=createHumanModel(THREE,{avatarConfig:config});next.figure.position.set(position.x,position.y,position.z);next.figure.rotation.y=player?.figure.rotation.y??(Number.isFinite(+start.yaw)?+start.yaw:Math.PI);scene.add(next.figure);disposeAvatar(player);player=next;
    playerLabel.remove();playerLabel=makeLabel(citizen?.display_name||citizen?.name||'Tamu','',true);loading.remove();
  }
  function applyPhase(value){
    phase=normalizeWorldPhase(value);context.setPhase(phase);
    // A completed slab can appear under the player when inspecting a phase.
    position.y=worldFloorHeight(position.x,position.z,collisionResources());
    player?.figure.position.set(position.x,position.y,position.z);onState(state());
  }
  function teleport(point){
    if(interior||!point||!Number.isFinite(+point.x)||!Number.isFinite(+point.z))return false;
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
  function resize(){const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);applyWorldHudLayout(parent,width,height,{coarse:globalThis.matchMedia?.('(any-pointer: coarse)').matches||false});renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const paused=()=>document.body.classList.contains('production-viewer-open')||!!document.querySelector('dialog[open],#avatarCustomizer:not([hidden])');
  const formTarget=e=>e.target?.closest?.('input,textarea,select,[contenteditable=true],[role=dialog]');
  const runControl=bindRunToggle(runButton,{signal,isPaused:()=>interior||paused(),onChange:value=>runTouch=value});
  const resetMovement=()=>{keys.clear();runControl.reset();stick.x=stick.z=0;stickId=null;knob.style.transform='';pointer.clear();pinchDistance=0;};
  const parcel=createWelcomeParcel({scene});
  const inertNodes=new Map();
  home=mountCitizenHome({scene,ui,canvas,getPosition:()=>position,getCitizen:()=>swapCitizen,getYaw:()=>player?.figure.rotation.y||0,apiUrl,events:signal,
    beforeAction:async()=>{if(!await syncPresence({fresh:true}))throw new Error('Posisi belum tersinkron. Coba lagi saat koneksi kembali.');},
    onInteriorChange(next){
      const wasInside=interior;interior=next;resetMovement();card.hidden=true;closeChat();lastTime=0;presenceEpoch++;clearPeers();
      document.body.classList.toggle('citizen-home-open',next);
      if(next){
        document.body.classList.remove('capture-mode');
        for(const node of [...parent.children,document.querySelector('.game-hud')])if(node&&node!==ui&&node!==canvas){inertNodes.set(node,node.inert);node.inert=true;}
        // The server also gates delayed heartbeats after entering a room.
        const pendingPresence=presencePromise;void Promise.resolve(pendingPresence).then(()=>{if(!disposed&&interior)return presence.leave();}).catch(()=>{});
      }else{
        for(const [node,value] of inertNodes)node.inert=value;inertNodes.clear();
        if(wasInside&&!disposed){teleport({x:HOME_LAYOUT.entrance.x,z:HOME_LAYOUT.entrance.z+2});lastPresence=0;}
      }
    }});
  listen(window,'keydown',e=>{if(interior||formTarget(e)||paused())return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){keys.add(e.code);e.preventDefault();}if(['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(e.code)){setZoom(zoom*(['Equal','NumpadAdd'].includes(e.code)?1/1.22:1.22));e.preventDefault();}if(e.code==='KeyE'&&!e.repeat){if(home.consumeInteraction()||construction.consumeInteraction())e.preventDefault();else if(nearby?.kind==='player')openChat(nearby);else showCitizen();}if(e.code==='Escape'){card.hidden=true;closeChat();}});
  listen(window,'keyup',e=>keys.delete(e.code));listen(window,'blur',resetMovement);listen(document,'focusin',e=>{if(formTarget(e))resetMovement();});
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(e.deltaY*.001));},{passive:false});
  listen(canvas,'pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=0;if(pointer.size===2){const p=[...pointer.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
  listen(canvas,'pointermove',e=>{const old=pointer.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;dragged+=Math.abs(dx)+Math.abs(dy);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointer.size===2){const p=[...pointer.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance)setZoom(zoom*pinchDistance/Math.max(10,d));pinchDistance=d;}else{yaw-=dx*.006;pitch=clamp(pitch+dy*.005,.08,1.14);}});
  const release=e=>{pointer.delete(e.pointerId);pinchDistance=0;};listen(canvas,'pointerup',release);listen(canvas,'pointercancel',release);
  const updateStick=e=>{const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.32),dz=(e.clientY-r.top-r.height/2)/(r.height*.32),length=Math.max(1,Math.hypot(dx,dz));stick.x=dx/length;stick.z=dz/length;knob.style.transform=`translate(${stick.x*35}px,${stick.z*35}px)`;};
  listen(pad,'pointerdown',e=>{e.preventDefault();stickId=e.pointerId;pad.setPointerCapture(e.pointerId);updateStick(e);});listen(pad,'pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
  const clearStick=e=>{if(e.pointerId!==stickId)return;stickId=null;stick.x=stick.z=0;knob.style.transform='';};listen(pad,'pointerup',clearStick);listen(pad,'pointercancel',clearStick);
  listen(window,WORLD_PHASE_EVENT,e=>{if(e.detail?.source==='server')applyPhase(e.detail.phase);});
  listen(window,'semesta:citizen-change',e=>replacePlayer(e.detail?.citizen).catch(error=>{if(!disposed)onError(error);}));
  listen(document,'visibilitychange',()=>{lastTime=0;resetMovement();});
  function labelAt(actor,label,roleVisible=true){
    if(actor.head?.getWorldPosition)actor.head.getWorldPosition(headPoint);else actor.figure.getWorldPosition(headPoint).add(temp.set(0,1.75,0));headPoint.y+=.31;
    const distance=camera.position.distanceTo(headPoint);const projected=headPoint.clone().project(camera);
    if(projected.z>1||projected.z< -1||Math.abs(projected.x)>1.06||Math.abs(projected.y)>1.05||!worldLabelVisible({distance,screenX:projected.x,self:label.dataset.self==='true'})){label.hidden=true;return;}
    raycaster.set(camera.position,temp.copy(headPoint).sub(camera.position).normalize());raycaster.far=distance-.25;
    const obscured=raycaster.intersectObjects(worldOccluders(),false).some(hit=>visible(hit.object)&&!(hit.object.material?.transparent&&hit.object.material.opacity<.6));
    label.hidden=obscured;if(obscured)return;label.style.left=`${(projected.x*.5+.5)*width}px`;label.style.top=`${(-projected.y*.5+.5)*height}px`;label.style.opacity=distance>35?'.72':'1';label.querySelector('small').hidden=!roleVisible||distance>13;
  }
  function tick(now){
    if(disposed)return;raf=requestAnimationFrame(tick);home.tick(now);if(document.hidden||paused()){lastTime=0;resetMovement();ui.style.visibility='hidden';return;}ui.style.visibility='';
    if(interior){lastTime=0;return;}
    const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;
    if(swapCitizen?.id&&now-lastPresence>1600){lastPresence=now;void syncPresence();}
    let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x,dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+stick.z;
    const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}const moving=length>.08,speed=player?avatarSpeed(player,(keys.has('ShiftLeft')||keys.has('ShiftRight')||runTouch)?'Run':'Walk'):0;
    if(player){
      const wx=dx*Math.cos(yaw)+dz*Math.sin(yaw),wz=-dx*Math.sin(yaw)+dz*Math.cos(yaw),previous={...position};
      if(moving){Object.assign(position,moveWorldPosition(position,{x:wx*speed*dt,z:wz*speed*dt},collisionResources()));const goal=Math.atan2(wx,wz),delta=Math.atan2(Math.sin(goal-player.figure.rotation.y),Math.cos(goal-player.figure.rotation.y));player.figure.rotation.y+=delta*Math.min(1,dt*13);}
      position.y=worldFloorHeight(position.x,position.z,collisionResources());
      const actual=dt?Math.hypot(position.x-previous.x,position.z-previous.z)/dt:0;player.figure.position.set(position.x,position.y,position.z);construction.resetActorPose();animateAvatar(player,actual,dt);construction.applyActorPose(player);
    }
    terrain.update(position.x,position.z);
    construction.tick(now);
    parcel.update(player,home.opportunity()?.action==='deliver');
    const homePriority=home.wantsInteraction();home.setActionVisible(chatPanel.hidden);construction.setActionVisible(!homePriority&&chatPanel.hidden);
    if(now-lastPopulation>700){lastPopulation=now;void populate();}
    nearby=null;let nearest=4.3;
    for(const peer of peers.values()){
      const beforeX=peer.actor.figure.position.x,beforeZ=peer.actor.figure.position.z,travel=Math.hypot(peer.target.x-beforeX,peer.target.z-beforeZ);
      if(travel>15){peer.actor.figure.position.x=peer.target.x;peer.actor.figure.position.z=peer.target.z;}
      else {const fraction=Math.min(1,dt*5);peer.actor.figure.position.x+=(peer.target.x-beforeX)*fraction;peer.actor.figure.position.z+=(peer.target.z-beforeZ)*fraction;}
      const moved=Math.hypot(peer.actor.figure.position.x-beforeX,peer.actor.figure.position.z-beforeZ);peer.actor.figure.position.y=worldFloorHeight(peer.actor.figure.position.x,peer.actor.figure.position.z,{surfaces:[...context.surfaces,...construction.geometry.surfaces],city:cityId});
      if(moved>.001)peer.actor.figure.rotation.y=Math.atan2(peer.actor.figure.position.x-beforeX,peer.actor.figure.position.z-beforeZ);
      animateAvatar(peer.actor,dt?moved/dt:0,dt);
      const distance=Math.hypot(position.x-peer.actor.figure.position.x,position.z-peer.actor.figure.position.z);if(distance<nearest){nearest=distance;nearby={kind:'player',id:peer.target.id,name:peer.target.name,role:'Warga online',actor:peer.actor};}
    }
    for(const resident of residents.values()){
      animateAvatar(resident.actor,0,dt);const d=Math.hypot(position.x-resident.actor.figure.position.x,position.z-resident.actor.figure.position.z);if(d<nearest){nearest=d;nearby={...resident,kind:'npc'};}
    }
    talk.hidden=!nearby||homePriority||construction.wantsInteraction();talk.textContent=nearby?`Sapa ${nearby.name} · E`:'';
    cameraTarget.set(position.x,position.y+1.25,position.z);desiredCamera.set(position.x+Math.sin(yaw)*zoom*Math.cos(pitch),position.y+1.25+Math.sin(pitch)*zoom,position.z+Math.cos(yaw)*zoom*Math.cos(pitch));
    desiredCamera.y=Math.max(desiredCamera.y,terrainHeight(desiredCamera.x,desiredCamera.z,cityId)+.65);
    // Keep the orbit camera on the player's side of walls. Thin transparent
    // windows do not block it; landscape and solid geometry do.
    raycaster.set(cameraTarget,temp.copy(desiredCamera).sub(cameraTarget).normalize());raycaster.far=cameraTarget.distanceTo(desiredCamera);
    const obstruction=raycaster.intersectObjects(worldOccluders(),false).find(hit=>hit.distance>.25&&visible(hit.object)&&!(hit.object.material?.transparent&&hit.object.material.opacity<.6));
    if(obstruction)desiredCamera.copy(cameraTarget).addScaledVector(raycaster.ray.direction,Math.max(.7,obstruction.distance-.22));
    camera.position.copy(desiredCamera);camera.lookAt(cameraTarget);camera.updateMatrixWorld(true);
    sun.position.set(position.x+20,position.y+35,position.z+25);sun.target.position.set(position.x,position.y,position.z);sun.target.updateMatrixWorld();
    renderer.render(scene,camera);
    if(now-lastLabels>100){lastLabels=now;playerLabel.hidden=true;let shown=0;for(const person of [...peers.values(),...residents.values()].sort((a,b)=>a.actor.figure.position.distanceToSquared(camera.position)-b.actor.figure.position.distanceToSquared(camera.position))){if(shown>=4){person.label.hidden=true;continue;}labelAt(person.actor,person.label);if(!person.label.hidden)shown++;}}
    if(now-lastState>250){lastState=now;onState(state());}
  }
  function dispose(){
    if(disposed)return;disposed=true;playerVersion++;populationEpoch++;presenceEpoch++;cancelAnimationFrame(raf);home?.dispose();parcel.dispose();construction.dispose();abort.abort();observer.disconnect();if(swapCitizen?.id)void presence.leave().catch(()=>{});closeChat();clearPeers();disposeAvatar(player);for(const c of residents.values())disposeAvatar(c.actor);residents.clear();terrain.dispose();context.dispose();
    for(const set of Object.values(resources))for(const r of set)r.dispose();sun.shadow.map?.dispose();renderer.dispose();disposeHud();ui.remove();parent.style.position=oldPosition;canvas.style.touchAction=oldTouch;if(oldTabIndex===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',oldTabIndex);
  }
  if(external){if(external.aborted){dispose();return {dispose,setPhase:applyPhase,focusCitizen,teleport,getState:state};}listen(external,'abort',dispose,{once:true});}
  onState({...state(),loading:true});raf=requestAnimationFrame(tick);
  try{await Promise.all([replacePlayer(activeCitizen),preloadRepublicBuildingLogo().catch(error=>onError(error))]);if(!disposed)void populate();}catch(error){dispose();onError(error);throw error;}
  return {dispose,setPhase:applyPhase,focusCitizen,teleport,getState:state};
}
