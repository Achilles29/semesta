import timeline from '../public/audio/produksi/episode-002/release-v15/timeline.json' with {type:'json'};
import envelope from '../public/audio/produksi/episode-002/release-v15/speech-envelope.json' with {type:'json'};
export const EPISODE_DURATION=timeline.duration,EPISODE_SCENES=timeline.scenes,EPISODE_CUES=timeline.cues,EPISODE_SHOTS=timeline.shots,EPISODE_EVENTS=timeline.events;
const GROUND=.075;
export const V15_SET={chair:[-48,GROUND,-98.6],desk:[-50.4,GROUND,-96.2],chairEnd:[-50.4,GROUND,-97.15]};
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const lerp=(a,b,p)=>a+(b-a)*p,blend=(a,b,p)=>a.map((v,i)=>lerp(v,b[i],p));
const ev=EPISODE_EVENTS;
const actor=(x,z,t=0)=>({x,y:GROUND,groundY:GROUND,z,yaw:0,clip:'Idle',phase:t*.55,handTargets:{},handOrientations:{},seated:0,crouch:0,mouthOpen:0,headYaw:0,headNod:0,smile:1,visible:true});
function walk(a,end,t,start,duration){
  const p=ease((t-start)/duration),x=a.x,z=a.z;a.x=lerp(x,end[0],p);a.z=lerp(z,end[1],p);
  if(p>0&&p<1){a.clip='Walk';a.phase=(t-start)*1.15;a.yaw=Math.atan2(end[0]-x,end[1]-z)*ease((t-start)/.2)*(1-ease((t-start-duration+.2)/.2));}
}
export function localPoint(a,x,y,z){const c=Math.cos(a.yaw),s=Math.sin(a.yaw);return[a.x+x*c+z*s,a.y+y,a.z-x*s+z*c];}
function hand(a,side,target){a.handTargets[side]=target;}
function sheet(a,width=.46,height=1.13){
  const position=localPoint(a,0,height,.335);
  // Upright palms cradle the lower side edges. Fingers continue the forearm
  // rather than folding backwards at the wrist; thumbs remain in front.
  for(const side of ['L','R']){
    const sign=side==='L'?1:-1;
    hand(a,side,localPoint(a,sign*(width/2+.04),height-.09,.39));
    a.handOrientations[side]=[0,a.yaw-sign*Math.PI/2,0];
  }
  return {position,rotation:[0,a.yaw,0],owner:a};
}
export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  const scene=EPISODE_SCENES.find(s=>time>=s.start&&time<s.end)??EPISODE_SCENES.at(-1);
  const cut=EPISODE_SHOTS.find(s=>time>=s.start&&time<s.end)??EPISODE_SHOTS.at(-1);
  const actors={bahlil:actor(-48.85,-98.5,time),'mama-ghufron':actor(-46.8,-99,time),'bu-warung':actor(-45.4,-98,time),komeng:actor(-49.4,-99.4,time),
    'v15-young':actor(-52.4,-99.9,time),'v15-father':actor(-53.35,-100.05,time),'v15-leader':actor(-44.3,-99.6,time)};
  const b=actors.bahlil,g=actors['mama-ghufron'],bu=actors['bu-warung'],k=actors.komeng;
  const young=actors['v15-young'],father=actors['v15-father'],leader=actors['v15-leader'];
  // Front-facing opening: nobody spawns, slides in, or grips a chair behind their body.
  if(cue.role==='bahlil')hand(b,'R',localPoint(b,-.28,1.35,.28));
  const carryDuration=1.75,move=ease((time-ev.chair_move)/carryDuration);
  const chair=blend(V15_SET.chair,V15_SET.chairEnd,move);chair[1]=GROUND+.025*Math.sin(move*Math.PI);
  walk(k,[-48,-99.16],time,ev.chair_move-1.3,1.3);
  if(time>=ev.chair_move){
    k.x=chair[0];k.z=chair[2]-.56;k.yaw=0;
    if(move<1){k.clip='Walk';k.phase=(time-ev.chair_move)*1.3;}
    const release=ease((time-ev.chair_move-carryDuration)/.55);
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      hand(k,side,blend([chair[0]+sign*.39,1.18+chair[1],chair[2]-.29],localPoint(k,sign*.40,.93,.12),release));
    }
    if(time>ev.chair_move+carryDuration+.55){
      k.handTargets={};k.handOrientations={};
      walk(k,[-51.5,-98.1],time,ev.chair_move+carryDuration+.55,1.0);
    }
  }
  if(time>=ev.challenge){walk(b,[-50.4,-97.08],time,ev.challenge,1.45);if(time>=ev.challenge+1.45)b.yaw=0;}
  b.seated=ease((time-ev.sit)/.72);b.y=GROUND-.27*b.seated;b.smile=1-ease((time-ev.smile_drop)/.45);
  // Complaint is carried in actor-local space, then physically lowered to the desk.
  walk(bu,[-49.38,-96.18],time,ev.complaint,2.0);
  if(time>=ev.folder-.6)bu.yaw=lerp(0,-Math.PI/2,ease((time-ev.folder+.6)/.6));
  const folder=sheet(bu,.45,1.12);
  const transfer=ease((time-ev.folder)/.9);
  const deskFolder=[-49.90,.865+GROUND,-96.0];
  if(time>=ev.folder){
    folder.position=blend(localPoint(bu,0,1.12,.335),deskFolder,transfer);
    folder.rotation=[-Math.PI/2*transfer,bu.yaw*(1-transfer),0];
    // Left hand follows a fixed point on the moving paper until it rests on the
    // tabletop. Right hand releases first. No unsupported flight to the desk.
    bu.handTargets={};bu.handOrientations={};
    const retract=ease((time-ev.folder-.9)/.65);
    const [rx,ry]=folder.rotation,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
    const x=.265*cy+.055*sy,z=-.265*sy+.055*cy;
    const grip=[folder.position[0]+x,folder.position[1]-.09*cx-z*sx,folder.position[2]-.09*sx+z*cx];
    hand(bu,'L',blend(grip,localPoint(bu,.38,.95,.12),retract));
    bu.handOrientations.L=[rx,ry-Math.PI/2,0,'XYZ'];
    hand(bu,'R',blend(localPoint(bu,-.265,1.03,.39),localPoint(bu,-.38,.95,.12),ease((time-ev.folder)/.65)));
    if(retract===1){bu.handTargets={};bu.handOrientations={};}
  }
  if(time>=ev.folder+.9){
    b.headNod=.13;b.headYaw=.12;
    const p=ease((time-ev.folder-.9)/.5);
    for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      const target=[b.x+sign*.20+(side==='R'&&time>=ev.write?.025*Math.sin(time*11):0),1.065+GROUND,-96.70];
      hand(b,side,blend(localPoint(b,sign*.4,.95,.12),target,p));
      b.handOrientations[side]=[Math.PI,0,0];
    }
  }
  if(cue.role==='mama-ghufron'){
    hand(g,'L',localPoint(g,.30,1.34,.28));hand(g,'R',localPoint(g,-.30,1.25,.28));
  }else if(time>ev.complaint){g.headYaw=-.22;g.headNod=.06;}
  const photo=sheet(young,.46,lerp(1.13,1.20,ease((time-ev.photo+.25)/.45)));
  father.headYaw=.25;hand(father,'L',localPoint(father,.30,1.25,.28));
  if(cut.id==='leader'||cut.id==='committee'){hand(leader,'L',localPoint(leader,.16,1.16,.32));hand(leader,'R',localPoint(leader,-.16,1.16,.32));}
  const extras=[actor(-51.25,-99.2,time),actor(-43.3,-101,time+1),actor(-42.3,-100.6,time+2),actor(-41.3,-100.2,time+3),
    actor(-42,-102.5,time+4),actor(-41,-103.2,time+5),actor(-40,-103.9,time+6),actor(-54.3,-98.7,time+7)];
  const rules=sheet(extras[0],.39,1.10),cv=sheet(extras[7],.4,1.10);
  cv.position[2]-=.04; // The CV applicant's shorter morphed palm wraps behind the base wrist.
  const committee=ev.committee.map((start,i)=>{
    const p=ease((time-start+.65)/1.1),x=-44.7+i*.95,z=lerp(-101,-97.8,p),e=extras[i+1];
    e.x=x;e.z=z-.56;e.yaw=0;
    if(p>0&&p<1){e.clip='Walk';e.phase=(time-start+.65)*1.25;}
    for(const side of ['L','R'])hand(e,side,[x+(side==='L'?.365:-.365),1.10+GROUND,z-.29]);
    // Staggered walk-ins from the rear; no teleporting sideways with the chairs.
    return {position:[x,GROUND,z],visible:true};
  });
  const queueFolders=extras.slice(4,7).map((e,i)=>{
    walk(e,[-48.3+i,-95.8+i*.4],time,ev.write-3.6+i*.25,5.6);
    if(e.clip!=='Walk')e.yaw=-.4;
    e.headYaw=-.2;if(time>=ev.write)e.headNod=.025*Math.sin(time*1.7+i);
    const q=sheet(e,i===2?.40:.33,1.14);
    // The stocky third extra's morphed palm sits 5 cm ahead of the base wrist.
    if(i===2){q.position[0]+=.05*Math.sin(e.yaw);q.position[2]+=.05*Math.cos(e.yaw);}
    return q;
  });
  const speaking=time<cue.audio_end,frame=time*envelope.fps,index=Math.floor(frame),f=frame-index;
  const energy=(envelope.values[index]??0)*(1-f)+(envelope.values[index+1]??0)*f;
  for(const [id,a] of Object.entries(actors))if(id===cue.role&&speaking){a.mouthOpen=energy;a.headNod+=Math.sin(time*5)*.025*energy;}
  // Full-body coverage. No actor visibility cuts; the same cast stays in the space.
  // Focus point, horizontal safe half-width, key body IDs, lateral camera offset.
  const views={
    chair:[[-48.15,1,-98.5],1.35,['bahlil'],0],
    bahlil:[[b.x,1,b.z],.72,['bahlil'],0],
    establish:[[-47.8,1,-98.6],2.4,['bahlil','mama-ghufron'],0],
    cv:[[-53.35,1,-99.3],1.35,['v15-father'],0],
    photo:[[young.x-.45,1,young.z],1.2,['v15-young','v15-father'],0],
    rules:[[-51.75,1,-99.4],1.1,['v15-young'],0],
    leader:[[leader.x,1,leader.z],.75,['v15-leader'],.06],
    committee:[[-43.65,1,-98.6],1.8,['v15-leader'],-.32],
    reveal:[[-44.8,1,-98.6],3.1,['v15-leader','mama-ghufron'],0],
    gufron:[[g.x,1,g.z],.8,['mama-ghufron'],0],
    complaint:[[bu.x,1,bu.z],.8,['bu-warung'],.04],
    receipts:[[bu.x,1,bu.z],.85,['bu-warung'],.12],
    move:[[chair[0],1,chair[2]-.2],1.15,['komeng'],.15],
    challenge:[[b.x,1,b.z],1.3,['bahlil'],.12],
    sit:[[b.x,1,b.z+.25],1.25,['bahlil'],.35],
    reaction:[[b.x+.15,.95,b.z+.25],1.15,['bahlil'],.35],
    queue:[[-47.4,1,-97],3.8,['bahlil','bu-warung'],.08],
    ending:[[-49.8,1,-96.7],1.55,['bahlil','bu-warung'],.3],
  };
  const [target,halfWidth,subjects,side]=views[cut.id];
  const safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:9/16,fov=36,tan=Math.tan(fov*Math.PI/360);
  let distance=Math.max(1.24/tan,halfWidth/(tan*safeAspect))+.35;
  // Analytic perspective fit of a conservative head-to-foot envelope. This also
  // covers the approach BEFORE the grip, not just the midpoint of a still shot.
  const len=Math.hypot(side,.07,1),rightLen=Math.hypot(side,1);
  const view=[side/len,.07/len,1/len],right=[1/rightLen,0,-side/rightLen];
  const up=[view[1]*right[2],view[2]*right[0]-view[0]*right[2],-view[1]*right[0]];
  const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
  for(const id of subjects){const a=actors[id];for(const x of [-.43,.43])for(const y of [0,2.05]){
    const relative=[a.x+x-target[0],a.y+y-target[1],a.z-target[2]],depth=dot(relative,view);
    distance=Math.max(distance,(depth+Math.abs(dot(relative,right))/(tan*safeAspect*.90))/len,(depth+Math.abs(dot(relative,up))/(tan*.90))/len);
  }}
  const position=[target[0]+side*distance,target[1]+.07*distance,target[2]+distance];
  return {time,scene,cue,cut,actors,extras,speaking,provisional:false,
    camera:{position,target,fov,fullBodySubjects:subjects},direction:{speaker:cue.role,subject:subjects[0],kind:cut.id,partners:Object.keys(actors)},
    props:{chair,photo:photo.position,photoRotation:photo.rotation,rules:rules.position,rulesRotation:rules.rotation,cv:cv.position,cvRotation:cv.rotation,
      folderGripSide:time>=ev.folder?'L':'R',
      swap:ease((time-ev.rules)/.45),committee,queueFolders:queueFolders.map(q=>({position:q.position,rotation:q.rotation})),
      folder:folder.position,folderRotation:folder.rotation,folderOnDesk:transfer===1,folderTransfer:transfer,
      pen:[b.x-.20,.89,-96.76],writing:time>=ev.write,
      broom:[0,-20,0],tray:[0,-20,0],broomVisible:false,trayVisible:false,litter:0,clap:false},
    fadeOut:ease((time-(EPISODE_DURATION-.65))/.65)};
}
export function episodeCueSheet(){return [
  'EPISODE 002 V15 - '+EPISODE_DURATION.toFixed(2)+' detik / 6 rangkaian / 18 shot',
  'Full body, pembuka frontal. Parodi fiksi / dialog rekaan / suara AI.',
  'Narator ekspresi baru; dialog identik Bahlil/Gufron memakai take V13 berizin. Semua suara 1x.',
  'Spasi jeda, R ulang, panah pindah rangkaian, Esc keluar. Rekam audio tab/sistem.',
  ...EPISODE_CUES.map(c=>c.start.toFixed(2)+'-'+c.audio_end.toFixed(2)+' '+c.role+': '+c.text),
].join('\n');}
