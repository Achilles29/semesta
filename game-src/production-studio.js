import {createProductionFullscreen} from './production-fullscreen.js';
import {presets} from './avatar-v15-config.js';
import {ACTIONS,CAMERAS,PROPS,OUTPUTS,blankScenario,rehearsalScenario,validateScenario,compileScenario,durationOf,srtFor} from './production-scenario.js';
import {createProductionStage,createProductionRenderer,compositeFrame} from './production-stage.js';
import {encodeMp4,mixProductionAudio} from './production-export.js';
import {day1OpeningScenario} from './production-day1-opening.js';
import {day1Scenario,DAY1_SPEAKERS} from './production-day1.js';
import {DAY2_SPEAKERS} from './production-day2.js';
import {STORY_CLIPS} from './production-audio-catalog.js';
import {displaySpeechText} from './production-speech-text.js';
import {speakerCastId} from './production-speech-cues.js';
import {PRODUCTION_EPISODES,LATEST_EPISODE,scenarioForEpisode,episodeForScenario} from './production-episodes.js';
import {hasStoryAudio,loadStoryAudio} from './production-story-audio.js';
import {migrateProductionDraft,resolveProductionDraft,isPristineProductionDraft} from './production-draft-migration.js';
import {citizens,citizenForPreset,castIdentity,selectCastPreset,characterSearch} from './citizen-roster.js';

const STORAGE='semesta.production.workspace.v1';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(values,selected)=>Object.entries(values).map(([v,label])=>`<option value="${escape(v)}"${v===selected?' selected':''}>${escape(label)}</option>`).join('');
const stamp=t=>`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;
const filename=title=>(title.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'produksi');
const speechCaption=key=>displaySpeechText(STORY_CLIPS[key].text);
const speakerName=clip=>DAY2_SPEAKERS[clip.speaker]||DAY1_SPEAKERS[clip.speaker]||clip.speaker;
const missingSpeechCount=scenario=>scenario.shots.reduce((count,shot)=>count+Number(!!shot.plannedSpeech)+(shot.plannedSpeeches?.length||0),0);
const castOptions=(selected,query='')=>{
  const available=presets.filter(p=>p.id===selected||characterSearch(p,query));
  return [[`Warga gelombang 1 · ${citizens.length} karakter`,available.filter(p=>citizenForPreset(p.id))],['Karakter lainnya',available.filter(p=>!citizenForPreset(p.id))]].map(([label,items])=>`<optgroup label="${escape(label)}">${options(Object.fromEntries(items.map(p=>{const c=citizenForPreset(p.id);return [p.id,c?`${c.name} — ${c.role}`:p.name];})),selected)}</optgroup>`).join('');
};

export function mountProductionStudio(host,{createStage=createProductionStage,createRenderer=createProductionRenderer,encode=encodeMp4,mixAudio=mixProductionAudio,loadStory=loadStoryAudio,initialScenario=null,persist=true,isActive=()=>host.closest('.admin-view')?.classList.contains('active')??host.isConnected}={}){
  const events=new AbortController(),listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:events.signal});
  let scenario=initialScenario?validateScenario(initialScenario):scenarioForEpisode(LATEST_EPISODE),storageNotice='';
  if(persist&&!initialScenario)try{const saved=localStorage.getItem(STORAGE);if(saved)scenario=validateScenario(resolveProductionDraft(JSON.parse(saved),{emptyIntent:localStorage.getItem(STORAGE+'.empty-intent')==='true',preferredEpisode:localStorage.getItem(STORAGE+'.selected-episode')}));}catch{try{localStorage.setItem(STORAGE+'.unreadable-backup',localStorage.getItem(STORAGE)||'');}catch{}storageNotice='Draf lokal tidak dapat dibaca. Episode terbaru bawaan dibuka; salinan data lama disimpan untuk pemulihan.';}
  let restoredDifferentDraft=persist&&!initialScenario&&!isPristineProductionDraft(scenario);
  let stage=null,renderer=null,rebuilding=null,loadVersion=0,playing=false,starting=false,exporting=false,time=0,started=0,raf=0,disposed=false;
  let audioContext=null,audioSource=null,mixed=null,exportAbort=null,downloadUrl=null,format='portrait',quality='1080',guides=false,playVersion=0,audioLoading=0;
  const audioVersion=[0,0];
  let storyEnabled=true,rhythmEnabled=true;
  let castQuery='';
  let shotNodes=[],activeShotNode=null,lastTransportUpdate=-Infinity;
  const tracks=[{name:'Dialog / narasi',buffer:null,volume:1,offset:0},{name:'Musik / suasana',buffer:null,volume:.25,offset:0}];
  host.innerHTML=`<div class="production-studio">
    <div class="ps-heading"><div><span class="ps-eyebrow">REPUBLIK WKWKWK · PRODUKSI</span><h3>Pilih cerita republik.</h3><p>Susun adegan, lalu putar seluruh cerita dengan satu tombol.</p><p data-draft-notice hidden>Pratinjau membuka draf suntingan Anda. Pilihan episode menyimpan draf terpisah; memuat versi terbaru mengunduh cadangan lebih dahulu.</p><label class="ps-episode-picker">Episode<select data-episode>${options({...PRODUCTION_EPISODES,draft:'Draf / latihan saya'},episodeForScenario(scenario))}</select></label></div><div class="ps-workspace-actions"><button type="button" data-command="day3-full">Muat Day 3 terbaru</button><button type="button" data-command="day2-full">Muat Day 2 terbaru</button><button type="button" data-command="day1-full">Muat Day 1 terbaru</button><button type="button" data-command="day1-opening" class="ps-secondary">Pembuka Pasca Bowow</button><button type="button" data-command="rehearsal" class="ps-secondary">Coba latihan studio</button></div></div>
    <div class="ps-layout"><section class="ps-monitor" aria-label="Pratinjau produksi">
      <div class="ps-screen"><canvas data-preview width="360" height="640" aria-label="Pratinjau animasi skenario"></canvas><div class="ps-empty"><b>Lembar cerita baru</b><p>Belum ada adegan. Pilih episode atau coba latihan studio.</p></div></div>
      <div class="ps-transport"><button type="button" data-command="play" disabled>▶ Play semua</button><button type="button" data-command="stop" disabled>↺ Awal</button><button type="button" data-command="fullscreen" aria-pressed="false">Layar penuh</button><span data-time>0:00.0 / 0:00.0</span></div>
      <input class="ps-seek" data-seek type="range" min="0" max="0" step="0.033333" value="0" aria-label="Posisi pemutaran" disabled>
      <p data-shot-status class="ps-muted">Belum ada adegan.</p>
      <label class="ps-check"><input data-guides type="checkbox">Tampilkan panduan area aman (tidak ikut ekspor)</label>
      <div class="ps-output"><label>Format<select data-format>${options(Object.fromEntries(Object.entries(OUTPUTS).map(([k,v])=>[k,v.label])),format)}</select></label><label>Kualitas<select data-quality><option value="1080">1080p · utama</option><option value="720">720p · ringan</option></select></label></div>
      <button type="button" class="ps-export" data-command="export" disabled>Buat MP4</button><button type="button" data-command="cancel" hidden>Batalkan ekspor</button>
      <progress data-progress max="1" value="0" hidden aria-label="Kemajuan ekspor"></progress>
      <a data-download class="ps-download" hidden>↓ Unduh MP4</a>
      <p class="ps-muted">H.264 · 30 fps · subtitle menyatu · audio AAC jika dipasang. Ekspor langsung di perangkat melalui HTTPS atau localhost.</p>
      <p data-status role="status" aria-live="polite"></p>
    </section><section class="ps-editor" aria-label="Skenario produksi">
      <form data-editor><div data-form-content></div></form>
      <section class="ps-audio"><h4>Audio</h4><label><input data-story-audio type="checkbox" checked> Gunakan suara narator dan karakter episode</label><label><input data-story-rhythm type="checkbox" checked> Musik latar, suasana dan Oke Gas sesuai skenario</label><p class="ps-muted" data-audio-readiness></p><p class="ps-muted">Suara mengikuti identitas tokoh dan waktu adegan. Musik turun saat dialog serta protes. Audio tambahan di bawah hanya untuk sesi ini; musik tambahan menggantikan musik bawaan.</p>
      ${tracks.map((t,i)=>`<div class="ps-audio-track" data-audio-track="${i}"><label>${t.name}<input type="file" data-audio-file="${i}" accept="audio/*"></label><span data-audio-name="${i}" class="ps-muted">Tanpa audio</span><div class="ps-audio-settings"><label>Volume<input data-audio-volume="${i}" type="range" min="0" max="1" step=".05" value="${t.volume}"></label><label>Mulai (detik)<input data-audio-offset="${i}" type="number" min="0" max="300" step=".1" value="0"></label><button type="button" data-audio-remove="${i}">Lepas</button></div></div>`).join('')}
      </section><div class="ps-workspace-actions"><button type="button" data-command="save">↓ Simpan skenario</button><label class="ps-file-button">Buka skenario<input data-import type="file" accept=".json,application/json"></label><button type="button" data-command="srt">↓ Subtitle SRT</button><button type="button" data-command="new">Skenario kosong</button></div>
      <p class="ps-muted" data-save-status>Draf tersimpan otomatis di browser ini. Unduh skenario untuk cadangan atau pindah perangkat.</p>
    </section></div></div>`;
  const el=selector=>host.querySelector(selector),canvas=el('[data-preview]'),ctx=canvas.getContext('2d',{alpha:false}),gpu=document.createElement('canvas');
  const status=message=>{const node=el('[data-status]');if(node)node.textContent=message;};
  let fullscreen;
  fullscreen=createProductionFullscreen(el('.ps-monitor'),el('[data-command="fullscreen"]'),{onChange:()=>{if(fullscreen&&!exporting)draw();}});
  const invalidateDownload=()=>{if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null;el('[data-download]').hidden=true;};
  function saveDraft(){if(!persist)return;try{localStorage.setItem(STORAGE,JSON.stringify(scenario));el('[data-save-status]').textContent='Draf tersimpan di browser ini. Unduh skenario untuk cadangan atau pindah perangkat.';}catch{el('[data-save-status]').textContent='Penyimpanan browser penuh/tidak tersedia. Gunakan Simpan skenario agar perubahan tidak hilang.';}}
  function form(){
    el('[data-draft-notice]').hidden=!restoredDifferentDraft;
    el('[data-episode]').value=episodeForScenario(scenario);
    const pending=missingSpeechCount(scenario),episode=episodeForScenario(scenario);
    el('[data-audio-readiness]').textContent=pending?`${pending} rekaman ujaran belum tersedia. Visual dan teks dapat dipratinjau; suara yang belum ada tidak akan terdengar.`:`${episode==='draft'?'Draf':episode==='day3'?'Day 3':episode==='day2'?'Day 2':'Day 1'} · ${scenario.shots.reduce((n,s)=>n+Number(!!s.speech)+(s.speeches?.length||0),0)} cue suara terpasang · ${stamp(durationOf(scenario))}. Tonton dan dengarkan hasil sebelum publikasi.`;
    el('.ps-heading h3').textContent=scenario.shots.length?scenario.title:'Mulai dari cerita pertama.';
    el('.ps-heading p').textContent=scenario.kind==='rehearsal'?'Draf / latihan, belum menjadi episode final. Uji gerakan, kamera, subtitle, dan MP4; audio perlu dipasang terpisah.':pending?'Skenario visual tersedia. Sebagian suara masih menunggu rekaman.':scenario.shots.length?'Putar seluruh cerita, tinjau hasil, lalu buat MP4 untuk diunggah.':'Susun adegan atau pilih episode untuk memulai.';
    let cursor=0;const compiled=compileScenario(scenario);
    el('[data-form-content]').innerHTML=`<div class="ps-fields"><label>Judul<input data-field="title" maxlength="100" value="${escape(scenario.title)}" required></label><label>Lokasi<select data-field="set">${options({courtyard:'Halaman warga',studio:'Studio dalam ruang',republic:'Lapangan nol Republik Wkwkwk',construction:'Pembangunan Koplak Desa dan SPPG',development:'Day 3 - Kota dan kehidupan warga'},scenario.set)}</select></label></div>
      <div class="ps-section-heading"><h4>Pemeran</h4><button type="button" data-command="add-cast" ${scenario.cast.length>=64?'disabled':''}>+ Pemeran</button></div>
      <label class="ps-cast-search">Cari nama / profesi warga<input type="search" data-cast-search value="${escape(castQuery)}" placeholder="Contoh: DD, dokter, pelukis"></label>
      <div class="ps-cast">${scenario.cast.map(c=>{const identity=castIdentity(c,scenario);return `<div class="ps-cast-row"><label class="ps-cast-preset">Pemeran ${escape(c.id.toUpperCase())}<select data-cast="${c.id}">${castOptions(c.preset,castQuery)}</select></label><label>Aksesori<select data-cast-prop="${c.id}">${options({'':'Tanpa properti',guitar:'Gitar punggung'},c.prop||'')}</select></label><label>X<input data-cast-x="${c.id}" type="number" min="-30" max="30" step=".1" value="${c.position[0]}"></label><label>Z<input data-cast-z="${c.id}" type="number" min="-30" max="30" step=".1" value="${c.position[1]}"></label><label>Y<input data-cast-height="${c.id}" type="number" min="0" max="8" step=".1" value="${c.height||0}"></label>${scenario.cast.length>1?`<button type="button" data-remove-cast="${c.id}" aria-label="Hapus pemeran ${c.id}">×</button>`:''}<div class="ps-cast-identity"><label>Nama di layar<input data-cast-name="${c.id}" maxlength="60" value="${escape(identity.name)}" required></label><label>Peran<input data-cast-role="${c.id}" maxlength="100" value="${escape(identity.role)}"></label></div></div>`;}).join('')}</div>
      <fieldset class="ps-props"><legend>Properti set</legend>${Object.entries(PROPS).map(([k,v])=>`<label><input type="checkbox" data-prop="${k}" ${scenario.props.includes(k)?'checked':''}>${v}</label>`).join('')}</fieldset>
      <div class="ps-section-heading"><h4>Adegan <span>${scenario.shots.length} / 80</span></h4><button type="button" data-command="add" ${scenario.shots.length>=80?'disabled':''}>+ Adegan</button></div>
      ${!scenario.shots.length?'<div class="ps-story-empty">Belum ada adegan. Pilih episode, tambahkan adegan, atau buka latihan studio.</div>':''}
      <div class="ps-shots">${scenario.shots.map((s,i)=>{const start=cursor;cursor+=s.duration;return `<article class="ps-shot" data-shot="${i}"><div class="ps-shot-head"><button type="button" data-jump="${i}">${String(i+1).padStart(2,'0')} · ${stamp(start)}–${stamp(cursor)}</button><div><button type="button" data-up="${i}" ${i===0?'disabled':''} aria-label="Geser adegan ke atas">↑</button><button type="button" data-remove="${i}" aria-label="Hapus adegan">×</button></div></div>
      <label>Nama adegan<input data-shot-field="label" maxlength="80" value="${escape(s.label)}"></label><div class="ps-fields"><label>Durasi (detik)<input data-shot-field="duration" type="number" min="1" max="30" step=".1" value="${s.duration}"></label><label>Kamera<select data-shot-field="camera">${options(CAMERAS,s.camera)}</select></label><label>Fokus<select data-shot-field="focus">${options(Object.fromEntries(scenario.cast.map(c=>[c.id,castIdentity(c,scenario).name])),s.focus)}</select></label></div>
      ${scenario.cast.map(c=>{const cue=s.actors[c.id]||{action:'Idle'};return `<div class="ps-blocking"><label>${escape(c.id.toUpperCase())} · gerakan<select data-action="${c.id}">${options(ACTIONS,cue.action)}</select></label>${['Walk','Run','Carry'].includes(cue.action)?`<label>Tujuan X<input data-to-x="${c.id}" type="number" min="-30" max="30" step=".1" value="${(cue.to||compiled.shots[i].tracks[c.id].from)[0]}"></label><label>Tujuan Z<input data-to-z="${c.id}" type="number" min="-30" max="30" step=".1" value="${(cue.to||compiled.shots[i].tracks[c.id].from)[1]}"></label>`:`<label>Arah (derajat)<input data-yaw="${c.id}" type="number" min="-360" max="360" step="5" value="${Math.round((cue.yaw||0)*180/Math.PI)}"></label>`}${cue.action==='Dance'?`<label>Tempo (BPM)<input data-bpm="${c.id}" type="number" min="70" max="180" step="1" value="${cue.bpm||130}"></label>`:''}</div>`;}).join('')}
      ${s.speeches?.length?`<div class="ps-voice-cues"><strong>${s.speeches.length} ujaran bergantian</strong>${s.speeches.map(cue=>`<p>${escape(speakerName(STORY_CLIPS[cue.key]))} · ${stamp(cue.offset)} — ${escape(speechCaption(cue.key))}</p>`).join('')}<small>Memilih satu suara di bawah mengganti seluruh rangkaian ujaran adegan ini.</small><button type="button" data-clear-speech="${i}">Lepas rangkaian suara</button></div>`:''}
      <label>Suara adegan<select data-speech>${options({'':s.speeches?.length?'Pertahankan rangkaian suara':'Tanpa suara bawaan',...Object.fromEntries(Object.entries(STORY_CLIPS).filter(([,clip])=>clip.speaker==='narrator'||scenario.cast.some(c=>c.id===speakerCastId(clip,scenario))).map(([key,clip])=>[key,`${key.startsWith('day2')?'Day 2':'Day 1'} · ${speakerName(clip)}: ${speechCaption(key)}`]))},s.speech||'')}</select></label>
      <label>Subtitle<textarea data-shot-field="caption" rows="2" maxlength="180" placeholder="${escape(s.speeches?.map(cue=>speechCaption(cue.key)).join(' ')||'Dialog atau teks adegan')}">${escape(s.caption)}</textarea></label><small>Mengubah subtitle melepas suara bawaan adegan agar teks dan suara tidak berbeda.</small>
      <label>Teks utama<input data-shot-field="overlay" maxlength="100" value="${escape(s.overlay||'')}"></label>
      ${s.frame?`<p class="ps-muted">${s.frame.motion?`Kamera ${escape(s.frame.motion.type)} · akhir ditahan ${Math.round((s.frame.motion.hold||0)*100)}%. `:''}Bingkai khusus: lebar ${s.frame.width} m. Pilih ulang jenis kamera untuk kembali ke bingkai otomatis.</p>`:''}
      <div class="ps-fields">${scenario.cast.map(c=>`<label><input type="checkbox" data-visible="${c.id}" ${compiled.shots[i].tracks[c.id].visible?'checked':''}>${escape(castIdentity(c,scenario).name)}</label>`).join('')}</div></article>`;}).join('')}</div>`;
  }
  function controls(){
    const busy=exporting||starting||audioLoading>0,ready=!!stage&&scenario.shots.length>0;
    el('[data-command="play"]').disabled=!ready||busy;el('[data-command="play"]').textContent=playing?'Ⅱ Jeda':'▶ Play semua';
    el('[data-command="stop"]').disabled=!ready||busy;el('[data-command="export"]').disabled=!scenario.shots.length||busy;
    el('[data-seek]').disabled=!ready||busy;el('[data-command="cancel"]').hidden=!exporting;el('[data-progress]').hidden=!exporting;
    host.querySelectorAll('[data-editor] input,[data-editor] select,[data-editor] textarea,[data-editor] button,.ps-workspace-actions input,.ps-workspace-actions button,.ps-audio input,.ps-audio button,[data-episode],[data-command="rehearsal"],[data-command="day1-opening"],[data-format],[data-quality]').forEach(node=>{node.disabled=busy;});
    if(!busy){el('[data-command="add-cast"]').disabled=scenario.cast.length>=64;el('[data-command="add"]').disabled=scenario.shots.length>=80;const first=el('[data-up="0"]');if(first)first.disabled=true;}
  }
  // Keep preview fill-rate bounded even on a fullscreen high-DPI display.
  // Full-resolution offline export still uses the selected 1080p/720p output.
  function dimensions(full=false){const output=OUTPUTS[format],scale=full?(quality==='720'?2/3:1):Math.min(1,(fullscreen?.active?1280:640)/Math.max(output.width,output.height));return {width:Math.round(output.width*scale),height:Math.round(output.height*scale)};}
  function draw(full=false){
    if(!stage||!renderer)return;
    const d=dimensions(full);if(canvas.width!==d.width||canvas.height!==d.height){canvas.width=d.width;canvas.height=d.height;}if(gpu.width!==d.width||gpu.height!==d.height)renderer.setSize(d.width,d.height,false);
    const sample=stage.pose(time,d.width/d.height);renderer.render(stage.scene,stage.camera);compositeFrame(ctx,gpu,stage,time,{guides:guides&&!full,sample});
    const now=performance.now();
    if(!playing||now-lastTransportUpdate>=100){
      el('[data-time]').textContent=`${stamp(time)} / ${stamp(stage.compiled.duration)}`;el('[data-seek]').value=time;lastTransportUpdate=now;
    }
    if(!shotNodes.length||!shotNodes[0].isConnected)shotNodes=[...host.querySelectorAll('[data-shot]')];
    const current=shotNodes[sample?.index];
    if(current!==activeShotNode){
      activeShotNode?.classList.remove('is-current');current?.classList.add('is-current');activeShotNode=current;
      el('[data-shot-status]').textContent=sample?`${sample.index+1}. ${sample.shot.label}`:'Belum ada adegan.';
    }
  }
  function stopAudio(){if(audioSource){try{audioSource.stop();}catch{}audioSource.disconnect();audioSource=null;}}
  async function prepareAudio(){
    if(mixed)return mixed;
    let automatic=[];
    if((storyEnabled||rhythmEnabled)&&hasStoryAudio(scenario)){
      audioContext ||= new AudioContext();
      automatic=await loadStory(scenario,audioContext,{voices:storyEnabled,rhythm:rhythmEnabled&&!tracks[1].buffer});
    }
    mixed=await mixAudio([...automatic,...tracks],stage.compiled.duration);return mixed;
  }
  function pause(){playVersion++;playing=false;cancelAnimationFrame(raf);stopAudio();controls();}
  function tick(){if(!playing||disposed)return;time=Math.min(stage.compiled.duration,(audioSource?audioContext.currentTime:performance.now()/1000)-started);draw();if(time>=stage.compiled.duration){pause();status('Pemutaran selesai. MP4 siap dibuat.');}else raf=requestAnimationFrame(tick);}
  async function play(){
    if(playing){pause();return;}
    const attempt=++playVersion;starting=true;controls();
    try{
      if(time>=stage.compiled.duration)time=0;
      if(tracks.some(t=>t.buffer)||((storyEnabled||rhythmEnabled)&&hasStoryAudio(scenario))){
        audioContext ||= new AudioContext();await audioContext.resume();await prepareAudio();
      }
      if(disposed||attempt!==playVersion||!isActive())return;
      if(mixed){audioSource=audioContext.createBufferSource();audioSource.buffer=mixed;audioSource.connect(audioContext.destination);audioSource.start(0,time);started=audioContext.currentTime-time;}else started=performance.now()/1000-time;
      playing=true;status('Memutar seluruh skenario.');raf=requestAnimationFrame(tick);
    }catch(error){status(error.message);}finally{starting=false;if(!disposed)controls();}
  }
  async function rebuild(){
    const version=++loadVersion;pause();stage?.dispose();stage=null;time=0;mixed=null;invalidateDownload();
    const hasShots=scenario.shots.length>0;el('.ps-empty').hidden=hasShots;el('[data-seek]').max=durationOf(scenario);controls();
    el('[data-time]').textContent=`0:00.0 / ${stamp(durationOf(scenario))}`;
    if(!hasShots){ctx.fillStyle='#18333d';ctx.fillRect(0,0,canvas.width,canvas.height);el('[data-shot-status]').textContent='Belum ada adegan.';status(storageNotice||'Workspace kosong. Pilih episode atau tambahkan adegan.');storageNotice='';return;}
    status('Memuat pemeran dan properti…');
    try{
      renderer ||= createRenderer(gpu);
      const next=await createStage(structuredClone(scenario));
      if(version!==loadVersion||disposed){next.dispose();return;}
      stage=next;draw();status(storageNotice||(scenario.kind==='rehearsal'?'Draf / latihan siap. Belum menjadi episode final; audio dipasang terpisah.':missingSpeechCount(scenario)?'Visual siap dipratinjau; sebagian rekaman ujaran belum tersedia.':'Skenario dan cue suara siap diputar. Tinjau hasil sebelum publikasi.'));storageNotice='';
    }catch(error){if(version===loadVersion)status(`Pratinjau belum siap: ${error.message}`);}finally{if(version===loadVersion)controls();}
  }
  function update(next,{scene=false}={}){
    try{scenario=validateScenario(next);}catch(error){status(error.message);form();controls();return;}
    if(persist)try{if(scenario.shots.length)localStorage.removeItem(STORAGE+'.empty-intent');else localStorage.setItem(STORAGE+'.empty-intent','true');}catch{}
    pause();invalidateDownload();mixed=null;saveDraft();form();
    if(scene||!stage||!scenario.shots.length){rebuilding=rebuild();return;}
    stage.setScenario(scenario);time=0;el('[data-seek]').max=durationOf(scenario);draw();controls();
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function clearSessionAudio(){
    tracks.forEach((t,i)=>{t.buffer=null;t.offset=0;t.volume=i===0?1:.25;el(`[data-audio-file="${i}"]`).value='';el(`[data-audio-name="${i}"]`).textContent='Tanpa audio';el(`[data-audio-offset="${i}"]`).value=0;el(`[data-audio-volume="${i}"]`).value=t.volume;});
  }
  function switchEpisode(id,{factory=false}={}){
    if(exporting||starting||audioLoading)return;
    const previous=episodeForScenario(scenario);
    if(persist)try{localStorage.setItem(`${STORAGE}.episode.${previous}`,JSON.stringify(scenario));if(id!=='draft')localStorage.setItem(STORAGE+'.selected-episode',id);}catch{}
    if(factory&&scenario.shots.length)download(new Blob([JSON.stringify(scenario,null,2)],{type:'application/json'}),`${filename(scenario.title)}-cadangan.json`);
    let next=id==='draft'?blankScenario():scenarioForEpisode(id);
    if(persist&&!factory)try{const saved=localStorage.getItem(`${STORAGE}.episode.${id}`);if(saved)next=validateScenario(migrateProductionDraft(JSON.parse(saved)));}catch{}
    restoredDifferentDraft=!isPristineProductionDraft(next);clearSessionAudio();update(next,{scene:true});
  }
  async function exportVideo(){
    pause();exporting=true;exportAbort=new AbortController();invalidateDownload();el('[data-progress]').removeAttribute('value');controls();const oldTime=time;
    let exportStage='Menyiapkan pratinjau',wakeLock;
    status('Menyiapkan pratinjau untuk MP4…');
    try{
      // Let the browser paint the busy state before audio mixing or rendering.
      await new Promise(resolve=>setTimeout(resolve,0));
      if(!stage&&rebuilding)await rebuilding;
      if(!stage)throw new Error('Scene belum berhasil dimuat. Periksa status pratinjau, lalu coba lagi.');
      try{wakeLock=await navigator.wakeLock?.request('screen');}catch{}
      exportStage='Menyiapkan suara';status('Menyiapkan suara untuk MP4…');
      await prepareAudio();
      if(disposed||exportAbort.signal.aborted)throw exportAbort.signal.reason||new DOMException('Ekspor dibatalkan.','AbortError');
      time=0;draw(true);
      const blob=await encode({canvas,duration:stage.compiled.duration,audio:mixed,signal:exportAbort.signal,renderFrame:t=>{time=t;draw(true);},onStage:label=>{exportStage=label;status(`${label}…`);},onProgress:p=>{el('[data-progress]').value=p;status(`Membuat MP4 · ${Math.round(p*100)}%`);}});
      downloadUrl=URL.createObjectURL(blob);const link=el('[data-download]');link.href=downloadUrl;link.download=`${filename(scenario.title)}-${format}-${quality}p.mp4`;link.hidden=false;
      status(`MP4 selesai · ${(blob.size/1048576).toFixed(1)} MB. Tekan Unduh MP4 untuk menyimpan.`);
    }catch(error){const cause=exportAbort?.signal.aborted?exportAbort.signal.reason||error:error;status(cause.name==='AbortError'?'Ekspor dibatalkan. Skenario tetap tersimpan.':`Ekspor gagal (${exportStage}): ${cause.message}`);}
    finally{await wakeLock?.release().catch(()=>{});exporting=false;exportAbort=null;time=oldTime;if(!disposed){draw();controls();}}
  }
  listen(el('[data-editor]'),'submit',e=>e.preventDefault());
  listen(el('[data-editor]'),'input',event=>{if(!event.target.hasAttribute('data-cast-search'))return;castQuery=event.target.value;for(const c of scenario.cast)el(`[data-cast="${c.id}"]`).innerHTML=castOptions(c.preset,castQuery);});
  listen(el('[data-editor]'),'change',event=>{
    if(exporting||starting)return;const target=event.target,next=structuredClone(scenario);let scene=false;
    const shot=target.closest('[data-shot]'),s=shot?next.shots[Number(shot.dataset.shot)]:null;
    if(target.dataset.field){next[target.dataset.field]=target.value;scene=target.dataset.field==='set';}
    if(target.hasAttribute('data-cast-search'))return;
    if(target.dataset.cast){const index=next.cast.findIndex(c=>c.id===target.dataset.cast),cast=next.cast[index];next.cast[index]=selectCastPreset({...cast,...castIdentity(cast,scenario)},target.value);scene=true;}
    if(target.dataset.castName)next.cast.find(c=>c.id===target.dataset.castName).name=target.value.trim();
    if(target.dataset.castRole)next.cast.find(c=>c.id===target.dataset.castRole).role=target.value.trim();
    if(target.dataset.castHeight){next.cast.find(c=>c.id===target.dataset.castHeight).height=Number(target.value);scene=true;}
    if(target.dataset.castProp){const cast=next.cast.find(c=>c.id===target.dataset.castProp);if(target.value)cast.prop=target.value;else delete cast.prop;scene=true;}
    for(const [key,axis] of [['castX',0],['castZ',1]])if(target.dataset[key]){next.cast.find(c=>c.id===target.dataset[key]).position[axis]=Number(target.value);scene=true;}
    if(target.dataset.prop){next.props=[...host.querySelectorAll('[data-prop]:checked')].map(n=>n.dataset.prop);scene=true;}
    if(s&&target.dataset.shotField)s[target.dataset.shotField]=target.dataset.shotField==='duration'?Number(target.value):target.value;
    if(s&&target.dataset.shotField==='caption'){delete s.speech;delete s.speechOffset;delete s.speeches;delete s.plannedSpeech;delete s.plannedSpeeches;delete s.plannedVoice;}
    if(s&&target.dataset.shotField==='camera')delete s.frame;
    if(s&&target.hasAttribute('data-speech')){if(target.value){delete s.speeches;delete s.plannedSpeech;delete s.plannedSpeeches;delete s.plannedVoice;s.speech=target.value;s.caption=speechCaption(target.value);s.speechOffset=.3;s.duration=Math.max(s.duration,STORY_CLIPS[target.value].duration+.9);}else if(!s.speeches?.length){delete s.speech;delete s.speechOffset;}}
    if(s&&target.dataset.visible){s.actors[target.dataset.visible] ||= {action:'Idle'};s.actors[target.dataset.visible].visible=target.checked;}
    if(s&&target.dataset.action){const id=target.dataset.action,action=target.value;s.actors[id]={...s.actors[id],action};delete s.actors[id].bpm;delete s.actors[id].phase;if(['Walk','Run','Carry'].includes(action)){const prior=compileScenario(scenario).shots[Number(shot.dataset.shot)].tracks[id];s.actors[id].to=[Math.min(28,prior.from[0]+(action==='Run'?5:2.5)),prior.from[1]];}else{delete s.actors[id].to;delete s.actors[id].toHeight;}}
    for(const [key,axis] of [['toX',0],['toZ',1]])if(s&&target.dataset[key])s.actors[target.dataset[key]].to[axis]=Number(target.value);
    if(s&&target.dataset.yaw){const id=target.dataset.yaw;s.actors[id] ||= {action:'Idle'};s.actors[id].yaw=Number(target.value)*Math.PI/180;}
    if(s&&target.dataset.bpm)s.actors[target.dataset.bpm].bpm=Number(target.value);
    update(next,{scene});
  });
  listen(host,'click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const command=button.dataset.command;
    if(command==='fullscreen'){if(!exporting)void fullscreen.toggle();return;}
    if(command==='cancel'){exportAbort?.abort();return;}if(exporting||starting||audioLoading)return;
    if(command==='play'){void play();return;}if(command==='stop'){pause();time=0;draw();return;}
    if(command==='export'){void exportVideo();return;}
    if(command==='save'){download(new Blob([JSON.stringify(scenario,null,2)],{type:'application/json'}),`${filename(scenario.title)}.json`);return;}
    if(command==='srt'){download(new Blob([srtFor(scenario)],{type:'text/plain;charset=utf-8'}),`${filename(scenario.title)}.srt`);return;}
    if(['day1-full','day2-full','day3-full'].includes(command)){switchEpisode(command.slice(0,4),{factory:true});return;}
    if(command==='new'||command==='rehearsal'||command==='day1-opening'){
      // Keep a downloadable backup before replacing authored work, without a confirmation dialog.
      if(scenario.shots.length)download(new Blob([JSON.stringify(scenario,null,2)],{type:'application/json'}),`${filename(scenario.title)}-cadangan.json`);
      restoredDifferentDraft=false;
      clearSessionAudio();update(command==='new'?blankScenario():command==='day1-opening'?day1OpeningScenario():rehearsalScenario(),{scene:true});return;
    }
    if(button.dataset.jump!==undefined){if(!stage)return;pause();time=compileScenario(scenario).shots[Number(button.dataset.jump)].start;draw();return;}
    if(button.dataset.audioRemove!==undefined){const i=Number(button.dataset.audioRemove);pause();tracks[i].buffer=null;mixed=null;invalidateDownload();el(`[data-audio-file="${i}"]`).value='';el(`[data-audio-name="${i}"]`).textContent='Tanpa audio';return;}
    const next=structuredClone(scenario);let scene=false,changed=true;
    if(command==='add'){next.shots.push({id:crypto.randomUUID(),label:`Adegan ${next.shots.length+1}`,duration:3,camera:'wide',focus:next.cast[0].id,caption:'',actors:Object.fromEntries(next.cast.map(c=>[c.id,{action:'Idle',yaw:0}]))});}
    else if(command==='add-cast'){const id='abcdefghijklmnop'.split('').find(id=>!next.cast.some(c=>c.id===id));if(!id)return;next.cast.push({id,preset:presets[next.cast.length].id,position:[next.cast.length-1,1],yaw:0});scene=true;}
    else if(button.dataset.removeCast){const id=button.dataset.removeCast;next.cast=next.cast.filter(c=>c.id!==id);for(const s of next.shots){delete s.actors[id];for(const cue of Object.values(s.actors))if(cue.lookAt===id)delete cue.lookAt;if(s.focus===id)s.focus=next.cast[0].id;if(s.speech&&speakerCastId(STORY_CLIPS[s.speech],scenario)===id){delete s.speech;delete s.speechOffset;s.caption='';}if(s.speeches){s.speeches=s.speeches.filter(cue=>speakerCastId(STORY_CLIPS[cue.key],scenario)!==id);s.caption=s.speeches.map(cue=>speechCaption(cue.key)).join(' ');if(!s.speeches.length)delete s.speeches;}}scene=true;}
    else if(button.dataset.clearSpeech!==undefined){const s=next.shots[Number(button.dataset.clearSpeech)];delete s.speech;delete s.speechOffset;delete s.speeches;delete s.plannedSpeech;delete s.plannedSpeeches;delete s.plannedVoice;}
    else if(button.dataset.remove!==undefined)next.shots.splice(Number(button.dataset.remove),1);
    else if(button.dataset.up!==undefined){const i=Number(button.dataset.up);if(i>0)[next.shots[i-1],next.shots[i]]=[next.shots[i],next.shots[i-1]];}
    else changed=false;
    if(changed)update(next,{scene});
  });
  listen(el('[data-episode]'),'change',event=>switchEpisode(event.target.value));
  listen(el('[data-import]'),'change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>200000)throw new Error('Berkas skenario maksimal 200 KB.');const next=validateScenario(JSON.parse(await file.text()));update(next,{scene:true});}catch(error){status(`Skenario belum dibuka: ${error.message}`);}finally{event.target.value='';}
  });
  listen(el('[data-seek]'),'input',event=>{if(exporting)return;pause();time=Number(event.target.value);draw();});
  listen(el('[data-format]'),'change',event=>{pause();format=event.target.value;canvas.style.aspectRatio=`${OUTPUTS[format].width}/${OUTPUTS[format].height}`;invalidateDownload();draw();});
  listen(el('[data-quality]'),'change',event=>{quality=event.target.value;invalidateDownload();});
  for(const selector of ['[data-story-audio]','[data-story-rhythm]'])listen(el(selector),'change',()=>{pause();storyEnabled=el('[data-story-audio]').checked;rhythmEnabled=el('[data-story-rhythm]').checked;mixed=null;invalidateDownload();});
  listen(el('[data-guides]'),'change',event=>{guides=event.target.checked;if(!exporting)draw();});
  host.querySelectorAll('[data-audio-file]').forEach(input=>listen(input,'change',async()=>{
    const i=Number(input.dataset.audioFile),file=input.files[0],version=++audioVersion[i];if(!file)return;
    pause();tracks[i].buffer=null;mixed=null;invalidateDownload();audioLoading++;controls();el(`[data-audio-name="${i}"]`).textContent='Membaca audio…';
    try{if(file.size>50*1024*1024)throw new Error('Audio maksimal 50 MB.');audioContext ||= new AudioContext();const buffer=await audioContext.decodeAudioData(await file.arrayBuffer());if(version!==audioVersion[i]||disposed)return;if(buffer.duration>600)throw new Error('Gunakan audio maksimal 10 menit.');tracks[i].buffer=buffer;el(`[data-audio-name="${i}"]`).textContent=`${file.name} · ${stamp(buffer.duration)}`;status('Audio siap. Akan ikut saat Play dan ekspor MP4.');}
    catch(error){if(!disposed){el(`[data-audio-name="${i}"]`).textContent='Tanpa audio';status(`Audio belum dipasang: ${error.message}`);}}finally{audioLoading--;if(!disposed)controls();}
  }));
  host.querySelectorAll('[data-audio-volume],[data-audio-offset]').forEach(input=>listen(input,'change',()=>{
    pause();const volume=input.dataset.audioVolume!==undefined,i=Number(volume?input.dataset.audioVolume:input.dataset.audioOffset);tracks[i][volume?'volume':'offset']=Math.max(0,Math.min(volume?1:300,Number(input.value)||0));input.value=tracks[i][volume?'volume':'offset'];mixed=null;invalidateDownload();
  }));
  listen(window,'semesta:admin-view-change',event=>{if(event.detail.view!=='production'&&!exporting)pause();});
  listen(document,'visibilitychange',()=>{if(document.hidden&&!exporting)pause();});
  listen(window,'beforeunload',event=>{if(exporting){event.preventDefault();event.returnValue='';}});
  listen(gpu,'webglcontextlost',event=>{event.preventDefault();pause();const error=new Error('Konteks grafis terputus. Muat ulang halaman; draf tetap tersimpan. Coba kualitas 720p untuk mengurangi beban grafis.');exportAbort?.abort(error);status(error.message);});
  form();saveDraft();const ready=rebuild();rebuilding=ready;
  return {ready,play,dispose(){disposed=true;fullscreen.dispose();loadVersion++;audioVersion[0]++;audioVersion[1]++;pause();exportAbort?.abort();events.abort();stage?.dispose();renderer?.dispose();void audioContext?.close();invalidateDownload();host.replaceChildren();}};
}
