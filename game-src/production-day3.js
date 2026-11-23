import script from './production-day3-script.json' with {type:'json'};
import {CIVIC_FACILITIES,facilityById,facilityEntry,developmentGroundHeight} from './civic-development-layout.js';
const terrainHeight=developmentGroundHeight;
import {markBuiltInEpisode} from './production-episode-origin.js';
export const DAY3_TITLE=script.title;
export const DAY3_SCRIPT=script;
const F=(target,width,azimuth=.1,elevation=.4)=>({target,width,azimuth,elevation});
const M=(type,from,to,hold=.15)=>({...from,motion:{type,from,to,hold}});
export function day3Scenario(){
  const cast=Object.entries(script.actors).filter(([id])=>id!=='narrator').map(([id,a],i)=>({id,name:a.name,preset:a.preset,role:id==='pasca'?'Presiden':'Warga',position:id==='pasca'?[-5,-.1]:[-9+i*1.6,3],height:id==='pasca'?.6:0,yaw:id==='pasca'?0:Math.PI}));
  const scenario={version:1,episode:'day3',day:3,title:DAY3_TITLE,notice:'DAY 3 · UANGNYA WARGA, JASANYA PRESIDEN',kind:'episode',set:'development',props:[],cast,template:'republic-series',shots:[]};
  const progress=Object.fromEntries(CIVIC_FACILITIES.map(f=>[f.id,0]));let homes=0;
  for(const row of script.shots){
    const actors=Object.fromEntries(cast.map(c=>[c.id,{action:'Idle',visible:false}])),speaker=cast.find(c=>c.id===row.speaker);
    let frame=F([-5,1.8,1],6,.15,.15),panel;
    const development={facilities:{...progress},homes};
    const show=(id,at,action='Idle',gesture)=>{actors[id]={action,visible:true,at,height:terrainHeight(...at),yaw:0,expression:'neutral',lookAt:'camera',...(gesture?{gesture}:{})};};
    const build=(ids,from,to)=>{for(const id of ids){development.facilities[id]=[from,to];progress[id]=to;}};
    const group=(category)=>CIVIC_FACILITIES.filter(f=>f.category===category).map(f=>f.id);
    const facilityShot=(id,width)=>{const f=facilityById(id),entry=facilityEntry(f),y=terrainHeight(f.x,f.z);frame=M('crane',F([f.x,y+2,f.z],width,.2,.25),F([f.x,y+3,f.z],width*1.15,.2,.8));show('xel',[entry.x-3,entry.z],'Build');show('ardhy',[entry.x+3,entry.z],'Measure');};
    if(['plaza','plan','overview','closing'].includes(row.beat)){
      for(const c of cast)actors[c.id]={action:c.id===row.speaker?'Point':'Idle',visible:true,at:c.position,height:c.height,yaw:c.yaw,expression:c.id===row.speaker?'happy':'neutral',lookAt:row.speaker==='narrator'?'pasca':row.speaker};
      if(speaker){
        for(const c of cast)if(c.id!==speaker.id&&c.id!==(speaker.id==='pasca'?'climenzo':'pasca'))actors[c.id].visible=false;
        actors[speaker.id]={...actors[speaker.id],action:row.gesture==='talk'?'Point':'Idle',yaw:0,gesture:row.gesture,lookAt:speaker.id==='pasca'?'climenzo':'pasca'};
        frame=F([speaker.position[0],1.55+(speaker.height||0),speaker.position[1]],2.3,.22,.08);
      }
      if(row.beat==='overview'||row.beat==='plan')frame=M('crane',F([50,5,100],210,.25,1.2),F([50,5,160],300,.25,1.6));
      if(row.beat==='closing')frame=M('dolly',F([-5,1.8,1],6,.1,.1),F([-5,1.8,1],4.5,.1,.1));
    }else if(row.beat==='worship-foundation'){
      build(group('worship'),0,.35);frame=M('truck',F([45,8,145],315,0,1),F([52,8,145],315,0,1));
    }else if(row.beat==='worship-west'||row.beat==='worship-east'){
      const west=row.beat==='worship-west',ids=group('worship').slice(west?0:3,west?3:6);build(ids,.35,1);frame=M('dolly',F([west?-35:130,4,145],148,-.12,.7),F([west?-35:130,3,145],58,.12,.38));
    }else if(row.beat==='school'||row.beat==='hospital'||row.beat==='stadium'){
      const id={school:'sekolah',hospital:'rumah-sakit',stadium:'stadion'}[row.beat];build([id],0,1);facilityShot(id,id==='stadion'?112:64);
      if(row.speaker==='demian'){const e=facilityEntry(facilityById(id));show('demian',[e.x,e.z+1],'Point');}
    }else if(row.beat==='school-reaction'||row.beat==='stadium-reaction'){
      const id=row.beat==='school-reaction'?'sekolah':'stadion',f=facilityById(id),e=facilityEntry(f);show(row.speaker,[e.x,e.z+2],'Idle',row.gesture);frame=F([e.x,terrainHeight(e.x,e.z+2)+1.5,e.z+2],3.4,0,.1);
    }else if(row.beat==='safety'){
      build(group('safety'),0,1);frame=M('truck',F([-35,14,290],165,-.08,.8),F([-15,14,290],165,.08,.8));
    }else if(row.beat==='homes-build'){
      development.homes=[0,1];homes=1;frame=M('crane',F([180,2,-35],136,.2,.5),F([180,3,-35],144,.2,1));
    }else if(row.beat==='homes-reaction'||row.beat==='homes-claim'){
      show('demian',[133, -80],'Point');show('pasca',[135,-80],'Idle',row.speaker==='pasca'?'self':undefined);frame=F([134,2.2,-82],row.beat==='homes-claim'?13:6,0,.18);
    }else if(row.beat==='economy-intro'||row.beat==='economy-build'){
      if(row.beat==='economy-build'){build(group('economy'),0,1);frame=M('truck',F([35,15,365],275,-.1,.8),F([40,15,365],275,.1,.8));}
      else{show('xel',[-80,385],'Idle','talk');frame=F([-80,terrainHeight(-80,385)+1.5,385],3.5,0,.12);}
    }else{
      panel={register:'register',profession:'profession',save:'save',starter:'starter-plan',available:'available','economy-demo':'economy-plan'}[row.beat];
      frame=F([38,3,-3],26,.2,.3);
    }
    const caption=row.speaker==='narrator'?row.text:`${script.actors[row.speaker].name}: ${row.text}`;
    scenario.shots.push({id:row.id,label:row.label,duration:row.duration,camera:frame.width>12?'wide':'medium',focus:speaker?.id||'pasca',caption,frame,actors,development,plannedSpeech:`day3-${row.id}`,plannedVoice:{speaker:row.speaker,text:row.text,voice:script.actors[row.speaker].voice},...(panel?{day3Panel:panel}:{}),...(row.id==='D24'||row.id==='D32'?{overlay:'republikwkwkwk.com'}:{}),musicBedVolume:.16});
  }
  return markBuiltInEpisode(scenario);
}
