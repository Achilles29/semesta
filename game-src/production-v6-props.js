/** Owned cinematic scenery and analytic limb targets. No mutation of stored town assets. */
export function createV6Props(THREE,production){
  const group=new THREE.Group();group.name='EpisodeV6Warung';production.group.add(group);group.visible=false;
  const mats=new Map(),geo=new Set();
  function mesh(parent,geometry,color,pos=[0,0,0]){
    geo.add(geometry);if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.86}));
    const o=new THREE.Mesh(geometry,mats.get(color));o.position.fromArray(pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  const box=(p,c,x,y,z,w,h,d)=>mesh(p,new THREE.BoxGeometry(w,h,d),c,[x,y,z]);
  // Open-sided shop; canopy is behind performers and does not cover their faces.
  box(group,'#bd946c',-48, .62,-102.1,4.9,1.24,.55);
  for(const x of [-50.6,-45.4])box(group,'#77573b',x,1.55,-102.25,.10,3.1,.1);
  for(let i=0;i<12;i++)box(group,i%2?'#f0ddb1':'#ac624f',-50.53+i*.46,3.1,-102.1,.46,.10,1.1);
  for(let i=0;i<6;i++)mesh(group,new THREE.CylinderGeometry(.11,.1,.2,10),i%2?'#c9e3d3':'#ddaa65',[-49.8+i*.65,1.35,-102.1]);
  const chair=new THREE.Group();chair.name='V6HeroChair';group.add(chair);
  box(chair,'#b56c4a',0,.48,0,.68,.10,.62);
  box(chair,'#b56c4a',0,.87,-.27,.68,.70,.08);
  for(const x of [-.27,.27])for(const z of [-.24,.24])box(chair,'#614739',x,.23,z,.07,.46,.07);
  const broom=new THREE.Group();broom.name='V6Broom';group.add(broom);
  mesh(broom,new THREE.CylinderGeometry(.018,.02,1.25,8),'#b08b56',[0,.65,0]);
  box(broom,'#ac854a',0,.10,0,.34,.18,.07);
  for(let i=0;i<10;i++)box(broom,'#d3b773',-.15+i*.033,.03,.015,.017,.11,.07);
  const table=new THREE.Group();table.position.set(-46.6,0,-98.5);group.add(table);
  box(table,'#9a7551',0,.72,0,.95,.08,.75);
  for(const x of [-.37,.37])for(const z of [-.27,.27])box(table,'#674e39',x,.35,z,.07,.7,.07);
  // Drinks exist before pickup, on a separate serving stand rather than in mid-air.
  box(group,'#9a7551',-46.6,.72,-99.25,.68,.08,.42);
  box(group,'#674e39',-46.6,.35,-99.25,.09,.7,.09);
  box(group,'#674e39',-46.6,.06,-99.25,.47,.06,.32);
  const tray=new THREE.Group();tray.name='V6Tray';group.add(tray);
  box(tray,'#7dada3',0,0,0,.58,.035,.34);
  for(const x of [-.15,.15]){
    mesh(tray,new THREE.CylinderGeometry(.075,.055,.21,12),'#b97536',[x,.115,0]);
    mesh(tray,new THREE.CylinderGeometry(.08,.08,.015,12),'#e6d7ae',[x,.225,0]);
    mesh(tray,new THREE.CylinderGeometry(.008,.008,.27,6),'#f0ddbf',[x+.025,.19,0]);
  }
  const litter=[];
  for(let i=0;i<9;i++){
    const o=box(group,i%2?'#c3a463':'#eee0c9',-48.45+(i%3)*.25,.085,-99.3+Math.floor(i/3)*.18,.11,.012,.07);o.rotation.y=i*.8;litter.push(o);
  }
  const rigs=new Map();
  for(const npc of production.cast){
    const bones=[];npc.model.figure.traverse(n=>{if(n.isBone)bones.push({n,p:n.position.clone(),q:n.quaternion.clone()});});rigs.set(npc.id,bones);
  }
  function reset(npc){for(const {n,p,q} of rigs.get(npc.id)??[]){n.position.copy(p);n.quaternion.copy(q);}}
  function pointBone(bone,child,target){
    const origin=bone.getWorldPosition(new THREE.Vector3()),current=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const desired=target.clone().sub(origin).normalize();
    const parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const worldQ=bone.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parentQ.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(current,desired).multiply(worldQ)));
    bone.updateWorldMatrix(false,true);
  }
  function limb(figure,upperName,lowerName,endName,target,pole){
    const upper=figure.getObjectByName(upperName),lower=figure.getObjectByName(lowerName),end=figure.getObjectByName(endName);
    if(!upper||!lower||!end)return;
    figure.updateWorldMatrix(true,true);
    const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),aim=new THREE.Vector3().fromArray(target).sub(a);
    const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,aim.length()));aim.normalize();
    const endTarget=a.clone().addScaledVector(aim,distance);
    const bend=new THREE.Vector3().fromArray(pole).sub(a);bend.addScaledVector(aim,-bend.dot(aim)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const elbow=a.clone().addScaledVector(aim,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
    pointBone(upper,lower,elbow);pointBone(lower,end,endTarget);
  }
  function pose(npc,sample){
    for(const [side,target] of Object.entries(sample.handTargets??{})){
      limb(npc.model.figure,'upper_arm'+side,'forearm'+side,'hand'+side,target,[sample.x+(side==='L'?.65:-.65),.85,sample.z+.15]);
    }
    if(sample.seated||sample.crouch){
      for(const side of ['L','R']){
        const sign=side==='L'?1:-1;
        const forward=sample.seated?.46*sample.seated:.07;
        limb(npc.model.figure,'thigh'+side,'calf'+side,'foot'+side,[sample.x+sign*.16,.12,sample.z+forward],[sample.x+sign*.16,.55,sample.z+1]);
      }
    }
  }
  function update(shot){
    chair.position.fromArray(shot.props.chair);broom.position.fromArray(shot.props.broom);
    broom.visible=shot.props.broomVisible;tray.position.fromArray(shot.props.tray);tray.visible=shot.props.trayVisible;
    litter.forEach((o,i)=>{o.visible=shot.props.litter>(i+.5)/litter.length;});
    // One listener claps; the rest of the crowd continues its staggered routine.
    const extra=production.neighborhood?.extras[0];
    if(extra&&shot.props.clap){
      const a=extra.model.actions.Interact;if(a){extra.model.mixer.stopAllAction();a.reset().play();a.time=shot.time%a.getClip().duration;extra.model.mixer.update(0);extra.model.activeAction='Interact';}
    }
  }
  return {group,reset,pose,update,dispose(){group.removeFromParent();for(const g of geo)g.dispose();for(const m of mats.values())m.dispose();}};
}
