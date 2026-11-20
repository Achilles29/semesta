import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAvatarV15,AVATAR_V15_CATALOG as catalog} from '../game-src/avatar-v15.js';
const root=new URL('../ilustrasi/avatar-v2/farmer-v15-proportions/',import.meta.url);
const profiles=process.argv.slice(2).length?catalog.profiles.filter(p=>process.argv.slice(2).includes(p.id)):catalog.profiles;
const results=[];
for(const profile of profiles){
 const bytes=await fs.readFile(new URL(`${profile.id}/avatar.glb`,root));
 const loader=new GLTFLoader();loader.register(parser=>({name:'CPU_TEXTURE_AUDIT',loadTexture:i=>Promise.resolve(new THREE.Texture())}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const a=createAvatarV15(THREE,asset),b=createAvatarV15(THREE,asset);a.figure.updateMatrixWorld(true);
 assert.equal(a.figure.userData.profile.id,profile.id);assert.equal(a.figure.userData.setAppearance,undefined);
 const meshes=[],bones=[];a.figure.traverse(n=>{if(n.isMesh)meshes.push(n);if(n.isBone)bones.push(n);});
 assert.equal(bones.length,49);assert.deepEqual(asset.animations.map(c=>c.name).sort(),['Hold','Idle','Point','Run','Sit','Walk','Wave']);
 const slots=new Set(meshes.map(m=>m.userData.avatarSlot));for(const slot of catalog.readySlots)assert.ok(slots.has(slot),`Missing ${slot}`);
 assert.ok(!meshes.some(m=>/Anatomy_Source|ReviewFloor/.test(m.name)));
 let weights=0,samples=0,contacts=0,lowest=Infinity;const motionChecks={};
 for(const m of meshes){
  assert.ok(m.isSkinnedMesh);const w=m.geometry.attributes.skinWeight;
  for(let i=0;i<w.count;i++){assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<.0001);weights++;}
 }
 const p=new THREE.Vector3();const restFeet={};
 const head=a.figure.getObjectByName('head'),restHeadInverse=head.getWorldQuaternion(new THREE.Quaternion()).invert();
 for(const side of ['L','R']){const bone=a.figure.getObjectByName('foot'+side);restFeet[side]={matrix:bone.matrixWorld.clone(),position:bone.getWorldPosition(new THREE.Vector3())};}
 for(const clip of asset.animations){
  a.mixer.stopAllAction();const action=a.actions[clip.name].reset().setLoop(THREE.LoopOnce,1).play();action.clampWhenFinished=true;const gait=a.figure.userData.locomotion[clip.name];
  const frames=gait?Math.round(clip.duration*120):12;
  let first=null,last=null;const soles=[],headAngles=[];
  for(let f=0;f<=frames;f++){
   action.time=clip.duration*f/frames;a.mixer.update(0);a.figure.updateMatrixWorld(true);
   const positions=[];
   if(!gait||f%5===0||f===frames)for(const m of meshes){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i+=17){m.getVertexPosition(i,p).applyMatrix4(m.matrixWorld);assert.ok(p.toArray().every(Number.isFinite));assert.ok(Math.abs(p.x)<1.3&&p.y>-.12&&p.y<2.2&&Math.abs(p.z)<1.4,`${profile.id}/${clip.name}: ${p.toArray()}`);lowest=Math.min(lowest,p.y);samples++;if(gait&&(f===0||f===frames))positions.push(...p.toArray());}}
   if(gait){
    const rotation=head.getWorldQuaternion(new THREE.Quaternion()).multiply(restHeadInverse);
    const up=new THREE.Vector3(0,1,0).applyQuaternion(rotation),forward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
    headAngles.push({roll:THREE.MathUtils.radToDeg(Math.atan2(-up.x,up.y)),yaw:THREE.MathUtils.radToDeg(Math.atan2(forward.x,forward.z)),pitch:THREE.MathUtils.radToDeg(Math.atan2(-forward.y,Math.hypot(forward.x,forward.z)))});
    if(f===0)first=positions;if(f===frames)last=positions;
    const frameSoles={};
    for(const side of ['L','R']){
     const r=restFeet[side];frameSoles[side]=[gait.heelOffset,gait.toeOffset].map(contact=>{
      const local=new THREE.Vector3(r.position.x,contact[2],r.position.z-contact[1]).applyMatrix4(r.matrix.clone().invert());
      return a.figure.getObjectByName('foot'+side).localToWorld(local);
     });
     for(const actual of frameSoles[side])assert.ok(actual.y>-.012,`${profile.id}/${clip.name}/${f}/${side}: sole below floor ${actual.y}`);
     if(Math.min(...frameSoles[side].map(p=>p.y))<.015)contacts++;
    }
    soles.push(frameSoles);
   }
  }
  if(gait){
   let seam=0;first.forEach((v,i)=>seam=Math.max(seam,Math.abs(v-last[i])));assert.ok(seam<.0002,`Loop seam ${clip.name}: ${seam}`);
   const support=soles.map(f=>Math.min(...Object.values(f).flat().map(p=>p.y)));
   if(clip.name==='Walk')assert.ok(Math.max(...support)<.016,'Walking must retain a support foot');
   if(clip.name==='Run')assert.ok(Math.max(...support)>.02,'Running needs a real flight phase');
   const slip=[];
   for(let f=1;f<soles.length;f++)for(const side of ['L','R'])for(let point=0;point<2;point++){
    const before=soles[f-1][side][point],after=soles[f][side][point];
    // Score planted points only; a descending heel near the ground is still
    // decelerating toward impact and is not a locked support contact yet.
    if(before.y<.01&&after.y<.01&&Math.abs(after.y-before.y)/(clip.duration/frames)<.1)slip.push(Math.abs((after.z-before.z)/(clip.duration/frames)+gait.recommendedForwardSpeed));
   }
   slip.sort((a,b)=>a-b);
   motionChecks[clip.name]={seam,maxSupportHeight:Math.max(...support),minSoleHeight:Math.min(...support),supportSlipMean:slip.reduce((s,n)=>s+n,0)/Math.max(1,slip.length),supportSlipP95:slip[Math.floor(slip.length*.95)]||0,supportSlipMax:Math.max(0,...slip)};
   const headCheck={maxRoll:Math.max(...headAngles.map(v=>Math.abs(v.roll))),meanRoll:headAngles.reduce((s,v)=>s+v.roll,0)/headAngles.length,maxYaw:Math.max(...headAngles.map(v=>Math.abs(v.yaw))),maxPitch:Math.max(...headAngles.map(v=>Math.abs(v.pitch)))};
   assert.ok(headCheck.maxRoll<1.6&&Math.abs(headCheck.meanRoll)<.2,`${clip.name}: head should stay upright ${JSON.stringify(headCheck)}`);
   assert.ok(headCheck.maxYaw<2.7&&headCheck.maxPitch<4.2,`${clip.name}: gaze should remain forward`);
   assert.ok(headCheck.maxRoll>.05,'Do not freeze all head motion');
   motionChecks[clip.name].headDegrees=headCheck;
   console.log(profile.id,clip.name,motionChecks[clip.name]);
   assert.equal(gait.revision,catalog.motionRevision,'Stale motion asset');
   assert.ok(motionChecks[clip.name].supportSlipMean<.4,'Excessive stance sliding');
   assert.ok(motionChecks[clip.name].supportSlipP95<.8,'Persistent sliding in support phase');
  }
 }
 // Palette and visibility changes must be reversible and isolated per actor.
 const get=(actor,slot)=>{let found;actor.figure.traverse(n=>{if(n.isMesh&&n.userData.avatarSlot===slot&&(!found||n.visible))found=n;});return found;};
 const base=get(b,'skin').material.color.clone(),bootColor=get(a,'footwear').material.color.clone();a.figure.userData.customization.set({skinTone:'deep',palette:'wine',hairStyle:'none',outerwear:false,accessoryChest:false});
 assert.equal(get(a,'hair').visible,false);assert.equal(get(a,'outerwear').visible,false);assert.equal(get(b,'hair').visible,true);assert.ok(get(b,'skin').material.color.equals(base));assert.ok(!get(a,'skin').material.color.equals(base));
 assert.ok(get(a,'footwear').material.color.equals(bootColor),'Outerwear tint must not recolor footwear');
 assert.throws(()=>a.figure.userData.customization.set({hairStyle:'unreleased'}));
 a.figure.userData.customization.set({skinTone:'warm',hairStyle:'short',outerwear:true,accessoryChest:true,palette:'indigo'});assert.ok(get(a,'hair').visible);
 const report={id:profile.id,passed:true,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),bones:bones.length,primitives:meshes.length,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),slots:[...slots],weightSamples:weights,vertexSamples:samples,contactSamples:contacts,motionChecks,lowestSampledVertex:lowest,locomotion:a.figure.userData.locomotion,instanceIsolation:true};
 await fs.writeFile(new URL(`${profile.id}/runtime-test.json`,root),JSON.stringify(report,null,2));results.push(report);console.log(profile.id,'PASS',samples,'vertices',contacts,'contacts');
}
if(profiles.length===6)await fs.writeFile(new URL('runtime-test.json',root),JSON.stringify({passed:true,profiles:results,browserInteractionVerified:false,gpuFPSMeasured:false},null,2));
