import * as THREE from 'three';
import {createCivicFacilities} from './civic-facilities-geometry.js';
import {republicGeometry} from './republic-geometry.js';
import {STORY_HOMES,storyHomeGround} from './citizen-story-homes.js';

export function createDay3Set({owned,geometries,materials,textures}){
  const facilities=createCivicFacilities({parent:owned,geometries,materials,textures}),occluders=facilities.occluders;
  const g=republicGeometry({geometries,materials,textures,occluders}),root=g.group(owned,'Day3Homes'),homes=[];
  for(const [i,h] of STORY_HOMES.entries()){
    const house=g.group(root,h.id,[h.x,storyHomeGround(h),h.z]),layers=[];
    const layer=(label,at)=>{const o=g.group(house,label);layers.push({o,at});return o;};
    const a=layer('Footings',.05),b=layer('Columns',.25),c=layer('Walls',.45),d=layer('Roof',.65),e=layer('Nameplate',.85);
    const colors=['#e7d6b5','#d9dfcb','#dfc9b8','#cadbd9'],roofs=['#9f5943','#58676b','#a87348','#65745d'];
    g.box(a,'Slab','#b8af98',[0,-.1,0],[8.5,.2,8.5]);for(const x of [-3.8,3.8])for(const z of [-3.8,3.8])g.box(b,'Post','#aaa997',[x,1.55,z],[.3,3.1,.3]);
    g.box(c,'HouseWalls',colors[h.style],[0,1.55,0],[8,3.1,8]);
    for(const side of [-1,1]){const roof=g.box(d,'Roof',roofs[h.style],[side*2.2,4.1,0],[Math.hypot(4.4,2),.17,9]);roof.rotation.z=-side*Math.atan2(2,4.4);g.triangle(d,'Gable',colors[h.style],[[-4.4,3.1,side*4],[4.4,3.1,side*4],[0,5.1,side*4]]);g.box(e,'Window','#6e9b9c',[side*2.5,1.8,4.1],[1.8,1.4,.12]);}
    g.box(e,'Door','#6f5847',[0,1.15,4.1],[1.35,2.3,.15]);g.sign(e,'ResidentName',['RUMAH '+h.name,h.address],[0,3.75,4.15],[3.5,1.05],{background:'#244d50',color:'#fff4d9',font:52});
    homes.push({house,layers,index:i});
  }
  const crane=g.group(owned,'Day3Crane'),mast=g.box(crane,'CraneMast','#e0b44b',[0,10,0],[.8,20,.8]);g.box(crane,'Boom','#e0b44b',[5,20,0],[17,.5,.7]);
  const hook=g.group(crane,'Hook');g.beam(hook,'Cable','#616c6a',[0,0,0],[0,-9,0],.035);g.box(hook,'LiftedBeam','#bfc3b7',[0,-9,0],[6,.4,.5]);
  const resolve=(value,p)=>Array.isArray(value)?value[0]+(value[1]-value[0])*p:value||0;
  function pose(sample,time){
    const p=THREE.MathUtils.smoothstep(sample.elapsed/sample.shot.duration,0,1),cue=sample.shot.development||{};
    facilities.apply(Object.fromEntries(Object.entries(cue.facilities||{}).map(([id,value])=>[id,resolve(value,p)])));
    const hp=resolve(cue.homes,p);for(const h of homes){const local=Math.max(0,Math.min(1,(hp-h.index*.003)/.85));for(const layer of h.layers){const t=Math.max(0,Math.min(1,(local-layer.at)/.12));layer.o.visible=t>0;layer.o.scale.y=Math.max(.001,t*t*(3-2*t));}}
    const working=Object.entries(cue.facilities||{}).find(([,v])=>Array.isArray(v)&&v[0]<v[1]);
    crane.visible=!!working&&p<.9;if(working){const b=facilities.buildings.get(working[0]);crane.position.set(b.x-b.width/2-3,b.base,b.z);hook.position.set(5+Math.sin(time*.4)*2,20-Math.sin(p*Math.PI)*3,0);}
  }
  return {root,facilities,homes,occluders,pose,dispose(){root.removeFromParent();crane.removeFromParent();facilities.dispose();}};
}
