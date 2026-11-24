// One shared landscape contract for exploration, content and the planning desk.
export const REPUBLIC_PALETTE=Object.freeze({grass:'#438451',hill:'#2b6145',sand:'#d6ba80',water:'#137f99',deepWater:'#125568',road:'#c9b28c',sky:'#80c9ed',trunk:'#70513c',leaf:'#236748',leafLight:'#639c42',flower:'#df7d52'});
export const REPUBLIC_RIVER=Object.freeze({name:'Sungai Ngalir',width:18,points:[[-340,-360],[-275,-220],[-210,-100],[-180,40],[-195,155],[-260,240],[-225,335],[-160,450],[-80,550]]});
export const REPUBLIC_LAKE=Object.freeze({name:'Danau Santuy',x:-280,z:255,rx:63,rz:48});
export const REPUBLIC_PARKS=Object.freeze([
  {id:'taman-tepi-air',name:'Taman Tepi Air',x:-145,z:75,radius:18},
  {id:'taman-perintis',name:'Taman Perintis',x:265,z:-40,radius:15},
  {id:'taman-kerukunan',name:'Taman Kerukunan',x:48,z:190,radius:10},
]);
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
export function waterDistance(x,z){
  const river=Math.min(...REPUBLIC_RIVER.points.slice(1).map((p,i)=>segmentDistance(x,z,REPUBLIC_RIVER.points[i],p)))-REPUBLIC_RIVER.width/2;
  const l=REPUBLIC_LAKE,lake=(Math.hypot((x-l.x)/l.rx,(z-l.z)/l.rz)-1)*Math.min(l.rx,l.rz);
  return Math.min(river,lake);
}
export function shapeWaterBasin(height,x,z){const d=waterDistance(x,z);if(d>16)return height;const t=Math.max(0,Math.min(1,d/16)),blend=t*t*(3-2*t);return -1.7*(1-blend)+height*blend;}
export const natureVariant=(index)=>['rain-tree','tall-palm','giant-emergent','low-garden'][((index%4)+4)%4];
