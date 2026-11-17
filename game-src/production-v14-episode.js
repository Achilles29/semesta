import timeline from '../public/audio/produksi/episode-002/release-v14/timeline.json' with {type:'json'};
import envelope from '../public/audio/produksi/episode-002/release-v14/speech-envelope.json' with {type:'json'};

export const EPISODE_DURATION=timeline.duration;
export const EPISODE_SCENES=timeline.scenes;
export const EPISODE_CUES=timeline.cues;
export const EPISODE_SHOTS=timeline.shots;
export const EPISODE_EVENTS=timeline.events;
export const V14_SET={chair:[-48,0,-98.6],desk:[-48,0,-96.2],chairEnd:[-48,0,-97.15]};
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const lerp=(a,b,p)=>a+(b-a)*p;
const blend=(a,b,p)=>a.map((v,i)=>lerp(v,b[i],p));
const ev=EPISODE_EVENTS;
const actor=(x,z,t=0)=>({x,y:0,z,yaw:0,clip:'Idle',phase:t*.55,handTargets:{},seated:0,crouch:0,mouthOpen:0,headYaw:0,headNod:0,smile:1});
function walk(a,end,t,start,duration){
  const p=ease((t-start)/duration),x=a.x,z=a.z;
  a.x=lerp(x,end[0],p);a.z=lerp(z,end[1],p);
  if(p>0&&p<1){a.clip='Walk';a.phase=(t-start)*1.15;a.yaw=Math.atan2(end[0]-x,end[1]-z);}
}
function aimHand(a,side,target){a.handTargets[side]=target;}

export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  const scene=EPISODE_SCENES.find(s=>time>=s.start&&time<s.end)??EPISODE_SCENES.at(-1);
  const cut=EPISODE_SHOTS.find(s=>time>=s.start&&time<s.end)??EPISODE_SHOTS.at(-1);
  const actors={bahlil:actor(-48.55,-98.5,time),'mama-ghufron':actor(-46.4,-98.9,time),
    'bu-warung':actor(-46.7,-96.9,time),komeng:actor(-48.6,-99.5,time),
    'v14-young':actor(-50.7,-99.9,time),'v14-father':actor(-51.5,-100.05,time),'v14-leader':actor(-44.3,-99.6,time)};
  const b=actors.bahlil,g=actors['mama-ghufron'],bu=actors['bu-warung'],k=actors.komeng;
  const young=actors['v14-young'],father=actors['v14-father'],leader=actors['v14-leader'];
  const move=ease((time-ev.chair_move)/1.65),chair=blend(V14_SET.chair,V14_SET.chairEnd,move);
  chair[1]=.035*Math.sin(move*Math.PI);
  // Cold-open hand grip, followed by a confident free-hand gesture.
  if(time<EPISODE_CUES[2].end)aimHand(b,'L',[-48.28,1.20,-98.83]);
  if(cue.role==='bahlil')aimHand(b,'R',[b.x-.28,1.29,b.z+.32]);
  if(time>=ev.challenge){walk(b,[-48,-97.2],time,ev.challenge,.95);if(time>=ev.challenge+.95)b.yaw=0;}
  b.seated=ease((time-ev.sit)/.72);b.y=-.27*b.seated;
  b.smile=1-ease((time-ev.smile_drop)/.45);
  if(time>=ev.folder){
    b.headNod=.13;b.headYaw=.12;
    aimHand(b,'L',[-47.83,.91,-96.72]);
    aimHand(b,'R',[-48.18+(time>=ev.write?.035*Math.sin(time*13):0),.89,-96.72]);
  }
  // Prop-carry paths stay short, with continuous hand attachment.
  walk(k,[-48.12,-99.1],time,ev.chair_move-.8,.7);
  if(time>=ev.chair_move-.1&&time<ev.chair_move+1.75){
    k.x=chair[0]-.12;k.z=chair[2]-.52;k.yaw=0;k.clip='Walk';k.phase=time*1.2;
    aimHand(k,'L',[chair[0]+.20,1.20+chair[1],chair[2]-.27]);
    aimHand(k,'R',[chair[0]-.24,1.20+chair[1],chair[2]-.27]);
  }
  if(time>=ev.chair_move+1.75){k.x=-49.0;k.z=-97.7;k.yaw=.45;}
  walk(bu,[-46.9,-96.05],time,ev.complaint,.8);
  if(time>=ev.folder){bu.yaw=-Math.PI/2;bu.headNod=.04;}
  const folderHand=[bu.x-.20,1.16,bu.z+.27];
  if(time<ev.folder){aimHand(bu,'R',folderHand);aimHand(bu,'L',[bu.x+.19,1.16,bu.z+.27]);}
  else aimHand(bu,'R',[-47.28,1.02,-96.20]);
  if(cue.role==='mama-ghufron'){
    aimHand(g,'L',[g.x+.28,1.31,g.z+.32]);aimHand(g,'R',[g.x-.28,1.25,g.z+.32]);
  }else if(time>ev.complaint){g.headYaw=-.22;g.headNod=.06;}
  const photoLift=ease((time-ev.photo+.25)/.45);
  const photo=[young.x,lerp(1.02,1.29,photoLift),young.z+.28];
  aimHand(young,'L',[photo[0]+.23,photo[1]-.11,photo[2]]);aimHand(young,'R',[photo[0]-.23,photo[1]-.11,photo[2]]);
  father.headYaw=.25;
  aimHand(father,'L',[father.x+.29,1.25,father.z+.3]);
  if(cut.id==='leader'||cut.id==='committee'){
    aimHand(leader,'L',[leader.x+.08,1.18,leader.z+.32]);aimHand(leader,'R',[leader.x-.08,1.18,leader.z+.32]);
    leader.headNod=.035*Math.sin(time*3);
  }
  const extras=[actor(-50.05,-98.7,time),actor(-43.3,-101,time+1),actor(-42.3,-100.6,time+2),actor(-41.3,-100.2,time+3),
    actor(-45.7,-96.1,time+4),actor(-44.7,-96.4,time+5),actor(-44,-97.5,time+6),actor(-52.1,-98.7,time+7)];
  const clerk=extras[0];clerk.yaw=-.45;
  const swap=ease((time-ev.rules)/.45);
  aimHand(clerk,'R',[clerk.x-.24,1.13,clerk.z+.29]);clerk.headYaw=time>=ev.photo?-.35:0;
  const committee=ev.committee.map((start,i)=>{
    const p=ease((time-start+.65)/.9),x=-46.3+i*.85,z=lerp(-101,-97.8,p);
    const e=extras[i+1];e.x=x;e.z=z-.6;e.yaw=0;
    if(p>0&&p<1){e.clip='Walk';e.phase=(time-start+.65)*1.25;}
    if(time<ev.chair_move){aimHand(e,'L',[x+.2,1.10,z-.27]);aimHand(e,'R',[x-.2,1.10,z-.27]);}
    const clear=ease((time-ev.chair_move+1)/1);
    return {position:[x+clear*2.1,0,z],visible:time>=start-.65};
  });
  // The three panitia step aside along with their chairs, keeping the aisle open.
  for(let i=1;i<=3;i++){
    const e=extras[i],p=ease((time-ev.chair_move+1)/1);e.x+=p*2.1;
    for(const target of Object.values(e.handTargets))target[0]+=p*2.1;
    if(p>0&&p<1){e.clip='Walk';e.yaw=0;e.phase=time*1.25;}
    if(time>=ev.chair_move+.1)e.yaw=-.2;
  }
  extras[7].headYaw=.3;
  aimHand(extras[7],'L',[-51.71,1.14,-98.39]);aimHand(extras[7],'R',[-52.09,1.14,-98.39]);
  for(let i=4;i<7;i++){
    const e=extras[i];e.yaw=-.55;e.headYaw=-.25;
    if(time>=ev.write){e.headNod=.025*Math.sin(time*1.7+i);}
    aimHand(e,'R',[e.x-.2,1.03,e.z+.27]);
  }
  const speaking=time<cue.audio_end;
  const frame=time*envelope.fps,index=Math.floor(frame),f=frame-index;
  const energy=(envelope.values[index]??0)*(1-f)+(envelope.values[index+1]??0)*f;
  for(const [id,a] of Object.entries(actors))if(id===cue.role&&speaking){a.mouthOpen=energy;a.headNod+=Math.sin(time*5)*.025*energy;}

  // Hard editorial cuts; each frame is deterministic on seek/replay.
  // target, horizontal half-width, vertical half-height, camera offset, key subject.
  const views={
    chair:[[-48.08,.87,-98.6],.42,.48,[.75,.35,1],'chair'],
    bahlil:[[b.x,1.48,b.z],.34,.40,[.15,.08,1],'bahlil'],
    establish:[[-48.3,1.1,-98.5],3.5,1.2,[0,.15,1],'ensemble'],
    cv:[[-51.5,1.15,-98.6],.63,.58,[0,.10,1],'clerk'],
    photo:[[young.x,1.36,young.z+.2],.43,.44,[0,.08,1],'photo'],
    rules:[[clerk.x-.22,1.15,clerk.z+.3],.27,.26,[0,.12,1],'rules'],
    leader:[[leader.x,1.43,leader.z],.38,.43,[.1,.05,1],'v14-leader'],
    committee:[[-45.1,1.05,-98.1],1.65,1.1,[.8,.28,.75],'committee'],
    reveal:[[-46,1.05,-98.1],3,1.15,[0,.22,1],'committee'],
    gufron:[[g.x,1.46,g.z],.35,.43,[0,.07,1],'mama-ghufron'],
    complaint:[[bu.x,1.37,bu.z],.6,.65,[.12,.08,1],'bu-warung'],
    receipts:[[bu.x,1.17,bu.z+.3],.29,.29,[0,.12,1],'folder'],
    move:[[-48.3,1.05,chair[2]-.2],.95,1.05,[-.4,.14,1],'chair'],
    challenge:[[-48,1.1,-97.1],1.45,1.1,[0,.12,1],'bahlil'],
    sit:[[b.x,1.05,b.z],.7,.9,[-.3,.12,1],'bahlil'],
    reaction:[[b.x,1.36,b.z],.45,.43,[-.2,.08,1],'bahlil'],
    queue:[[-46.8,1.14,-96.5],2.3,1.02,[-.3,.18,1],'ensemble'],
    ending:[[-47.4,1.10,-96.7],1.7,1.05,[-.25,.12,1],'ensemble'],
  };
  const [target,halfWidth,halfHeight,offset,subject]=views[cut.id];
  // Coverage masks keep out-of-shot foreground bodies from covering an insert.
  // This only changes cinematic visibility, never world positions or saved NPCs.
  const coverage={
    chair:[['bahlil','komeng'],[]],bahlil:[['bahlil','mama-ghufron'],[]],
    cv:[['v14-father'],[7]],photo:[['v14-young','v14-father'],[]],rules:[['v14-young','v14-father'],[0]],
    leader:[['v14-leader'],[]],committee:[['v14-leader'],[1,2,3]],reveal:[['bahlil','mama-ghufron','v14-leader'],[1,2,3]],
    gufron:[['mama-ghufron'],[]],complaint:[['bu-warung','mama-ghufron'],[4,5,6]],receipts:[['bu-warung'],[]],
    move:[['bahlil','komeng','mama-ghufron'],[]],reaction:[['bahlil'],[]],
  }[cut.id];
  for(const [id,a] of Object.entries(actors))a.visible=!coverage||coverage[0].includes(id);
  extras.forEach((e,i)=>{e.visible=!coverage||coverage[1].includes(i);});
  const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:9/16,fov=36,tan=Math.tan(fov*Math.PI/360);
  const d=Math.max(halfHeight/tan,halfWidth/(tan*safeAspect))+.18;
  const position=target.map((v,i)=>v+offset[i]*d);
  return {time,scene,cue,cut,actors,extras,speaking,provisional:false,
    camera:{position,target,fov},direction:{speaker:cue.role,subject,kind:cut.id,partners:Object.keys(actors)},
    props:{chair,photo,swap,committee,folder:time<ev.folder?[bu.x,1.16,bu.z+.3]:[-48,.86,-96.62],folderOnDesk:time>=ev.folder,
      pen:[-48.18+(time>=ev.write?.035*Math.sin(time*13):0),.9,-96.72],writing:time>=ev.write,
      broom:[0,-20,0],tray:[0,-20,0],broomVisible:false,trayVisible:false,litter:0,clap:false},
    fadeOut:ease((time-(EPISODE_DURATION-.65))/.65)};
}
export function episodeCueSheet(){return [
  `EPISODE 002 V14 — ${EPISODE_DURATION.toFixed(2)} detik / 6 rangkaian / 18 shot`,
  'Mau Kursinya? Ini Kerjaannya. Parodi fiksi / dialog rekaan / suara AI.',
  'Narator baru; dialog identik Bahlil/Gufron memakai take clone V13 berizin. Suara 1x.',
  'Narator off-screen; mulut pembicara mengikuti RMS, bukan fonem.',
  'Spasi jeda, R ulang, panah pindah rangkaian, Esc keluar. Rekam audio tab/sistem.',
  ...EPISODE_CUES.map(c=>`${c.start.toFixed(2)}–${c.audio_end.toFixed(2)} ${c.role}: ${c.text}`),
].join('\n');}
