import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {catalog,presets,defaults,normalizeAvatarConfig,mountAvatarEditor,avatarCharacterOptions} from './avatar-v15-config.js';
import {loadAvatarProfile,createHumanModel,disposeAvatar} from './avatar-runtime.js';
import {createStudioClock,createStudioAnimation} from './avatar-studio-playback.js';
import {previewViseme} from './avatar-expression.js';
import {createAvatarThumbnails} from './avatar-catalog-thumbnails.js';

export async function mountAvatarStudio(root,apiUrl) {
  if(!root)return;
  root.innerHTML=`<div class="admin-page-intro"><div><span class="eyebrow">KARAKTER GAME & KONTEN</span><h2>Studio avatar V15</h2><p>6 profil tubuh, 24 karakter siap pakai. Racik wajah, rambut, pakaian dan aksesori, lalu uji gerakannya.</p></div></div>
  <div class="avatar-studio"><div class="avatar-preview-card"><canvas id="avatarPreviewCanvas" aria-label="Pratinjau avatar V15"></canvas><div class="avatar-preview-caption"><b data-name>Arka</b><span>Seret untuk memutar · scroll untuk zoom</span></div>
  <div class="character-preview-toolbar"><label>Animasi<select data-animation>${['Idle','Walk','Run','Wave','Sit','Point','Hold'].map(k=>`<option>${k}</option>`).join('')}</select></label><button type="button" data-pause aria-pressed="false">Jeda</button><label>Kecepatan<select data-speed><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label><button type="button" data-front>Depan</button><button type="button" data-side>Samping</button></div>
  <div class="character-preview-toolbar"><label>Ekspresi<select data-expression>${['neutral','happy','angry','sad','surprised','confused'].map(k=>`<option>${k}</option>`).join('')}</select></label><label>Tangan<select data-hands>${['clip','relaxed','open','point','grip','fist'].map(k=>`<option>${k}</option>`).join('')}</select></label><label><input type="checkbox" data-speech> Demo bicara</label></div><p data-asset role="status">Memuat karakter…</p></div>
  <form class="avatar-options" data-form><label>Nama karakter<input data-preset-name maxlength="40" value="Arka" required></label><div data-editor></div><div class="builder-actions"><button type="button" data-random>Acak variasi</button><button type="submit">Simpan sebagai karakter baru</button><button type="button" data-download>Unduh konfigurasi</button></div><p data-status role="status"></p></form></div>
  <div class="avatar-library"><div class="builder-subhead"><h3>Karakter siap pakai</h3><label>Cari karakter<input type="search" data-search></label><label>Profil<select data-filter><option value="all">Semua</option><option value="male">Pria</option><option value="female">Perempuan</option><option value="saved">Tersimpan</option></select></label></div><div class="avatar-preset-grid" data-cards></div></div>`;
  const $=s=>root.querySelector(s),canvas=$('canvas'),status=$('[data-status]');
  let renderer,scene,camera,controls,environment,actor,animation,request=0,config=normalizeAvatarConfig(presets[0].config),paused=false,saved=[],libraryLoaded=false,thumbnail=null,dead=false;
  const editor=mountAvatarEditor($('[data-editor]'),value=>{config=value;show(value);});
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    scene=new THREE.Scene();scene.background=new THREE.Color('#e8eeea');camera=new THREE.PerspectiveCamera(32,1,.05,40);camera.position.set(.4,1.4,4.5);
    controls=new OrbitControls(camera,canvas);controls.target.set(0,.95,0);controls.minDistance=1;controls.maxDistance=7;controls.update();
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();scene.environment=environment.texture;
    scene.add(new THREE.HemisphereLight('#fff5df','#64745e',1.5));const light=new THREE.DirectionalLight('#fff4dc',2.2);light.position.set(3,5,4);scene.add(light);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(2,64),new THREE.MeshStandardMaterial({color:'#c6d1c9',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);
  }catch(error){$('[data-asset]').textContent=`Pratinjau tidak tersedia: ${error.message}`;}
  async function show(value){
    const id=++request;config=normalizeAvatarConfig(value);editor.set(config);
    if(!renderer)return;
    $('[data-asset]').textContent='Memuat karakter V15…';
    try{
      const current=config;await loadAvatarProfile(current.profileId);if(id!==request||dead)return;
      if(actor?.figure.userData.avatarConfig.profileId===current.profileId){actor.figure.userData.customization.set(current.appearance);actor.figure.userData.avatarConfig=current;}
      else{disposeAvatar(actor);actor=createHumanModel(THREE,avatarCharacterOptions(current));scene.add(actor.figure);animation=createStudioAnimation(actor);animation.select($('[data-animation]').value,true);}
      $('[data-asset]').textContent=catalog.profiles.find(p=>p.id===current.profileId).label+' · model aktif di game';
    }catch(error){if(id===request)$('[data-asset]').textContent=`Gagal memuat avatar: ${error.message}`;}
  }
  const resize=()=>{if(!renderer)return;const rect=canvas.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}};
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const clock=createStudioClock();let frame;
  function draw(now){if(dead)return;frame=requestAnimationFrame(draw);const active=root.classList.contains('active')&&!document.hidden;const tick=clock.tick(now,{active,paused,speed:$('[data-speed]').value});if(!active||!renderer)return;animation?.update(tick.delta);actor?.figure.userData.expressionController?.update({time:tick.time,expression:$('[data-expression]').value,viseme:$('[data-speech]').checked?previewViseme(tick.time):'rest'});actor?.figure.userData.handController?.update({pose:$('[data-hands]').value});controls.update();renderer.render(scene,camera);}
  frame=requestAnimationFrame(draw);
  $('[data-animation]').addEventListener('change',()=>animation?.select($('[data-animation]').value));
  $('[data-pause]').addEventListener('click',event=>{paused=!paused;event.currentTarget.textContent=paused?'Putar':'Jeda';event.currentTarget.setAttribute('aria-pressed',String(paused));});
  for(const [key,pos] of [['front',[0,1.1,4.5]],['side',[4.5,1.1,0]]])$(`[data-${key}]`).addEventListener('click',()=>{camera?.position.set(...pos);controls?.target.set(0,.95,0);controls?.update();});
  $('[data-random]').addEventListener('click',()=>{const pick=a=>a[Math.floor(Math.random()*a.length)];config={model:'v15',profileId:pick(catalog.profiles).id,appearance:Object.fromEntries(Object.entries(catalog.fields).map(([k,f])=>[k,pick(Object.keys(f.options))]))};show(config);});
  $('[data-download]').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({name:$('[data-preset-name]').value,config},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='karakter-v15.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  let cardRequest=0;
  function cards(){
    const query=$('[data-search]').value.toLocaleLowerCase('id-ID'),filter=$('[data-filter]').value,grid=$('[data-cards]');grid.replaceChildren();const generation=++cardRequest;
    const items=[...presets,...saved].filter(p=>p.name.toLocaleLowerCase('id-ID').includes(query)&&(filter==='all'||(filter==='saved'?saved.includes(p):p.config.profileId.startsWith(filter+'-'))));
    for(const preset of items){const card=document.createElement('button');card.type='button';card.className='avatar-preset-card';card.dataset.presetId=preset.id;const img=document.createElement('img');img.alt='';img.loading='lazy';if(presets.includes(preset))img.src=new URL(`portraits/${preset.id}.png`,new URL(window.SEMESTA_AVATAR_V15_BASE,location.href)).href;const name=document.createElement('b');name.textContent=preset.name;const meta=document.createElement('small');meta.textContent=catalog.profiles.find(p=>p.id===preset.config.profileId).label;card.append(img,name,meta);card.addEventListener('click',()=>{$('[data-preset-name]').value=preset.name;$('[data-name]').textContent=preset.name;show(preset.config);grid.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===card));});grid.append(card);}
    // Render only when the studio is visible. One shared thumbnail context.
    if(renderer&&root.classList.contains('active')){
      const jobs=items.map((p,i)=>({preset:p,image:grid.children[i].querySelector('img'),config:p.config})).filter(j=>saved.includes(j.preset));
      if(!jobs.length)return;thumbnail ||= createAvatarThumbnails(THREE);thumbnail.fill(jobs).catch(error=>{if(generation===cardRequest)status.textContent=`Kartu belum termuat: ${error.message}`;});
    }
  }
  $('[data-search]').addEventListener('input',cards);$('[data-filter]').addEventListener('change',cards);
  const viewObserver=new MutationObserver(()=>{if(root.classList.contains('active')){resize();cards();}});viewObserver.observe(root,{attributes:true,attributeFilter:['class']});
  $('[data-form]').addEventListener('submit',async event=>{
    event.preventDefault();if(!libraryLoaded){status.textContent='Katalog tersimpan belum termuat; muat ulang halaman sebelum menyimpan.';return;}
    const button=event.submitter;button.disabled=true;const name=$('[data-preset-name]').value.trim();
    const item={id:`v15-custom-${Date.now()}`,name,config:editor.get()};const next=[...saved,item];
    try{const response=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource:'avatar_library',presets:next})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Gagal menyimpan.');saved=result.presets.map(p=>({...p,config:normalizeAvatarConfig(p.config)}));status.textContent=`${name} tersimpan di katalog.`;cards();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  await show(config);resize();cards();
  try{const response=await fetch(`${apiUrl}?resource=avatar_library`);const result=await response.json();if(!response.ok)throw new Error(result.error||'Katalog tidak tersedia.');saved=(result.presets||[]).map(p=>({...p,config:normalizeAvatarConfig(p.config)}));libraryLoaded=true;cards();}catch(error){status.textContent=`Katalog bawaan tersedia. ${error.message}`;}
  window.addEventListener('pagehide',()=>{dead=true;request++;cancelAnimationFrame(frame);observer.disconnect();viewObserver.disconnect();thumbnail?.dispose();disposeAvatar(actor);controls?.dispose();environment?.dispose();renderer?.dispose();},{once:true});
}
