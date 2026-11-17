import timeline from '../public/audio/produksi/episode-002/release-v16-r3/timeline.json' with {type:'json'};
import envelope from '../public/audio/produksi/episode-002/release-v16-r3/speech-envelope.json' with {type:'json'};
export const EPISODE_DURATION=timeline.duration,EPISODE_SCENES=timeline.scenes,EPISODE_CUES=timeline.cues,EPISODE_SHOTS=timeline.shots,EPISODE_EVENTS=timeline.events;
export const V16_SET={ground:.3,hole:[-47.12,-96],carStart:[-48,-103],carEnd:[-48,-97.06],ribbonZ:-94.4};
const ev=EPISODE_EVENTS,G=V16_SET.ground;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const actor=(x,z,t=0)=>({x,y:G,z,yaw:0,groundY:G,clip:'Idle',phase:t*.65,handTargets:{},handOrientations:{},mouthOpen:0,headYaw:0,headNod:0,smile:1,visible:true});
export function localPoint(a,x,y,z){const c=Math.cos(a.yaw),s=Math.sin(a.yaw);return[a.x+x*c+z*s,a.y+y,a.z-x*s+z*c];}
function walk(a,points,t,start,end){
  const u=clamp((t-start)/(end-start))*(points.length-1),i=Math.min(points.length-2,Math.floor(u)),f=u-i;
  a.x=lerp(points[i][0],points[i+1][0],f);a.z=lerp(points[i][1],points[i+1][1],f);
  if(t>start&&t<end){a.yaw=Math.atan2(points[i+1][0]-points[i][0],points[i+1][1]-points[i][1]);a.clip='Walk';a.phase=(t-start)*1.25;}
}
function gesture(a,side,x,y,z){a.handTargets[side]=localPoint(a,x,y,z);}
function clap(a,t){const width=.09+.17*(.5+.5*Math.sin(t*14));gesture(a,'L',width,1.22,.34);gesture(a,'R',-width,1.22,.34);}
export function sampleEpisode(seconds,aspect=9/16){
  const time=Math.max(0,Math.min(EPISODE_DURATION,Number(seconds)||0));
  const cue=EPISODE_CUES.find(c=>time>=c.start&&time<c.end)??EPISODE_CUES.at(-1);
  const scene=EPISODE_SCENES.find(c=>time>=c.start&&time<c.end)??EPISODE_SCENES.at(-1);
  const cut=EPISODE_SHOTS.find(c=>time>=c.start&&time<c.end)??EPISODE_SHOTS.at(-1),n=Number(cut.id.split('-')[1]);
  const actors={bahlil:actor(-49.2,-102.6,time),'mama-ghufron':actor(-48.6,-94.85,time),'bu-warung':actor(-45.9,-95.7,time),komeng:actor(-47.15,-91,time)};
  const b=actors.bahlil,g=actors['mama-ghufron'],bu=actors['bu-warung'],photographer=actors.komeng;
  // Leave the parked vehicle through its open door; walk outside the pothole.
  b.visible=time>=ev.arrival;
  walk(b,[[-49.2,-102.6],[-49.15,-98.7],[-49.15,-94.85]],time,ev.arrival,ev.scissors);
  if(time>=ev.shuffle)walk(b,[[-49.15,-94.85],[-47.12,-94.85]],time,ev.shuffle,ev.photo);
  if(time>=ev.proof+.25){
    walk(b,[[-47.12,-94.85],[-49.25,-95.1],[-49.25,-102.6]],time,ev.proof+.25,ev.drive);
    b.visible=time<ev.drive;
  }
  const drive=ease((time-ev.drive)/(ev.impact-ev.drive));
  const carZ=lerp(V16_SET.carStart[1],V16_SET.carEnd[1],drive),dip=ease((time-ev.impact)/.22);
  if(time>=ev.exit){
    b.visible=true;walk(b,[[-49.25,carZ+.25],[-49.25,carZ-1.7],[-48.45,carZ-2.05]],time,ev.exit,ev.push);b.yaw=0;
  }
  if(time>=ev.push){
    b.x=-48.45;b.z=carZ-2.05;b.headNod=.18;b.smile=0;
    gesture(b,'L',.23,1.05,.31);gesture(b,'R',-.23,1.05,.31);
    b.clip='Walk';b.phase=time*.75;
  }else if(time>=ev.scissors&&time<ev.proof+.25){
    gesture(b,'R',-.26,1.14,.34);gesture(b,'L',.25,1.10,.33);
    if(time>=ev.cut&&time<ev.cut+.5)b.headNod=.08;
  }
  // The mother steps around the same hole and lifts the muddy sandal as evidence.
  if(time<2.5){walk(bu,[[-46.5,-96.4],[-45.9,-95.7]],time,0,2.5);bu.headNod=.15;}
  gesture(bu,'L',.31,.98,.20);gesture(bu,'R',-.28,time>=ev.proof?1.34:1.0,.20);bu.smile=0;
  if(time>=ev.question&&time<ev.shuffle){g.headYaw=-.35;gesture(g,'R',-.35,1.05,.35);}
  if((time>=ev.cut&&time<ev.proof)||(time>=ev.clap))clap(g,time);
  else if(cue.role==='mama-ghufron'){gesture(g,'L',.34,1.20,.30);g.headYaw=.1;}
  // The invitation belongs to the residents. Stop endless applause; acknowledge
  // the viewer and gesture toward the actual unresolved road, without teleporting.
  if(time>=ev.warga){
    g.handTargets={};g.headYaw=.06*Math.sin(time*1.4);g.headNod=.03*Math.sin(time*2);
    if(time<ev.choice){gesture(g,'L',.38,1.18,.30);gesture(g,'R',-.30,1.04,.30);}
    else if(time<ev.proposal){g.headYaw=-.18;gesture(g,'R',-.32,1.02,.30);}
    else{gesture(g,'L',.37,1.15,.30);}
  }
  photographer.x=-43.5;photographer.z=-97.5;photographer.yaw=-.9;
  gesture(photographer,'L',.15,1.47,.30);gesture(photographer,'R',-.15,1.47,.30);
  const extras=[actor(-50.1,-95.4,time),actor(-45,-94.9,time+1),actor(-50.9,-98.5,time+2),actor(-44.6,-99.3,time+3),actor(-51.5,-103,time+4),actor(-44.3,-103.5,time+5),actor(-52,-106,time+6),actor(-44,-107,time+7)];
  // A second pusher comes from the roadside; no cast member teleports.
  if(time>=ev.exit)walk(extras[2],[[-50.9,-98.5],[-50,-99.2],[-47.55,carZ-2.05]],time,ev.exit,ev.push);
  if(time>=ev.push){const e=extras[2];e.x=-47.55;e.z=carZ-2.05;e.yaw=0;gesture(e,'L',.23,1.05,.31);gesture(e,'R',-.23,1.05,.31);e.clip='Walk';e.phase=time*.75;}
  for(const [i,e] of extras.entries()){
    if(i!==2){e.headYaw=.12*Math.sin(time*.7+i);e.headNod=.025*Math.sin(time*1.6+i);}
    if(time>=ev.clap&&time<ev.warga&&i!==2)clap(e,time+i*.17);
    else if(time>=ev.cut&&time<ev.proof&&i<2)clap(e,time+i*.17);
    if(time>=ev.warga&&i!==2){e.headYaw=.07*Math.sin(time*.9+i);if(i<2)gesture(e,i===0?'L':'R',i===0?.28:-.28,1.1,.28);}
  }
  const frame=time*envelope.fps,index=Math.floor(frame),f=frame-index;
  const energy=(envelope.values[index]??0)*(1-f)+(envelope.values[index+1]??0)*f;
  const speaking=time<cue.audio_end;
  if(actors[cue.role]&&speaking){actors[cue.role].mouthOpen=energy;actors[cue.role].headNod+=Math.sin(time*7)*energy*.035;}
  let subjects=n<=3?['bu-warung']:n<=6?['bahlil','mama-ghufron']:n<=8?['mama-ghufron','bahlil']:n<=12?['bahlil','mama-ghufron','bu-warung']:n<=14?[]:['bahlil','mama-ghufron'];
  subjects=subjects.filter(id=>actors[id].visible);
  if(n===2)subjects=[];
  if(n>=16)subjects=['bahlil'];
  let target=n<=3?[-47.5,1.0,-96]:n<=12?[-47.6,1.25,-94.8]:[-48,1.15,carZ];
  if(n===2)target=[-52.2,1.6,-98.8];
  if(n>=16)target=[-48,1.15,carZ-.8];
  let side=n===1||n===3?.6:n===4?-.4:n===14?.8:n>=15?-.45:0;
  if(n>=16)side=1.1; // East rear angle keeps the ceremony stage out of the pushers' sightline.
  if(n>=18){
    subjects=['mama-ghufron','bu-warung'];target=[-47.4,1.15,-95.4];side=.08;
    if(n===20){target=[-47.7,1.15,-96.3];side=-.18;}
    if(n===21){target=[-47.4,.95,-95.7];side=.24;}
    if(n===22){target=[-47.4,1.15,-95.4];side=-.08;}
    if(n===23){target=[-49.4,1.35,-97.2];side=.16;}
  }
  let fov=38,tan=Math.tan(fov*Math.PI/360),safeAspect=Number.isFinite(aspect)&&aspect>0?aspect:9/16,distance=4;
  const points=[];
  for(const id of subjects){const a=actors[id];for(const dx of [-.5,.5])for(const dy of [0,2.05])points.push([a.x+dx,a.y+dy,a.z]);}
  if(n===1||n===3)points.push([-48.1,G,-97.2],[-46.3,G,-94.9]);
  if(n===2)for(const x of [-54.8,-50.8])for(const y of [G,G+3.4])points.push([x,y,-99]);
  if(n>=16&&n<18)for(const x of [-48.1,-47.1])for(const y of [G,G+2.05])points.push([x,y,carZ-2.05]);
  if(n===4||(n>=13&&n<18)){for(const x of [-49,-47])for(const z of [carZ-1.8,carZ+1.8])for(const y of [G,G+1.8])points.push([x,y,z]);}
  if(n>=18)points.push([-48,G,-97.1],[-46.25,G,-94.9]);
  if(n===23)for(const x of [-54.8,-50.8])for(const y of [G,G+3.4])points.push([x,y,-99]);
  // Fit real full-body bounds in both portrait and landscape, never a fixed face zoom.
  const slope=n===10?.02:.19,forward=n>=16&&n<18?-1:1,len=Math.hypot(side,slope,1),rlen=Math.hypot(side,1),view=[side/len,slope/len,forward/len],right=[forward/rlen,0,-side/rlen];
  const up=[view[1]*right[2],view[2]*right[0]-view[0]*right[2],-view[1]*right[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  for(const p of points){const rel=p.map((x,i)=>x-target[i]),depth=dot(rel,view);distance=Math.max(distance,(depth+Math.abs(dot(rel,right))/(tan*safeAspect*.87))/len,(depth+Math.abs(dot(rel,up))/(tan*.87))/len);}
  return{time,cue,scene,cut,actors,extras,speaking,provisional:false,
    camera:{fov,position:[target[0]+side*distance,target[1]+slope*distance,target[2]+forward*distance],target,fullBodySubjects:subjects},
    props:{car:[-48,G-.09*dip,carZ],carTilt:.055*dip,drive,dip,door:(time>=ev.arrival&&time<ev.arrival+.75)||(time>=ev.drive-.7&&time<ev.drive)||(time>=ev.exit&&time<ev.exit+.65),ribbonCut:ease((time-ev.cut)/.28),scissors:time>=ev.scissors&&time<ev.proof+.25,flash:Math.max(0,1-Math.abs(time-(ev.photo+.7))/.08)},
    fadeOut:ease((time-(EPISODE_DURATION-.65))/.65)};
}
export function episodeCueSheet(){return ['V16 — Jalannya Rusak, Acaranya Mulus',EPISODE_DURATION.toFixed(2)+' detik. Parodi fiksi / dialog rekaan / suara AI.','Narator Jemmy: upbeat. Bahlil dan Gufron: clone berizin. Semua audio 1x.','Caption publikasi: Follow jadi warga Republik WKWKWK.',...EPISODE_CUES.map(c=>`${c.start.toFixed(2)}–${c.audio_end.toFixed(2)} ${c.role}: ${c.text}`)].join('\n');}
