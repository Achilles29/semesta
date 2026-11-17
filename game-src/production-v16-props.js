import {createGripRig} from './production-grip-rig.js';
import {V16_SET} from './production-v16-episode.js';

/** Isolated road set. The existing district is restored on exit, never saved. */
export function createV16Props(THREE,production){
  const group=new THREE.Group();group.name='V16RoadCeremony';group.visible=false;production.group.add(group);
  const materials=new Map(),geometries=new Set(),textures=new Set(),G=V16_SET.ground;
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return materials.get(color);};
  function mesh(p,geometry,color,position=[0,0,0]){geometries.add(geometry);const m=new THREE.Mesh(geometry,material(color));m.position.fromArray(position);m.castShadow=m.receiveShadow=true;p.add(m);return m;}
  const box=(p,c,pos,size)=>mesh(p,new THREE.BoxGeometry(...size),c,pos);
  box(group,'#b7b38c',[-48,.025,-100],[38,.08,35]);
  // Real aperture: ground below remains visible instead of a painted black decal.
  const road=new THREE.Shape();road.moveTo(-2.3,-12);road.lineTo(2.3,-12);road.lineTo(2.3,12);road.lineTo(-2.3,12);road.closePath();
  const hole=new THREE.Path();hole.absellipse(.88,-4,.78,1.06,0,Math.PI*2,true);road.holes.push(hole);
  const asphalt=mesh(group,new THREE.ShapeGeometry(road,48),'#62676a',[-48,G,-100]);asphalt.rotation.x=-Math.PI/2;
  const mud=mesh(group,new THREE.CircleGeometry(1,48),'#634b36',[-47.12,.08,-96]);mud.rotation.x=-Math.PI/2;mud.scale.set(.80,1.08,1);
  for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const m=mesh(group,new THREE.DodecahedronGeometry(.10,0),'#807769',[-47.12+.82*Math.cos(a),G-.025,-96+1.1*Math.sin(a)]);m.scale.set(1,.45,.7);}
  for(const x of [-50.4,-45.6])box(group,'#d5c6a4',[x,.14,-100],[.22,.28,24]);
  // The unnecessary ceremony is visible from the first establishing view.
  const stage=new THREE.Group();stage.name='V16UnnecessaryStage';stage.position.set(-53,G,-99);group.add(stage);
  box(stage,'#965f49',[0,.22,0],[3.6,.44,3]);box(stage,'#254e65',[0,1.5,-1.4],[3.6,2.6,.10]);
  for(const x of [-1.7,1.7])box(stage,'#ad8b4d',[x,1.65,0],[.08,3.3,3]);
  box(stage,'#e1c675',[0,3.25,0],[3.8,.16,3.2]);
  // Diegetic banner: the final joke points back to a real object, not a HUD card.
  box(stage,'#f3e9c8',[0,2.5,-1.30],[3.35,.64,.035]);
  if(production.createText){
    const source=production.createText('PERESMIAN JALAN','522e26','f3e9c8');
    const geometry=new THREE.PlaneGeometry(3.2,.48);geometries.add(geometry);
    const texture=source.material.map;if(texture)textures.add(texture);
    const mat=new THREE.MeshBasicMaterial({map:texture??null,transparent:true,depthWrite:false});materials.set('ceremony-banner',mat);
    const label=new THREE.Mesh(geometry,mat);label.position.set(0,2.5,-1.275);stage.add(label);
    source.material.dispose();
  }
  for(const x of [-1.45,1.45])box(stage,'#323b40',[x,.72,.8],[.42,.95,.42]);
  const ribbons=[];
  for(const sign of [-1,1]){
    const x=-47.6+sign*2.15;box(group,'#ab8845',[x,G+.65,V16_SET.ribbonZ],[.07,1.3,.07]);
    const ribbon=new THREE.Group();ribbon.position.set(x,G+1.12,V16_SET.ribbonZ);group.add(ribbon);
    box(ribbon,'#d8473d',[-sign*1.075,0,0],[2.15,.10,.025]);ribbons.push(ribbon);
  }
  const car=new THREE.Group();car.name='V16OfficialCar';group.add(car);
  box(car,'#e0dfd3',[0,.70,0],[1.70,.55,3.35]);box(car,'#e0dfd3',[0,1.17,-.25],[1.56,.70,1.85]);
  box(car,'#6d929a',[0,1.35,.70],[1.42,.43,.035]);box(car,'#6d929a',[0,1.35,-1.19],[1.42,.43,.035]);
  for(const x of [-.79,.79])box(car,'#6d929a',[x,1.34,-.23],[.035,.43,1.50]);
  box(car,'#c4c4b9',[0,.43,1.70],[1.76,.13,.08]);box(car,'#c4c4b9',[0,.43,-1.70],[1.76,.13,.08]);
  box(car,'#343f43',[0,.65,1.69],[.62,.20,.04]);
  for(const x of [-.60,.60]){box(car,'#ffedb6',[x,.77,1.69],[.30,.18,.04]);box(car,'#a94233',[x,.77,-1.69],[.28,.16,.04]);}
  const wheels=[];
  for(const x of [-.88,.88])for(const z of [-1.06,1.06]){
    const w=new THREE.Group();w.position.set(x,.32,z);car.add(w);wheels.push(w);
    const tire=mesh(w,new THREE.CylinderGeometry(.32,.32,.18,20),'#252b2e');tire.rotation.z=Math.PI/2;
    const hub=mesh(w,new THREE.CylinderGeometry(.15,.15,.185,16),'#a8acad');hub.rotation.z=Math.PI/2;
  }
  const door=new THREE.Group();door.position.set(-.865,.90,.45);car.add(door);
  box(door,'#d1d3c8',[0,0,-.48],[.045,.60,.95]);box(door,'#6d929a',[0,.38,-.48],[.045,.35,.95]);
  const scissors=new THREE.Group();scissors.name='V16HandScissors';group.add(scissors);
  for(const x of [-.045,.045]){const ring=mesh(scissors,new THREE.TorusGeometry(.042,.009,6,16),'#c29d47',[x,0,0]);ring.rotation.x=Math.PI/2;}
  const blades=[];
  for(const sign of [-1,1]){const blade=box(scissors,'#ccd0d0',[sign*.025,.10,0],[.016,.19,.016]);blades.push(blade);}
  const sandal=new THREE.Group();sandal.name='V16MuddySandal';group.add(sandal);
  const sole=mesh(sandal,new THREE.SphereGeometry(1,12,8),'#6b5035');sole.scale.set(.10,.025,.20);box(sandal,'#b09a65',[0,.04,.025],[.18,.025,.05]);
  const bag=new THREE.Group();bag.name='V16ShoppingBag';group.add(bag);box(bag,'#bfa572',[0,-.14,0],[.25,.30,.15]);
  const handle=mesh(bag,new THREE.TorusGeometry(.075,.011,6,14),'#745a3f',[0,.04,0]);handle.scale.y=1.4;
  const cameraProp=new THREE.Group();cameraProp.name='V16PhotographerCamera';group.add(cameraProp);
  box(cameraProp,'#313b42',[0,0,0],[.28,.17,.13]);const lens=mesh(cameraProp,new THREE.CylinderGeometry(.065,.065,.08,16),'#577984',[0,0,.10]);lens.rotation.x=Math.PI/2;
  const cast=production.cast,extras=production.neighborhood.extras,all=[...cast,...extras],rigs=new Map(),initialExtras=[];
  for(const npc of all){const bones=[];npc.model.figure.traverse(n=>{if(n.isBone)bones.push({n,p:n.position.clone(),q:n.quaternion.clone()});});rigs.set(npc.id,bones);}
  const pose=createGripRig(THREE),byId=new Map(cast.map(n=>[n.id,n]));let visibility=null;
  function reset(npc){for(const {n,p,q} of rigs.get(npc.id)??[]){n.position.copy(p);n.quaternion.copy(q);}}
  function activate(){
    const keep=new Set([group,production.neighborhood.scenery,...all.map(n=>n.root)]);visibility=new Map();
    for(const c of production.group.children)if(!keep.has(c)){visibility.set(c,c.visible);c.visible=false;}
    initialExtras.length=0;for(const e of extras)initialExtras.push({p:e.root.position.clone(),q:e.root.quaternion.clone(),visible:e.root.visible,x:e.collider.x,z:e.collider.z});
  }
  function deactivate(){if(visibility){for(const [c,v] of visibility)c.visible=v;visibility=null;}}
  function resetExtras(){for(const [i,e] of extras.entries()){reset(e);const s=initialExtras[i];if(s){e.root.position.copy(s.p);e.root.quaternion.copy(s.q);e.root.visible=s.visible;e.collider.x=s.x;e.collider.z=s.z;}}}
  function attachToHand(prop,id,side,offset){
    const hand=byId.get(id).model.figure.getObjectByName('hand'+side);if(!hand)throw new Error('V16: tangan pemeran '+id+' tidak ditemukan');
    hand.updateWorldMatrix(true,false);prop.position.copy(hand.localToWorld(new THREE.Vector3(...offset)));prop.quaternion.copy(hand.getWorldQuaternion(new THREE.Quaternion()));
  }
  return{group,extraCast:[],activate,deactivate,reset,pose,resetExtras,
    poseExtras(shot){for(const [i,e] of extras.entries()){
      const p=shot.extras[i];reset(e);e.root.position.set(p.x,p.y,p.z);e.root.rotation.set(0,p.yaw,0);e.root.visible=p.visible;
      e.model.mixer.stopAllAction();const action=e.model.actions[p.clip]??e.model.actions.Idle;action.reset().play();action.time=p.phase%action.getClip().duration;e.model.mixer.update(0);pose(e,p);
    }},
    update(shot){
      car.position.fromArray(shot.props.car);car.rotation.x=shot.props.carTilt;
      for(const w of wheels)w.rotation.x=-shot.props.drive*18+(shot.props.dip?Math.sin(shot.time*18)*.06:0);
      door.rotation.y=shot.props.door?-1.05:0;
      ribbons[0].rotation.z=-.35*shot.props.ribbonCut;ribbons[1].rotation.z=.35*shot.props.ribbonCut;
      scissors.visible=shot.props.scissors;attachToHand(scissors,'bahlil','R',[0,.05,0]);blades.forEach((b,i)=>b.rotation.z=(i?1:-1)*(.10+.25*(1-shot.props.ribbonCut)));
      attachToHand(sandal,'bu-warung','R',[0,.07,0]);attachToHand(bag,'bu-warung','L',[0,.02,0]);
      const k=byId.get('komeng');k.model.figure.updateWorldMatrix(true,true);const head=k.model.head;
      cameraProp.position.copy(head.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(.29*Math.sin(shot.actors.komeng.yaw),-.02,.29*Math.cos(shot.actors.komeng.yaw)));
      cameraProp.rotation.set(0,shot.actors.komeng.yaw,0);
    },
    dispose(){deactivate();resetExtras();group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();}
  };
}
