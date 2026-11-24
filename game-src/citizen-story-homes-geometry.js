import {buildSignatureHome,signatureHome} from './signature-homes.js';
import {republicGeometry} from './republic-geometry.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {STORY_HOMES,STORY_ROADS,storyHomeGround} from './citizen-story-homes.js';
import {terrainHeight} from './republic-world-layout.js';

/** Public exteriors only. Instancing shares walls/roofs; one atlas holds names. */
export function createStoryHomes({scene,city='jakarta'}={}){
  const root=new THREE.Group();root.name='KampungPerintis';scene?.add(root);
  const colliders=[],surfaces=[],occluders=[],materials=[],geometries=[],textures=[],batches=new Map();
  const cube=new THREE.BoxGeometry(1,1,1);geometries.push(cube);
  const shape=new THREE.Shape();shape.moveTo(-4.4,0);shape.lineTo(4.4,0);shape.lineTo(0,2);shape.closePath();
  const gable=new THREE.ShapeGeometry(shape);geometries.push(gable);
  function add(color,position,size,rotation=0,geo=cube,yaw=0){
    const key=color+geo.uuid;if(!batches.has(key))batches.set(key,{color,geo,items:[]});
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,rotation)),new THREE.Vector3(...size));
    batches.get(key).items.push(matrix);
  }
  const specialResources={geometries:new Set(),materials:new Set(),textures:new Set()};const sg=republicGeometry({...specialResources,occluders});
  if(city==='jakarta'){
    for(const h of STORY_HOMES){
      const y=storyHomeGround(h),wall=['#e7d6b5','#d9dfcb','#dfc9b8','#cadbd9'][h.style],roof=['#9f5943','#58676b','#a87348','#65745d'][h.style];
      const minY=Math.min(...[-4,4].flatMap(x=>[-4,4].map(z=>terrainHeight(h.x+x,h.z+z))))-.12;
      add('#a79b87',[h.x,(minY+y)/2,h.z],[8.5,y-minY,8.5]);
      if(signatureHome(h)){const building=sg.group(root,h.id,[h.x,y,h.z]),special=buildSignatureHome(sg,building,h);colliders.push({minX:h.x-4,maxX:h.x+4,minZ:h.z-4,maxZ:h.z+4,minY,maxY:y+special.height});continue;}
      add(wall,[h.x,y+1.55,h.z],[8,3.1,8]);
      add('#b8a78b',[h.x,y+.22,h.z+4.06],[8,.3,.12]);
      for(const sign of [-1,1]){
        add(roof,[h.x+sign*2.2,y+4.1,h.z],[Math.hypot(4.4,2),.18,9],-sign*Math.atan2(2,4.4));
        add(wall,[h.x,y+3.1,h.z+sign*4],[1,1,1],0,gable,sign<0?Math.PI:0);
        add('#395b58',[h.x+sign*2.5,y+1.8,h.z+4.08],[1.8,1.4,.15]);
        add('#a9ccce',[h.x+sign*2.5,y+1.8,h.z+4.17],[1.55,1.16,.04]);
        add('#f4e7cc',[h.x+sign*2.5,y+1.8,h.z+4.21],[.07,1.2,.04]);
        add('#c8b797',[h.x+sign*2.5,y+1.07,h.z+4.22],[2,.12,.4]);
      }
      add('#705545',[h.x,y+1.15,h.z+4.08],[1.35,2.3,.15]);
      add('#dfb76c',[h.x+.42,y+1.13,h.z+4.2],[.08,.16,.06]);
      add(roof,[h.x,y+2.8,h.z+4.7],[2.7,.13,1.8]);
      add('#736954',[h.x,y+5.14,h.z],[.22,.14,9]);
      // The path follows the actual terrain; the unclaimed house door stays closed.
      for(let k=0;k<4;k++){const z=h.z+4.5+k*.45;add('#cbbd9f',[h.x,terrainHeight(h.x,z)+.035,z],[2,.07,.46]);}
      colliders.push({minX:h.x-4.25,maxX:h.x+4.25,minZ:h.z-4.25,maxZ:h.z+4.25,minY,maxY:y+5.3});
    }
    for(const road of STORY_ROADS){
      const [a,b]=[road.from,road.to],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/2),vertices=[],indices=[];
      for(let i=0;i<=steps;i++)for(const s of [-1,1]){const x=a[0]+(b[0]-a[0])*i/steps-s*(b[1]-a[1])/length*road.width/2,z=a[1]+(b[1]-a[1])*i/steps+s*(b[0]-a[0])/length*road.width/2;vertices.push(x,terrainHeight(x,z)+.025,z);}
      for(let i=0;i<steps;i++){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometries.push(geometry);
      const material=new THREE.MeshStandardMaterial({color:'#c4b99c',side:THREE.DoubleSide});materials.push(material);const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;root.add(mesh);
    }
    // A single texture/mesh for all 48 nameplates; no floating long-range labels.
    const canvas=globalThis.document?.createElement('canvas'),ctx=canvas?.getContext('2d');
    if(ctx){
      canvas.width=2048;canvas.height=768;ctx.fillStyle='#244d50';ctx.fillRect(0,0,2048,768);
      const planes=[];
      STORY_HOMES.forEach((h,i)=>{
        const col=i%8,row=Math.floor(i/8),x=col*256,y=row*128;
        ctx.fillStyle='#e6cc90';ctx.fillRect(x+8,y+9,240,2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px sans-serif';ctx.fillText('RUMAH',x+128,y+30);
        let font=27;do{ctx.font=`bold ${font--}px sans-serif`;}while(ctx.measureText(h.name).width>232&&font>12);
        ctx.fillStyle='#fff4d9';ctx.fillText(h.name,x+128,y+66);ctx.font='15px sans-serif';ctx.fillStyle='#d6d9c8';ctx.fillText(h.address.replace('Kampung Perintis ','PERINTIS '),x+128,y+104);
        const plane=new THREE.PlaneGeometry(2.5,1.25),uv=plane.attributes.uv;
        for(let j=0;j<uv.count;j++)uv.setXY(j,(col+uv.getX(j))/8,1-(row+1-uv.getY(j))/6);
        plane.translate(h.x,storyHomeGround(h)+3.65,h.z+4.12);planes.push(plane);
      });
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
      const geometry=mergeGeometries(planes);planes.forEach(p=>p.dispose());geometries.push(geometry);
      const material=new THREE.MeshBasicMaterial({map:texture});materials.push(material);const mesh=new THREE.Mesh(geometry,material);mesh.name='ResidentNameplates';root.add(mesh);
    }
  }
  for(const {color,geo,items} of batches.values()){
    const material=new THREE.MeshStandardMaterial({color,roughness:.88,side:geo===gable?THREE.DoubleSide:THREE.FrontSide});materials.push(material);
    const mesh=new THREE.InstancedMesh(geo,material,items.length);items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);occluders.push(mesh);
  }
  let disposed=false;return {root,colliders,surfaces,occluders,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());Object.values(specialResources).forEach(set=>set.forEach(r=>r.dispose()));}};
}
