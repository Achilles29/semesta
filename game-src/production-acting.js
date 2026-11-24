import {Vector3,Quaternion,PropertyBinding} from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const pulse=(time,center,width)=>Math.abs(time-center)<width?Math.cos((time-center)/width*Math.PI/2)**2:0;
export const speechAccent=(clip,time)=>(clip?.words||[]).reduce((value,word,i)=>i%3===0?Math.max(value,pulse(time,word.start+.12,.32)):value,0);

/** Pose after the mixer, from absolute timeline time. No accumulating rotations.
 * Hands use measured two-bone IK; walking and the accepted dance remain intact.
 */
export function createProductionActing(actor){
  const figure=actor.figure,bones=new Map();
  figure.traverse(node=>{if(node.isBone)bones.set(node.name,node);});
  const bone=name=>bones.get(PropertyBinding.sanitizeNodeName(name));
  const arms=['L','R'].map(side=>['upper_arm.','forearm.','hand.'].map(prefix=>bone(prefix+side)));
  function aim(node,child,target){
    const origin=node.getWorldPosition(new Vector3()),from=child.getWorldPosition(new Vector3()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    const q=new Quaternion().setFromUnitVectors(from,to).multiply(node.getWorldQuaternion(new Quaternion()));
    node.quaternion.copy(node.parent.getWorldQuaternion(new Quaternion()).invert().multiply(q));node.updateWorldMatrix(false,true);
  }
  function arm(joints,target,pole,weight){
    if(joints.some(n=>!n))return;
    const [upper,lower,end]=joints,base=joints.map(n=>n.quaternion.clone());
    const a=upper.getWorldPosition(new Vector3()),b=lower.getWorldPosition(new Vector3()),c=end.getWorldPosition(new Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),direction=target.clone().sub(a),distance=clamp(direction.length(),Math.abs(l1-l2)+.001,l1+l2-.001);direction.normalize();
    const bend=pole.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    aim(upper,lower,a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along))));
    aim(lower,end,a.clone().addScaledVector(direction,distance));
    joints.forEach((n,i)=>{const targetQ=n.quaternion.clone();n.quaternion.copy(base[i]).slerp(targetQ,weight);});
    // Only this limb changed. Rebuilding the entire rig after each arm also
    // walked every garment, accessory and finger in all 49 crowd members.
    upper.updateWorldMatrix(false,true);
  }
  return {apply({p,clip,local,speaking,sample,id,speaker,time}){
    const fade=smooth(p.elapsed/.45)*smooth((sample.shot.duration-p.elapsed)/.45);
    const active=Boolean(clip&&speaking&&local>=0&&local<clip.duration);
    const accent=active?speechAccent(clip,local):0;
    const laugh=active&&clip.laughStart!==undefined&&local>=clip.laughStart;
    let gaze=0;
    const target=p.lookAt==='camera'?null:sample.actors[p.lookAt||(!speaking?speaker:null)];
    if(target&&!['Walk','Run','Dance'].includes(p.action)){
      const angle=Math.atan2(target.position[0]-p.position[0],target.position[1]-p.position[1])-p.yaw;
      gaze=clamp(Math.atan2(Math.sin(angle),Math.cos(angle)),-.32,.32)*fade;
      actor.head.rotation.y+=gaze;
    }
    if(p.action==='Idle'){
      // One acknowledgment, not a continuously bobbing head.
      const nod=p.gesture==='nod'?.055*pulse(p.elapsed-(p.gestureDelay||0),.65,.42):active?.022*accent:0;
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
      // Short character beats, measured from shot time so seek/replay agree.
      // Existing gestures remain unchanged for previously accepted episodes.
      if(['boast','sneer','shrug'].includes(p.gesture)){
        const t=p.elapsed-(p.gestureDelay||0);
        const weight=smooth(t/.28)*(1-smooth((t-1.05)/.65))*fade;
        if(weight>0){
          const stature=(figure.userData.profile?.height||1.78)/1.78;
          const chest=bone('chest');
          let hands;
          if(p.gesture==='boast'){
            actor.head.rotation.x-=.065*weight;
            if(chest)chest.rotation.x-=.045*weight;
            hands=[[.31,1.04,.27],[-.14,1.32,.23]];
          }else if(p.gesture==='sneer'){
            // Chin up and a single outward dismissal, not a repeating head shake.
            actor.head.rotation.x-=.035*weight;
            actor.head.rotation.y+=.07*weight;
            if(chest)chest.rotation.y+=.035*weight;
            hands=[[.30,1.0,.25],[-.34-.18*smooth(t/.8),1.15,.34]];
          }else{
            if(chest)chest.rotation.x-=.018*weight;
            actor.head.rotation.x-=.025*weight;
            hands=[[.43,1.25,.34],[-.43,1.25,.34]];
          }
          figure.updateMatrixWorld(true);
          hands.forEach((hand,index)=>arm(arms[index],figure.localToWorld(new Vector3(...hand).multiplyScalar(stature)),figure.localToWorld(new Vector3(index===0?.6:-.6,1.08,.04).multiplyScalar(stature)),weight*.92));
          figure.userData.handController?.update({pose:'relaxed',intensity:.7});
        }
      }
      if(['self','stop','dismiss'].includes(p.gesture)){
        const stature=(figure.userData.profile?.height||1.78)/1.78;
        const beat=smooth(p.elapsed/.2)*smooth((sample.shot.duration-p.elapsed)/.25);
        const chest=bone('chest');
        if(p.gesture==='self'){
          actor.head.rotation.x-=.045*beat;
          if(chest)chest.rotation.x-=.025*beat;
        }
        const hand=p.gesture==='self'?[-.14,1.32,.20]:p.gesture==='stop'?[-.38,1.39,.43]:[-.42-.12*Math.sin(Math.min(1,p.elapsed/1.1)*Math.PI),1.08,.32];
        figure.updateMatrixWorld(true);
        arm(arms[1],figure.localToWorld(new Vector3(...hand).multiplyScalar(stature)),figure.localToWorld(new Vector3(-.6,1.0,.04).multiplyScalar(stature)),beat*.92);
        figure.userData.handController?.update({pose:'relaxed',intensity:.75});
      }
    }
    if(['Protest','Measure','Build','Paint','Carry','Operate','CutRibbon','Applaud','Sit'].includes(p.action)){
      const t=p.actionElapsed??p.elapsed,span=p.actionDuration??sample.shot.duration;
      const weight=smooth(t/.28)*smooth((span-t)/.25);
      const stature=(figure.userData.profile?.height||1.78)/1.78;
      const phase=id.split('').reduce((sum,c)=>sum+c.charCodeAt(0),0)*.37;
      const cycle=Math.sin(t*4+phase),chest=bone('chest');
      let hands=[[.28,.95,.25],[-.28,.95,.25]],grip='relaxed';
      if(p.action==='Protest'){
        // Open palms and one raised arm; independent cadence avoids a marching crowd.
        hands=[[.36,1.12+.055*cycle,.38],[-.30,1.36+.09*Math.sin(t*3+phase),.27]];
        if(chest)chest.rotation.y+=.035*cycle*weight;
        actor.head.rotation.x+=.035*Math.sin(t*2.3+phase)*weight;
      }else if(p.action==='Measure')hands=[[.38,.84,.44],[-.38,.84,.44]];
      else if(p.action==='Build'){
        hands=[[.25,.87,.39],[-.24,1.12+.2*Math.sin(t*4),.43]];grip='fist';
        if(chest)chest.rotation.x+=.08*weight;
      }else if(p.action==='Paint'){hands=[[.26,.92,.25],[-.27,1.18+.22*Math.sin(t*2.6),.49]];grip='fist';}
      else if(p.action==='Carry')hands=[[.37,1.02,.38],[-.37,1.02,.38]];
      else if(p.action==='CutRibbon'){
        const reach=smooth(t/Math.max(.3,span*.35));hands=[[.32,.98,.30],[-.18,1.02,.28+.28*reach]];grip='fist';
      }else if(p.action==='Applaud'){
        const apart=.055+.12*(1+Math.cos(t*7))/2;hands=[[apart,1.15,.42],[-apart,1.15,.42]];
      }else if(['Operate','Sit'].includes(p.action)){
        const root=bone('root');if(root)root.position.y-=.43*stature*weight;
        figure.updateMatrixWorld(true);
        for(const [side,sign] of [['L',1],['R',-1]]){
          const joints=['thigh.','calf.','foot.'].map(prefix=>bone(prefix+side));
          arm(joints,figure.localToWorld(new Vector3(sign*.19,.12,.46).multiplyScalar(stature)),figure.localToWorld(new Vector3(sign*.22,.55,.85).multiplyScalar(stature)),weight);
        }
        hands=p.action==='Operate'?[[.23,.90,.48],[-.23,.90,.48]]:[[.25,.65,.37],[-.25,.65,.37]];
      }
      figure.updateMatrixWorld(true);
      hands.forEach((hand,index)=>arm(arms[index],figure.localToWorld(new Vector3(...hand).multiplyScalar(stature)),figure.localToWorld(new Vector3(index===0?.57:-.57,.88,.04).multiplyScalar(stature)),weight));
      figure.userData.handController?.update({pose:grip,intensity:.65});
    }
    return {gaze:gaze*1.3,accent,laugh,fade};
  }};
}
