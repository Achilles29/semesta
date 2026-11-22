/** Canonical coordinates shared by exploration, the map and filmed episodes.
 * The old destination IDs are storage/API keys, never the displayed names. */
export const WORLD_PHASE_EVENT='republic:world-phase';
export const WORLD_PHASE_KEY='republic-world-phase-v1';
export const WORLD_PHASES=['before-day2','after-day2'];
export const REGIONAL_BOUNDS=Object.freeze({minX:-2600,maxX:2600,minZ:-2300,maxZ:2300});
const atlasPoint=(x,z)=>({x:(x-REGIONAL_BOUNDS.minX)/(REGIONAL_BOUNDS.maxX-REGIONAL_BOUNDS.minX)*100,y:(z-REGIONAL_BOUNDS.minZ)/(REGIONAL_BOUNDS.maxZ-REGIONAL_BOUNDS.minZ)*100});
const destination=(id,name,x,z,landmass,status='planned')=>({id,name,center:{x,z},landmass,subtitle:status==='capital'?'Ibu kota • warga pertama':'Lahan kota • belum dibangun',map:atlasPoint(x,z),spawn:{x,z:z+8,yaw:Math.PI},status});
export const WORLD_DESTINATIONS=Object.freeze({
  jakarta:destination('jakarta','Jakartawa',0,0,'mainland','capital'),
  bandung:destination('bandung','Bandunggul',-1000,-430,'mainland'),
  semarang:destination('semarang','Semarame',1450,-1450,'semarang-island'),
  surabaya:destination('surabaya','Surabawow',1100,300,'mainland'),
  makassar:destination('makassar','Makasabar',-1150,1550,'makassar-island'),
});
const coastRadius=(angle,seed)=>1+.055*Math.sin(angle*3+seed)+.026*Math.cos(angle*7-seed);
function landmass(id,name,x,z,rx,rz,rotation,seed){
  const center={x,z},radius={x:rx,z:rz};
  const outline=Array.from({length:144},(_,i)=>{const a=i/144*Math.PI*2,r=coastRadius(a,seed),px=Math.cos(a)*rx*r,pz=Math.sin(a)*rz*r;return [x+px*Math.cos(rotation)-pz*Math.sin(rotation),z+px*Math.sin(rotation)+pz*Math.cos(rotation)];});
  return {id,name,center,radius,rotation,seed,outline,polygon:outline};
}
export const WORLD_LANDMASSES=Object.freeze([
  landmass('mainland','Daratan Utama',0,0,1900,790,.15,1),
  landmass('semarang-island','Pulau Semarame',1450,-1450,520,420,-.2,3),
  landmass('makassar-island','Pulau Makasabar',-1150,1550,500,440,.23,5),
]);
const route=(id,name,points,width=7)=>({id,name,points,from:points[0],to:points.at(-1),width});
export const REGIONAL_LAYOUT=Object.freeze({
  bounds:REGIONAL_BOUNDS,cities:WORLD_DESTINATIONS,landmasses:WORLD_LANDMASSES,
  routes:[
    route('west-road','Jalan Barat',[[-1000,-422],[-760,-220],[-330,30],[-20,10]]),
    route('east-road','Jalan Timur',[[122,10],[400,95],[720,210],[1100,308]]),
    route('village-road','Jalan Desa',[[-330,30],[-460,180]],5),
    route('forest-trail','Jalur Hutan',[[-760,-220],[-500,-450]],3.5),
    route('mountain-trail','Jalur Pegunungan',[[-500,-450],[-350,-690]],3),
  ],
  districts:[
    {id:'urban-jakartawa',name:'Pusat Jakartawa',kind:'urban',city:'jakarta',rect:{x:0,z:0,width:310,depth:280},entry:{x:0,z:8},description:'Panggung warga, fondasi permukiman dan pusat republik. Buka denah rinci ibu kota.'},
    {id:'urban-bandunggul',name:'Calon Kota Bandunggul',kind:'urban',city:'bandung',rect:{x:-1000,z:-430,width:220,depth:180},entry:{x:-1000,z:-422},description:'Lahan kota baru di daratan utama. Belum ada pembangunan.'},
    {id:'urban-surabawow',name:'Calon Kota Surabawow',kind:'urban',city:'surabaya',rect:{x:1100,z:300,width:240,depth:190},entry:{x:1100,z:308},description:'Ujung Jalan Timur. Masih berupa lahan bertanda.'},
    {id:'urban-semarame',name:'Calon Kota Semarame',kind:'urban',city:'semarang',rect:{x:1450,z:-1450,width:220,depth:180},entry:{x:1450,z:-1442},description:'Lahan kota di Pulau Semarame, terpisah laut.'},
    {id:'urban-makasabar',name:'Calon Kota Makasabar',kind:'urban',city:'makassar',rect:{x:-1150,z:1550,width:220,depth:180},entry:{x:-1150,z:1558},description:'Lahan kota di Pulau Makasabar, terpisah laut.'},
    {id:'village',name:'Desa Sukausul',kind:'village',rect:{x:-460,z:180,width:230,depth:210},entry:{x:-460,z:180},description:'Lahan desa di tepi jalur barat; petak rumah masih berupa rencana.'},
    {id:'countryside',name:'Padang Santai',kind:'countryside',rect:{x:440,z:130,width:400,depth:260},entry:{x:400,z:95},description:'Padang rumput dan lahan pedesaan terbuka di antara kota.'},
    {id:'forest',name:'Hutan Bisik-Bisik',kind:'forest',rect:{x:-500,z:-450,width:430,depth:260},entry:{x:-500,z:-450},description:'Hutan dengan jalan setapak yang dapat dilalui.'},
    {id:'mountains',name:'Bukit Banyakjanji',kind:'mountains',rect:{x:-350,z:-660,width:360,depth:220},entry:{x:-350,z:-690},description:'Jalur perbukitan berpemandangan daratan utama.'},
  ],
});
const localNaturalDistricts=Object.values(WORLD_DESTINATIONS).filter(d=>d.id!=='jakarta').flatMap(city=>[
  {kind:'village',label:'Desa Rencana',dx:-160,dz:90,width:140,depth:130},
  {kind:'countryside',label:'Padang',dx:150,dz:100,width:180,depth:140},
  {kind:'forest',label:'Hutan',dx:150,dz:-140,width:180,depth:160},
  {kind:'mountains',label:'Bukit',dx:-150,dz:-220,width:170,depth:140},
].map(d=>({id:city.id+'-'+d.kind,city:city.id,kind:d.kind,name:d.label+' '+city.name,rect:{x:city.center.x+d.dx,z:city.center.z+d.dz,width:d.width,depth:d.depth},entry:{x:city.center.x+d.dx,z:city.center.z+d.dz},description:d.kind==='village'?'Lahan desa bertanda patok; belum ada rumah atau fasilitas.':d.kind==='forest'?'Kawasan pepohonan dan jalan setapak pada wilayah kota ini.':d.kind==='mountains'?'Jalur bukit dengan relief nyata dan pandangan ke sekitar wilayah.':'Lahan pedesaan terbuka; belum ada permukiman jadi.'})));
export const WORLD_DISTRICTS=Object.freeze([...REGIONAL_LAYOUT.districts.map(d=>({...d,city:d.city||'jakarta'})),...localNaturalDistricts]);
const localRoutes=localNaturalDistricts.map(d=>{const center=WORLD_DESTINATIONS[d.city].center;return {...route('local-'+d.id,'Jalur '+d.name,[[center.x,center.z+8],[center.x+(d.entry.x-center.x)*.5,center.z+(d.entry.z-center.z)*.6],[d.entry.x,d.entry.z]],d.kind==='forest'||d.kind==='mountains'?3:4),city:d.city};});
// Separate crossing road surfaces by millimetres to avoid coplanar flicker.
export const WORLD_ROUTES=Object.freeze([...REGIONAL_LAYOUT.routes,...localRoutes].map((road,index)=>({...road,elevation:.045+index*.0015})));
const regionalBounds=Object.freeze({
  jakarta:{minX:-850,maxX:850,minZ:-850,maxZ:650},
  bandung:{minX:-1550,maxX:-650,minZ:-900,maxZ:100},
  surabaya:{minX:550,maxX:1750,minZ:-250,maxZ:850},
  semarang:{minX:900,maxX:2000,minZ:-2000,maxZ:-950},
  makassar:{minX:-1700,maxX:-600,minZ:1000,maxZ:2100},
});
export function getRegionalLayout(cityId){
  const city=WORLD_DESTINATIONS[cityId]?cityId:'jakarta',bounds=regionalBounds[city];
  const intersects=road=>road.points.some((b,i)=>{if(!i)return false;const a=road.points[i-1];return Math.max(a[0],b[0])>=bounds.minX&&Math.min(a[0],b[0])<=bounds.maxX&&Math.max(a[1],b[1])>=bounds.minZ&&Math.min(a[1],b[1])<=bounds.maxZ;});
  return {city,selectedCity:city,bounds,districts:WORLD_DISTRICTS.filter(d=>d.city===city),routes:WORLD_ROUTES.filter(r=>(!r.city||r.city===city)&&intersects(r)),landmasses:WORLD_LANDMASSES,cities:WORLD_DESTINATIONS};
}
export const projectRegionalPoint=(x,z)=>atlasPoint(x,z);

const plotXs=[29,44,59,74,89,104],plotZs=[-28,-46,-64,-82];
export const CAPITAL_LAYOUT=Object.freeze({
  id:'jakarta',name:'Jakartawa',bounds:{minX:-110,maxX:115,minZ:-115,maxZ:100},
  stage:{x:-5,z:-1,width:5,depth:3,height:.6},
  koplak:{x:4,z:-7,width:9,depth:5,entrance:{x:2.7,z:-4.4}},
  sppg:{x:-7,z:-9,width:9,depth:6,entrance:{x:-5.4,z:-5.9}},
  housingOverview:{x:65,z:-54},
  zones:[
    {id:'civic',name:'Alun-alun warga',status:'active',rect:{x:-3,z:1,width:32,depth:31}},
    {id:'housing',name:'Permukiman • fondasi 24 petak',status:'foundation',rect:{x:66.5,z:-55,width:91,depth:72}},
    {id:'education',name:'Rencana sekolah & PAUD',status:'planned',rect:{x:-48,z:-38,width:46,depth:30}},
    {id:'health',name:'Rencana klinik warga',status:'planned',rect:{x:-46,z:-75,width:44,depth:24}},
    {id:'market',name:'Rencana pasar & bengkel',status:'planned',rect:{x:55,z:39,width:68,depth:36}},
    {id:'park',name:'Ruang terbuka warga',status:'planned',rect:{x:-48,z:47,width:48,depth:38}},
  ],
  roads:[
    {id:'arrival',from:[-22,10],to:[122,10],width:6},
    {id:'west',from:[-20,87],to:[-20,-105],width:6},
    {id:'housing-spine',from:[17,10],to:[17,-103],width:5},
    {id:'housing-north',from:[17,-94],to:[115,-94],width:4},
    ...[-19,-37,-55,-73].map((z,i)=>({id:'housing-lane-'+i,from:[17,z],to:[115,z],width:4})),
    {id:'market-lane',from:[17,19],to:[17,83],width:5},
    {id:'school-lane',from:[-20,-19],to:[-84,-19],width:4},
    {id:'clinic-lane',from:[-20,-59],to:[-84,-59],width:4},
  ],
  housingPlots:plotZs.flatMap((z,row)=>plotXs.map((x,col)=>({id:`P${String(row*6+col+1).padStart(2,'0')}`,x,z,width:8,depth:8,capacity:2}))),
});

export function normalizeWorldPhase(value){return value==='after-day2'?'after-day2':'before-day2';}
export function getWorldPhase(storage){
  try{const item=(storage||globalThis.localStorage)?.getItem(WORLD_PHASE_KEY);const record=JSON.parse(item||'null');return normalizeWorldPhase(typeof record==='string'?record:record?.phase);}catch{return 'before-day2';}
}
export function setWorldPhase(value,{persist=true,source='inspection',storage}={}){
  const phase=normalizeWorldPhase(value),detail={phase,source,updatedAt:new Date().toISOString()};
  if(persist)try{(storage||globalThis.localStorage)?.setItem(WORLD_PHASE_KEY,JSON.stringify(detail));}catch{/* A local preview still works when storage is unavailable. */}
  if(globalThis.dispatchEvent&&globalThis.CustomEvent)globalThis.dispatchEvent(new CustomEvent(WORLD_PHASE_EVENT,{detail}));
  return phase;
}
export function projectWorldPoint(x,z){const b=CAPITAL_LAYOUT.bounds;return {x:(x-b.minX)/(b.maxX-b.minX)*100,y:(z-b.minZ)/(b.maxZ-b.minZ)*100};}
export function worldDestination(city){return WORLD_DESTINATIONS[typeof city==='string'?city:city?.id]||WORLD_DESTINATIONS.jakarta;}

export function hashWorld(x,z,seed=0){let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(seed|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
const smooth=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};
/** Flat civic ground, gradually rolling countryside, a distant physical coast. */
export function terrainHeight(x,z,city='jakarta'){
  const shore=shoreDistance(x,z);if(shore<=-24)return -3;
  let flat=1;for(const d of Object.values(WORLD_DESTINATIONS)){const r=Math.hypot(x-d.center.x,z-d.center.z),radius=d.id==='jakarta'?145:48;flat=Math.min(flat,smooth((r-radius)/150));}
  const hills=(Math.sin(x*.008+.6)*Math.cos(z*.007-1)*10+Math.sin((x+z)*.017)*3+14);
  let mountains=78*Math.exp(-(((x+420)/290)**2+((z+570)/235)**2));
  for(const district of localNaturalDistricts)if(district.kind==='mountains')mountains+=52*Math.exp(-(((x-district.rect.x)/85)**2+((z-district.rect.z)/90)**2));
  return -3*(1-smooth((shore+24)/24))+(hills+mountains)*flat*smooth(shore/100);
}
export function shoreDistance(x,z){return Math.max(...WORLD_LANDMASSES.map(m=>{const dx=x-m.center.x,dz=z-m.center.z,px=(dx*Math.cos(m.rotation)+dz*Math.sin(m.rotation))/m.radius.x,pz=(-dx*Math.sin(m.rotation)+dz*Math.cos(m.rotation))/m.radius.z;return (coastRadius(Math.atan2(pz,px),m.seed)-Math.hypot(px,pz))*Math.min(m.radius.x,m.radius.z);}));}
export function regionalRoadDistance(x,z){let nearest={distance:Infinity,width:0},elevation=0;for(const road of WORLD_ROUTES)for(let i=1;i<road.points.length;i++){const distance=distanceToSegment(x,z,road.points[i-1],road.points[i]);if(distance<nearest.distance)nearest={distance,width:road.width};if(distance<=road.width/2)elevation=Math.max(elevation,road.elevation);}return {...nearest,elevation};}
export function isReservedGround(x,z,city='jakarta'){
  if(WORLD_DISTRICTS.some(d=>Math.hypot(x-d.entry.x-4,z-d.entry.z+4)<5))return true;
  if(Object.values(WORLD_DESTINATIONS).some(d=>Math.hypot(x-d.center.x,z-d.center.z)<25))return true;
  if(x>-25&&x<22&&z>-23&&z<19)return true;
  if(CAPITAL_LAYOUT.zones.some(({rect:r})=>Math.abs(x-r.x)<r.width/2+3&&Math.abs(z-r.z)<r.depth/2+3))return true;
  if(CAPITAL_LAYOUT.roads.some(r=>distanceToSegment(x,z,r.from,r.to)<r.width/2+3))return true;
  const road=regionalRoadDistance(x,z);return road.distance<road.width/2+2;
}
export function distanceToSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u);}
export function terrainChunkKeys(x,z,size=64,radius=2){const cx=Math.floor(x/size),cz=Math.floor(z/size),keys=[];for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)keys.push(`${cx+dx},${cz+dz}`);return keys;}

/** Stable meeting positions; these are invitations to fictional roles, not
 * an assignment of real property or confirmed follow status. */
export function citizenWorldPosition(citizen,index){
  const name=citizen.name.toLowerCase();
  const civic={dd:[-8,6],asila:[-5,7],angel:[-7,3.4],naraevelync:[-9,3.5],demian:[-3,5],zizi:[5.8,4.2],'climenzo_jr':[1,2.8],'4ku_fek.smail':[3,-3],'tazinho.cc':[-11,7],sheaza:[7,7]};
  if(civic[name])return {x:civic[name][0],z:civic[name][1],yaw:Math.PI+(index%3-1)*.4};
  if(/dokter|forensik/i.test(citizen.role))return {x:-29-(index%3)*3,z:-65-(index%2)*3,yaw:Math.PI*.5};
  if(/guru|sekolah|profesor/i.test(citizen.role))return {x:-30-(index%4)*3,z:-29-(index%2)*3,yaw:Math.PI*.5};
  if(/mekanik|pertamini|excavator|mandor/i.test(citizen.role))return {x:25+(index%5)*3,z:25+(index%3)*3,yaw:Math.PI};
  const plot=CAPITAL_LAYOUT.housingPlots[index%24];return {x:plot.x+(index>=24?2.5:-2.5),z:plot.z+6.8,yaw:Math.PI+(index%3-1)*.3};
}

/** Axis-slide character movement against physical walls, with real step heights. */
export function moveWorldPosition(position,delta,{colliders=[],surfaces=[],city='jakarta',radius=.27,stepHeight=.28}={}){
  const next={x:position.x,y:position.y??terrainHeight(position.x,position.z,city),z:position.z};
  const floor=(x,z)=>worldFloorHeight(x,z,{surfaces,city});
  const blocked=(x,z,y)=>colliders.some(c=>{
    if(c.minY!==undefined&&y+1.6<c.minY||c.maxY!==undefined&&y>=c.maxY-.035)return false;
    if(c.radius!==undefined)return Math.hypot(x-c.x,z-c.z)<radius+c.radius;
    return x>c.minX-radius&&x<c.maxX+radius&&z>c.minZ-radius&&z<c.maxZ+radius;
  });
  const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.18));
  for(let i=0;i<steps;i++)for(const axis of ['x','z']){
    const candidate={...next,[axis]:next[axis]+delta[axis]/steps},height=floor(candidate.x,candidate.z);
    if(height<-.17||height-next.y>stepHeight||blocked(candidate.x,candidate.z,height))continue;
    next.x=candidate.x;next.z=candidate.z;next.y=height;
  }
  return next;
}

export function worldFloorHeight(x,z,{surfaces=[],city='jakarta'}={}){const road=regionalRoadDistance(x,z);return Math.max(terrainHeight(x,z,city)+road.elevation,...surfaces.filter(s=>x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ).map(s=>s.y));}
