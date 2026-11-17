/** Two-bone IK with actor-local elbow/knee planes and explicit wrist orientation.
 * Used only by V15; archive productions retain their original posing. */
export function createGripRig(THREE){
  const vec=a=>new THREE.Vector3(...a);
  function aim(bone,child,target){
    const origin=bone.getWorldPosition(new THREE.Vector3());
    const from=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const to=target.clone().sub(origin).normalize();
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const world=bone.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(new THREE.Quaternion().setFromUnitVectors(from,to).multiply(world)));
    bone.updateWorldMatrix(false,true);
  }
  function limb(figure,names,target,pole){
    const [upper,lower,end]=names.map(n=>figure.getObjectByName(n));if(!upper||!lower||!end)return;
    figure.updateWorldMatrix(true,true);
    const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),dir=vec(target).sub(a);
    const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,dir.length()));dir.normalize();
    const bend=vec(pole).sub(a);bend.addScaledVector(dir,-bend.dot(dir));
    if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(dir,-dir.z);
    bend.normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    aim(upper,lower,a.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along))));
    aim(lower,end,a.clone().addScaledVector(dir,distance));
  }
  return function pose(npc,p){
    const yaw=p.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw);
    const local=(x,y,z)=>[p.x+x*c+z*s,(p.y??0)+y,p.z-x*s+z*c];
    for(const [side,target] of Object.entries(p.handTargets??{})){
      limb(npc.model.figure,['upper_arm'+side,'forearm'+side,'hand'+side],target,local(side==='L'?.62:-.62,.9,.32));
      const orientation=p.handOrientations?.[side];
      if(orientation){
        const hand=npc.model.figure.getObjectByName('hand'+side);
        if(!hand?.parent)throw new Error(`Rig karakter ${npc.id} tidak lengkap: hand${side} tidak ditemukan. Pastikan aset avatar V11 sudah dimuat.`);
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(orientation[0],orientation[1],orientation[2],orientation[3]??'YXZ'));
        hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
        hand.updateWorldMatrix(false,true);
      }
    }
    if(p.seated||p.crouch)for(const side of ['L','R']){
      const sign=side==='L'?1:-1;
      // Ground contacts do not inherit the pelvis's seated vertical offset.
      const foot=local(sign*.16,.12+(p.groundY??0)-(p.y??0),p.seated?.46*p.seated:.07);
      limb(npc.model.figure,['thigh'+side,'calf'+side,'foot'+side],foot,local(sign*.16,.55,1));
    }
  };
}
