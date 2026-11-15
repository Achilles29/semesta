// Editorial animatic: timing is provisional until V13 narration is recorded.
export const EPISODE_DURATION=96;
export const EPISODE_SCENES=[
  {id:'v13-1',name:'Kursi kosong, warga kesusahan',start:0,end:27},
  {id:'v13-2',name:'Sambutan tanpa bantuan',start:27,end:55},
  {id:'v13-3',name:'Komeng dan warga membantu',start:55,end:66},
  {id:'v13-4',name:'Yang dilihat kursinya',start:66,end:96},
];
const lines=[
  [0,11,'narator','Day one di Republik WKWKWK. Kursi wapres kosong. Yang mau duduk sudah ada. Yang mau kerja? Kita lihat dulu.'],
  [11,13,'bahlil','Diindaa! Saya siap!'],
  [13,27,'narator','Bahlil datang duluan. Belum ditanya, sudah siap. Di belakangnya, gerobak Bu Warung nyangkut di lubang. Ibu ini mau jualan, bukan mau ikut kampanye.'],
  [27,32,'narator','Terus Gufron datang. Nah, mungkin yang ini mau bantu.'],
  [32,39,'mama-ghufron','Pemimpin harus dekat dengan rakyat. Betul apa tidak? Keprok atuh!'],
  [39,55,'narator','Oh, minta tepuk tangan. Gerobaknya masih di situ. Coba bayangin jadi Bu Warung. Di depan mata ada dua calon pemimpin. Tapi buat lewat depan warung sendiri, masih susah.'],
  [55,66,'narator','Komeng akhirnya taruh gelas. Ajak satu warga, angkat rodanya. Gerobaknya jalan. Nggak pakai sambutan.'],
  [66,83,'narator','Bu Warung kecapekan, terus duduk di kursi tadi. Bahlil sama Gufron langsung nengok. Dari tadi orangnya kesusahan nggak dilihat. Begitu kursinya didudukin, baru diperhatiin.'],
  [83,96,'narator','Hari ini belum ada yang dipilih. Dua-duanya masih harus dites. Kalau kamu warga sini, tes pertama mereka harus ngapain?'],
];
export const EPISODE_CUES=lines.map(([start,end,role,text],i)=>({id:`v13-${i+1}`,start,end,role,text,provisional:true}));
export const V13_SET={chair:[-47.55,0,-98.1],cart:[-50.5,.08,-100],hole:[-49.97,.081,-99.9],cupTable:[-46.6,.78,-99.25]};
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*ease(t);
const progress=(t,start,length)=>clamp((t-start)/length);
const actor=(x,z,t=0)=>({x,y:0,z,yaw:0,clip:'Idle',phase:t*.65,handTargets:{},seated:0,crouch:0,mouthOpen:0,headYaw:0,headNod:0});
function walk(a,x,z,t,start,length){
  const p=progress(t,start,length),ox=a.x,oz=a.z;
  a.x=mix(ox,x,p);a.z=mix(oz,z,p);
  if(p>0&&p<1){a.clip='Walk';a.phase=(t-start)*.85;a.yaw=Math.atan2(x-ox,z-oz);}
}
export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const scene=EPISODE_SCENES.find(s=>time>=s.start&&time<s.end)??EPISODE_SCENES.at(-1);
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  const roll=ease((time-60)/5),lift=ease((time-58)/2)*(1-ease((time-64)/1));
  const cart=[-50.5,.08+.13*lift,-100+1.25*roll];
  const actors={bahlil:actor(-47.6,-100.5,time),'mama-ghufron':actor(-45.4,-100.3,time),
    'bu-warung':actor(cart[0],cart[2]-.95,time),komeng:actor(-46.35,-99.5,time)};
  const b=actors.bahlil,g=actors['mama-ghufron'],bu=actors['bu-warung'],k=actors.komeng;
  walk(b,-48.1,-98.8,time,1,3);walk(g,-46.75,-98.9,time,27,3);
  // Keep actors oriented toward the audience until the chair payoff.
  if(time>=4)b.yaw=0;if(time>=30)g.yaw=0;
  if(time>=11&&time<13)b.handTargets.R=[b.x-.32,1.35,b.z+.26];
  if(time>=32&&time<39)g.handTargets.L=[g.x+.36,1.25,g.z+.25];
  if(time>=4&&time<58){
    const effort=.012*Math.sin(time*3.2);bu.z+=effort;bu.headNod=.07*Math.sin(time*3.2);
  }
  if(time<66){
    bu.handTargets.L=[cart[0]+.28,.94+cart[1],cart[2]-.66];
    bu.handTargets.R=[cart[0]-.28,.94+cart[1],cart[2]-.66];
    if(time>=60&&time<65){bu.clip='Walk';bu.phase=(time-60)*.7;}
  }else{
    walk(bu,-49.3,-97.55,time,66,3);
    if(time>=69)walk(bu,V13_SET.chair[0],V13_SET.chair[2]-.1,time,69,3);
    bu.seated=ease((time-72)/1);bu.y=-.27*bu.seated;
    if(time>=72)bu.yaw=0;
  }
  const put=ease((time-53)/1.5);
  const cup=[mix(-46.58,V13_SET.cupTable[0],put),mix(1.04,V13_SET.cupTable[1]+.1,put),mix(-99.45,V13_SET.cupTable[2],put)];
  if(time<54.5)k.handTargets.R=[cup[0],cup[1]-.01,cup[2]];
  walk(k,cart[0]+.97,cart[2]-.06,time,54.5,3.5);
  if(time>=58&&time<66){
    k.x=cart[0]+.97;k.z=cart[2]-.06;k.yaw=-Math.PI/2;
    k.handTargets.R=[cart[0]+.57,.96+cart[1],cart[2]-.15];
    k.handTargets.L=[cart[0]+.57,.96+cart[1],cart[2]+.15];
    if(time>=60&&time<65){k.clip='Walk';k.phase=(time-60)*.65;}
  }
  if(time>=66){k.x=cart[0]+.97;k.z=cart[2]-.06;k.yaw=-.3;}
  if(time>=73){
    b.headYaw=.42*ease((time-73)/.5);g.headYaw=-.42*ease((time-73)/.5);
    b.headNod=-.06;g.headNod=-.06;
  }
  const extras=Array.from({length:8},(_,i)=>actor(
    [-52,-45,-49.2,-48,-51.5,-44.2,-53,-43.5][i],
    [-101,-100.7,-103.3,-103.4,-104.5,-103.5,-106,-106][i],time+i));
  const helper=extras[0];
  walk(helper,cart[0]-.97,cart[2]-.06,time,55,3);
  if(time>=58){helper.x=cart[0]-.97;helper.z=cart[2]-.06;helper.yaw=Math.PI/2;}
  if(time>=58&&time<66){
    helper.handTargets.L=[cart[0]-.57,.96+cart[1],cart[2]-.15];
    helper.handTargets.R=[cart[0]-.57,.96+cart[1],cart[2]+.15];
    if(time>=60&&time<65){helper.clip='Walk';helper.phase=(time-60)*.65;}
  }
  for(let i=1;i<extras.length;i++){
    const e=extras[i];
    if(i===5||i===6){e.x+=.35*Math.sin(time*.24+i);e.clip='Walk';e.yaw=Math.cos(time*.24+i)>0?Math.PI/2:-Math.PI/2;}
    if((i===1||i===2)&&time>=39&&time<41){
      const spread=.07+.07*(.5+.5*Math.sin(time*15));
      e.handTargets.L=[e.x+spread,1.13,e.z+.34];e.handTargets.R=[e.x-spread,1.13,e.z+.34];
    }
  }
  // No borrowed V10 waveform or fabricated lip sync in this silent preview.
  const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:9/16;
  let minX=-52,maxX=mix(-44.8,-45.7,(time-27)/3),targetZ=-99.4;
  if(scene.id==='v13-3'){minX=-52.1;maxX=mix(-45.7,-48.8,(time-55)/3);targetZ=cart[2]-.2;}
  if(scene.id==='v13-4'){minX=mix(-52,-49.05,(time-66)/6);maxX=-46.15;targetZ=-97.55;}
  const fov=36,tan=Math.tan(fov*Math.PI/360),distance=Math.max(1.35/tan,(maxX-minX)/2/(tan*safeAspect))+1;
  return {time,scene,cue,actors,extras,speaking:false,provisional:true,
    camera:{position:[(minX+maxX)/2,1.65,targetZ+distance],target:[(minX+maxX)/2,1.05,targetZ],fov},
    direction:{speaker:cue.role,partners:Object.keys(actors),kind:'v13-ensemble'},
    props:{chair:[...V13_SET.chair],cart,roll,lift,cup,hole:[...V13_SET.hole],broom:[-54,0,-104],tray:[-46.6,.77,-99.25],broomVisible:false,trayVisible:false,litter:0,clap:false},
    fadeOut:ease((time-94.8)/1.2)};
}
export function createPreviewClock(){
  let state='idle',time=0,floor=0,limit=EPISODE_DURATION,last=null;
  return {
    get state(){return state;},get active(){return state!=='idle';},get time(){return Math.max(floor,time);},
    async start(start=0,end=EPISODE_DURATION){floor=Math.max(0,start);time=floor-3;limit=Math.min(EPISODE_DURATION,end);last=null;state='playing';return true;},
    tick(now,hidden=false){if(state!=='playing'){last=null;return;}if(hidden){state='paused';last=null;return;}const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;if(dt>.5){state='paused';return;}time=Math.min(limit,time+dt);if(time>=limit)state='finished';},
    async pause(){if(state==='playing')state='paused';else if(state==='paused')state='playing';last=null;},
    seek(t){time=Math.max(floor,Math.min(limit,t));last=null;if(state==='finished')state='paused';},
    stop(){state='idle';last=null;},dispose(){this.stop();},setVolume(){},
  };
}
export function episodeCueSheet(){return ['EPISODE 002 V13 — PREVIEW VISUAL TANPA SUARA','96 detik sementara, bukan timing rekaman. Pegangan awal 3 detik.','Narator off-screen. DIIN–DAA: tekanan kedua suku kata. WKWKWK: wekawekaweka.','Tidak ada pelantikan; Bu Warung duduk untuk istirahat. Parodi rekaan.',...EPISODE_CUES.map(c=>`${c.start}–${c.end} ${c.role}: ${c.text}`)].join('\n');}
