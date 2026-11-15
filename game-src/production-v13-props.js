import {createV6Props} from './production-v6-props.js';
export function createV13Props(THREE,production){
  const base=createV6Props(THREE,production),group=base.group;group.name='EpisodeV13CartAndChair';
  const geometries=new Set(),materials=new Map();
  function mesh(parent,geo,color,pos){
    geometries.add(geo);if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.86}));
    const m=new THREE.Mesh(geo,materials.get(color));m.position.fromArray(pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(p,c,pos,size)=>mesh(p,new THREE.BoxGeometry(...size),c,pos);
  const cart=new THREE.Group();cart.name='V13WarungCart';group.add(cart);
  box(cart,'#49958d',[0,.71,0],[1.05,.59,.83]);
  box(cart,'#e2c79b',[0,1.03,0],[1.15,.09,.91]);
  for(const x of [-.28,.28])box(cart,'#6b513d',[x,.94,-.56],[.055,.055,.55]);
  for(const x of [-.57,.57])box(cart,'#6b513d',[x,.96,0],[.055,.055,.44]);
  for(const x of [-.48,.48])box(cart,'#826046',[x,1.32,-.36],[.05,.6,.05]);
  box(cart,'#c87854',[0,1.65,0],[1.22,.08,1]);
  for(let i=0;i<3;i++)mesh(cart,new THREE.CylinderGeometry(.11,.1,.18,12),['#be8149','#a7b76b','#d1a755'][i],[-.33+i*.33,1.16,.05]);
  const wheels=[];
  for(const x of [-.56,.56]){
    const w=mesh(cart,new THREE.CylinderGeometry(.29,.29,.10,16),'#353b3b',[x,.29,.1]);w.rotation.z=Math.PI/2;
    const hub=mesh(w,new THREE.CylinderGeometry(.1,.1,.12,10),'#a6b5b4',[0,0,0]);
    box(w,'#9ba7a3',[0,0,0],[.5,.12,.04]);wheels.push(w);
  }
  // Ground-level broken edge and a dark inset; kept after the cart is freed.
  const hole=new THREE.Group();hole.name='V13RoadPothole';group.add(hole);
  const dark=mesh(hole,new THREE.CircleGeometry(.38,12),'#332f2b',[0,0,0]);dark.rotation.x=-Math.PI/2;dark.scale.y=.8;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const stone=box(hole,'#827969',[Math.cos(a)*.39,.025,Math.sin(a)*.31],[.15,.05,.11]);stone.rotation.y=a;}
  const cup=mesh(group,new THREE.CylinderGeometry(.075,.055,.18,12),'#dfb064',[0,0,0]);cup.name='V13KomengCup';
  const extras=production.neighborhood.extras;
  const saved=extras.map(e=>{const bones=[];e.model.figure.traverse(n=>{if(n.isBone)bones.push({n,p:n.position.clone(),q:n.quaternion.clone()});});return bones;});
  function poseExtras(shot){extras.forEach((e,i)=>{
    for(const {n,p,q} of saved[i]){n.position.copy(p);n.quaternion.copy(q);}
    const p=shot.extras[i];e.root.position.set(p.x,p.y,p.z);e.root.rotation.set(0,p.yaw,0);
    e.model.mixer.stopAllAction();const a=e.model.actions[p.clip]??e.model.actions.Idle;a.reset().play();a.time=p.phase%a.getClip().duration;e.model.mixer.update(0);
    base.pose(e,p);e.collider.x=p.x;e.collider.z=p.z;
  });}
  function resetExtras(){for(const bones of saved)for(const {n,p,q} of bones){n.position.copy(p);n.quaternion.copy(q);}}
  return {...base,poseExtras,resetExtras,update(shot){base.update(shot);cart.position.fromArray(shot.props.cart);hole.position.fromArray(shot.props.hole);cup.position.fromArray(shot.props.cup);for(const w of wheels)w.rotation.y=shot.props.roll*1.25/.29;},
    dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();base.dispose();}};
}
