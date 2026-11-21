import {Vector3,Quaternion,PropertyBinding} from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const pulse=(time,center,width)=>Math.abs(time-center)<width?Math.cos((time-center)/width*Math.PI/2)**2:0;
export const speechAccent=(clip,time)=>(clip?.words||[]).reduce((value,word,i)=>i%3===0?Math.max(value,pulse(time,word.start+.12,.32)):value,0);

/** Pose after the mixer, from absolute timeline time. No accumulating rotations.
 * Hands use measured two-bone IK; walking and the accepted dance remain intact.
 */
export function createProductionActing(actor){
  const figure=actor.figure,bone=name=>figure.getObjectByName(PropertyBinding.sanitizeNodeName(name));
  const arms=['L','R'].map(side=>['upper_arm.','forearm.','hand.'].map(prefix=>bone(prefix+side)));
  function aim(node,child,target){
    const origin=node.getWorldPosition(new Vector3()),from=child.getWorldPosition(new Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const q=new Quaternion().setFromUnitVectors(from,to).multiply(node.getWorldQuaternion(new Quaternion()));
    node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(q));node.updateWorldMatrix(false,true);
  }
  function arm(joints,target,pole,weight){
    const [upper,lower,end]=joints,base=joints.map(n=>n.quaternion.clone());
    const a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=end.getWorldPosition(new Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=target.clone().sub(a),distance=clamp(direction.length(),Math.abs(l1-l2)+.001,l1+l2-.001);direction.normalize();
    const bend=pole.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    aim(upper,lower,a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along))));
    aim(lower,end,a.clone().addScaledVector(direction,distance));
    joints.forEach((n,i)=>{const targetQ=n.quaternion.clone();n.quaternion.copy(base[i]).slerp(targetQ,weight);});
    figure.updateMatrixWorld(true);
  }
  return {apply({p,clip,local,speaking,sample,id,speaker,time}){
    const fade=smooth(p.elapsed/.45)*smooth((sample.shot.duration-p.elapsed)/.45);
    const active=speaking&&local>=0&&local<clip.duration;
    const accent=active?speechAccent(clip,local):0;
    const laugh=active&&clip.laughStart!==undefined&&local>=clip.laughStart;
    let gaze=0;
    const target=p.lookAt==='camera'?null:sample.actors[p.lookAt||(!speaking?speaker:null)];
    if(target&&p.action==='Idle'){
      const angle=Math.atan2(target.position[0]-p.position[0],target.position[1]-p.position[1])-p.yaw;
      gaze=clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.32,.32)*fade;
      actor.head.rotation.y+=gaze;
    }
    if(p.action==='Idle'){
      // One acknowledgment, not a continuously bobbing head.
      const nod=p.gesture==='nod'?.055*pulse(p.elapsed,.65,.42):active?.022*accent:0;
      actor.head.rotation.x+=nod*fade;
      if(p.gesture==='look')actor.head.rotation.y+=.13*Math.sin(p.elapsed*1.2)*fade;
      if(laugh){actor.head.rotation.x-=.035*fade;bone('chest').rotation.x+=.012*Math.sin((local-clip.laughStart)*18)*fade;}
      if(active){
        const speakingFade=smooth(local/.35)*smooth((clip.duration-local)/.4)*fade;
        const stature=(figure.userData.profile?.height||1.78)/1.78;
        figure.updateMatrixWorld(true);
        for(const [index,sign] of [[0,1],[1,-1]]){
          const dominant=index===1,level=dominant?1.08:1.0;
          const hand=new Vector3(sign*(dominant?.33:.30),level+(dominant?.045:.018)*accent,.27+(dominant?.055:.02)*accent).multiplyScalar(stature);
          const pole=new Vector3(sign*.52,.98,.02).multiplyScalar(stature);
          arm(arms[index],figure.localToWorld(hand),figure.localToWorld(pole),speakingFade*(laugh?.35:dominant?.8:.4));
        }
        figure.userData.handController?.update({pose:'relaxed',intensity:.7});
      }
    }
    return {gaze:gaze*1.3,accent,laugh,fade};
  }};
}
