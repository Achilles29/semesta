import {STORY_CLIPS} from './production-audio-catalog.js';
import {displaySpeechText} from './production-speech-text.js';
import {STORY_HOMES,storyHomeGround} from './citizen-story-homes.js';
import script from './production-day3-script.json' with {type:'json'};
import {CIVIC_FACILITIES,facilityById,facilityEntry,developmentGroundHeight as ground} from './civic-development-layout.js';
import {markBuiltInEpisode} from './production-episode-origin.js';
export const DAY3_TITLE=script.title;
export const DAY3_SCRIPT=script;
const F=(target,width,azimuth=.1,elevation=.3)=>({target,width,azimuth,elevation});
const M=(type,from,to,hold=.12)=>({...from,motion:{type,from,to,hold}});
const home=name=>STORY_HOMES.find(h=>h.name.toLowerCase()===name);

export function day3Scenario(){
  const positions={pasca:[-5,-.1],climenzo:[-5,3],eqa:[-7,3.2],cecil:[-3,3.2],xel:[0,4],demian:[-2,5],sari:[-4,5],ardhy:[2,5]};
  const cast=Object.entries(script.actors).filter(([id])=>id!=='narrator').map(([id,a])=>({id,name:a.name,preset:a.preset,role:id==='pasca'?'Presiden':'Warga',position:positions[id]||[1,6],height:id==='pasca'?.6:0,yaw:id==='pasca'?0:Math.PI}));
  const scenario={version:1,episode:'day3',day:3,title:DAY3_TITLE,notice:'DAY 3 · UANGNYA WARGA, JASANYA PRESIDEN',kind:'episode',set:'development',props:[],cast,template:'republic-series',shots:[]};
  const progress=Object.fromEntries(CIVIC_FACILITIES.map(f=>[f.id,0]));let homes=0,musicOffset=0;
  for(const row of script.shots){
    const clip=STORY_CLIPS[row.audioKey];
    const duration=clip?Math.max(row.minDuration||1.45,clip.duration+.24):row.duration;
    const actors=Object.fromEntries(cast.map(c=>[c.id,{action:'Idle',visible:false}]));
    let frame=F([-5,2,1],7,.2,.17),panel;
    const development={facilities:{...progress},homes};
    const show=(id,at,opts={})=>{actors[id]={action:'Idle',visible:true,at,height:ground(...at),yaw:0,expression:'neutral',lookAt:'camera',...opts};};
    const face=(id,other)=>{const a=actors[id],b=actors[other];a.yaw=Math.atan2(b.at[0]-a.at[0],b.at[1]-a.at[1]);a.lookAt=other;};
    const build=ids=>{for(const id of ids){development.facilities[id]=[0,1];progress[id]=1;}};
    const plaza=()=>{for(const id of ['pasca','climenzo','eqa','cecil','demian','sari']){const c=cast.find(c=>c.id===id);show(id,c.position,{height:c.height,yaw:c.yaw,lookAt:id==='pasca'?'climenzo':'pasca'});}};
    const gamePair=()=>{show('demian',[37,4],{expression:'happy'});show('sari',[40,4],{expression:'happy'});face('demian','sari');face('sari','demian');};
    const facilityShot=(id,width)=>{const f=facilityById(id),e=facilityEntry(f),y=ground(f.x,f.z);frame=M('crane',F([f.x,y+5,f.z],width,.23,.23),F([f.x,y+6,f.z],width*1.05,.1,.48));show('xel',[e.x-3,e.z],{action:'Build'});show('ardhy',[e.x+3,e.z],{action:'Measure'});};
    if(row.beat==='arrival'){
      plaza();frame=M('descent',F([-35,18,70],1800,-.35,1.1),F([-5,2,1],12,.15,.26),.1);
    }else if(row.beat==='plaza'){
      plaza();const speaker=cast.find(c=>c.id===row.speaker);
      if(speaker){const id=speaker.id;actors[id].gesture=row.gesture||'talk';actors[id].expression='happy';if(id!=='pasca')face(id,'pasca');frame=F([speaker.position[0],1.5+speaker.height,speaker.position[1]],3.8,id==='pasca'?.25:speaker.position[0]<-5?2:-2,.12);}
    }else if(row.beat==='start-build'){
      show('xel',[-95,166],{gesture:'talk'});show('ardhy',[-92,164],{action:'Build'});frame=M('truck',F([-95,1.6,166],4,.1,.15),F([-93,1.8,165],8,.2,.2));
    }else if(row.beat==='worship-pair'){
      build(row.buildIds);const fs=row.buildIds.map(facilityById),x=(fs[0].x+fs[1].x)/2;frame=M('crane',F([x,5,145],100,0,.35),F([x,7,145],100,.07,.5));show('xel',[fs[0].x,164],{action:'Build'});show('ardhy',[fs[1].x,164],{action:'Measure'});
    }else if(['school','hospital','stadium'].includes(row.beat)){
      const id={school:'sekolah',hospital:'rumah-sakit',stadium:'stadion'}[row.beat];build([id]);facilityShot(id,id==='stadion'?120:65);
    }else if(row.beat==='safety'){
      build(['damkar','polisi','kodim']);frame=M('truck',F([-17,9,290],170,-.08,.48),F([-12,11,290],170,.08,.58));show('xel',[-18,310],{action:'Build'});show('ardhy',[-12,310],{action:'Measure'});
    }else if(row.beat==='homes-build'){
      development.homes=[0,1];homes=1;frame=M('crane',F([180,5,-35],136,.15,.5),F([180,8,-35],144,.18,.9));
    }else if(['home-sign','homes-reaction'].includes(row.beat)){
      const h=home('demian'),y=storyHomeGround(h),z=h.z+6;
      // Insert and dialogue share the same canonical house and front door.
      // A wider lens keeps the camera inside the lane, outside the next row's roofs.
      if(row.beat==='home-sign')frame={...F([h.x,y+3.75,h.z+4.15],4.1,0,.02),fov:60};
      else{show('demian',[h.x-1.3,z],{expression:row.speaker==='demian'?'happy':'surprised'});show('pasca',[h.x+1.3,z],{expression:'happy'});face('demian','pasca');face('pasca','demian');frame=M('dolly',{...F([h.x,y+2,z-1],5.8,.04,.08),fov:65},{...F([h.x,y+2,z-1],5.5,.04,.08),fov:65});}
    }else if(['livia-home','angel-home'].includes(row.beat)){
      const id=row.beat.split('-')[0],h=home(id),y=storyHomeGround(h);frame=M('orbit',F([h.x,y+4,h.z],18,-.3,.32),F([h.x,y+4,h.z],18,.3,.4));show(id,[h.x-1.3,h.z+6],{action:'Wave',height:y,expression:'happy'});
    }else if(row.beat==='game-question'){
      gamePair();frame=F([38.5,1.4,4],6,.15,.15);
    }else if(['game-intro','register','starter','starter-reaction','available','proposal-question','proposal'].includes(row.beat)){
      gamePair();frame=M('truck',F([38.5,1.4,4],7,.15,.18),F([39,1.4,4],7,.23,.18));panel={'game-intro':'game-intro',register:'onboarding',starter:'starter-plan',available:'available',proposal:'proposal'}[row.beat];
      if(row.beat==='available'){actors.demian={...actors.demian,action:'Walk',to:[37,8]};actors.sari={...actors.sari,action:'Walk',to:[40,8]};frame=M('truck',F([38.5,1.4,4],7,.15,.18),F([38.5,1.4,8],7,.15,.18),0);}
    }else if(row.beat==='waiting'){
      // Walk along the lane between rows, not through the houses at z=-66.
      for(const [i,id] of ['sari','demian','climenzo','eqa','cecil','xel'].entries())show(id,[136+i*2,-76],{action:'Walk',to:[140+i*2,-76]});frame=M('crane',F([143,2,-76],20,.2,.8),F([147,4,-76],35,.3,.9));
    }else if(['final-credit','final-answer','final-reaction','closing'].includes(row.beat)){
      gamePair();show('pasca',[38.5,2],{expression:'happy'});show('climenzo',[42,3],{action:row.beat==='final-answer'?'Wave':'Idle',expression:'happy'});face('demian','pasca');actors.pasca.lookAt='demian';frame=F([38.5,1.5,3],row.beat==='final-reaction'?4.6:8,.15,.16);
      if(row.beat==='closing'){frame=M('crane',F([38.5,2,3],11,.15,.22),F([80,8,30],145,.2,.75),.15);panel='closing';}
    }
    if(row.speaker&&actors[row.speaker]?.visible)Object.assign(actors[row.speaker],{...(row.gesture?{gesture:row.gesture}:{}),...(row.expression?{expression:row.expression}:{}),...(row.gestureDelay!==undefined?{gestureDelay:row.gestureDelay}:{})});
    for(const [id,cue] of Object.entries(row.reactions||{}))if(actors[id]?.visible)Object.assign(actors[id],cue,{lookAt:row.speaker||'demian'});
    let overlay=row.overlay;
    if(row.beat==='worship-pair')overlay=row.buildIds.map(id=>facilityById(id).name).join(' • ');
    if(['register','final-credit','final-answer','final-reaction','closing'].includes(row.beat))overlay='republikwkwkwk.com';
    const shot={id:row.id,label:row.label,duration,camera:frame.width>12?'wide':'medium',focus:row.speaker&&row.speaker!=='narrator'?row.speaker:'pasca',caption:clip?displaySpeechText(clip.text):'',frame,actors,development,...(clip?{speeches:[{key:row.audioKey,offset:.08,volume:1}]}:row.speaker?{plannedVoice:{speaker:row.speaker,text:row.text,voice:script.actors[row.speaker].voice}}:{}),...(panel?{day3Panel:panel}:{}),...(overlay?{overlay}:{}),musicBedVolume:row.beat==='final-answer'?0:clip?.42:.64};
    if(row.music){shot.sound='okeGas';shot.musicOffset=musicOffset;shot.musicVolume=.75;musicOffset+=duration;}
    scenario.shots.push(shot);
  }
  return markBuiltInEpisode(scenario);
}
