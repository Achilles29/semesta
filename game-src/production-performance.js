import envelope from '../public/audio/produksi/episode-002/release-v10/speech-envelope.json' with {type:'json'};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** One visibly speaking character, motivated listening and a shot for every exchange. */
export function directPerformance({time,cue,actors,speaking,aspect}){
  const speaker=actors[cue.role],recipient=cue.recipient,listener=actors[recipient];
  const addressCamera=['camera','crowd','ensemble','extras'].includes(recipient);
  const frame=time*envelope.fps,index=Math.floor(frame),fraction=frame-index;
  const energy=(envelope.values[index]??0)*(1-fraction)+(envelope.values[index+1]??0)*fraction;
  for(const [id,a] of Object.entries(actors)){
    a.mouthOpen=id===cue.role&&speaking?energy:0;
    a.headYaw=0;a.headNod=0;a.reaction='listen';
    // Dialogue must not make all actors simultaneously use the same waving clip.
    if(a.clip==='Interact')a.clip='Idle';
    const target=id===cue.role?listener:speaker;
    if(target)a.headYaw=clamp(Math.atan2(target.x-a.x,Math.max(.8,target.z-a.z)),-.48,.48)-a.yaw;
    if(id===cue.role){
      a.headYaw=addressCamera?-a.yaw:a.headYaw;
      a.headNod=speaking?Math.sin((time-cue.start)*6.5)*.035*energy:0;
      a.reaction=addressCamera?'address-viewer':'speak';
    }else if(id===recipient){
      a.headNod=Math.sin(Math.min(1,(time-cue.start)/.6)*Math.PI)*.11;
      a.reaction='respond';
    }
  }
  // Individually motivated free-hand gestures, preserving all prop grips.
  if(speaking){
    const local=time-cue.start,beat=Math.sin(Math.min(1,local/.45)*Math.PI/2);
    const freeSide=!speaker.handTargets.R?'R':!speaker.handTargets.L?'L':null;
    if(freeSide){
      const side=freeSide==='L'?1:-1;
      const targetY=cue.role==='bu-warung'?.99:cue.beat==='clap'?1.53:1.18;
      speaker.handTargets[freeSide]=[speaker.x+side*(.31+.08*beat),targetY+(speaker.y??0),speaker.z+.28];
    }
  }
  // Camera is on the same side of the action axis throughout. Two-shots retain
  // the listener; action pauses widen to show cause and consequence, not a new speaker.
  let partners=listener?[cue.role,recipient]:[cue.role];
  let kind=listener?'dialogue-two-shot':'direct-address';
  if(!speaking&&['lift','deliver','customer'].includes(cue.beat)){
    partners=cue.beat==='lift'?['bahlil','bu-warung']:cue.beat==='deliver'?['mama-ghufron','komeng']:['pak-sandal','bu-warung'];kind='action-payoff';
  }
  if(cue.beat==='invite')partners=['bu-warung','bahlil','pak-sandal'];
  if(cue.beat==='customer'&&speaking)partners=['bu-warung','bahlil'];
  // Final address keeps two listeners at the edges; the following punchline cuts to Bahlil.
  if(cue.beat==='follow')partners=['pemandu','bu-warung','bahlil'];
  if(['series','promise'].includes(cue.beat))partners=['pemandu','bu-warung'];
  if(cue.beat==='vacancy')partners=['pemandu','bahlil'];
  const selected=partners.map(id=>actors[id]);
  const minX=Math.min(...selected.map(a=>a.x)),maxX=Math.max(...selected.map(a=>a.x));
  const x=(minX+maxX)/2,z=Math.max(...selected.map(a=>a.z));
  const fullBody=kind==='action-payoff'||['handoff','lift','order','invite','customer'].includes(cue.beat);
  const targetY=fullBody?1.02:1.43;
  const halfWidth=(maxX-minX)/2+.56,halfHeight=fullBody?1.18:.67;
  const fov=36,tangent=Math.tan(fov*Math.PI/360);
  const distance=Math.max(halfHeight/tangent,halfWidth/(tangent*aspect))+ .45;
  return {camera:{position:[x,targetY+.17,z+distance],target:[x,targetY,z],fov},
    direction:{speaker:cue.role,recipient,kind,partners},energy};
}

/** Head-bound mouth cavity: driven by real RMS, never by an arbitrary sine loop. */
export function createCastPerformance(THREE,cast){
  const records=new Map(),geometry=new THREE.SphereGeometry(1,20,12);
  const material=new THREE.MeshStandardMaterial({color:'#3d1817',roughness:1});
  for(const npc of cast){
    const head=npc.model.head,smile=npc.model.figure.getObjectByName('Face_Smile');
    if(!head||!smile)continue;
    // The authored V11 mouth is at y=1.556, z=.158 in rest-pose figure coordinates.
    const mouth=new THREE.Mesh(geometry,material);mouth.name='SpeechMouth';
    mouth.position.set(0,1.552,.164);mouth.scale.set(.042,.002,.013);
    npc.model.figure.add(mouth);npc.model.figure.updateWorldMatrix(true,true);head.attach(mouth);
    mouth.visible=false;records.set(npc.id,{mouth,smile,head,smileVisible:smile.visible});
  }
  return {
    update(npc,pose){const r=records.get(npc.id);if(!r)return;
      const amount=pose.mouthOpen??0;r.mouth.visible=amount>.045;r.smile.visible=!r.mouth.visible;
      r.mouth.scale.y=.003+amount*.017;
      r.head.rotation.y+=pose.headYaw??0;r.head.rotation.x+=pose.headNod??0;
    },
    reset(){for(const r of records.values()){r.mouth.visible=false;r.smile.visible=r.smileVisible;}},
    dispose(){for(const r of records.values())r.mouth.removeFromParent();geometry.dispose();material.dispose();}
  };
}
