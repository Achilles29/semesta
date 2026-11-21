import {presets} from './avatar-v15-config.js';
import day1Audio from './production-day1-audio.json' with {type:'json'};

export const SCENARIO_VERSION = 1;
export const ACTIONS = Object.freeze({Idle:'Diam',Walk:'Jalan',Run:'Lari',Wave:'Melambaikan tangan',Point:'Menunjuk',Hold:'Memegang barang',Dance:'Joget Prabowow (parodi)'});
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
const point = p => Array.isArray(p) && p.length===2 && p.every(n=>finite(n,-12,12));
export function validateScenario(input) {
  // Return owned data: edits cannot mutate a currently exporting scenario.
  const s=structuredClone(input);
  const fail=message=>{throw new Error(message);};
  if(!s || s.version!==SCENARIO_VERSION)fail('Versi skenario tidak didukung.');
  if(!text(s.title,100)||!s.title.trim())fail('Judul wajib diisi (maksimal 100 karakter).');
  if(s.notice!==undefined&&!text(s.notice,80))fail('Label produksi maksimal 80 karakter.');
  if(!['episode','rehearsal'].includes(s.kind)||!['courtyard','studio','republic'].includes(s.set))fail('Jenis produksi atau set tidak dikenal.');
  if(!Array.isArray(s.props)||s.props.length>4||s.props.some(p=>!Object.hasOwn(PROPS,p)))fail('Properti tidak dikenal.');
  if(!Array.isArray(s.cast)||s.cast.length<1||s.cast.length>4)fail('Gunakan 1–4 pemeran.');
  const ids=new Set();
  for(const c of s.cast){
    if(!/^[a-z][a-z0-9_-]{0,30}$/.test(c.id)||ids.has(c.id))fail('ID pemeran harus unik.');
    ids.add(c.id);
    if(!presets.some(p=>p.id===c.preset)||!point(c.position)||!finite(c.yaw,-Math.PI*2,Math.PI*2))fail('Preset atau posisi pemeran tidak valid.');
  }
  if(!Array.isArray(s.shots)||s.shots.length>40)fail('Maksimal 40 adegan.');
  const shots=new Set();
  for(const shot of s.shots){
    if(!text(shot.id,50)||!shot.id||shots.has(shot.id))fail('ID adegan harus unik.');shots.add(shot.id);
    if(!text(shot.label,80)||!text(shot.caption,180))fail('Nama adegan maksimal 80 dan subtitle 180 karakter.');
    if(!finite(shot.duration,1,30))fail('Durasi adegan harus 1–30 detik.');
    if(!Object.hasOwn(CAMERAS,shot.camera)||!ids.has(shot.focus))fail('Kamera atau fokus tidak valid.');
    if(shot.speech!==undefined&&!Object.hasOwn(day1Audio,shot.speech))fail('Klip dialog tidak dikenal.');
    if(shot.speech&&shot.caption!==day1Audio[shot.speech].text.replaceAll('Weka Weka','Wkwkwk').replaceAll('Dei Dua','Day Dua'))fail('Subtitle harus sesuai klip suara; lepas suara sebelum mengganti teks.');
    if(shot.speechOffset!==undefined&&!finite(shot.speechOffset,0,shot.duration))fail('Waktu dialog tidak valid.');
    if(shot.speech&&(shot.speechOffset??.3)+day1Audio[shot.speech].duration>shot.duration)fail('Durasi adegan lebih pendek dari dialog.');
    if(shot.overlay!==undefined&&!text(shot.overlay,100))fail('Teks utama maksimal 100 karakter.');
    if(shot.card!==undefined&&!['build','events'].includes(shot.card))fail('Kartu usulan tidak dikenal.');
    if(shot.sound!==undefined&&shot.sound!=='beat')fail('Efek suara tidak dikenal.');
    if(shot.frame!==undefined&&(!Array.isArray(shot.frame.target)||shot.frame.target.length!==3||!shot.frame.target.every(n=>finite(n,-12,12))||!finite(shot.frame.width,.8,12)))fail('Bingkai kamera tidak valid.');
    if(!shot.actors||typeof shot.actors!=='object'||Array.isArray(shot.actors))fail('Gerakan pemeran belum diatur.');
    for(const [id,cue] of Object.entries(shot.actors)){
      if(!ids.has(id)||!cue||!Object.hasOwn(ACTIONS,cue.action))fail('Gerakan pemeran tidak dikenal.');
      if(cue.to!==undefined && (!point(cue.to)||!['Walk','Run'].includes(cue.action)))fail('Posisi tujuan hanya untuk jalan atau lari.');
      if(['Walk','Run'].includes(cue.action)&&!point(cue.to))fail('Jalan atau lari membutuhkan posisi tujuan.');
      if(cue.yaw!==undefined&&!finite(cue.yaw,-Math.PI*2,Math.PI*2))fail('Arah pemeran tidak valid.');
      if(cue.bpm!==undefined&&(!finite(cue.bpm,70,180)||cue.action!=='Dance'))fail('Tempo joget harus 70–180 BPM.');
      if(cue.visible!==undefined&&typeof cue.visible!=='boolean')fail('Visibilitas pemeran tidak valid.');
      if(cue.gesture!==undefined&&!['look','nod','talk'].includes(cue.gesture))fail('Gestur tidak dikenal.');
      for(const key of ['phase','delay'])if(cue[key]!==undefined&&(!finite(cue[key],0,30)||cue.action!=='Dance'))fail('Waktu joget tidak valid.');
    }
  }
  if(durationOf(s)>180)fail('Durasi maksimal satu produksi adalah 3 menit.');
  return s;
}
export const durationOf = s => s.shots.reduce((n,shot)=>n+shot.duration,0);
export function compileScenario(input){
  const scenario=validateScenario(input);let start=0;
  let poses=Object.fromEntries(scenario.cast.map(c=>[c.id,{position:[...c.position],yaw:c.yaw,visible:true}]));
  const shots=scenario.shots.map(shot=>{
    const tracks={};
    for(const c of scenario.cast){
      const cue=shot.actors[c.id]||{action:'Idle'},from=[...poses[c.id].position],to=cue.to||from;
      const distance=Math.hypot(to[0]-from[0],to[1]-from[1]);
      const yaw=distance>.001?Math.atan2(to[0]-from[0],to[1]-from[1]):cue.yaw??poses[c.id].yaw;
      const visible=cue.visible??poses[c.id].visible;
      tracks[c.id]={...cue,visible,action:distance<.001&&['Walk','Run'].includes(cue.action)?'Idle':cue.action,from,to:[...to],distance,yaw,fromYaw:poses[c.id].yaw};
      poses[c.id]={position:[...to],yaw,visible};
    }
    const compiled={...shot,start,end:start+shot.duration,tracks};start=compiled.end;return compiled;
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
    const progress=travel(elapsed,shot.duration);
    actors[id]={...track,position:track.from.map((n,i)=>n+(track.to[i]-n)*progress),yaw:angle(track.fromYaw,track.yaw,smooth(elapsed/.22)),elapsed,distanceTravelled:track.distance*progress,
      previous:previous?{...previous.tracks[id],elapsed:previous.duration+elapsed}:null,blend:smooth(elapsed/.24)};
  }
  return {time:t,shot,index:compiled.shots.indexOf(shot),elapsed,actors};
}
export function srtFor(scenario){
  const stamp=t=>{const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
  return compileScenario(scenario).shots.filter(s=>s.caption.trim()).map((s,i)=>{const start=s.start+(s.speech?(s.speechOffset??.3):0),end=s.speech?Math.min(s.end,start+day1Audio[s.speech].duration+.12):s.end;return `${i+1}\n${stamp(start)} --> ${stamp(end)}\n${s.caption}\n`;}).join('\n');
}
