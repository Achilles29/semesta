import {createV6Props} from './production-v6-props.js';
import {createHumanModel} from './avatar-runtime.js';
import {avatarCharacterOptions as farmerCharacterOptions} from './avatar-v15-config.js';
const FARMER_PRESET={};
import {V14_SET} from './production-v14-episode.js';

/** Owned cinematic cast and props: never saved to world/admin data. */
export function createV14Props(THREE,production){
  const added=[];
  for(const [id,bodyType,shirt,hair,face] of [
    ['v14-young','slender','#e0ddd2','short','oval'],
    ['v14-father','skinny','#eae5d7','swept','angular'],
    ['v14-leader','mature','#b9a17b','short','round'],
  ]){
    const root=new THREE.Group();root.name=id;root.visible=false;
    const model=createHumanModel(THREE,farmerCharacterOptions({...FARMER_PRESET,farmer:{bodyType,outfit:'work-shirt',bottomStyle:'relaxed',hairStyle:hair,
      faceShape:face,eyeStyle:'relaxed',mouthStyle:'neutral',headwear:'none',accessory:'none',gloves:'none',footwearStyle:'shoes',
      colors:{skin:'#d5ac8a',hair:'#302c29',shirt,trousers:'#45505a',footwear:'#443a32'}}}));
    root.add(model.figure);production.group.add(root);
    const npc={id,root,model,collider:{x:0,z:0},name:id};added.push(npc);
  }
  const base=createV6Props(THREE,{...production,cast:[...production.cast,...added]}),group=base.group;group.name='V14ServiceDeskSet';
  // Old broom/drinks scenery is not part of this episode. The surrounding
  // neighborhood stays visible; only this owned prop group's dressing is hidden.
  for(const c of group.children)c.visible=c.name==='V6HeroChair';
  for(const npc of added)group.add(npc.root);
  const geo=new Set(),mats=new Map();
  function mesh(parent,geometry,color,pos){
    geo.add(geometry);if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));
    const m=new THREE.Mesh(geometry,mats.get(color));m.position.fromArray(pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const box=(p,c,pos,size)=>mesh(p,new THREE.BoxGeometry(...size),c,pos);
  const desk=new THREE.Group();desk.name='V14ComplaintDesk';desk.position.fromArray(V14_SET.desk);group.add(desk);
  box(desk,'#a78459',[0,.79,0],[1.45,.09,1.05]);
  for(const x of [-.6,.6])for(const z of [-.43,.43])box(desk,'#6c5340',[x,.39,z],[.08,.78,.08]);
  box(desk,'#456e72',[0,.55,.49],[1.2,.4,.04]);
  function paper(name,color,w=.4,h=.3){
    const p=new THREE.Group();p.name=name;group.add(p);
    box(p,color,[0,0,0],[w,h,.022]);
    for(let i=0;i<3;i++)box(p,'#a19b8b',[-.025,h*.2-i*.055,.014],[w*.65,.012,.003]);
    return p;
  }
  const photo=paper('V14FamilyPhoto','#faf0da',.46,.34);
  // Illustrative family portrait assembled as native geometry, not real-person imagery.
  for(const [x,shirt] of [[-.105,'#e6e1d4'],[.105,'#e6e1d4']]){
    box(photo,shirt,[x,-.07,.021],[.16,.14,.025]);
    mesh(photo,new THREE.SphereGeometry(.057,12,8),'#d5ac8a',[x,.055,.03]);
    box(photo,'#302c29',[x,.103,.027],[.106,.029,.025]);
  }
  const rules=paper('V14ChangingRules','#f0dcc4',.39,.34);rules.position.set(-50.29,1.14,-98.4);
  const stamp=mesh(rules,new THREE.CircleGeometry(.05,16),'#ad4438',[.12,.10,.022]);
  const changed=mesh(rules,new THREE.CircleGeometry(.05,16),'#3d8b69',[.12,.10,.024]);changed.visible=false;
  const cv=paper('V14ExperienceFolder','#7698a6',.4,.32);cv.position.set(-51.9,1.14,-98.39);
  const folder=paper('V14ComplaintFolder','#c18b4d',.45,.33);
  for(let i=0;i<3;i++){
    box(folder,'#fff4db',[-.14+i*.14,.045,.026],[.115,.20,.009]);
    mesh(folder,new THREE.CircleGeometry(.025,12),'#a04f43',[-.14+i*.14,-.015,.033]);
  }
  const pen=mesh(group,new THREE.CylinderGeometry(.009,.009,.15,8),'#274956',[0,0,0]);pen.name='V14WritingPen';pen.rotation.z=-.3;
  const chairs=[];
  for(let i=0;i<3;i++){
    const c=new THREE.Group();c.name='V14CommitteeChair'+i;group.add(c);chairs.push(c);
    box(c,'#6d9088',[0,.48,0],[.62,.08,.57]);box(c,'#6d9088',[0,.82,-.25],[.62,.58,.07]);
    for(const x of [-.25,.25])for(const z of [-.22,.22])box(c,'#5c5141',[x,.23,z],[.06,.46,.06]);
  }
  const queueFolders=[];
  for(let i=0;i<3;i++)queueFolders.push(paper('V14QueueFolder'+i,['#729e97','#ac8e65','#8d839c'][i],.33,.26));
  const extras=production.neighborhood.extras;
  const extraVisibility=extras.map(e=>e.root.visible);
  const saved=extras.map(e=>{const bones=[];e.model.figure.traverse(n=>{if(n.isBone)bones.push({n,p:n.position.clone(),q:n.quaternion.clone()});});return bones;});
  function poseExtras(shot){extras.forEach((e,i)=>{
    for(const {n,p,q} of saved[i]){n.position.copy(p);n.quaternion.copy(q);}
    const p=shot.extras[i];e.root.visible=p.visible!==false;e.root.position.set(p.x,p.y,p.z);e.root.rotation.set(0,p.yaw,0);
    e.model.mixer.stopAllAction();const a=e.model.actions[p.clip]??e.model.actions.Idle;a.reset().play();a.time=p.phase%a.getClip().duration;e.model.mixer.update(0);
    base.pose(e,p);if(e.model.head){e.model.head.rotation.y+=p.headYaw??0;e.model.head.rotation.x+=p.headNod??0;}
    e.collider.x=p.x;e.collider.z=p.z;
  });}
  function resetExtras(){for(const [i,bones] of saved.entries()){extras[i].root.visible=extraVisibility[i];for(const {n,p,q} of bones){n.position.copy(p);n.quaternion.copy(q);}}}
  return {...base,extraCast:added,poseExtras,resetExtras,update(shot){
    base.update(shot);photo.position.fromArray(shot.props.photo);
    photo.visible=shot.actors['v14-young'].visible!==false;
    rules.visible=shot.extras[0].visible!==false;cv.visible=shot.extras[7].visible!==false;
    stamp.visible=shot.props.swap<.5;changed.visible=shot.props.swap>=.5;
    rules.rotation.z=-.13*Math.sin(shot.props.swap*Math.PI);
    folder.visible=shot.props.folderOnDesk||shot.actors['bu-warung'].visible!==false;
    folder.position.fromArray(shot.props.folder);folder.rotation.x=shot.props.folderOnDesk?-Math.PI/2:0;
    pen.visible=shot.props.writing;pen.position.fromArray(shot.props.pen);
    chairs.forEach((c,i)=>{c.position.fromArray(shot.props.committee[i].position);c.visible=shot.props.committee[i].visible&&shot.extras[i+1].visible!==false;});
    queueFolders.forEach((f,i)=>{const a=shot.extras[i+4];f.visible=a.visible!==false;f.position.set(a.x-.18,1.03,a.z+.29);});
  },dispose(){
    for(const npc of added){npc.model.mixer.stopAllAction();npc.model.mixer.uncacheRoot(npc.model.figure);
      npc.model.figure.traverse(n=>{if(n.isMesh){if(!n.userData.sharedCharacterGeometry)n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();}});npc.root.removeFromParent();}
    for(const g of geo)g.dispose();for(const m of mats.values())m.dispose();base.dispose();
  }};
}
