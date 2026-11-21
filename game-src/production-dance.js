import {Vector3,Quaternion,PropertyBinding} from 'three';

export const DANCE_BPM=130; // Choreography default; not a measurement of the licensed recording.
const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};

/** Original, stylized eight-beat parody: small steps, knee bounce, alternating
 * bent-arm pumps. Absolute-time IK keeps planted feet and an upright head.
 * This is not motion capture of a real person. Shared Walk/Run clips are untouched.
 */
export function createProductionDance(actor){
  const figure=actor.figure;
  const bone=name=>figure.getObjectByName(PropertyBinding.sanitizeNodeName(name));
  actor.mixer.update(0);figure.updateMatrixWorld(true);
  const joints=[];figure.traverse(n=>{if(n.isBone)joints.push({bone:n,p:n.position.clone(),q:n.quaternion.clone()});});
  const root=bone('root'),head=bone('head');
  const inFigure=n=>figure.worldToLocal(n.getWorldPosition(new Vector3()));
  const relativeQ=n=>figure.getWorldQuaternion(new Quaternion()).invert().multiply(n.getWorldQuaternion(new Quaternion()));
  const neutralHead=relativeQ(head),feet={};
  for(const side of ['L','R'])feet[side]={position:inFigure(bone('foot.'+side)),q:relativeQ(bone('foot.'+side))};
  const world=local=>figure.localToWorld(new Vector3(...local));
  function aim(node,child,target){
    const origin=node.getWorldPosition(new Vector3()),from=child.getWorldPosition(new Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const q=new Quaternion().setFromUnitVectors(from,to).multiply(node.getWorldQuaternion(new Quaternion()));
    node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(q));node.updateWorldMatrix(false,true);
  }
  function limb(names,target,pole){
    const [upper,lower,end]=names.map(bone),a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=end.getWorldPosition(new Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=target.clone().sub(a),distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,direction.length()));direction.normalize();
    const bend=pole.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction));if(bend.lengthSq()<1e-8)bend.set(0,0,1);bend.normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    aim(upper,lower,a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along))));
    aim(lower,end,a.clone().addScaledVector(direction,distance));
  }
  function orientation(node,relative){node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(figure.getWorldQuaternion(new Quaternion()).multiply(relative)));node.updateWorldMatrix(false,true);}
  return {
    apply({time,bpm=DANCE_BPM,weight=1}){
      weight=Math.max(0,Math.min(1,weight));if(weight===0)return;
      const base=joints.map(j=>({p:j.bone.position.clone(),q:j.bone.quaternion.clone()}));
      for(const j of joints){j.bone.position.copy(j.p);j.bone.quaternion.copy(j.q);}
      const beats=Math.max(0,time)*bpm/60,phase=beats*Math.PI,sway=Math.sin(phase/2),bounce=(1-Math.cos(phase*2))/2;
      const rise=smooth(time/.22);
      root.position.x+=.035*sway*rise;root.position.y-=(.025+.035*bounce)*rise;
      root.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.055*sway*rise));
      figure.updateMatrixWorld(true);
      for(const [side,sign] of [['L',1],['R',-1]]){
        const foot=feet[side],local=foot.position.clone();
        const beat=(beats+(side==='L'?0:2))%4;
        const tap=beat<2?Math.sin(beat*Math.PI/2)**2:0;
        local.x+=sign*.045*tap*rise;local.y+=.035*tap*rise;
        limb(['thigh.'+side,'calf.'+side,'foot.'+side],world(local.toArray()),world([sign*.22,.48,.65]));
        orientation(bone('foot.'+side),foot.q);
        const pump=Math.sin(phase+(side==='L'?0:Math.PI));
        const hand=[sign*(.28+.035*pump),1.16+.065*pump,.34+.055*pump];
        limb(['upper_arm.'+side,'forearm.'+side,'hand.'+side],world(hand),world([sign*.57,1.03,.03]));
      }
      figure.userData.handController?.update({pose:'fist',intensity:.8});
      // Torso turns do not roll the head; retain the rig's approved upright pose.
      orientation(head,neutralHead);
      for(let i=0;i<joints.length;i++){const j=joints[i],target=j.bone.quaternion.clone();j.bone.position.lerpVectors(base[i].p,j.bone.position,weight);j.bone.quaternion.copy(base[i].q).slerp(target,weight);}
      figure.updateMatrixWorld(true);
    },
  };
}
