import {Vector3,Quaternion,PropertyBinding} from 'three';

/** Temporary two-arm pose only. Restore before the locomotion mixer advances;
 * this never edits animations, legs, spine, face or the skeleton hierarchy. */
export function createConstructionCarryPose(actor){
  const figure=actor?.figure,bones=new Map();figure?.traverse(node=>{if(node.isBone)bones.set(node.name,node);});
  const arms=['L','R'].map(side=>['upper_arm.','forearm.','hand.'].map(prefix=>bones.get(PropertyBinding.sanitizeNodeName(prefix+side))||bones.get(prefix+side)));
  let saved=null,disposed=false;
  function restore(){if(!saved)return;for(const [bone,rotation] of saved)bone.quaternion.copy(rotation);saved=null;figure.updateMatrixWorld(true);}
  function aim(bone,end,target){
    const origin=bone.getWorldPosition(new Vector3()),from=end.getWorldPosition(new Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const rotation=new Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new Quaternion()));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(rotation));bone.updateWorldMatrix(false,true);
  }
  function apply(carrying){
    restore();if(disposed||!carrying||!figure||arms.some(arm=>arm.some(bone=>!bone)))return;
    saved=arms.flat().map(bone=>[bone,bone.quaternion.clone()]);figure.updateMatrixWorld(true);
    arms.forEach(([upper,lower,hand],index)=>{
      const side=index===0?1:-1,target=figure.localToWorld(new Vector3(side*.35,1.07,.38)),pole=figure.localToWorld(new Vector3(side*.58,.83,.06));
      const a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=hand.getWorldPosition(new Vector3()),l1=a.distanceTo(b),l2=b.distanceTo(c);
      if(l1<.001||l2<.001)return;
      const direction=target.clone().sub(a),distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,direction.length()));direction.normalize();
      const bend=pole.sub(a);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
      const along=(l1*l1-l2*l2+distance*distance)/(2*distance),elbow=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
      aim(upper,lower,elbow);aim(lower,hand,a.addScaledVector(direction,distance));
    });
  }
  return {apply,restore,dispose(){restore();disposed=true;}};
}
