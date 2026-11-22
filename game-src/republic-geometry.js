import * as THREE from 'three';

/** Owned, episode-independent geometry shared by the republic and the filmed sets. */
export function republicGeometry({geometries,materials,textures,occluders}){
  const palette=new Map(),shapes=new Map();
  const material=(color,extra={})=>{
    const key=JSON.stringify([color,extra]);
    if(!palette.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness:.76,...extra});palette.set(key,m);materials.add(m);}
    return palette.get(key);
  };
  const geometry=(key,create)=>{if(!shapes.has(key)){const g=create();shapes.set(key,g);geometries.add(g);}return shapes.get(key);};
  function mesh(parent,name,g,m,pos=[0,0,0],size=[1,1,1],opaque=true){
    geometries.add(g);materials.add(m);const o=new THREE.Mesh(g,m);o.name=name;o.position.fromArray(pos);o.scale.fromArray(size);o.castShadow=o.receiveShadow=true;parent.add(o);
    if(opaque)occluders.push(o);return o;
  }
  const box=(parent,name,color,pos,size,extra={})=>mesh(parent,name,geometry('box',()=>new THREE.BoxGeometry(1,1,1)),material(color,extra),pos,size,!extra.transparent);
  const ball=(parent,name,color,pos,size)=>mesh(parent,name,geometry('sphere',()=>new THREE.SphereGeometry(1,12,8)),material(color),pos,size);
  const cylinder=(parent,name,color,pos,radius,height,extra={})=>mesh(parent,name,geometry('cylinder',()=>new THREE.CylinderGeometry(1,1,1,12)),material(color,extra),pos,[radius,height,radius],!extra.transparent);
  function beam(parent,name,color,a,b,radius=.025){
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const o=cylinder(parent,name,color,av.clone().add(bv).multiplyScalar(.5).toArray(),radius,delta.length());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  }
  const group=(parent,name,pos=[0,0,0])=>{const o=new THREE.Group();o.name=name;o.position.fromArray(pos);parent.add(o);return o;};
  function sign(parent,name,lines,pos,size,{background='#f5f2ea',color='#173748',font=58}={}){
    const o=box(parent,name,background,pos,[size[0],size[1],.035]);o.userData.signLines=lines;o.userData.signColor=color;o.userData.signBackground=background;
    const canvas=globalThis.document?.createElement('canvas'),ctx=canvas?.getContext('2d');
    if(ctx){
      canvas.width=1024;canvas.height=Math.max(128,Math.round(1024*size[1]/size[0]));
      ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
      const height=canvas.height/(lines.length+1);ctx.font=`800 ${Math.min(font,height*.74)}px Arial`;
      lines.forEach((line,i)=>ctx.fillText(line,512,height*(i+1),960));
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
      const front=material('#ffffff').clone();front.map=texture;front.needsUpdate=true;materials.add(front);
      o.material=[o.material,o.material,o.material,o.material,front,o.material];
    }
    return o;
  }
  function triangle(parent,name,color,points){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2]);g.computeVertexNormals();return mesh(parent,name,g,material(color,{side:THREE.DoubleSide}));
  }
  function phase(obj,from,to=Infinity){obj.userData.buildFrom=from;obj.userData.buildUntil=to;return obj;}
  const trackTexture=texture=>textures.add(texture);
  return {material,geometry,mesh,box,ball,cylinder,beam,group,sign,triangle,phase,trackTexture};
}

