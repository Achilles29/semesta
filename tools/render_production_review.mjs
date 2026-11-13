// CPU geometry diagnostic, NOT a browser screenshot. Uses the real posed game meshes.
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHumanModel,setFarmerAsset} from '../game-src/avatar-character-3d.js';
import {buildProductionDistrict} from '../game-src/production-district-scene.js';
import {createV6Props} from '../game-src/production-v6-props.js';
import {createCastPerformance} from '../game-src/production-performance.js';
import {sampleEpisode,EPISODE_CUES} from '../game-src/production-episode.js';
const bytes=fs.readFileSync('public/models/characters/semesta-farmer-v11.glb');
setFarmerAsset(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
const world=new THREE.Group();
const production=buildProductionDistrict(THREE,{world,
 makeHuman(p,o){const m=createHumanModel(THREE,o);p.add(m.figure);return m;},
 makeText(){return new THREE.Sprite(new THREE.SpriteMaterial());},addCollider(x,z){return{x,z};},createWorldAsset(){return new THREE.Group();}});
production.updateLabels(0);
const props=createV6Props(THREE,production),performance=createCastPerformance(THREE,production.cast);
props.group.visible=true;
const folder='docs/record/production-v9-review';fs.mkdirSync(folder,{recursive:true});
const at=beat=>EPISODE_CUES.find(c=>c.beat===beat).start+.65;
for(const [name,time,portrait] of [['intro-series',at('series'),null],['intro-komeng',at('comment_reply'),null],['intro-handoff',at('handoff'),null]]){
 const shot=sampleEpisode(time,9/16);
 for(const npc of production.cast){const p=shot.actors[npc.id];props.reset(npc);npc.root.position.set(p.x,p.y,p.z);npc.root.rotation.set(0,p.yaw,0);
  npc.model.mixer.stopAllAction();const a=npc.model.actions[p.clip];a.reset().play();a.time=((p.phase%a.getClip().duration)+a.getClip().duration)%a.getClip().duration;npc.model.mixer.update(0);props.pose(npc,p);performance.update(npc,p);}
 props.update(shot);production.updateAtmosphere(time);world.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(shot.camera.fov,9/16,.05,150);
 camera.position.fromArray(shot.camera.position);camera.lookAt(...shot.camera.target);
 if(portrait){const p=shot.actors[portrait];camera.position.set(p.x+.09,1.65,p.z+2.05);camera.lookAt(p.x,1.56,p.z);}
 camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
 const triangles=[],point=new THREE.Vector3(),light=new THREE.Vector3(-.4,.8,1).normalize();
 const target=portrait?production.cast.find(n=>n.id===portrait).root:world;
 target.traverseVisible(mesh=>{if(!mesh.isMesh)return;
  const g=mesh.geometry,index=g.index,vertices=[],positions=[];
  for(let i=0;i<g.attributes.position.count;i++){mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);positions.push(point.clone());vertices.push(point.clone().project(camera));}
  const count=index?index.count:g.attributes.position.count;
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),v=ids.map(j=>vertices[j]);
   if(v.some(p=>p.z<-1||p.z>1)||v.every(p=>p.x<-1)||v.every(p=>p.x>1)||v.every(p=>p.y<-1)||v.every(p=>p.y>1))continue;
   let m=mesh.material;if(Array.isArray(m)){const group=g.groups.find(s=>i>=s.start&&i<s.start+s.count);m=m[group?.materialIndex??0];}
   if(!m.visible||m.opacity===0)continue;
   const p=ids.map(j=>positions[j]),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
   const shade=.58+.42*Math.max(0,normal.dot(light)),color=(m.color??new THREE.Color('#ffffff')).clone().multiplyScalar(shade);
   triangles.push([v.map(p=>p.z),v.flatMap(p=>[(p.x+1)*270,(1-p.y)*480]),'#'+color.getHexString()]);
  }
 });
 fs.writeFileSync(`${folder}/${name}.json`,JSON.stringify(triangles));
 console.log(name,triangles.length);
}
