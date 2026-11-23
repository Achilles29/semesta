import {CIVIC_FACILITIES} from './civic-development-layout.js';
import {DAY3_PANELS} from './production-day3-panels.js';
import {displaySpeechText} from './production-speech-text.js';
import day1Music from './production-day1-music.json' with {type:'json'};
import {presets} from './avatar-v15-config.js';
import {STORY_CLIPS} from './production-audio-catalog.js';
import {speechCues} from './production-speech-cues.js';

export const SCENARIO_VERSION = 1;
export const ACTIONS = Object.freeze({Idle:'Diam',Walk:'Jalan',Run:'Lari',Wave:'Melambaikan tangan',Point:'Menunjuk',Hold:'Memegang barang',Dance:'Joget Pasca Bowow (parodi)',Protest:'Protes',Measure:'Mengukur',Build:'Bekerja membangun',Paint:'Mengecat',Carry:'Membawa',Operate:'Mengoperasikan alat',CutRibbon:'Memotong pita',Applaud:'Bertepuk tangan',Sit:'Duduk'});
export const CAMERAS = Object.freeze({wide:'Lebar',medium:'Sedang',close:'Dekat',follow:'Mengikuti pemeran'});
export const PROPS = Object.freeze({bench:'Bangku',crate:'Peti',plants:'Tanaman',board:'Papan studio',office:'Kursi kantor sementara'});
export const OUTPUTS = Object.freeze({portrait:{label:'Vertikal · 9:16',width:1080,height:1920},landscape:{label:'Horizontal · 16:9',width:1920,height:1080},square:{label:'Persegi · 1:1',width:1080,height:1080}});
export const blankScenario = () => ({version:SCENARIO_VERSION,title:'Day 1',kind:'episode',set:'courtyard',props:['bench','plants'],cast:[{id:'a',preset:'v15-arka',position:[-.7,0],yaw:0},{id:'b',preset:'v15-laras',position:[.7,0],yaw:0}],shots:[]});
export const rehearsalScenario = () => ({...blankScenario(),cast:blankScenario().cast.map((c,i)=>i===0?{...c,position:[-3.2,0]}:c),title:'Latihan studio',kind:'rehearsal',shots:[
  {id:'masuk',label:'Masuk ke set',duration:2,camera:'wide',focus:'a',caption:'Satu skenario. Semua bergerak bersama.',actors:{a:{action:'Walk',to:[-.7,0]},b:{action:'Idle'}}},
  {id:'salam',label:'Sapa kamera',duration:3,camera:'medium',focus:'a',caption:'Gerakan, kamera, dan subtitle mengikuti timeline.',actors:{a:{action:'Wave',yaw:0},b:{action:'Wave',yaw:0}}},
  {id:'properti',label:'Tunjukkan properti',duration:3,camera:'close',focus:'b',caption:'Pemeran dan properti siap untuk cerita baru.',actors:{a:{action:'Idle'},b:{action:'Point',yaw:-.35}}},
  {id:'selesai',label:'Penutup latihan',duration:2,camera:'wide',focus:'a',caption:'Day 1 belum dimulai. Ini hanya latihan teknis.',actors:{a:{action:'Idle',yaw:0},b:{action:'Idle',yaw:0}}},
]});
const finite = (n,min,max) => typeof n==='number' && Number.isFinite(n) && n>=min && n<=max;
const text = (s,max) => typeof s==='string' && s.length<=max;
const point = p => Array.isArray(p) && p.length===2 && p.every(n=>finite(n,-2000,2000));
const frameValid = f => f&&Array.isArray(f.target)&&f.target.length===3&&f.target.every(n=>finite(n,-10000,10000))&&finite(f.width,.8,12000)&&(f.azimuth===undefined||finite(f.azimuth,-Math.PI*2,Math.PI*2))&&(f.elevation===undefined||finite(f.elevation,-.4,8))&&(f.fov===undefined||finite(f.fov,20,65));
export function validateScenario(input) {
  // Return owned data: edits cannot mutate a currently exporting scenario.
  const s=structuredClone(input);
  const fail=message=>{throw new Error(message);};
  if(!s || s.version!==SCENARIO_VERSION)fail('Versi skenario tidak didukung.');
  if(!text(s.title,100)||!s.title.trim())fail('Judul wajib diisi (maksimal 100 karakter).');
  if(s.notice!==undefined&&!text(s.notice,80))fail('Label produksi maksimal 80 karakter.');
  if(s.template!==undefined&&s.template!=='republic-series')fail('Template tidak dikenal.');
  if(!['episode','rehearsal'].includes(s.kind)||!['courtyard','studio','republic','construction','development'].includes(s.set))fail('Jenis produksi atau set tidak dikenal.');
  if(!Array.isArray(s.props)||s.props.length>4||s.props.some(p=>!Object.hasOwn(PROPS,p)))fail('Properti tidak dikenal.');
  if(!Array.isArray(s.cast)||s.cast.length<1||s.cast.length>64)fail('Gunakan 1–64 pemeran.');
  const ids=new Set();
  for(const c of s.cast){
    if(!/^[a-z][a-z0-9_-]{0,30}$/.test(c.id)||ids.has(c.id))fail('ID pemeran harus unik.');
    ids.add(c.id);
    if(c.name!==undefined&&(!text(c.name,60)||!c.name.trim()))fail('Nama pemeran wajib terisi (maksimal 60 karakter).');
    if(c.role!==undefined&&!text(c.role,100))fail('Peran pemeran maksimal 100 karakter.');
    if(!presets.some(p=>p.id===c.preset)||!point(c.position)||!finite(c.yaw,-Math.PI*2,Math.PI*2))fail('Preset atau posisi pemeran tidak valid.');
    if(c.prop!==undefined&&c.prop!=='guitar')fail('Aksesori pemeran tidak dikenal.');
    if(c.height!==undefined&&!finite(c.height,-2,10))fail('Ketinggian pemeran tidak valid.');
    if(c.visible!==undefined&&typeof c.visible!=='boolean')fail('Visibilitas awal pemeran tidak valid.');
  }
  if(!Array.isArray(s.shots)||s.shots.length>80)fail('Maksimal 80 adegan.');
  const shots=new Set();
  for(const shot of s.shots){
    if(!text(shot.id,50)||!shot.id||shots.has(shot.id))fail('ID adegan harus unik.');shots.add(shot.id);
    if(!text(shot.label,80)||!text(shot.caption,180))fail('Nama adegan maksimal 80 dan subtitle 180 karakter.');
    if(!finite(shot.duration,1,30))fail('Durasi adegan harus 1–30 detik.');
    if(!Object.hasOwn(CAMERAS,shot.camera)||!ids.has(shot.focus))fail('Kamera atau fokus tidak valid.');
    if(shot.speech!==undefined&&!Object.hasOwn(STORY_CLIPS,shot.speech))fail('Klip dialog tidak dikenal.');
    if(shot.speech&&shot.caption!==displaySpeechText(STORY_CLIPS[shot.speech].text))fail('Subtitle harus sesuai klip suara; lepas suara sebelum mengganti teks.');
    if(shot.speechOffset!==undefined&&!finite(shot.speechOffset,0,shot.duration))fail('Waktu dialog tidak valid.');
    if(shot.speeches!==undefined&&(!Array.isArray(shot.speeches)||shot.speeches.length>12||shot.speech))fail('Gunakan satu dialog atau daftar dialog, maksimal dua belas.');
    if(shot.speechTail!==undefined&&!finite(shot.speechTail,0,1))fail('Ekor dialog maksimal satu detik.');
    for(const cue of speechCues(shot)){
      if(!cue||!Object.hasOwn(STORY_CLIPS,cue.key)||!finite(cue.offset??.3,0,shot.duration))fail('Klip atau waktu dialog tidak dikenal.');
      if((cue.offset??.3)+STORY_CLIPS[cue.key].duration>shot.duration+(shot.speechTail||0)+.001)fail('Durasi adegan lebih pendek dari dialog.');
      if(cue.volume!==undefined&&!finite(cue.volume,0,1))fail('Volume dialog tidak valid.');
    }
    if(shot.overlay!==undefined&&!text(shot.overlay,100))fail('Teks utama maksimal 100 karakter.');
    if(shot.followExtra!==undefined&&!['chicken','cat'].includes(shot.followExtra))fail('Fokus figuran tidak valid.');
    if(shot.card!==undefined&&!['build','events'].includes(shot.card))fail('Kartu usulan tidak dikenal.');
    if(shot.sound!==undefined&&!['beat','okeGas'].includes(shot.sound))fail('Efek suara tidak dikenal.');
    if(shot.musicOffset!==undefined&&!finite(shot.musicOffset,0,day1Music.duration-.01))fail('Posisi musik tidak valid.');
    if(shot.musicVolume!==undefined&&!finite(shot.musicVolume,0,1))fail('Volume musik tidak valid.');
    if(shot.musicBedVolume!==undefined&&!finite(shot.musicBedVolume,0,1))fail('Volume latar tidak valid.');
    if(shot.frame!==undefined&&!frameValid(shot.frame))fail('Bingkai kamera tidak valid.');
    if(shot.frame?.push!==undefined&&!finite(shot.frame.push,0,.2))fail('Gerak kamera tidak valid.');
    if(shot.frame?.motion){const m=shot.frame.motion;if(!['orbit','truck','crane','dolly','zoom','descent'].includes(m.type)||!frameValid(m.from)||!frameValid(m.to)||(m.hold!==undefined&&!finite(m.hold,0,.8)))fail('Lintasan kamera tidak valid.');}
    if(shot.buildProgress!==undefined){const values=Array.isArray(shot.buildProgress)?shot.buildProgress:[shot.buildProgress];if(values.length<1||values.length>2||values.some(n=>!finite(n,0,8)))fail('Tahap bangunan tidak valid.');}
    if(shot.props!==undefined){
      const states={board:['carried','handover','stand'],table:['stage','moving','ceremony'],folder:['open','closed'],ribbon:['hidden','ready','cut'],scissors:['tray','hand'],excavator:['parked','digging'],suitcase:['hand','ground'],phone:['recording','down'],plan:['held','table']};
      if(!shot.props||typeof shot.props!=='object'||Array.isArray(shot.props))fail('Properti adegan tidak valid.');
      for(const [key,value] of Object.entries(shot.props)){
        if(key==='tableProgress'){if(!Array.isArray(value)||value.length!==2||value.some(n=>!finite(n,0,1)))fail('Pergerakan meja tidak valid.');continue;}
        if(!states[key])fail('Properti adegan tidak dikenal.');if(typeof value==='string'){if(!states[key].includes(value))fail('Status properti tidak dikenal.');}else if(!value||!states[key].includes(value.from)||!states[key].includes(value.to)||!finite(value.at,0,1)||(value.until!==undefined&&!finite(value.until,value.at,1)))fail('Peralihan properti tidak valid.');
      }
    }
    if(shot.day3Panel!==undefined&&!DAY3_PANELS.includes(shot.day3Panel))fail('Panel Day 3 tidak dikenal.');
    if(shot.development!==undefined){
      const d=shot.development,progress=v=>finite(v,0,1)||(Array.isArray(v)&&v.length===2&&v.every(n=>finite(n,0,1)));
      if(s.set!=='development'||!d||!progress(d.homes)||!d.facilities||Array.isArray(d.facilities)||typeof d.facilities!=='object'||Object.entries(d.facilities).some(([id,v])=>!CIVIC_FACILITIES.some(f=>f.id===id)||!progress(v)))fail('Tahap fasilitas Day 3 tidak valid.');
    }
    if(shot.interior!==undefined&&!['koplak','sppg'].includes(shot.interior))fail('Interior tidak dikenal.');
    if(shot.survey!==undefined){const poll=shot.survey;if(!poll||!text(poll.title,100)||!text(poll.footer,100)||!Array.isArray(poll.choices)||poll.choices.length<2||poll.choices.length>6||poll.choices.some(c=>!c||!text(c.key,4)||!text(c.label,50)))fail('Pilihan survei tidak valid.');}
    if(shot.protest!==undefined){const p=shot.protest;if(!p||!finite(p.level,0,1)||(p.from!==undefined&&!finite(p.from,0,1))||(p.to!==undefined&&!finite(p.to,p.from??0,1)))fail('Reaksi warga tidak valid.');
    }
    if(shot.extras!==undefined){
      if(!shot.extras||typeof shot.extras!=='object'||Array.isArray(shot.extras))fail('Figuran tidak valid.');
      for(const [name,cue] of Object.entries(shot.extras))if(!['chicken','cat'].includes(name)||!cue||typeof cue!=='object'||(cue.to!==undefined&&!point(cue.to))||(cue.visible!==undefined&&typeof cue.visible!=='boolean')||(cue.action!==undefined&&!['idle','walk','sad','proud'].includes(cue.action)))fail('Gerak figuran tidak valid.');
    }
    if(!shot.actors||typeof shot.actors!=='object'||Array.isArray(shot.actors))fail('Gerakan pemeran belum diatur.');
    for(const [id,cue] of Object.entries(shot.actors)){
      if(!ids.has(id)||!cue||!Object.hasOwn(ACTIONS,cue.action))fail('Gerakan pemeran tidak dikenal.');
      if(cue.to!==undefined && (!point(cue.to)||!['Walk','Run','Carry'].includes(cue.action)))fail('Posisi tujuan hanya untuk berjalan, berlari, atau membawa barang.');
      if(['Walk','Run'].includes(cue.action)&&!point(cue.to)&&!cue.path)fail('Jalan atau lari membutuhkan posisi tujuan.');
      if(cue.path!==undefined){let prior=0;if(!['Walk','Run','Carry'].includes(cue.action)||!Array.isArray(cue.path)||cue.path.length<1||cue.path.length>10)fail('Jalur aktor tidak valid.');for(const node of cue.path){if(!node||!point(node.to)||!finite(node.at,prior+.0001,1)||(node.height!==undefined&&!finite(node.height,-2,10)))fail('Titik jalur aktor tidak valid.');prior=node.at;}}
      if(cue.yaw!==undefined&&!finite(cue.yaw,-Math.PI*2,Math.PI*2))fail('Arah pemeran tidak valid.');
      if(cue.bpm!==undefined&&(!finite(cue.bpm,70,180)||cue.action!=='Dance'))fail('Tempo joget harus 70–180 BPM.');
      if(cue.visible!==undefined&&typeof cue.visible!=='boolean')fail('Visibilitas pemeran tidak valid.');
      if(cue.at!==undefined&&!point(cue.at))fail('Posisi awal adegan tidak valid.');
      for(const key of ['height','toHeight'])if(cue[key]!==undefined&&!finite(cue[key],-2,s.set==='development'?100:10))fail('Ketinggian gerak tidak valid.');
      for(const key of ['delay','gestureDelay'])if(cue[key]!==undefined&&!finite(cue[key],0,shot.duration))fail('Jeda gerak tidak valid.');
      if(cue.activeDuration!==undefined&&!finite(cue.activeDuration,.01,shot.duration-(cue.delay||0)))fail('Jendela gerak tidak valid.');
      if(cue.gesture!==undefined&&!['look','nod','talk','self','stop','dismiss'].includes(cue.gesture))fail('Gestur tidak dikenal.');
      if(cue.expression!==undefined&&!['neutral','happy','confused','surprised','sad','angry'].includes(cue.expression))fail('Ekspresi tidak dikenal.');
      if(cue.lookAt!==undefined&&cue.lookAt!=='camera'&&!ids.has(cue.lookAt))fail('Arah pandangan tidak dikenal.');
      if(cue.phase!==undefined&&(!finite(cue.phase,0,30)||cue.action!=='Dance'))fail('Waktu joget tidak valid.');
    }
  }
  if(durationOf(s)>300)fail('Durasi maksimal satu produksi adalah 5 menit.');
  return s;
}
export const durationOf = s => s.shots.reduce((n,shot)=>n+shot.duration,0);
export function compileScenario(input){
  const scenario=validateScenario(input);let start=0;
  let poses=Object.fromEntries(scenario.cast.map(c=>[c.id,{position:[...c.position],height:c.height??0,yaw:c.yaw,visible:c.visible??true}]));
  let extraPoses={chicken:{position:[2.7,1.15],visible:false,action:'idle'},cat:{position:[2.8,1.4],visible:false,action:'idle'}};
  const shots=scenario.shots.map(shot=>{
    const tracks={};
    for(const c of scenario.cast){
      const cue=shot.actors[c.id]||{action:'Idle'},from=[...(cue.at||poses[c.id].position)],to=cue.path?.at(-1).to||cue.to||from;
      const fromHeight=cue.height??poses[c.id].height,toHeight=cue.path?.at(-1).height??cue.toHeight??fromHeight;
      const pathNodes=[{to:from,height:fromHeight,at:0},...(cue.path||[{to,height:toHeight,at:1}])];
      pathNodes.forEach((node,i)=>{if(i&&node.height===undefined)node.height=pathNodes[i-1].height;});
      const distance=pathNodes.slice(1).reduce((n,node,i)=>n+Math.hypot(node.to[0]-pathNodes[i].to[0],node.to[1]-pathNodes[i].to[1]),0);
      const yaw=distance>.001?Math.atan2(to[0]-from[0],to[1]-from[1]):cue.yaw??poses[c.id].yaw;
      const visible=cue.visible??poses[c.id].visible;
      tracks[c.id]={...cue,pathNodes,visible,action:distance<.001&&Math.abs(toHeight-fromHeight)<.001&&['Walk','Run'].includes(cue.action)?'Idle':cue.action,from,to:[...to],fromHeight,toHeight,distance,yaw,fromYaw:cue.at?yaw:poses[c.id].yaw};
      poses[c.id]={position:[...to],height:toHeight,yaw,visible};
    }
    const extraTracks={};
    for(const [name,prior] of Object.entries(extraPoses)){
      const cue=shot.extras?.[name]||{},to=cue.to||prior.position;
      extraTracks[name]={...prior,...cue,from:[...prior.position],to:[...to]};
      extraPoses[name]={...prior,...cue,position:[...to]};
    }
    const compiled={...shot,start,end:start+shot.duration,tracks,extraTracks};start=compiled.end;return compiled;
  });
  return {scenario,shots,duration:start};
}
const clamp = n => Math.max(0,Math.min(1,n));
const smooth = n => {n=clamp(n);return n*n*(3-2*n);};
const angle = (a,b,k) => a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
// Distance integral of a trapezoidal speed curve: gentle start/stop, steady middle.
export function travel(t,duration){
  const ramp=Math.min(.22,duration/4),time=Math.max(0,Math.min(duration,t)),normal=duration-ramp;
  if(time<ramp)return time*time/(2*ramp*normal);
  if(time>duration-ramp)return 1-(duration-time)**2/(2*ramp*normal);
  return (time-ramp/2)/normal;
}
export function sampleScenario(compiled,time){
  if(!compiled.shots.length)return null;
  const t=Math.max(0,Math.min(compiled.duration,time));
  const index=Math.max(0,compiled.shots.findIndex(s=>t<s.end));
  const shot=t>=compiled.duration?compiled.shots.at(-1):compiled.shots[index];
  const elapsed=t-shot.start,previous=compiled.shots[compiled.shots.indexOf(shot)-1];
  const actors={};
  for(const [id,track] of Object.entries(shot.tracks)){
    const delay=track.delay??0,window=track.activeDuration??Math.max(.01,shot.duration-delay),local=elapsed-delay;
    const progress=travel(local,window),outside=track.action!=='Dance'&&(local<0||(track.activeDuration!==undefined&&local>window));
    let position=track.from.map((n,i)=>n+(track.to[i]-n)*progress),height=track.fromHeight+(track.toHeight-track.fromHeight)*progress,yaw=angle(track.fromYaw,track.yaw,smooth(local/.22)),distanceTravelled=track.distance*progress;
    if(track.path){
      const nodes=track.pathNodes,fraction=clamp(local/window),found=nodes.findIndex(n=>n.at>=fraction),index=found<0?nodes.length-1:Math.max(1,found),end=nodes[index],start=nodes[index-1],segmentTime=local-start.at*window,k=travel(segmentTime,(end.at-start.at)*window);
      position=start.to.map((v,i)=>v+(end.to[i]-v)*k);height=start.height+(end.height-start.height)*k;
      const heading=Math.atan2(end.to[0]-start.to[0],end.to[1]-start.to[1]),before=index>1?Math.atan2(start.to[0]-nodes[index-2].to[0],start.to[1]-nodes[index-2].to[1]):track.fromYaw;
      yaw=angle(before,heading,smooth(segmentTime/.16));distanceTravelled=nodes.slice(1,index).reduce((sum,n,i)=>sum+Math.hypot(n.to[0]-nodes[i].to[0],n.to[1]-nodes[i].to[1]),0)+Math.hypot(end.to[0]-start.to[0],end.to[1]-start.to[1])*k;
    }
    actors[id]={...track,action:outside?'Idle':track.action,actionElapsed:Math.max(0,Math.min(window,local)),actionDuration:window,position,height,yaw,elapsed,distanceTravelled,
      previous:previous?{...previous.tracks[id],elapsed:previous.duration+elapsed}:null,blend:smooth(elapsed/.24)};
  }
  const extras=Object.fromEntries(Object.entries(shot.extraTracks).map(([name,cue])=>[name,{...cue,position:cue.from.map((v,i)=>v+(cue.to[i]-v)*travel(elapsed,shot.duration)),moving:Math.hypot(...cue.to.map((v,i)=>v-cue.from[i]))>.001}]));
  const speechSources=compiled.shots.filter(s=>s.start<=t&&s.end+1.2>=t).flatMap(s=>speechCues(s).map(c=>({...c,shotStart:s.start})));
  return {time:t,shot,index:compiled.shots.indexOf(shot),elapsed,actors,extras,speechSources};
}
export function srtFor(scenario){
  const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
  return compileScenario(scenario).shots.flatMap(s=>speechCues(s).length?speechCues(s).map(c=>({start:s.start+(c.offset??.3),end:Math.min(s.end+(s.speechTail||0),s.start+(c.offset??.3)+STORY_CLIPS[c.key].duration+.12),caption:displaySpeechText(STORY_CLIPS[c.key].text)})):s.caption.trim()?[{start:s.start,end:s.end,caption:s.caption}]:[]).map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${s.caption}\n`).join('\n');
}
