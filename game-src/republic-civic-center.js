import * as THREE from 'three';
import {republicGeometry} from './republic-geometry.js';
import {buildRepublicCivicBuildings} from './republic-civic-buildings.js';

/** Public square shared verbatim with the filmed set. No episode/player logic. */
export function buildRepublicSquare(g,root){
  const {box,group,sign,cylinder,beam,ball}=g;
  box(root,'Day2CitizenArrivalPath','#c7b591',[5,.012,3.3],[17,.024,2.6]);
  box(root,'Day2PublicSquare','#c6b99b',[-3,.018,2.9],[9,.036,6]);
  const stage=group(root,'Day2WelcomeStage',[-5,0,-1]);
  box(stage,'StageWoodDeck','#a27752',[0,.54,0],[5,.12,3]);
  for(let i=0;i<19;i++)box(stage,'StageDeckPlank','#b18860',[-2.4+i*.267,.605,0],[.25,.015,2.98]);
  box(stage,'StageRedFrontSkirt','#a92c39',[0,.28,1.48],[5,.52,.055]);
  for(const x of [-2.3,0,2.3])for(const z of [-1.3,1.3])box(stage,'StageSupport','#675748',[x,.25,z],[.16,.5,.16]);
  for(let i=0;i<4;i++)box(root,'StageStair_'+i,'#ad8a61',[-1.45-i*.3,.075*(i+1),-.3],[.3,.15*(i+1),1.15]);
  sign(stage,'RepublicStageBanner',['REPUBLIK WKWKWK','SELAMAT DATANG, WARGA!'],[0,1.55,-1.43],[3.7,.78],{background:'#a42a39',color:'#fff6e6'});
  for(const x of [-2.2,2.2])box(stage,'StageBannerPost','#6d695d',[x,1.32,-1.43],[.065,2.64,.065]);
  const microphone=group(root,'Day2MicrophoneStand',[-5,.6,.48]);cylinder(microphone,'MicBase','#273239',[0,.025,0],.19,.05);cylinder(microphone,'MicStand','#425056',[0,.68,0],.019,1.34);beam(microphone,'MicBoom','#424c4f',[0,1.34,0],[0,1.45,-.24],.014);const mic=cylinder(microphone,'Microphone','#202c31',[0,1.46,-.28],.037,.17);mic.rotation.x=Math.PI/2;ball(microphone,'MicrophoneMesh','#525c60',[0,1.46,-.37],[.042,.042,.05]);
  const chair=group(root,'TemporaryOfficeChair',[-7,.6,-1.65]);box(chair,'ChairSeat','#e5e5d9',[0,.46,0],[.52,.07,.52]);box(chair,'ChairBack','#e5e5d9',[0,.84,-.24],[.5,.66,.06]);for(const x of [-.21,.21])for(const z of [-.21,.21])box(chair,'ChairLeg','#bdc6bb',[x,.23,z],[.045,.46,.045]);
  // Retain the Day 1 grove around the expanded clearing, outside the work zones.
  for(const [x,z,s] of [[-14,-5,1],[13,-13,1.2],[-1,-17,1.4],[14,8,1]]){
    cylinder(root,'RepublicTreeTrunk','#756049',[x,1.6*s,z],.18*s,3.2*s);
    for(let i=0;i<5;i++)ball(root,'RepublicTreeCrown',i%2?'#5b7953':'#719167',[x+Math.sin(i*2.4)*.75*s,(3.2+i%2*.35)*s,z+Math.cos(i*2.4)*.75*s],[1.25*s,.85*s,1.15*s]);
  }
  return {stage,microphone,chair};
}

export function createRepublicCivicCenter({owned,geometries,materials,textures}){
  const root=new THREE.Group();root.name='RepublicCivicCenter';owned.add(root);
  const occluders=[],g=republicGeometry({geometries,materials,textures,occluders});
  buildRepublicSquare(g,root);
  const buildings=buildRepublicCivicBuildings(g,root);
  function setPhase(value){
    const after=value==='after-day2';
    root.traverse(o=>{if(o.userData.buildFrom!==undefined)o.visible=8>=o.userData.buildFrom&&8<o.userData.buildUntil;if(o.name.endsWith('_open_door'))o.rotation.y=-Math.PI/2;});
    for(const building of buildings)building.visible=after;
  }
  setPhase('before-day2');return {root,occluders,buildings,setPhase};
}
