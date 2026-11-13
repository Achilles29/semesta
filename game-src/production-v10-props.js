import {createV6Props} from './production-v6-props.js';
import {V10_SET} from './production-episode.js';

// Reuse the proven rig IK and warung. New owned props only; no saved-world edits.
export function createV10Props(THREE,production){
  const base=createV6Props(THREE,production),group=base.group;
  group.name='EpisodeV10WaterAndChair';
  const owned=new THREE.Group();owned.name='V10ServiceTest';group.add(owned);
  const geometries=new Set(),materials=new Map();
  function mesh(parent,geometry,color,pos){
    geometries.add(geometry);
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75}));
    const m=new THREE.Mesh(geometry,materials.get(color));m.position.fromArray(pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(p,c,pos,size)=>mesh(p,new THREE.BoxGeometry(...size),c,pos);
  function pipe(a,b,r=.035,color='#7e9797'){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const m=mesh(owned,new THREE.CylinderGeometry(r,r,delta.length(),10),color,start.add(end).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  const [vx,vy,vz]=V10_SET.valve,[tx,ty,tz]=V10_SET.tap;
  // Raised tank makes the gravity-feed mechanism legible, rather than magic water.
  box(owned,'#776450',[-47.35,.75,-101.7],[.8,1.5,.8]);
  mesh(owned,new THREE.CylinderGeometry(.48,.48,.85,20),'#829f9f',[-47.35,1.93,-101.7]);
  pipe([-47.35,1.51,-101.7],[vx,.35,vz]);pipe([vx,.35,vz],[tx,.35,vz]);
  pipe([vx,.35,vz],[vx,vy,vz]);pipe([tx,.35,vz],[tx,.35,tz]);pipe([tx,.35,tz],[tx,ty,tz]);
  pipe([tx,ty,tz],[tx,ty,tz+.16]);pipe([tx,ty,tz+.16],[tx,ty-.12,tz+.16]);
  const valve=new THREE.Group();valve.name='V10MainValve';valve.position.set(vx,vy,vz);owned.add(valve);
  mesh(valve,new THREE.SphereGeometry(.065,12,8),'#9c453d',[0,0,0]);
  box(valve,'#bb5546',[0,0,.045],[.32,.045,.045]);
  box(owned,'#a9b5ab',[tx,.025,tz+.1],[.9,.05,.9]);
  const water=mesh(owned,new THREE.CylinderGeometry(.018,.023,.28,8),'#8ad5e5',[tx,.76,tz+.16]);
  water.name='V10RunningWater';water.castShadow=false;
  const ripples=mesh(owned,new THREE.TorusGeometry(.11,.009,6,18),'#b8ebee',[tx,.73,tz+.16]);ripples.rotation.x=Math.PI/2;
  function bucket(name,color){
    const root=new THREE.Group();root.name=name;owned.add(root);
    mesh(root,new THREE.CylinderGeometry(.16,.12,.28,16,1,true),color,[0,.14,0]);
    mesh(root,new THREE.CylinderGeometry(.12,.12,.02,16),color,[0,.01,0]);
    const rim=mesh(root,new THREE.TorusGeometry(.16,.014,6,16),'#b2c2b9',[0,.28,0]);rim.rotation.x=Math.PI/2;
    // Top grip is exactly y=.60, shared by sampleEpisode's hand target.
    const handle=mesh(root,new THREE.TorusGeometry(.16,.012,6,16,Math.PI),'#d0d6cd',[0,.44,0]);
    const fill=mesh(root,new THREE.CylinderGeometry(.145,.145,.012,16),'#8ad5e5',[0,.23,0]);fill.visible=false;
    return {root,fill,handle};
  }
  const buckets=[bucket('V10BahlilBucket','#5c8b91'),bucket('V10GufronBucket','#b29c66'),
    ...production.neighborhood.extras.map((_,i)=>bucket('V10CitizenBucket'+i,i%2?'#8fa66d':'#628e9c'))];
  // Selection paperwork is plainly a fictional prop, with no real person's document.
  const folder=box(owned,'#d9bb79',[-49.95,1.05,-99.7],[.42,.04,.32]);folder.name='V10SelectionFolder';
  box(owned,'#927757',[-50.65,.72,-99.8],[.65,.06,.5]);box(owned,'#795e43',[-50.65,.35,-99.8],[.1,.7,.1]);
  function update(shot){
    base.update(shot);valve.rotation.z=-Math.PI/2*shot.props.valveTurn;
    water.visible=shot.props.water>.01;ripples.visible=water.visible;
    water.scale.x=water.scale.z=.85+.15*Math.sin(shot.time*10);
    ripples.scale.setScalar(.8+.15*Math.sin(shot.time*7));
    const positions=[shot.props.bucket,shot.props.helperBucket,...shot.props.crowdBuckets];
    buckets.forEach((b,i)=>{b.root.position.fromArray(positions[i]);b.fill.visible=i===2&&shot.props.water>.8;});
    folder.position.set(-50.65,.77,-99.8);
    if(shot.cue.beat==='check_before_seat'||shot.cue.beat==='verification_satire'){
      folder.position.set(shot.actors.pemandu.x+.31,1.02,shot.actors.pemandu.z+.3);
    }
  }
  const extraRig=production.neighborhood.extras.map(e=>{const bones=[];e.model.figure.traverse(n=>{if(n.isBone)bones.push({n,p:n.position.clone(),q:n.quaternion.clone()});});return bones;});
  function poseExtras(shot){
    production.neighborhood.extras.forEach((e,i)=>{
      for(const {n,p,q} of extraRig[i]){n.position.copy(p);n.quaternion.copy(q);}
      const p=shot.extras[i];e.root.position.set(p.x,p.y,p.z);e.root.rotation.set(0,p.yaw,0);
      e.model.mixer.stopAllAction();const a=e.model.actions.Idle;a.reset().play();a.time=p.phase%a.getClip().duration;e.model.mixer.update(0);
      base.pose(e,p);e.collider.x=p.x;e.collider.z=p.z;
    });
  }
  return {...base,update,poseExtras,dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();base.dispose();}};
}
