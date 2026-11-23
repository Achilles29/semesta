import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {createHumanModel,disposeAvatar,animateAvatar,avatarSpeed} from '../game-src/avatar-runtime.js';
import {catalog} from '../game-src/avatar-v15-config.js';
import {createConstructionCarryPose} from '../game-src/republic-construction-pose.js';

await loadTestAvatars();let samples=0,worst=0;
for(const profile of catalog.profiles){
  const actor=createHumanModel(THREE,{avatarConfig:{profileId:profile.id}}),pose=createConstructionCarryPose(actor);
  actor.figure.position.set(29,.235,-28);actor.figure.rotation.y=.74;
  const bones=[];actor.figure.traverse(node=>{if(node.isBone)bones.push(node);});
  for(const speed of [0,avatarSpeed(actor,'Walk'),avatarSpeed(actor,'Run')])for(let frame=0;frame<4;frame++){
    pose.restore();animateAvatar(actor,speed,.12);actor.figure.updateMatrixWorld(true);
    const rotations=new Map(bones.map(bone=>[bone.name,bone.quaternion.clone()]));pose.apply(true);
    for(const [side,sign] of [['L',1],['R',-1]]){
      const hand=actor.figure.getObjectByName('hand'+side),target=actor.figure.localToWorld(new THREE.Vector3(sign*.35,1.07,.38));
      const error=hand.getWorldPosition(new THREE.Vector3()).distanceTo(target);worst=Math.max(worst,error);assert.ok(error<.075,`${profile.id} ${side} grip misses crate by ${error} m`);samples++;
    }
    for(const bone of bones)if(!/^(upper_arm|forearm|hand)[LR]$/.test(bone.name))assert.ok(bone.quaternion.equals(rotations.get(bone.name)),`${bone.name} was changed by carry pose`);
    pose.restore();for(const bone of bones)assert.ok(bone.quaternion.equals(rotations.get(bone.name)),`${bone.name} fails to restore current gait`);
  }
  pose.dispose();disposeAvatar(actor);
}
console.log(`PASS construction actual GLBs: ${catalog.profiles.length} profiles, ${samples} Idle/Walk/Run grip samples, max wrist error ${worst.toFixed(4)} m, untouched gait/head and complete pose restoration.`);
