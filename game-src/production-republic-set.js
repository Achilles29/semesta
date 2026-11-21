import * as THREE from 'three';

/** Code-native set, no remote textures. Ownership is handed to the stage disposer. */
export function buildRepublicSet({owned,geometries,materials,textures,box,office=true}){
  const sphere=(color,pos,size)=>{
    const g=new THREE.SphereGeometry(1,14,10),m=new THREE.MeshStandardMaterial({color,roughness:1});geometries.add(g);materials.add(m);
    const mesh=new THREE.Mesh(g,m);mesh.position.fromArray(pos);mesh.scale.fromArray(size);mesh.castShadow=mesh.receiveShadow=true;owned.add(mesh);return mesh;
  };
  const sign=(text,pos,width,height)=>{
    box('#74503b',[pos[0],pos[1]/2,pos[2]],[.08,pos[1],.1]);
    const panel=box('#f6e4b9',pos,[width,height,.09]);panel.name=text;
    // CPU tests have no canvas; geometry/positions stay testable independently.
    const canvas=globalThis.document?.createElement('canvas');const ctx=canvas?.getContext('2d');
    if(ctx){canvas.width=1024;canvas.height=256;ctx.fillStyle='#f6e4b9';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#38544d';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 66px Arial';ctx.fillText(text,512,128,950);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);panel.material.map=texture;panel.material.needsUpdate=true;}
    return panel;
  };
  box('#869776',[0,-.09,0],[100,.16,100]);
  // A broad clearing and a connected arrival path, kept empty for future episodes.
  const clearing=sphere('#c8ba99',[0,-.1,-.6],[5.3,.12,4.1]);clearing.name='RepublicClearing';
  const path=box('#c6b38e',[-4.1,-.005,-2.8],[1.5,.018,9]);path.rotation.y=-.7;path.name='ArrivalPath';
  for(let i=0;i<42;i++){
    const angle=i*2.399963,r=6+(i%5)*1.3,x=Math.cos(angle)*r,z=Math.sin(angle)*r-3;
    sphere(i%2?'#75916c':'#8da07a',[x,.06,z],[.35+(i%3)*.12,.18,.4]);
  }
  const tree=(x,z,scale=1)=>{
    const trunk=box('#796047',[x,1.65*scale,z],[.32*scale,3.3*scale,.35*scale]);trunk.rotation.z=-.035;
    for(let i=0;i<5;i++)sphere(i%2?'#547b52':'#658959',[x+Math.cos(i*2.4)*.65*scale,(3.1+(i%2)*.4)*scale,z+Math.sin(i*2.4)*.65*scale],[1.35*scale,.85*scale,1.2*scale]);
  };
  tree(3.1,-3.6);tree(-8,-8,1.1);tree(9,-11,1.4);
  sign('REPUBLIK WKWKWK',[-2.3,1.75,-3.4],2.3,.52);
  if(office){
    const x=2.1,z=-1.8;
    const seat=box('#e6e6d5',[x,.46,z],[.52,.075,.52]);seat.name='TemporaryOfficeChair';
    for(const dx of [-.21,.21])for(const dz of [-.2,.2]){const leg=box('#d0d5c8',[x+dx,.23,z+dz],[.055,.46,.055]);leg.rotation.z=dx*.25;}
    for(const dx of [-.22,.22])box('#e6e6d5',[x+dx,.71,z-.23],[.055,.53,.055]);
    for(const y of [.7,.83,.95])box('#e6e6d5',[x,y,z-.23],[.48,.09,.065]);
    sign('KANTOR SEMENTARA',[2.95,.8,-1.85],1.25,.35);
  }
}
