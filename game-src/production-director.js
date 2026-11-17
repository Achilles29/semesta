import * as legacyEpisode from './production-episode.js';
import * as previewEpisode from './production-v13-episode.js';
import * as archiveEpisode from './production-v13-audio-episode.js';
import * as previousEpisode from './production-v15-episode.js';
import * as currentEpisode from './production-v16-episode.js';
import {createProductionVoice} from './production-voice-playback.js';
import {createV10Props} from './production-v10-props.js';
import {createV13Props} from './production-v13-props.js';
import {createV15Props} from './production-v15-props.js';
import {createV16Props} from './production-v16-props.js';
import {createCastPerformance} from './production-performance.js';
import {createProductionSubtitles} from './production-subtitles.js';

/** Local cutscene with prerecorded VO; never moves the saved player or other clients. */
export function mountProductionDirector({THREE,production,world,camera,renderer,scene,panel,signal,onStart=()=>{}}){
  const audioClock=createProductionVoice({url:window.SEMESTA_PRODUCTION_VO_URL||new URL('public/audio/produksi/episode-002/release-v10/episode-002-v10-master.wav',document.baseURI).href});
  const previewClock=previewEpisode.createPreviewClock();
  const archiveClock=createProductionVoice({url:window.SEMESTA_PRODUCTION_V13_VO_URL||new URL('public/audio/produksi/episode-002/release-v13/episode-002-v13-master.wav',document.baseURI).href,duration:archiveEpisode.EPISODE_DURATION});
  const previousClock=createProductionVoice({url:window.SEMESTA_PRODUCTION_V15_VO_URL||new URL('public/audio/produksi/episode-002/release-v15/episode-002-v15-master.wav',document.baseURI).href,duration:previousEpisode.EPISODE_DURATION,leadIn:.25});
  const currentClock=createProductionVoice({url:window.SEMESTA_PRODUCTION_V16_VO_URL||new URL('public/audio/produksi/episode-002/release-v16-r3/episode-002-v16-r3-master.wav',document.baseURI).href,duration:currentEpisode.EPISODE_DURATION,leadIn:.25});
  let clock=currentClock,episode=currentEpisode;
  let {EPISODE_SCENES,EPISODE_DURATION,sampleEpisode,episodeCueSheet}=episode;
  let snapshot=null,aspect=9/16,selection='',selectedEnd=EPISODE_DURATION;
  const controls=document.createElement('section');controls.className='production-playback';
  controls.innerHTML=`<strong>Jalannya Rusak, Acaranya Mulus</strong>
    <p data-film-description>V16: cerita baru, 6 rangkaian / 23 potongan kamera, narator upbeat, Bahlil dan Gufron. Durasi ${EPISODE_DURATION.toFixed(2)} detik.</p>
    <label>Versi <select data-film-version><option value="v16">V16 · Jalan rusak / terbaru</option><option value="v15">V15 · Kursi / arsip</option><option value="v13">V13 · Arsip / gambar + suara</option><option value="preview">V13 · Animatic lama / tanpa suara</option><option value="v10">V10 · Arsip dengan suara lama</option></select></label>
    <label>Putar <select data-film-scene><option value="">Semua adegan · ${EPISODE_DURATION.toFixed(2)} detik</option>${EPISODE_SCENES.map((s,i)=>`<option value="${s.id}">${i+1}. ${s.name} · ${(s.end-s.start).toFixed(1)} dtk</option>`).join('')}</select></label>
    <label>Bingkai <select data-film-aspect><option value="portrait">Vertikal 9:16 · IG/TikTok</option><option value="landscape">Mendatar 16:9</option></select></label>
    <label>Volume suara <input data-film-volume type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume voice over"></label>
    <label><input data-film-subtitles type="checkbox" checked> Subtitle V16 (C untuk tampil/sembunyi saat merekam)</label>
    <div class="production-actions"><button type="button" data-film-play>▶ PLAY V16 + SUARA</button><button type="button" data-film-sheet>Unduh panduan adegan / VO</button></div>
    <p data-film-status role="status">V16 revisi 3: subtitle aktif dan musik komedi baru. Rekam layar browser + audio tab/sistem. HUD disembunyikan, subtitle tetap terlihat. Ajakan follow dan komentar diucapkan di penutup.</p>
    <p>Spasi: jeda/lanjut · R: ulang · ←/→: adegan · Esc: keluar. Penutup fade ke hitam, lalu Esc untuk kembali. Gunakan F11 sebelum merekam; crop bidang video bila ada sisi hitam.</p>
    <details><summary>Catatan editing</summary><p>V16 memakai narator Jemmy upbeat dan dialog baru clone berizin Bahlil/Gufron, kecepatan 1x. Gerak mulut berbasis energi suara, bukan fonem. Kemiripan dan intonasi perlu cek dengar. Versi lain arsip. Tidak ada ekspor MP4 otomatis. Tambahkan label PARODI FIKSI / SUARA AI saat publikasi.</p></details>`;
  panel.append(controls);
  const status=controls.querySelector('[data-film-status]');
  const playButton=controls.querySelector('[data-film-play]');
  const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal});
  // Outside the game HUD: filming hides that HUD, including its pause instructions.
  const pausePanel=document.createElement('section');pausePanel.hidden=true;
  pausePanel.setAttribute?.('aria-label','Kontrol pemutaran dijeda');
  pausePanel.style.cssText='position:fixed;z-index:10000;left:50%;top:50%;transform:translate(-50%,-50%);padding:20px;background:#18282ef5;color:white;border-radius:12px;text-align:center;font:16px system-ui';
  pausePanel.innerHTML='<p>Pemutaran dijeda.</p><button type="button" data-film-resume>Lanjutkan</button> <button type="button" data-film-exit>Kembali</button>';
  document.body.append(pausePanel);
  const subtitles=createProductionSubtitles();
  const subtitleToggle=controls.querySelector('[data-film-subtitles]');subtitleToggle.checked=true;
  // Props use a separate group so they can be hidden/restored without touching the town.
  const legacyProps=createV10Props(THREE,production),previewProps=createV13Props(THREE,production);
  const previousProps=createV15Props(THREE,production),currentProps=createV16Props(THREE,production);
  let v6=currentProps,props=v6.group;
  const cinematicCast=[...production.cast,...previousProps.extraCast,...currentProps.extraCast];
  const performance=createCastPerformance(THREE,cinematicCast);
  // A clean end slate without text or a sudden return of the game HUD.
  const endScene=new THREE.Scene(),endCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const endMaterial=new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:0,depthTest:false,depthWrite:false});
  const endPlane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),endMaterial);endPlane.frustumCulled=false;endScene.add(endPlane);

  function stop(){
    pausePanel.hidden=true;
    subtitles.clear();
    clock.stop();performance.reset();
    if(!snapshot)return;
    document.body.classList.remove('production-filming');
    for(const [object,visible] of snapshot.visibility)object.visible=visible;
    for(const saved of snapshot.cast){
      const {npc}=saved;npc.root.position.copy(saved.position);npc.root.rotation.copy(saved.rotation);npc.root.visible=saved.visible;
      npc.model.mixer?.stopAllAction();v6.reset(npc);npc.model.activeAction=null;
    }
    camera.position.copy(snapshot.position);camera.quaternion.copy(snapshot.quaternion);camera.fov=snapshot.fov;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.autoClear=snapshot.autoClear;
    renderer.setClearColor(snapshot.clearColor,snapshot.clearAlpha);
    props.visible=false;v6.resetExtras?.();v6.deactivate?.();snapshot=null;production.updateLabels(24);
    production.updateAtmosphere?.(0);
    status.textContent='Pemutaran selesai/dihentikan. Tekan Play untuk merekam ulang. Tidak ada berkas video yang dibuat otomatis.';
  }
  function playbackError(error){stop();console.error('Production playback:',error);status.textContent=`Pemutaran gagal: ${error.message}. Muat ulang halaman lalu coba Play lagi.`;}
  async function start(){
    stop();selection=controls.querySelector('[data-film-scene]').value;
    const selected=EPISODE_SCENES.find(s=>s.id===selection);selectedEnd=selected?.end??EPISODE_DURATION;
    playButton.disabled=true;status.textContent=episode===previewEpisode?'Menyiapkan animatic tanpa suara…':episode===currentEpisode?'Menyiapkan gambar + suara V16…':'Menyiapkan arsip bersuara…';
    try{
    onStart();
    if(!await clock.start(selected?.start??0,selectedEnd))return;
    aspect=controls.querySelector('[data-film-aspect]').value==='portrait'?9/16:16/9;
    snapshot={visibility:new Map(),cast:cinematicCast.map(npc=>({npc,position:npc.root.position.clone(),rotation:npc.root.rotation.clone(),visible:npc.root.visible})),
      position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov,autoClear:renderer.autoClear,clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha()};
    // Hide player, online peers and the old town for this local recording only.
    world.children.forEach(child=>{if(child!==production.group){snapshot.visibility.set(child,child.visible);child.visible=false;}});
    production.updateLabels(0);props.visible=true;v6.activate?.();
    document.activeElement?.blur();document.body.classList.remove('capture-mode');document.body.classList.add('production-filming');
    }catch(error){playbackError(error);}finally{playButton.disabled=false;}
  }
  function update(now){
    if(!snapshot)return;
    try{renderFrame(now);}catch(error){playbackError(error);}
  }
  function renderFrame(now){
    clock.tick(now,document.hidden);const shot=sampleEpisode(Math.min(clock.time,selectedEnd-.00001),aspect);
    pausePanel.hidden=clock.state!=='paused';
    production.updateAtmosphere?.(clock.time,{quiet:true});
    world.children.forEach(child=>{if(child!==production.group){if(!snapshot.visibility.has(child))snapshot.visibility.set(child,child.visible);child.visible=false;}});
    production.updateLabels(0);
    for(const npc of cinematicCast){
      const pose=shot.actors[npc.id];npc.root.visible=!!pose&&pose.visible!==false;
      if(!pose)continue;
      v6.reset(npc);npc.root.position.set(pose.x,pose.y??0,pose.z);npc.root.rotation.set(0,pose.yaw,0);
      const action=npc.model.actions?.[pose.clip]??npc.model.actions?.Idle;
      if(action && npc.model.mixer){
        // Force bindings to reapply after bone reset, including a paused/repeated
        // first frame. Cached PropertyMixer values otherwise leave a rest-pose flash.
        npc.model.mixer.stopAllAction();action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();npc.model.activeAction=pose.clip;
        const duration=action.getClip().duration;
        // Absolute timeline sampling: deterministic replay, pause, seek, 30–144 FPS.
        action.time=((pose.phase*(pose.clip==='Wave'?.72:1))%duration+duration)%duration;
        npc.model.mixer.update(0);
      }
      v6.pose(npc,pose);
      performance.update(npc,pose);
    }
    v6.poseExtras(shot);v6.update(shot);
    camera.fov=shot.camera.fov;camera.aspect=aspect;camera.position.fromArray(shot.camera.position);camera.lookAt(...shot.camera.target);camera.updateProjectionMatrix();
    const width=innerWidth,height=innerHeight,w=Math.min(width,height*aspect),h=w/aspect,x=(width-w)/2,y=(height-h)/2;
    subtitles.update(clock.time,{x,y,w,h},episode===currentEpisode&&subtitleToggle.checked&&clock.state==='playing'&&clock.time<selectedEnd);
    renderer.autoClear=false;renderer.setScissorTest(false);renderer.setClearColor('#000000',1);renderer.clear();
    renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);renderer.clear();renderer.render(scene,camera);
    if(shot.fadeOut>0){endMaterial.opacity=shot.fadeOut;renderer.render(endScene,endCamera);}
    renderer.setScissorTest(false);
    // Finished playback stays black until Escape; no HUD contaminates the recording.
  }
  listen(controls.querySelector('[data-film-play]'),'click',start);
  listen(pausePanel.querySelector('[data-film-resume]'),'click',async()=>{try{await clock.pause();pausePanel.hidden=clock.state!=='paused';}catch(error){playbackError(error);}});
  listen(pausePanel.querySelector('[data-film-exit]'),'click',stop);
  controls.querySelector('[data-film-volume]').disabled=false;
  listen(controls.querySelector('[data-film-version]'),'change',event=>{
    stop();const preview=event.target.value==='preview',current=event.target.value==='v16',previous=event.target.value==='v15',archive=event.target.value==='v13';
    episode=preview?previewEpisode:current?currentEpisode:previous?previousEpisode:archive?archiveEpisode:legacyEpisode;
    ({EPISODE_SCENES,EPISODE_DURATION,sampleEpisode,episodeCueSheet}=episode);
    clock=preview?previewClock:current?currentClock:previous?previousClock:archive?archiveClock:audioClock;v6=current?currentProps:previous?previousProps:preview||archive?previewProps:legacyProps;props=v6.group;
    clock.setVolume(controls.querySelector('[data-film-volume]').value);
    selection='';selectedEnd=EPISODE_DURATION;
    controls.querySelector('[data-film-scene]').innerHTML=`<option value="">Semua adegan · ${EPISODE_DURATION.toFixed(2)} detik</option>${EPISODE_SCENES.map((s,i)=>`<option value="${s.id}">${i+1}. ${s.name} · ${(s.end-s.start).toFixed(1)} dtk</option>`).join('')}`;
    controls.querySelector('[data-film-volume]').disabled=preview;
    subtitleToggle.disabled=!current;
    controls.querySelector('[data-film-description]').textContent=preview?'Animatic V13 lama: 96 detik tanpa suara.':current?`V16 revisi 3: Jalan rusak, 6 rangkaian / 23 shot, ${EPISODE_DURATION.toFixed(2)} detik. Penutup warga membangun republik; subtitle dan musik sinkron.`:previous?'V15 arsip: kursi dan meja pengaduan.':archive?'Arsip V13: gerobak warga / 4 adegan.':'Arsip V10: 6 adegan dengan 19 dialog lama.';
    playButton.textContent=preview?'▶ ANIMATIC V13':current?'▶ PLAY V16 + SUARA':previous?'▶ PLAY V15 + SUARA':archive?'▶ PLAY V13 + SUARA':'▶ PLAY V10 + SUARA';
    status.textContent=preview?'Animatic tanpa suara.':current?'V16 revisi 3: gambar + suara + subtitle. C: tampil/sembunyikan subtitle. Rekam layar browser dan audio tab/sistem; jangan tumpuk VO tambahan.':'Arsip dengan suara lama. Subtitle baru hanya untuk V16.';
  });
  listen(controls.querySelector('[data-film-volume]'),'input',event=>clock.setVolume(event.target.value));
  listen(subtitleToggle,'change',()=>{if(!subtitleToggle.checked)subtitles.clear();});
  listen(controls.querySelector('[data-film-sheet]'),'click',()=>{
    const url=URL.createObjectURL(new Blob([episodeCueSheet()],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='episode-002-panduan-rekam-dan-vo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  listen(window,'keydown',event=>{
    if(!clock.active&&clock.state!=='loading')return;
    // Keep browser fullscreen/devtools and recording shortcuts available.
    if(event.ctrlKey||event.altKey||event.metaKey||event.code==='F11'||event.code==='F12')return;
    event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
    if(event.code==='Escape'){stop();return;}
    if(clock.state==='loading')return;
    if(event.code==='Space')clock.pause().catch(playbackError);
    if(event.code==='KeyC'&&episode===currentEpisode){subtitleToggle.checked=!subtitleToggle.checked;if(!subtitleToggle.checked)subtitles.clear();}
    if(event.code==='KeyR'){start();return;}
    if(event.code==='ArrowRight'||event.code==='ArrowLeft'){
      const index=EPISODE_SCENES.findIndex(s=>s.id===sampleEpisode(clock.time).scene.id);
      if(!selection)clock.seek(EPISODE_SCENES[Math.max(0,Math.min(EPISODE_SCENES.length-1,index+(event.code==='ArrowRight'?1:-1)))].start);
    }
  },{capture:true});
  listen(document,'visibilitychange',()=>{if(clock.state==='playing'&&document.hidden)clock.pause().catch(playbackError);});
  signal.addEventListener('abort',()=>{stop();previewClock.dispose();audioClock.dispose();archiveClock.dispose();currentClock.dispose();previousClock.dispose();performance.dispose();previewProps.dispose();legacyProps.dispose();currentProps.dispose();previousProps.dispose();endPlane.geometry.dispose();endMaterial.dispose();controls.remove();pausePanel.remove();subtitles.dispose();},{once:true});
  return {get active(){return !!snapshot&&clock.active;},update,stop};
}
