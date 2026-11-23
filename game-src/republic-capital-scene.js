import * as THREE from 'three';
import {createRepublicCivicCenter} from './republic-civic-center.js';
import {republicGeometry} from './republic-geometry.js';
import {CAPITAL_LAYOUT,WORLD_DESTINATIONS,REGIONAL_LAYOUT,WORLD_DISTRICTS,WORLD_ROUTES,normalizeWorldPhase,terrainHeight,shoreDistance,terrainChunkKeys,hashWorld,isReservedGround} from './republic-world-layout.js';

function resourceSets(options){return {geometries:options.geometries||options.resources?.geometries||new Set(),materials:options.materials||options.resources?.materials||new Set(),textures:options.textures||options.resources?.textures||new Set()};}
function terrainGeometry(x0,z0,size,segments,city,lower=0,hole=null){
  let geometry;
  if(hole){
    // Insert exact boundary rows into the coarse distant terrain. Removing
    // triangles in this rectangle preserves the filmed set's excavations.
    const axes=(a,b)=>[...new Set([...Array.from({length:segments+1},(_,i)=>-size/2+i*size/segments),a,b])].sort((a,b)=>a-b),xs=axes(hole.minX,hole.maxX),zs=axes(hole.minZ,hole.maxZ),vertices=[],indices=[];
    for(const z of zs)for(const x of xs)vertices.push(x,0,z);
    for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
      const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;if(x>hole.minX&&x<hole.maxX&&z>hole.minZ&&z<hole.maxZ)continue;
      const a=j*xs.length+i,b=a+1,c=a+xs.length,d=c+1;indices.push(a,c,b,b,c,d);
    }
    geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  }else{geometry=new THREE.PlaneGeometry(size,size,segments,segments);geometry.rotateX(-Math.PI/2);}
  const position=geometry.attributes.position,colors=[],grass=new THREE.Color('#91a76e'),hill=new THREE.Color('#748e62'),sand=new THREE.Color('#c0b48a');
  for(let i=0;i<position.count;i++){
    const x=position.getX(i)+x0,z=position.getZ(i)+z0,height=terrainHeight(x,z,city);
    // Flat city roads/footings sit at grade even when production has no streamed
    // detail ground. Only rolling distant terrain needs a larger LOD overlap.
    const overlap=lower?(height<0?lower:Math.min(lower,.002+height*.1)):0;position.setY(i,height-overlap);
    const color=shoreDistance(x,z)<25?sand:grass.clone().lerp(hill,Math.min(1,Math.max(0,height)/60));
    const noise=.94+hashWorld(Math.round(x/7),Math.round(z/7),3)*.10;colors.push(color.r*noise,color.g*noise,color.b*noise);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();return geometry;
}

/** Production calls this with includeCore:false, because its animated Day 2
 * set already supplies the exact stage and two civic buildings. Exploration
 * uses includeCore:true. Both use these same roads, foundations and coastline. */
export function createCapitalContext(options={}){
  const {parent,includeCore=false,city='jakarta'}=options,resources=resourceSets(options),{geometries,materials,textures}=resources;
  const root=new THREE.Group();root.name='RepublicCapitalContext';parent?.add(root);
  const occluders=[],colliders=[],surfaces=[],g=republicGeometry({...resources,occluders});
  const {box,cylinder,beam,group}=g;
  const sign=(...args)=>{const object=g.sign(...args);for(const mat of Array.isArray(object.material)?object.material:[object.material])if(mat.map)mat.color.set('#ffffff');return object;};
  const ocean=box(root,'RepublicSea','#659ca9',[0,-1.3,0],[50000,.25,50000],{roughness:.38});ocean.castShadow=false;
  const landscape=terrainGeometry(0,0,5600,280,city,.55,!includeCore?{minX:-35,maxX:35,minZ:-30,maxZ:30}:null),terrain=g.mesh(root,'RepublicLandform',landscape,g.material('#ffffff',{vertexColors:true}),[0,0,0]);terrain.castShadow=false;terrain.userData.backgroundTerrain=true;
  let core=null,phase=normalizeWorldPhase(options.phase);
  const coreOccluders=[];
  {
    for(const [roadIndex,road] of CAPITAL_LAYOUT.roads.entries()){
      const [a,b]=[road.from,road.to],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const path=box(root,'CapitalGravelRoad_'+road.id,'#c8bc9e',[(a[0]+b[0])/2,.018+roadIndex*.0015,(a[1]+b[1])/2],[road.width,.036,length]);path.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);
      const vertical=a[0]===b[0];surfaces.push({minX:Math.min(a[0],b[0])-(vertical?road.width/2:0),maxX:Math.max(a[0],b[0])+(vertical?road.width/2:0),minZ:Math.min(a[1],b[1])-(vertical?0:road.width/2),maxZ:Math.max(a[1],b[1])+(vertical?0:road.width/2),y:.036+roadIndex*.0015});
      // Footpaths remain gravel; no invented finished boulevards or traffic.
      for(const side of [-1,1]){
        const offset=road.width/2+.18,dx=(b[1]-a[1])/length*offset,dz=-(b[0]-a[0])/length*offset;
        beam(root,'RoadEdge_'+road.id,'#b7aa8a',[a[0]+dx*side,.03,a[1]+dz*side],[b[0]+dx*side,.03,b[1]+dz*side],.045);
      }
    }
    const homes=group(root,'CapitalHousingFoundations');
    for(const plot of CAPITAL_LAYOUT.housingPlots){
      const p=group(homes,'Foundation_'+plot.id,[plot.x,0,plot.z]);p.userData.housingPlot=plot;
      box(p,'CompactedPlot','#b5a68a',[0,.007,0],[plot.width,.014,plot.depth]);
      for(const z of [-plot.depth/2,plot.depth/2]){box(p,'MasonryStrip','#9c9f91',[0,.095,z],[plot.width,.19,.28]);surfaces.push({minX:plot.x-plot.width/2,maxX:plot.x+plot.width/2,minZ:plot.z+z-.14,maxZ:plot.z+z+.14,y:.19});}
      for(const x of [-plot.width/2,0,plot.width/2]){box(p,'MasonryStrip','#a5a598',[x,.095,0],[.28,.19,plot.depth]);surfaces.push({minX:plot.x+x-.14,maxX:plot.x+x+.14,minZ:plot.z-plot.depth/2,maxZ:plot.z+plot.depth/2,y:.19});}
      for(const x of [-plot.width/2,0,plot.width/2])for(const z of [-plot.depth/2,plot.depth/2]){box(p,'FootingStone','#8a8f85',[x,.12,z],[.45,.24,.45]);cylinder(p,'SurveyPeg','#b89a74',[x,.34,z],.027,.45);}
      sign(p,'PlotNumber_'+plot.id,[plot.id,'FONDASI'],[0,.6,plot.depth/2+.32],[1.05,.43],{background:'#ede2c5',color:'#4f6154',font:78});
      for(const x of [-.45,.45])box(p,'PlotSignLeg','#7f7059',[x,.27,plot.depth/2+.32],[.04,.54,.04]);
    }
    for(const zone of CAPITAL_LAYOUT.zones.filter(z=>z.status==='planned')){
      const {rect:r}=zone,p=group(root,'PlannedZone_'+zone.id);
      p.userData.zone=zone.id;
      for(const x of [r.x-r.width/2,r.x+r.width/2])for(const z of [r.z-r.depth/2,r.z+r.depth/2]){
        box(p,'PlanningStake','#b99464',[x,.38,z],[.09,.76,.09]);box(p,'PlanningStakeRed','#b74c47',[x,.69,z],[.094,.17,.094]);
      }
      const label=sign(p,'ZoneSign_'+zone.id,[zone.name.toUpperCase(),'LAHAN RENCANA • BELUM DIBANGUN'],[r.x,1.24,r.z+r.depth/2],[5.6,.95],{background:'#eae4cf',color:'#3b655e',font:62});
      for(const dx of [-2.3,2.3])box(p,'ZoneSignPost','#816f54',[r.x+dx,.63,r.z+r.depth/2],[.085,1.26,.085]);
      colliders.push({minX:r.x-2.8,maxX:r.x+2.8,minZ:r.z+r.depth/2-.12,maxZ:r.z+r.depth/2+.12,minY:.75,maxY:1.8});
    }
    const welcome=group(root,'CapitalWelcome',[8,0,12.9]);
    sign(welcome,'CapitalWelcomeSign',[CAPITAL_LAYOUT.name.toUpperCase(),'IBU KOTA REPUBLIK WKWKWK'],[0,1.7,0],[5.7,1.05],{background:'#294f58',color:'#f5e9ce',font:74});
    for(const x of [-2.35,2.35])box(welcome,'WelcomePost','#877252',[x,.85,0],[.14,1.7,.14]);
    colliders.push({minX:5.05,maxX:10.95,minZ:12.75,maxZ:13.05,maxY:2.24});
    // Wayfinding does not masquerade as finished city infrastructure.
    sign(root,'CapitalWayfinding',['← ALUN-ALUN','FONDASI WARGA ↑','LAHAN PASAR →'],[14.2,1.25,7.2],[2.3,1.2],{background:'#446f6c',color:'#f5ead3',font:76});
    box(root,'WayfindingPost','#84725a',[14.2,.6,7.2],[.1,1.2,.1]);
    if(includeCore){
      core=createRepublicCivicCenter({owned:root,...resources});coreOccluders.push(...core.occluders);occluders.push(...core.occluders);
      surfaces.push({minX:-3.5,maxX:13.5,minZ:2,maxZ:4.6,y:.024},{minX:-7.5,maxX:1.5,minZ:-.1,maxZ:5.9,y:.036});
      surfaces.push({minX:-7.5,maxX:-2.5,minZ:-2.5,maxZ:.5,y:.615});
      for(let i=0;i<4;i++)surfaces.push({minX:-1.6-i*.3,maxX:-1.3-i*.3,minZ:-.875,maxZ:.275,y:.15*(i+1)});
      for(const [x,z,s] of [[-14,-5,1],[13,-13,1.2],[-1,-17,1.4],[14,8,1]])colliders.push({x,z,radius:.20*s,maxY:4});
    }
  }
  // Every destination is on this same world. Entry points do not clone the map.
  for(const destination of Object.values(WORLD_DESTINATIONS).filter(d=>d.id!=='jakarta')){
    const {x:cx,z:cz}=destination.center;
    const landmark=group(root,'FutureCityLandmark_'+destination.id,[cx,0,cz]);landmark.userData.destination=destination.id;
    cylinder(landmark,'SurveyStone','#a5a498',[0,.33,0],1,.66);
    sign(landmark,'FutureCitySign_'+destination.id,[destination.name.toUpperCase(),'LAHAN KOTA MASA DEPAN','BELUM ADA PEMBANGUNAN'],[0,1.8,0],[5.8,1.45],{background:'#385b60',color:'#f5ead0',font:66});
    for(const x of [-2.45,2.45])box(landmark,'FutureCitySignPost','#89785f',[x,.9,0],[.12,1.8,.12]);
    for(const [x,z] of [[-14,-14],[14,-14],[14,14],[-14,14]]){box(landmark,'FutureSurveyStake','#b99a70',[x,.3,z],[.09,.6,.09]);box(landmark,'FutureSurveyMarker','#bc6651',[x,.55,z],[.1,.1,.1]);}
    colliders.push({minX:cx-3,maxX:cx+3,minZ:cz-.15,maxZ:cz+.15,maxY:2.6},{x:cx,z:cz,radius:1,maxY:.66});
  }
  for(const route of WORLD_ROUTES){
    const vertices=[],indices=[],half=route.width/2;
    for(let part=1;part<route.points.length;part++){
      const a=route.points[part-1],b=route.points[part],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.ceil(length/4),nx=dz/length*half,nz=-dx/length*half,offset=vertices.length/3;
      for(let i=0;i<=steps;i++)for(const side of [-1,1]){const x=a[0]+dx*i/steps+side*nx,z=a[1]+dz*i/steps+side*nz;vertices.push(x,terrainHeight(x,z)+route.elevation,z);}
      for(let i=0;i<steps;i++){const n=offset+i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const road=g.mesh(root,'RegionalRoute_'+route.id,geometry,g.material('#b9a682',{side:THREE.DoubleSide}),[0,0,0],[1,1,1],false);road.castShadow=false;road.userData.route=route.id;
  }
  for(const district of WORLD_DISTRICTS.filter(d=>d.kind!=='urban')){
    const {x,z}=district.entry,y=terrainHeight(x,z);const marker=group(root,'RegionalDistrict_'+district.id,[x+4,y,z-4]);
    sign(marker,'RegionalDistrictSign',[district.name.toUpperCase(),district.kind==='village'?'LAHAN DESA ? BELUM DIBANGUN':'JALUR JELAJAH'],[0,1.45,0],[4.8,.85],{background:'#3e6655',color:'#f2ecd5',font:66});
    for(const dx of [-2,2])box(marker,'TrailSignPost','#8b7754',[dx,.72,0],[.09,1.44,.09]);
    colliders.push({minX:x+1.6,maxX:x+6.4,minZ:z-4.1,maxZ:z-3.9,maxY:y+1.9});
    if(district.kind==='village')for(const dx of [-20,15])for(const dz of [15,36])for(const sx of [-4,4])for(const sz of [-4,4]){const xx=x+dx+sx,zz=z+dz+sz;box(root,'VillagePlannedPlotPeg','#b69b70',[xx,terrainHeight(xx,zz)+.22,zz],[.08,.44,.08]);}
  }
  const staticColliderCount=colliders.length,staticSurfaceCount=surfaces.length;
  function setPhase(value){
    phase=normalizeWorldPhase(value);root.userData.phase=phase;if(!core)return;
    const after=phase==='after-day2';
    core.setPhase(phase);
    colliders.length=staticColliderCount;surfaces.length=staticSurfaceCount;
    if(after){
      for(const spec of [CAPITAL_LAYOUT.koplak,CAPITAL_LAYOUT.sppg])surfaces.push({minX:spec.x-spec.width/2,maxX:spec.x+spec.width/2,minZ:spec.z-spec.depth/2,maxZ:spec.z+spec.depth/2,y:.24});
      for(const spec of [CAPITAL_LAYOUT.koplak,CAPITAL_LAYOUT.sppg])surfaces.push({minX:spec.x-spec.width/2-.25,maxX:spec.x+spec.width/2+.25,minZ:spec.z+spec.depth/2,maxZ:spec.z+spec.depth/2+1.8,y:.05});
      root.updateMatrixWorld(true);
      core.root.traverse(o=>{
        if(after&&['Koplak_retail_shelf','Koplak_checkout'].includes(o.name)){
          const b=new THREE.Box3().setFromObject(o);colliders.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,minY:b.min.y,maxY:b.max.y,name:o.name});return;
        }
        if(!o.isMesh||!o.visible)return;
        if(/finished_wall|_column_|_door_leaf|SPPG_stainless_worktop/.test(o.name)){
          for(let a=o.parent;a;a=a.parent)if(!a.visible)return;
          const b=new THREE.Box3().setFromObject(o);if(b.min.y>2)return;
          colliders.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,minY:b.min.y,maxY:b.max.y,name:o.name});
        }
      });
    }
    root.updateMatrixWorld(true);
  }
  // Background land is analytic for movement/camera and never a wall ray target.
  for(let i=occluders.length-1;i>=0;i--)if(occluders[i].userData.backgroundTerrain||occluders[i].name==='RepublicSea')occluders.splice(i,1);
  setPhase(phase);
  let disposed=false;
  return {root,core,occluders,colliders,surfaces,resources,setPhase,get phase(){return phase;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();}};
}
export const buildCapitalContext=createCapitalContext;

/** Bounded residency: the countryside is streamed, not a huge set of live meshes.
 * Geometry evicted here is owned by the chunk, never by avatar/shared resources. */
export function createRepublicTerrainStream({parent,city='jakarta',radius=2,size=64,reservedBounds=[]}={}){
  const root=new THREE.Group();root.name='RepublicStreamedTerrain';parent?.add(root);
  const terrainMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});
  const trunkGeometry=new THREE.CylinderGeometry(.17,.24,2.8,7),crownGeometry=new THREE.IcosahedronGeometry(1.6,1),rockGeometry=new THREE.IcosahedronGeometry(.65,0);
  const trunkMaterial=new THREE.MeshStandardMaterial({color:'#77664d',roughness:1}),crownMaterial=new THREE.MeshStandardMaterial({color:'#668854',roughness:1}),rockMaterial=new THREE.MeshStandardMaterial({color:'#9b9d87',roughness:1});
  const chunks=new Map(),colliders=[],dummy=new THREE.Object3D();let current='',disposed=false;
  function createChunk(key){
    const [cx,cz]=key.split(',').map(Number),x0=(cx+.5)*size,z0=(cz+.5)*size,group=new THREE.Group();group.name='TerrainChunk_'+key;
    const geometry=terrainGeometry(x0,z0,size,12,city),mesh=new THREE.Mesh(geometry,terrainMaterial);mesh.position.set(x0,0,z0);mesh.receiveShadow=true;group.add(mesh);
    const trees=[],rocks=[];
    const inForest=WORLD_DISTRICTS.some(d=>d.kind==='forest'&&Math.abs(x0-d.rect.x)<d.rect.width/2+size&&Math.abs(z0-d.rect.z)<d.rect.depth/2+size);
    for(let i=0;i<(inForest?70:22);i++){
      const x=cx*size+hashWorld(cx*23+i,cz,21)*size,z=cz*size+hashWorld(cx,cz*31+i,37)*size,h=terrainHeight(x,z,city);
      if(h<.35&&Math.hypot(x,z)>580||isReservedGround(x,z,city)||reservedBounds.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ))continue;
      const scale=.75+hashWorld(cx+i,cz-i,13)*.55;if(i%4===0)rocks.push({x,z,h,scale});else trees.push({x,z,h,scale});
    }
    const trunk=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,trees.length),crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,trees.length),stones=new THREE.InstancedMesh(rockGeometry,rockMaterial,rocks.length);
    trunk.name='StreamedTreeTrunks';crowns.name='StreamedTreeCanopies';stones.name='StreamedRocks';
    trees.forEach((t,i)=>{dummy.position.set(t.x,t.h+1.4*t.scale,t.z);dummy.scale.setScalar(t.scale);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);dummy.position.y=t.h+3.1*t.scale;dummy.scale.set(t.scale,1.12*t.scale,t.scale);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);});
    rocks.forEach((t,i)=>{dummy.position.set(t.x,t.h+.25,t.z);dummy.scale.set(t.scale,t.scale*.75,t.scale);dummy.rotation.set(.1,hashWorld(i,cx,7)*6,.15);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);});
    for(const item of [trunk,crowns,stones]){item.castShadow=item.receiveShadow=true;item.computeBoundingSphere();group.add(item);}
    root.add(group);return {group,geometry,colliders:[...trees.map(t=>({x:t.x,z:t.z,radius:.22*t.scale,maxY:t.h+4})),...rocks.map(t=>({x:t.x,z:t.z,radius:.57*t.scale,maxY:t.h+.7}))]};
  }
  function update(x,z){
    if(disposed)return false;const key=`${Math.floor(x/size)},${Math.floor(z/size)}`;if(key===current)return false;current=key;
    const wanted=new Set(terrainChunkKeys(x,z,size,radius));
    for(const [id,chunk] of chunks)if(!wanted.has(id)){chunk.group.removeFromParent();chunk.geometry.dispose();chunks.delete(id);}
    for(const id of wanted)if(!chunks.has(id))chunks.set(id,createChunk(id));
    colliders.length=0;for(const chunk of chunks.values())colliders.push(...chunk.colliders);return true;
  }
  return {root,chunks,colliders,update,get count(){return chunks.size;},dispose(){if(disposed)return;disposed=true;for(const c of chunks.values())c.geometry.dispose();chunks.clear();colliders.length=0;root.removeFromParent();for(const r of [terrainMaterial,trunkGeometry,crownGeometry,rockGeometry,trunkMaterial,crownMaterial,rockMaterial])r.dispose();}};
}
