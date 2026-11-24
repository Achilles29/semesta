import * as THREE from 'three';
import {REPUBLIC_PALETTE as P,REPUBLIC_RIVER as R,REPUBLIC_LAKE as L,REPUBLIC_PARKS,waterDistance} from './republic-nature-layout.js';
import {terrainHeight,hashWorld,isReservedGround,regionalRoadDistance} from './republic-world-layout.js';

/** Batched silhouettes: wide rain trees, slender palms, emergents and gardens. */
export function createNatureInstances(points){
  const root=new THREE.Group();root.name='RepublicTropicalCanopy';
  const resources=[],meshes=[],dummy=new THREE.Object3D(),color=new THREE.Color();
  const make=(name,geometry,base,items)=>{const mat=new THREE.MeshStandardMaterial({color:base,roughness:1});const mesh=new THREE.InstancedMesh(geometry,mat,items.length);mesh.name=name;
    items.forEach((t,i)=>{dummy.position.set(...t.position);dummy.rotation.set(...(t.rotation||[0,0,0]));dummy.scale.set(...t.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(t.color)mesh.setColorAt(i,color.set(t.color));});
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);resources.push(geometry,mat);meshes.push(mesh);return mesh;};
  const trunks=[],crowns=[],fronds=[],flowers=[],colliders=[];
  for(const [i,p] of points.entries()){
    const type=p.type??i%4,s=p.scale||1,h=p.h??terrainHeight(p.x,p.z),height=([6,13,24,1.2][type])*s;
    if(type!==3){trunks.push({position:[p.x,h+height*.45,p.z],scale:[type===2?.65*s:.23*s,height*.9,type===2?.65*s:.23*s]});colliders.push({x:p.x,z:p.z,radius:type===2?.7*s:.3*s,maxY:h+height});}
    if(type===1){for(let k=0;k<6;k++)fronds.push({position:[p.x+Math.sin(k*Math.PI/3)*1.1*s,h+height,p.z+Math.cos(k*Math.PI/3)*1.1*s],scale:[.45*s,.12*s,2.3*s],rotation:[-.18,k*Math.PI/3,.08],color:k%2?P.leaf:P.leafLight});}
    else if(type===3){for(let k=0;k<3;k++){crowns.push({position:[p.x+(k-1)*.8*s,h+.55*s,p.z],scale:[.8*s,.6*s,.8*s],color:P.leafLight});flowers.push({position:[p.x+(k-1)*.7*s,h+1.05*s,p.z+.18],scale:[.16*s,.16*s,.16*s]});}}
    else{const radius=(type===2?5:3.3)*s;for(let k=0;k<3;k++)crowns.push({position:[p.x+Math.sin(k*2.1)*radius*.4,h+height+(k===1?.5:0)*s,p.z+Math.cos(k*2.1)*radius*.4],scale:[radius,height*.14,radius*.85],color:k%2?P.leaf:P.leafLight});}
  }
  make('TropicalTrunks',new THREE.CylinderGeometry(1,1.22,1,7),P.trunk,trunks);
  make('TropicalCrowns',new THREE.IcosahedronGeometry(1,1),P.leaf,crowns);
  make('PalmFronds',new THREE.SphereGeometry(1,7,4),P.leafLight,fronds);
  make('GardenFlowers',new THREE.IcosahedronGeometry(1,0),P.flower,flowers);
  return {root,colliders,dispose(){root.removeFromParent();for(const m of meshes)m.dispose();resources.forEach(r=>r.dispose());}};
}

export function createRepublicNature({parent,heightAt=terrainHeight}={}){
  const root=new THREE.Group();root.name='RepublicRiverAndParks';parent?.add(root);const resources=[],colliders=[];
  const mat=new THREE.MeshStandardMaterial({color:P.water,roughness:.3,metalness:.12,side:THREE.DoubleSide});resources.push(mat);
  const vertices=[],indices=[];
  R.points.forEach((p,i)=>{const a=R.points[Math.max(0,i-1)],b=R.points[Math.min(R.points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(const side of [-1,1])vertices.push(p[0]+(b[1]-a[1])/length*R.width*.5*side,-.4,p[1]-(b[0]-a[0])/length*R.width*.5*side);if(i){const n=(i-1)*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}});
  const riverGeo=new THREE.BufferGeometry();riverGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));riverGeo.setIndex(indices);riverGeo.computeVertexNormals();resources.push(riverGeo);const river=new THREE.Mesh(riverGeo,mat);river.name='SungaiNgalir';root.add(river);
  const lakeGeo=new THREE.CircleGeometry(1,64);lakeGeo.rotateX(-Math.PI/2);resources.push(lakeGeo);const lake=new THREE.Mesh(lakeGeo,mat);lake.name='DanauSantuy';lake.position.set(L.x,-.38,L.z);lake.scale.set(L.rx,1,L.rz);root.add(lake);
  // Bank colliders prevent unsupported walking under water; no swimming claim.
  for(let i=1;i<R.points.length;i++){const a=R.points[i-1],b=R.points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);for(let j=0;j<=n;j++)colliders.push({x:a[0]+(b[0]-a[0])*j/n,z:a[1]+(b[1]-a[1])*j/n,radius:10,maxY:100});}
  for(let k=0;k<36;k++)colliders.push({x:L.x+Math.cos(k*Math.PI/18)*L.rx*.92,z:L.z+Math.sin(k*Math.PI/18)*L.rz*.92,radius:9,maxY:100});
  const points=[];
  for(const park of REPUBLIC_PARKS)for(let i=0;i<24;i++){const a=i*2.399,r=park.radius*(.35+.6*hashWorld(i,31,9)),x=park.x+Math.sin(a)*r,z=park.z+Math.cos(a)*r;points.push({x,z,h:heightAt(x,z),type:i%4===0?0:3,scale:.7+hashWorld(i,7,4)*.4});}
  for(let i=0;i<95;i++){const z=-320+i*8,x=-340+Math.sin(i*.3)*25;if(waterDistance(x,z)<15||isReservedGround(x,z))continue;points.push({x,z,h:heightAt(x,z),type:i%3,scale:.8+hashWorld(i,11,2)*.5});}
  for(const x of [-125,220])for(let i=0;i<12;i++){const z=115+i*24;if(isReservedGround(x,z)||waterDistance(x,z)<20)continue;points.push({x,z,h:heightAt(x,z),type:i%4===0?0:1,scale:.9});}
  for(let i=0;i<11;i++){const x=113,z=-95+i*16;if(!isReservedGround(x,z))points.push({x,z,h:heightAt(x,z),type:1,scale:.9});}
  const grove=createNatureInstances(points);root.add(grove.root);colliders.push(...grove.colliders);
  for(let i=colliders.length-1;i>=0;i--){const c=colliders[i],r=regionalRoadDistance(c.x,c.z);if(r.distance<r.width/2+(c.radius||0)+3)colliders.splice(i,1);}
  return {root,colliders,dispose(){grove.dispose();resources.forEach(r=>r.dispose());root.removeFromParent();}};
}
