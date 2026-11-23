import * as THREE from 'three';
import {HOME_LAYOUT} from './citizen-home-layout.js';
import {createCitizenHomeGeometry, createCitizenRoomGeometry} from './citizen-home-geometry.js';

const distance = (a, b) => a && b ? Math.hypot(a.x-b.x, a.z-b.z) : Infinity;
const requestId = () => globalThis.crypto?.randomUUID?.() || `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const timeValue = value => typeof value === 'number' ? (value < 1e12 ? value*1000 : value) : (Date.parse(value) || 0);

/** Guidance is a proposal; only the server can award an item or open a room. */
export function citizenHomeOpportunity({snapshot, now = Date.now()} = {}) {
  const mission = snapshot?.mission;
  if (snapshot?.home?.inside) return null;
  const radius = Number(mission?.radius) || 3;
  if (mission?.status === 'carrying') {
    const remaining = Math.max(0, timeValue(mission.acceptedAt)+2000-now);
    return {action:'deliver', target:mission.deliveryPoint || HOME_LAYOUT.entrance, radius, remaining,
      title:'Antar paket ke Wisma', description:'Bawa paket perlengkapan ke pintu Wisma Warga. Hadiah pertamamu: tanaman untuk kamar.', destination:'Pintu Wisma Warga', label:'Serahkan paket'};
  }
  if (snapshot?.home?.unlocked) return {action:'enter_home', target:mission?.deliveryPoint || HOME_LAYOUT.entrance, radius,
    title:'Kamarmu sudah siap', description:'Masuk ke kamar pribadimu. Tempatkan tanaman hadiah di rak sambutan.', destination:'Pintu Wisma Warga', label:'Masuk kamar'};
  return {action:'accept_delivery', target:mission?.clerk || HOME_LAYOUT.clerk, radius,
    title:'Temui Bu Rani', description:'Bu Rani punya satu paket untuk Wisma Warga. Bantu mengantar dan dapatkan tanaman pertamamu.', destination:'Bu Rani · layanan warga', label:'Terima tugas antar'};
}

/** Static isometric room: the shelf also has an accessible HTML action. */
export function createCitizenRoomView({canvas, container, onSlot, onError} = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ddc7');
  const room = createCitizenRoomGeometry({scene});
  scene.add(new THREE.HemisphereLight('#fff5df', '#779487', 2.5));
  const sun = new THREE.DirectionalLight('#fff3d9', 3); sun.position.set(5,9,7); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100); camera.position.set(10,9,12); camera.lookAt(0,.65,0);
  let renderer, observer, disposed = false;
  const abort = new AbortController();
  function render() {
    if (!renderer || disposed) return;
    const width = Math.max(1, container?.clientWidth || canvas.clientWidth || 640), height = Math.max(1, container?.clientHeight || canvas.clientHeight || 480);
    renderer.setSize(width, height, false); camera.aspect = width/height;
    // Keep the whole room visible on narrow phone canvases.
    camera.position.set(10,9,12).multiplyScalar(Math.max(1, 1/camera.aspect)); camera.lookAt(0,.65,0); camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  }
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.7)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    if (globalThis.ResizeObserver) {observer = new ResizeObserver(render); observer.observe(container || canvas);}
    window.addEventListener('resize', render, {signal:abort.signal});
    canvas.addEventListener('click', event => {
      const rect=canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      const pointer = new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1);
      const ray = new THREE.Raycaster(); ray.setFromCamera(pointer,camera);
      if (ray.intersectObject(room.slot,true).some(hit=>hit.object.userData.slotId === HOME_LAYOUT.slotId)) onSlot?.();
    }, {signal:abort.signal});
    render();
  } catch {
    onError?.('Tampilan 3D kamar belum dapat dimuat. Kamu tetap bisa menaruh tanaman atau keluar lewat tombol.');
  }
  return {
    applyState(state) {room.applyState(state); render();},
    dispose() {if(disposed)return;disposed=true;abort.abort();observer?.disconnect();room.dispose();renderer?.dispose();renderer?.forceContextLoss();},
  };
}

export function mountCitizenHome({scene, ui, canvas, getPosition, getCitizen, beforeAction = async()=>{}, apiUrl, events, onInteriorChange = ()=>{},
  getYaw = ()=>0, fetchImpl = globalThis.fetch, now = Date.now, createInteriorView = createCitizenRoomView} = {}) {
  const geometry = createCitizenHomeGeometry({scene}), abort = new AbortController(), signal = abort.signal, external = events?.signal || events;
  let identity = Number(getCitizen?.()?.id) || 0, epoch = 0, disposed = false, snapshot = null, csrfToken = '', readAbort = null, writeAbort = null;
  let loading = false, busy = false, error = '', notice = '', inside = false, roomView = null, actionVisible = true, lastRender = -Infinity, clockOffset = 0;
  let sequence = 0, appliedSequence = 0, previousFocus = null;
  const pendingCommands = new Map();
  const host = document.createElement('section'); host.className = 'citizen-home'; host.setAttribute('aria-label','Tugas warga dan kamar'); ui.append(host);
  if (!document.querySelector('link[data-citizen-home-style]')) {
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./citizen-home.css',import.meta.url).href;link.dataset.citizenHomeStyle='';document.head.append(link);
  }
  host.innerHTML = '<details class="ch-panel"><summary><span class="ch-eyebrow">WARGA BARU</span><strong data-home-title>Temui Bu Rani</strong><span class="ch-distance"><b data-home-arrow aria-hidden="true">↑</b><span data-home-distance></span></span></summary><div class="ch-panel-body"><p data-home-description></p><p class="ch-bag" data-home-bag></p><p class="ch-notice" data-home-notice role="status" aria-live="polite"></p><button type="button" data-home-sync hidden>Coba sinkronkan lagi</button><button class="ch-collapse" type="button" data-home-collapse>Tutup petunjuk</button></div></details><button type="button" class="ch-action" data-home-action hidden></button><section class="ch-room" role="dialog" aria-modal="true" aria-labelledby="citizenHomeRoomTitle" tabindex="-1" hidden><header><div><span class="ch-eyebrow">RUANG PRIBADI</span><h2 id="citizenHomeRoomTitle" data-home-address>Kamarmu</h2></div><button type="button" class="ch-exit" data-home-exit>Keluar kamar <span aria-hidden="true">×</span></button></header><div class="ch-room-stage"><canvas data-home-canvas aria-label="Kamar dengan tempat tidur, meja, jendela dan rak tanaman"></canvas><p data-home-render-error hidden></p></div><footer><div><strong data-home-shelf-title>Rak sambutan</strong><p data-home-shelf-description></p><p class="ch-notice" data-home-room-notice role="status" aria-live="polite"></p></div><button class="ch-slot-action" type="button" data-home-slot></button><button class="ch-room-sync" type="button" data-home-room-sync hidden>Coba sinkronkan lagi</button></footer></section>';
  const $ = selector => host.querySelector(selector), panel = $('.ch-panel'), actionButton = $('[data-home-action]'), modal = $('.ch-room');
  const opportunity = () => citizenHomeOpportunity({snapshot, now:now()+clockOffset});
  const isInside = () => inside;

  function transitionInterior(next) {
    if (inside === next) return;
    inside = next; modal.hidden = !next; ui.classList.toggle('citizen-home-interior', next);
    if (next) {
      previousFocus = document.activeElement; panel.open = false;
      onInteriorChange(true);
      roomView = createInteriorView({canvas:$('[data-home-canvas]'),container:$('.ch-room-stage'),onSlot:()=>void perform(snapshot?.home?.decorationPlaced?'remove_decoration':'place_decoration'),
        onError:message=>{const fallback=$('[data-home-render-error]');fallback.hidden=false;fallback.textContent=message;}});
      $('[data-home-exit]').focus({preventScroll:true});
    } else {
      roomView?.dispose(); roomView=null; onInteriorChange(false);
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({preventScroll:true});
      else canvas?.focus?.({preventScroll:true});
      previousFocus=null;
    }
  }
  function validSnapshot(data) {
    return Number(data?.playerId) === identity && Number.isInteger(data?.version) && data.version >= 0 &&
      ['not_started','carrying','completed'].includes(data?.mission?.status) && typeof data?.home?.id === 'string' &&
      typeof data.home.unlocked === 'boolean' && typeof data.home.inside === 'boolean' && typeof data.home.decorationPlaced === 'boolean' &&
      [0,1].includes(data?.inventory?.welcomePlant) && typeof data.csrfToken === 'string' && !!data.csrfToken;
  }
  function applySnapshot(data, order) {
    if (!validSnapshot(data)) throw new Error('Data kamar belum lengkap. Coba sinkronkan lagi.');
    if (order < appliedSequence || snapshot && data.version < snapshot.version) return false;
    appliedSequence=order; snapshot=structuredClone(data);csrfToken=data.csrfToken;
    if(data.serverTime){const timestamp=timeValue(data.serverTime);if(timestamp)clockOffset=timestamp-now();}
    // A refresh may prove a write committed even when its response was lost.
    // Retire those IDs before a later enter/place cycle starts a NEW action.
    for(const [action] of pendingCommands){
      const confirmed=action==='accept_delivery'&&data.mission.status!=='not_started'||action==='deliver'&&data.mission.status==='completed'||action==='enter_home'&&data.home.inside||action==='leave_home'&&!data.home.inside||action==='place_decoration'&&data.home.decorationPlaced||action==='remove_decoration'&&!data.home.decorationPlaced;
      if(confirmed)pendingCommands.delete(action);
    }
    transitionInterior(data.home.inside);roomView?.applyState(data.home);render();return true;
  }
  async function readResponse(response) {
    const data=await response.json().catch(()=>({}));
    if(!response.ok){const problem=new Error(data.error || `Aksi belum berhasil (${response.status}).`);problem.status=response.status;throw problem;}
    return data;
  }
  async function refresh() {
    if(disposed || !identity || busy)return false;
    const token=epoch, order=++sequence;readAbort?.abort();const requestAbort=new AbortController();readAbort=requestAbort;loading=true;error='';render();
    try {
      const url=new URL(apiUrl,document.baseURI);url.searchParams.set('resource','citizen_home');
      const data=await readResponse(await fetchImpl(url.href,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:requestAbort.signal}));
      if(disposed || epoch!==token || readAbort!==requestAbort)return false;return applySnapshot(data,order);
    } catch(problem) {if(!disposed && epoch===token && readAbort===requestAbort && problem.name!=='AbortError')error=problem.message;return false;}
    finally {if(!disposed && epoch===token && readAbort===requestAbort){loading=false;render();}}
  }
  function resetIdentity() {
    const next=Number(getCitizen?.()?.id)||0;if(next===identity)return;
    identity=next;epoch++;readAbort?.abort();writeAbort?.abort();snapshot=null;csrfToken='';loading=busy=false;error=notice='';pendingCommands.clear();clockOffset=0;appliedSequence=0;
    transitionInterior(false);render();if(next)void refresh();
  }
  function canDo(action) {
    if(inside)return action==='leave_home' || action==='place_decoration' && !snapshot.home.decorationPlaced && snapshot.inventory.welcomePlant>0 || action==='remove_decoration' && snapshot.home.decorationPlaced;
    const work=opportunity();return action===work?.action && distance(getPosition?.(),work.target)<=work.radius && !work.remaining;
  }
  async function perform(action=opportunity()?.action) {
    resetIdentity();if(disposed || busy || loading || !action)return false;
    if(!identity){document.getElementById('profileButton')?.click();return true;}
    if(!snapshot || !csrfToken){void refresh();return true;}
    if(!canDo(action))return false;
    const token=epoch, order=++sequence, outdoor=!inside;
    let command=pendingCommands.get(action);
    if(!command){command={action,requestId:requestId()};if(action==='place_decoration'||action==='remove_decoration')command.slotId=HOME_LAYOUT.slotId;pendingCommands.set(action,command);}
    busy=true;error=notice='';render();
    try {
      if(outdoor){await beforeAction();if(disposed||epoch!==token)return false;if(!canDo(action))throw new Error('Kembali ke titik tujuan untuk melanjutkan.');}
      readAbort?.abort();writeAbort=new AbortController();
      const data=await readResponse(await fetchImpl(apiUrl,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({resource:'citizen_home',...command,csrfToken}),signal:writeAbort.signal}));
      if(disposed||epoch!==token)return false;
      applySnapshot(data,order);pendingCommands.delete(action);
      notice={accept_delivery:'Paket diterima. Ikuti arah ke Wisma Warga.',deliver:'Paket sampai! Tanaman hadiah dan kamar sudah siap.',enter_home:'Selamat datang di kamar pribadimu.',leave_home:'Kamar tersimpan. Sampai jumpa lagi!',place_decoration:'Tanaman sudah menghiasi rak sambutan.',remove_decoration:'Tanaman kembali ke inventaris.'}[action]||'';
      return true;
    } catch(problem) {
      if(!disposed&&epoch===token&&problem.name!=='AbortError'){error=problem.message;if(problem.status&&problem.status<500)pendingCommands.delete(action);}
      return false;
    } finally {if(!disposed&&epoch===token){busy=false;render();}}
  }
  function render() {
    if(disposed)return;
    const work=opportunity(), position=getPosition?.(), distanceToTarget=distance(position,work?.target), near=!!work&&distanceToTarget<=work.radius;
    panel.hidden=inside;
    if(work){
      const far=distance(position,HOME_LAYOUT.clerk)>180;
      $('[data-home-title]').textContent=loading&&!snapshot?'Menyiapkan tugas…':work.title;
      $('[data-home-description]').textContent=far?'Kegiatan ini ada di Jakartawa. Kembali melalui peta, lalu datangi Bu Rani atau Wisma Warga.':work.description;
      $('[data-home-distance]').textContent=`${far?'Jakartawa':work.destination} · ${Number.isFinite(distanceToTarget)?Math.ceil(distanceToTarget):'—'} m${near?' · dekat':''}`;
      const angle=position?Math.atan2(work.target.x-position.x,work.target.z-position.z)-getYaw():0;$('[data-home-arrow]').style.transform=`rotate(${angle}rad)`;
    }
    $('[data-home-bag]').textContent=!identity?'Masuk sebagai warga untuk mulai.':snapshot?.mission.status==='carrying'?'Bawaan: paket perlengkapan Wisma':snapshot?.inventory.welcomePlant?'Inventaris: 1 tanaman sambutan':snapshot?.home.decorationPlaced?'Tanaman tersimpan di rak kamarmu.':'Hadiah tugas: tanaman sambutan';
    $('[data-home-notice]').textContent=error||notice;$('[data-home-notice]').classList.toggle('is-error',!!error);
    $('[data-home-sync]').hidden=!error||!identity;$('[data-home-sync]').disabled=busy||loading;
    actionButton.hidden=inside||!actionVisible||!near;
    actionButton.disabled=busy||loading||!!work?.remaining;
    actionButton.textContent=!identity?'Masuk untuk mulai':loading?'Menyinkronkan…':busy?'Menyimpan aksi…':work?.remaining?`Bawa paket ke pintu · ${Math.ceil(work.remaining/1000)} dtk`:`${work?.label || 'Lanjutkan'} · E`;
    if(inside&&snapshot){
      $('[data-home-address]').textContent=snapshot.home.address||'Kamarmu di Wisma Warga';
      $('[data-home-shelf-title]').textContent=snapshot.home.decorationPlaced?'Rak sambutan · tanaman terpasang':'Rak sambutan · kosong';
      $('[data-home-shelf-description]').textContent=snapshot.home.decorationPlaced?'Hadiah tugas pertamamu. Bisa diambil kembali kapan saja.':snapshot.inventory.welcomePlant?'Tanaman hadiah ada di inventaris. Klik rak atau tombol untuk menaruhnya.':'Tempat tidur dan meja siap dipakai. Dekorasi tugas akan tampil di rak ini.';
      $('[data-home-slot]').textContent=busy?'Menyimpan…':snapshot.home.decorationPlaced?'Ambil tanaman':'Taruh tanaman';
      $('[data-home-slot]').disabled=busy||loading||!snapshot.home.decorationPlaced&&!snapshot.inventory.welcomePlant;
      $('[data-home-exit]').disabled=busy||loading;
      $('[data-home-room-notice]').textContent=error||notice;$('[data-home-room-notice]').classList.toggle('is-error',!!error);
      $('[data-home-room-sync]').hidden=!error;$('[data-home-room-sync]').disabled=busy||loading;
    }
    // Errors remain visible even when the explanatory panel was collapsed.
    if(error&&!inside)panel.open=true;
  }
  function wantsInteraction(){const work=opportunity();return !disposed&&!inside&&!!work&&distance(getPosition?.(),work.target)<=work.radius;}
  function consumeInteraction(){if(!wantsInteraction())return false;void perform();return true;}
  function setActionVisible(value){const next=!!value;if(next!==actionVisible){actionVisible=next;render();}}
  function tick(time=now()){if(disposed)return;resetIdentity();if(time-lastRender>=150){lastRender=time;render();}}
  function dispose(){if(disposed)return;disposed=true;epoch++;readAbort?.abort();writeAbort?.abort();abort.abort();transitionInterior(false);geometry.dispose();host.remove();pendingCommands.clear();}
  actionButton.addEventListener('click',()=>void perform(),{signal});
  $('[data-home-slot]').addEventListener('click',()=>void perform(snapshot?.home?.decorationPlaced?'remove_decoration':'place_decoration'),{signal});
  $('[data-home-exit]').addEventListener('click',()=>void perform('leave_home'),{signal});
  $('[data-home-sync]').addEventListener('click',()=>void refresh(),{signal});
  $('[data-home-room-sync]').addEventListener('click',()=>void refresh(),{signal});
  $('[data-home-collapse]').addEventListener('click',()=>{panel.open=false;panel.querySelector('summary').focus();},{signal});
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();void perform('leave_home');}
    if(event.key==='Tab'){
      const focusable=[...modal.querySelectorAll('button:not([disabled])')].filter(element=>!element.hidden),first=focusable[0],last=focusable.at(-1);
      if(!first){event.preventDefault();modal.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===modal)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  },{signal});
  window.addEventListener('semesta:citizen-change',()=>queueMicrotask(resetIdentity),{signal});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void refresh();},{signal});
  const api={tick,consumeInteraction,wantsInteraction,setActionVisible,opportunity,isInside,dispose,geometry};
  if(external){if(external.aborted){dispose();return api;}external.addEventListener('abort',dispose,{once:true,signal});}
  render();if(identity)void refresh();return api;
}
