import timeline from '../public/audio/produksi/episode-002/release-v10/timeline.json' with {type:'json'};
import {directPerformance} from './production-performance.js';
export const EPISODE_DURATION=timeline.duration;
export const LEAD_IN=3;
export const EPISODE_SCENES=timeline.scenes;
const castId=id=>id==='ghufron'?'mama-ghufron':id;
export const EPISODE_CUES=timeline.cues.map(c=>({...c,role:castId(c.role),recipient:castId(c.recipient),text:c.display_text??c.spoken_text}));
const beats=Object.fromEntries(EPISODE_CUES.map(c=>[c.beat,c]));
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*ease(t);
export const V10_SET=Object.freeze({chair:[-49.1,0,-98.7],valve:[-47.35,1.1,-99.48],tap:[-45.6,1.02,-98.85]});

// Every state is sampled from audio time, including all crowd poses and water.
// Seeking backwards never leaves a seated actor or running tap from a later shot.
export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const scene=EPISODE_SCENES.find(s=>time>=s.start&&time<s.end)??EPISODE_SCENES.at(-1);
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  const speaking=time<cue.audio_end,actors={};
  for(const [id,x,z] of [['pemandu',-50,-100],['bahlil',-49,-100],['komeng',-48.05,-100.7],['bu-warung',-47.05,-100.1],['mama-ghufron',-46.15,-100.3],['pak-sandal',-45,-99.7]]){
    actors[id]={x,y:0,z,yaw:0,clip:'Idle',phase:time*.72,handTargets:{},seated:0};
  }
  const host=actors['bu-warung'],b=actors.bahlil,g=actors['mama-ghufron'];
  const valveStart=beats.open_valve.audio_end,waterStart=valveStart+1.2;
  const voteStart=beats.credit_payoff.audio_end+.2;
  const sitStart=beats.declare_winner.audio_end;
  const carryStart=beats.work_not_spoils.audio_end;
  // Reaching the valve is prepared while others talk; no teleport at the reveal.
  const approach=clamp((time-beats.applause_payoff.start)/1.5);
  host.x=lerp(-47.05,-47,approach);host.z=lerp(-100.1,-99.85,approach);
  if(approach>0&&approach<1){host.clip='Walk';host.phase=(time-beats.applause_payoff.start)*.6;}
  const valveTurn=ease((time-valveStart)/1.2);
  if(time>=beats.open_valve.start&&time<waterStart+.9){
    host.clip='Idle';host.handTargets.R=[V10_SET.valve[0],V10_SET.valve[1]+.06*Math.sin(valveTurn*Math.PI),V10_SET.valve[2]+.025];
  }
  if(time>=sitStart){
    const walk=clamp((time-sitStart)/2.8);
    host.x=lerp(-47,V10_SET.chair[0],walk);
    host.z=lerp(-99.85,V10_SET.chair[2]-.1,walk);
    host.clip=walk<1?'Walk':'Idle';host.phase=(time-sitStart)*.75;
    host.seated=ease((time-sitStart-2.8)/.7);host.y=-.27*host.seated;
    host.handTargets={};
  }
  // The chair belongs to Bu Warung after the vote, not to a random customer.
  const chair=[...V10_SET.chair];
  let bucket=[-49.37,0,-99.62],helperBucket=[-46.48,0,-99.93];
  const helperStart=beats.ask_applause.audio_end+.5;
  if(time>=helperStart-.4&&time<helperStart)g.crouch=ease((time-helperStart+.4)/.4);
  if(time>=beats.ask_applause.audio_end+.5){
    const p=ease((time-beats.ask_applause.audio_end-.5)/1);
    g.crouch=1-p;
    helperBucket[1]=p*.37;g.handTargets.R=[helperBucket[0],helperBucket[1]+.60,helperBucket[2]];
  }
  if(time>=carryStart-.4&&time<carryStart)b.crouch=ease((time-carryStart+.4)/.4);
  if(time>=carryStart){
    const p=ease((time-carryStart)/1.4);
    b.crouch=1-p;
    bucket[1]=p*.37;b.handTargets.R=[bucket[0],bucket[1]+.60,bucket[2]];
  }
  for(const a of [b,g])if(a.crouch){a.y=-.32*a.crouch;a.z+=.12*a.crouch;}
  const extras=Array.from({length:8},(_,i)=>{
    const x=[-44.7,-44.4,-45.6,-46.8,-48.2,-50.5,-51.7,-43.5][i];
    const z=[-100,-101.1,-102.8,-103.2,-103.5,-102.5,-104,-103][i];
    const a={x,y:0,z,yaw:0,clip:'Idle',phase:time*.6+i*.4,handTargets:{},vote:0};
    const vote=ease((time-voteStart-i*.11)/.6)*(1-ease((time-sitStart-.2-i*.08)/.7));
    a.vote=vote;
    a.handTargets.L=[x+.3,1.0,z+.3];
    if(vote>.01)a.handTargets.R=[x-.28,1.12+vote*.42,z+.28];
    return a;
  });
  const water=ease((time-waterStart)/.25);
  const crowdBuckets=extras.map(a=>[a.x+.3,.4,a.z+.3]);
  // First resident visibly fills the bucket directly below the spout.
  const fill=ease((time-waterStart-.2)/1);
  extras[0].x=lerp(-44.7,-45.3,fill);extras[0].z=lerp(-100,-98.99,fill);
  extras[0].handTargets.L=[extras[0].x+.28,1.08+extras[0].vote*.46,extras[0].z+.28];
  extras[0].handTargets.R=[extras[0].x-.30,1,extras[0].z+.3];
  crowdBuckets[0]=[extras[0].x-.30,.4,extras[0].z+.3];
  if(cue.beat==='ask_applause'){
    const lift=.08*Math.sin(Math.PI*clamp((time-cue.start)/.5));
    for(let i=1;i<extras.length;i++){extras[i].handTargets.L[1]+=lift;crowdBuckets[i][1]+=lift;}
  }
  if(['check_before_seat','verification_satire'].includes(cue.beat))actors.pemandu.handTargets.L=[actors.pemandu.x+.31,1.08,actors.pemandu.z+.3];
  const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:9/16;
  const performance=directPerformance({time,cue,actors,speaking,aspect:safeAspect});
  // Camera composes the actual task, not just a sequence of talking heads.
  let partners=performance.direction.partners,kind=performance.direction.kind,focus=null;
  if(cue.beat==='vacancy_promise'){partners=['pemandu','bahlil','bu-warung'];focus=[-48.6,1.25,-99.5];kind='establishing';}
  if(['open_test','form_committee','service_claim'].includes(cue.beat)){partners=[cue.role,'bu-warung','mama-ghufron'];kind='ensemble';}
  if(cue.beat==='open_valve'){partners=['bu-warung','mama-ghufron'];focus=[-46.55,1,-99.45];kind='water-proof';}
  if(['credit_payoff','declare_winner'].includes(cue.beat)){partners=[cue.role,'bu-warung','bahlil'];kind='decision';}
  if(['accept_and_serve','citizen_challenge','ask_allocation','work_not_spoils'].includes(cue.beat)){partners=[cue.role,'bu-warung','bahlil'];kind='resolved-chair';}
  partners=[...new Set(partners)];
  const points=partners.map(id=>actors[id]);
  let minX=Math.min(...points.map(a=>a.x))-.48,maxX=Math.max(...points.map(a=>a.x))+.48;
  if(focus){minX=Math.min(minX,focus[0]-.6);maxX=Math.max(maxX,focus[0]+.6);}
  if(kind==='water-proof')maxX=Math.max(maxX,V10_SET.tap[0]+.65);
  if(kind==='decision'||kind==='resolved-chair'||kind==='establishing')minX=Math.min(minX,chair[0]-.5);
  const x=(minX+maxX)/2,z=Math.max(...points.map(a=>a.z),focus?.[2]??-Infinity);
  const targetY=1.03,halfWidth=(maxX-minX)/2,fov=36,tan=Math.tan(fov*Math.PI/360);
  const distance=Math.max(1.2/tan,halfWidth/(tan*safeAspect))+.65;
  return {time,scene,cue,actors,extras,speaking,
    camera:{position:[x,targetY+.25,z+distance],target:[x,targetY,z],fov},
    direction:{...performance.direction,partners,kind},
    props:{chair,broom:[-52,0,-103],tray:[-46.6,.77,-99.25],broomVisible:false,trayVisible:false,litter:0,clap:false,
      valveTurn,water,bucket,helperBucket,crowdBuckets,vote:time>=voteStart&&time<sitStart+1},
    fadeOut:ease((time-(EPISODE_DURATION-1.1))/1.1)};
}
export function createEpisodeClock(){
  let state='idle',time=0,last=null,limit=EPISODE_DURATION,floor=0;
  return {
    get state(){return state;},get time(){return Math.max(floor,time);},get active(){return state!=='idle';},
    start(start=0,end=EPISODE_DURATION){floor=Math.max(0,start);time=floor-LEAD_IN;limit=Math.min(EPISODE_DURATION,end);last=null;state='playing';},
    tick(now,hidden=false){if(state==='idle')return;if(hidden){last=null;return;}const dt=last===null?0:Math.max(0,(now-last)/1000);last=now;if(dt>.5){state='paused';return;}if(state==='playing'){time=Math.min(limit,time+dt);if(time>=limit)state='finished';}},
    pause(){if(state==='playing')state='paused';else if(state==='paused')state='playing';last=null;},
    seek(seconds){time=Math.max(floor,Math.min(limit,seconds));last=null;if(state==='finished')state='paused';},
    stop(){state='idle';last=null;},
  };
}
export function episodeCueSheet(){
  return ['EPISODE 002 V10 — '+EPISODE_SCENES.length+' ADEGAN / '+EPISODE_DURATION.toFixed(2)+' DETIK',
    'Play: dialog lengkap + musik orisinal + efek. Pegangan awal 3 detik di luar durasi master.',
    'Bahlil/Ghufron: clone berizin. Komeng: suara parodi generik V3 yang disetujui.',
    'Spasi jeda/lanjut, R ulang, panah kiri/kanan adegan, Esc keluar.',
    'Rekam audio tab/sistem. Jangan tumpuk VO/master tambahan. Game tidak mengekspor video.',
    'Mulut mengikuti energi rekaman; belum lip-sync fonem. Tambahkan PARODI FIKSI / suara AI saat editing.',
    ...EPISODE_SCENES.flatMap(s=>[s.start.toFixed(2)+'–'+s.end.toFixed(2)+' '+s.name,
      ...EPISODE_CUES.filter(c=>c.scene===Number(s.id.slice(-1))).map(c=>c.start.toFixed(2)+'–'+c.audio_end.toFixed(2)+' '+c.role+': '+c.text)])].join('\n');
}
