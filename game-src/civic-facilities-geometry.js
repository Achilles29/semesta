import * as THREE from 'three';
import {republicGeometry} from './republic-geometry.js';
import {CIVIC_FACILITIES,DEVELOPMENT_ROADS,developmentGroundHeight} from './civic-development-layout.js';
const terrainHeight=developmentGroundHeight;

export function createCivicFacilities({parent,geometries,materials,textures}){
  const occluders=[],g=republicGeometry({geometries,materials,textures,occluders}),root=g.group(parent,'CivicDevelopment'),buildings=new Map();
  const baseFor=f=>Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>terrainHeight(f.x+a*f.width/2,f.z+b*f.depth/2))))+.1;
  for(const road of DEVELOPMENT_ROADS){
    const dx=road.to[0]-road.from[0],dz=road.to[1]-road.from[1],length=Math.hypot(dx,dz),steps=Math.ceil(length/3);
    for(let i=0;i<steps;i++){const x=road.from[0]+dx*(i+.5)/steps,z=road.from[1]+dz*(i+.5)/steps;g.box(root,'DistrictRoad','#b9b2a0',[x,terrainHeight(x,z)+.03,z],[dx?length/steps:road.width,.06,dz?length/steps:road.width]);}
  }
  for(const f of CIVIC_FACILITIES){
    const base=baseFor(f),building=g.group(root,f.id,[f.x,base,f.z]),steps=[];
    const layer=(name,at)=>{const obj=g.group(building,name);steps.push({obj,at});return obj;};
    const pad=layer('Foundation',.04),frame=layer('Frame',.22),walls=layer('Walls',.44),roof=layer('Roof',.68),finish=layer('Finish',.86);
    const w=f.width*.78,d=f.depth*.65,floors=f.id==='rumah-sakit'?4:['sekolah','polisi','kodim'].includes(f.id)?3:f.id==='damkar'?2:1,h=floors>1?floors*4.2:f.category==='worship'?6:5.5;
    g.box(pad,'RaisedSite','#b8b3a1',[0,-.5,0],[f.width,1,f.depth]);
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])g.box(frame,'StructuralColumn','#a6a9a2',[x,h/2,z],[.5,h,.5]);
    if(f.id==='stadion'){
      g.box(walls,'Pitch','#588b5b',[0,.08,0],[66,.16,42]);
      for(const x of [-33,33])g.box(finish,'TouchLine','#f2f2db',[x,.18,0],[.16,.03,42]);
      for(const z of [-21,21])g.box(finish,'GoalLine','#f2f2db',[0,.18,z],[66,.03,.16]);
      g.box(finish,'HalfwayLine','#f2f2db',[0,.18,0],[.16,.03,42]);
      const circle=g.mesh(finish,'CenterCircle',new THREE.RingGeometry(6.8,7,40),g.material('#f2f2db',{side:THREE.DoubleSide}),[0,.2,0]);circle.rotation.x=-Math.PI/2;
      for(const side of [-1,1])for(let i=0;i<5;i++)g.box(walls,'TerracedStand',i%2?'#b4c7c7':'#6d8da1',[0,.6+i*.65,side*(24+i*1.3)],[80,.6,1.25]);
      for(const side of [-1,1]){g.box(roof,'StandCanopy','#567381',[0,5.5,side*29],[84,.25,12]);for(const z of [-3.5,3.5])g.beam(finish,'GoalPost','#f5f1dd',[side*32,0,z],[side*32,2.5,z],.08);g.beam(finish,'GoalBar','#f5f1dd',[side*32,2.5,-3.5],[side*32,2.5,3.5],.08);}
    }else{
      const color=f.id==='damkar'?'#c95748':f.id==='kodim'?'#6b8060':f.id==='polisi'?'#dad2bc':f.category==='health'?'#e4eeeb':f.category==='worship'?'#eee1c9':'#d5dbc8';
      g.box(walls,'MainVolume',color,[0,h/2,0],[w,h,d]);
      g.box(roof,'Cornice','#f1e8d2',[0,h+.2,0],[w+1,.4,d+1]);
      const roofColor=['kelenteng','vihara','pura'].includes(f.id)?'#9c4739':'#617d7f';
      if(['gereja-kristen','gereja-katolik','sekolah','agro','bengkel','gudang'].includes(f.id)){
        const run=w/2+.5,rise=f.category==='worship'?5:2.3;
        for(const side of [-1,1]){const r=g.box(roof,'PitchedRoof',roofColor,[side*run/2,h+rise/2+.5,0],[Math.hypot(run,rise),.3,d+2]);r.rotation.z=-side*Math.atan2(rise,run);g.triangle(roof,'Gable',color,[[-run,h+.4,side*d/2],[run,h+.4,side*d/2],[0,h+rise+.4,side*d/2]]);}
      }else g.box(roof,'FlatRoof',roofColor,[0,h+.55,0],[w+1.5,.3,d+1.5]);
      for(let floor=0;floor<floors;floor++)for(let x=-w/2+3;x<w/2;x+=5){if(Math.abs(x)<3)continue;g.box(finish,'Window','#769caa',[x,(floors>1?floor*4.2+2.3:h*.58),d/2+.07],[2.6,2,.12]);g.box(finish,'WindowSill','#f0ead6',[x,(floors>1?floor*4.2+2.3:h*.58)-1,d/2+.18],[2.9,.15,.35]);}
      g.box(finish,'Entrance','#3c646b',[0,1.6,d/2+.08],[3,3.2,.16]);
      g.box(finish,'EntranceCanopy','#d7c79d',[0,3.5,d/2+1.3],[5,.2,3]);
      if(floors>1){
        const accent=f.id==='polisi'?'#bda45e':f.id==='kodim'?'#a7b67c':'#e5dcc4';
        for(let floor=1;floor<floors;floor++)g.box(finish,'StoreyBand',accent,[0,floor*4.2,0],[w+.4,.25,d+.4]);
        for(const x of [-w*.32,-w*.16,w*.16,w*.32])g.box(finish,'GrandPorticoColumn',accent,[x,3,d/2+2],[.65,6,.65]);
        g.box(finish,'GrandPorticoRoof',accent,[0,6.2,d/2+1.7],[w*.75,.6,4]);
        for(let step=0;step<3;step++)g.box(pad,'CeremonialSteps','#c9c1ac',[0,.1+step*.14,d/2+3-step*.5],[w*.8, .2,1.2]);
        g.box(finish,'CentralGlassSpine','#335f78',[0,h*.65,d/2+.15],[4.5,h*.5,.18]);
        if(['polisi','kodim'].includes(f.id)){g.cylinder(finish,'CivicEmblem',accent,[0,h-1.3,d/2+.35],1.1,.2).rotation.x=Math.PI/2;g.sign(finish,'EmblemLetters',[f.id==='polisi'?'RW':'TNW'],[0,h-1.3,d/2+.5],[1.7,.9],{background:f.id==='polisi'?'#263e64':'#3f563b',color:'#f7d887'});}
        for(const x of [-w/2-1,w/2+1]){g.cylinder(finish,'FlagMast','#bfc8c5',[x,5,d/2+2],.06,10);g.box(finish,'RepublicFlagRed','#c53640',[x+.75,9.3,d/2+2],[1.5,.55,.05]);g.box(finish,'RepublicFlagWhite','#fff4db',[x+.75,8.75,d/2+2],[1.5,.55,.05]);}
      }
      if(f.id==='masjid'){
        g.ball(roof,'Dome','#5b9b88',[0,h+1.7,0],[5.5,4.8,5.5]);
        g.cylinder(roof,'Minaret','#e5dbc1',[-w/2+1,h,0],1,2*h);g.ball(roof,'MinaretCap','#5b9b88',[-w/2+1,2*h+.6,0],[1.4,1.2,1.4]);
      }
      if(f.id.startsWith('gereja')){g.box(roof,'CrossVertical','#d4bc83',[0,h+6,d/2],[.35,2.7,.35]);g.box(roof,'CrossHorizontal','#d4bc83',[0,h+6.4,d/2],[1.7,.35,.35]);if(f.id==='gereja-katolik'){g.cylinder(roof,'BellTower','#e0d1b3',[-w/2+2,h+1,0],2,7);}}
      if(['pura','vihara','kelenteng'].includes(f.id))for(let i=0;i<(f.id==='pura'?5:3);i++){
        const size=(f.id==='pura'?10:14)-i*1.7,color=f.id==='pura'?'#414a42':f.id==='vihara'?'#a58a4d':'#a33e34';
        const tier=g.mesh(roof,'TieredRoof',g.geometry('tier',()=>new THREE.ConeGeometry(1,1,4)),g.material(color),[0,h+1.5+i*1.6,0],[size*.71,2.1,size*.55]);tier.rotation.y=Math.PI/4;
        g.box(roof,'TierEave',color,[0,h+.5+i*1.6,0],[size,.18,size*.78]);
      }
      if(f.id==='pura')for(const side of [-1,1])for(let i=0;i<4;i++)g.box(finish,'SplitGate','#6d6d62',[side*3,.65+i*1.1,d/2+3],[2.6-i*.4,1.1,1.6]);
      if(f.id==='kelenteng')for(const side of [-1,1])g.cylinder(finish,'RedPillar','#ad4336',[side*(w/2-1),h/2,d/2+.3],.3,h);
      if(f.id==='rumah-sakit'){g.box(finish,'HealthVertical','#418b91',[0,h-1,d/2+.2],[.6,2.5,.15]);g.box(finish,'HealthHorizontal','#418b91',[0,h-1,d/2+.22],[2.5,.6,.15]);}
      if(f.id==='damkar'){for(const x of [-8,8]){g.box(finish,'ApplianceBay','#415256',[x,2,d/2+.15],[6,4,.2]);g.box(finish,'FireEngine','#c84131',[x,1,d/2+2],[2.8,1.7,4]);}}
      if(f.category==='economy')for(const x of [-w/2+3,w/2-3])g.box(finish,'StockCrate','#bd9465',[x,.6,d/2+2],[1.6,1.2,1.6]);
    }
    g.sign(finish,'FacilityName',f.id==='kodim'?['MARKAS KOMANDO','TENTARA NASIONAL WKWKWK']:f.id==='polisi'?['KEPOLISIAN','REPUBLIK WKWKWK']:[f.name.toUpperCase()],[0,4.7,f.depth/2-.7],[Math.min(22,f.width*.8),1.7],{background:'#244b56',color:'#fff0ce'});
    buildings.set(f.id,{...f,root:building,steps,base});
  }
  const apply=values=>{for(const [id,b] of buildings)for(const step of b.steps){const t=Math.max(0,Math.min(1,((values[id]||0)-step.at)/.13));step.obj.visible=t>0;step.obj.scale.y=Math.max(.001,t*t*(3-2*t));}};apply({});
  return {root,buildings,occluders,apply,dispose(){root.removeFromParent();}};
}
