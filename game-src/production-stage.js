import * as THREE from 'three';
import {loadAvatarProfile,createHumanModel,disposeAvatar,avatarSpeed} from './avatar-runtime.js';
import {presets} from './avatar-v15-config.js';
import {compileScenario,sampleScenario} from './production-scenario.js';
import {createProductionDance,DANCE_BPM} from './production-dance.js';

/** Scene and deterministic posing are also usable by CPU contract tests. */
export async function createProductionStage(input){
  let compiled=compileScenario(input);const scene=new THREE.Scene();
  scene.background=new THREE.Color(input.set==='studio'?'#293d48':'#b6cfce');
  scene.fog=new THREE.Fog(scene.background,24,65);
  scene.add(new THREE.HemisphereLight('#fff6df','#52686d',2.2));
  const sun=new THREE.DirectionalLight('#fff1d7',3.2);sun.position.set(-5,9,6);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:35});sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;scene.add(sun);
  const fill=new THREE.DirectionalLight('#b1d9ff',1.2);fill.position.set(5,3,-4);scene.add(fill);
  const owned=new THREE.Group();scene.add(owned);
  const geometries=new Set(),materials=new Set();
  const box=(color,position,size)=>{
    const geometry=new THREE.BoxGeometry(...size),material=new THREE.MeshStandardMaterial({color,roughness:.78});
    geometries.add(geometry);materials.add(material);const mesh=new THREE.Mesh(geometry,material);mesh.position.fromArray(position);mesh.castShadow=mesh.receiveShadow=true;owned.add(mesh);return mesh;
  };
  box(input.set==='studio'?'#53656c':'#c5baa4',[0,-.08,0],[100,.15,100]);
  box('#e5dece',[0,.01,-.6],[9,.02,5]);
  if(input.set==='studio'){
    box('#344e58',[0,4,-6],[30,8,.3]);
    for(const x of [-6,6])box('#d6b576',[x,2.3,-5.8],[.12,4.6,.1]);
  }else{
    box('#e3d5bb',[0,1.6,-6],[13,3.2,.3]);
    box('#896952',[0,3.3,-6],[13.5,.18,1]);
    for(const x of [-5,-2.5,2.5,5]){
      box('#6b9295',[x,1.7,-5.81],[1.2,1.5,.08]);box('#f2e9d7',[x,.95,-5.7],[1.4,.1,.25]);
    }
    for(const x of [-9,9]){
      box('#7e6752',[x,1.9,-5],[.35,3.8,.35]);
      const geometry=new THREE.SphereGeometry(2.2,16,12),material=new THREE.MeshStandardMaterial({color:'#5f7e5c',roughness:1});geometries.add(geometry);materials.add(material);
      const crown=new THREE.Mesh(geometry,material);crown.position.set(x,4,-5);crown.castShadow=true;owned.add(crown);
    }
  }
  if(input.props.includes('bench')){
    box('#7c5a40',[0,.48,-2.5],[2.5,.13,.65]);box('#986c49',[0,.95,-2.77],[2.5,.65,.12]);
    for(const x of [-1,1])box('#34464b',[x,.23,-2.5],[.1,.46,.5]);
  }
  if(input.props.includes('crate')){
    box('#aa784a',[-2.8,.38,-1.5],[.8,.75,.8]);
    for(const y of [.15,.4,.65])box('#d3a272',[-2.8,y,-1.08],[.83,.06,.03]);
  }
  if(input.props.includes('plants'))for(const x of [-3.8,3.8]){
    box('#b4775c',[x,.22,-3],[.5,.45,.5]);
    for(let i=0;i<7;i++){const leaf=box(i%2?'#72956c':'#4e795f',[x+Math.sin(i*2.4)*.18,.6+i*.06,-3+Math.cos(i*2.4)*.18],[.12,.65,.1]);leaf.rotation.z=Math.sin(i)*.65;}
  }
  if(input.props.includes('board')){
    box('#967958',[2.9,1.25,-2.5],[1.6,1.5,.12]);box('#315459',[2.9,1.25,-2.42],[1.45,1.35,.05]);
    for(const x of [2.3,3.5])box('#967958',[x,.4,-2.5],[.08,.8,.1]);
  }
  const actors=new Map(),camera=new THREE.PerspectiveCamera(35,9/16,.1,100);
  const configs=input.cast.map(c=>presets.find(p=>p.id===c.preset).config);
  const dispose=()=>{actors.forEach(disposeAvatar);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());sun.shadow.dispose();scene.clear();};
  try{
    await Promise.all([...new Set(configs.map(c=>c.profileId))].map(loadAvatarProfile));
    input.cast.forEach((c,i)=>{
      const actor=createHumanModel(THREE,{avatarConfig:configs[i]});actors.set(c.id,actor);scene.add(actor.figure);
      actor.productionDance=createProductionDance(actor);
      // The Hold action has an actual prop, parented to the rig's approved grip.
      const parcel=new THREE.Mesh(new THREE.BoxGeometry(.24,.18,.12),new THREE.MeshStandardMaterial({color:'#ba8b60',roughness:.9}));
      geometries.add(parcel.geometry);materials.add(parcel.material);parcel.name='ProductionParcel';parcel.castShadow=true;
      (actor.figure.userData.getGrip?.('handR')||actor.figure).add(parcel);actor.productionParcel=parcel;
    });
  }catch(error){dispose();throw error;}
  function pose(time,aspect=9/16){
    const sample=sampleScenario(compiled,time);
    for(const c of input.cast){
      const actor=actors.get(c.id),p=sample?.actors[c.id]||{action:'Idle',position:c.position,yaw:c.yaw,elapsed:time,blend:1};
      actor.figure.position.set(p.position[0],0,p.position[1]);actor.figure.rotation.y=p.yaw;
      actor.mixer.stopAllAction();
      const apply=(cue,weight,previous=false)=>{
        const action=actor.actions[cue.action==='Dance'?'Idle':cue.action];if(!action)return;
        action.reset().play();action.setEffectiveWeight(weight);action.paused=true;
        let phase=cue.action==='Idle'?time:cue.elapsed;
        if(['Walk','Run'].includes(cue.action))phase=(previous?cue.distance:cue.distanceTravelled)/avatarSpeed(actor,cue.action);
        action.time=Math.max(0,phase||0)%action.getClip().duration;
      };
      // Dance is layered over Idle with its own absolute-time blend. Avoid
      // playing the same mixer action twice for Dance -> Idle transitions.
      const mixerName=name=>name==='Dance'?'Idle':name;
      if(p.previous&&mixerName(p.previous.action)!==mixerName(p.action)&&p.blend<1){apply(p.previous,1-p.blend,true);apply(p,p.blend);}else apply(p,1);
      actor.mixer.update(0);
      if(p.action==='Dance')actor.productionDance.apply({time:p.elapsed,bpm:p.bpm??DANCE_BPM,weight:Math.min(1,p.elapsed/.22)});
      else if(p.previous?.action==='Dance'&&p.blend<1)actor.productionDance.apply({time:p.previous.elapsed,bpm:p.previous.bpm??DANCE_BPM,weight:1-p.blend});
      actor.productionParcel.visible=p.action==='Hold';
      actor.figure.userData.expressionController?.update({time,expression:p.action==='Wave'?'happy':'neutral',intensity:.4});
    }
    scene.updateMatrixWorld(true);
    const focus=sample?.actors[sample.shot.focus]?.position||[0,0];
    const mode=sample?.shot.camera||'wide';
    const center=mode==='wide'?[0,0]:focus;
    // Fit a stable physical width in either orientation; vertical close-ups
    // remain head-and-torso shots instead of cutting off the head.
    const width=(aspect<1?{wide:Math.max(2.8,input.cast.length*1.1),medium:1.9,close:.95,follow:2.2}:{wide:7,medium:3.8,close:1.7,follow:3.7})[mode];
    const height=Math.max(mode==='close'?1.25:2.4,width/aspect);
    const distance=height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    const y=mode==='close'?1.38:1.05;
    camera.aspect=aspect;camera.position.set(center[0]+(mode==='follow'?1:0),y+distance*.055,center[1]+distance);camera.lookAt(center[0],y,center[1]);camera.updateProjectionMatrix();
    return sample;
  }
  return {scene,camera,actors,get compiled(){return compiled;},setScenario(next){compiled=compileScenario(next);input=compiled.scenario;},pose,dispose};
}

export function createProductionRenderer(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  return renderer;
}

export function compositeFrame(ctx,source,stage,time,{guides=false}={}){
  const {width:w,height:h}=ctx.canvas;ctx.drawImage(source,0,0,w,h);
  const sample=sampleScenario(stage.compiled,time);if(!sample)return;
  const scale=Math.min(w/1080,h/1080),pad=w*.08;
  ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';ctx.font=`600 ${Math.round(22*scale)}px Arial`;
  const heading=stage.compiled.scenario.notice||(stage.compiled.scenario.kind==='rehearsal'?'LATIHAN STUDIO':stage.compiled.scenario.title);
  ctx.fillStyle='rgba(14,30,35,.8)';ctx.fillRect(pad,h*.09,Math.min(w*.78,ctx.measureText(heading).width+36*scale),42*scale);
  ctx.fillStyle='#fff4db';ctx.fillText(heading,pad+18*scale,h*.09+21*scale,w*.72);
  if(sample.shot.caption){
    let size=Math.round(38*scale),lines=[];
    const wrap=()=>{ctx.font=`600 ${size}px Arial`;lines=[];let line='';for(const word of sample.shot.caption.split(/\s+/)){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>w*.76&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);};
    wrap();while(lines.length>3&&size>18*scale){size-=1;wrap();}
    const lineHeight=size*1.35,bottom=h*.79,top=bottom-lines.length*lineHeight-16*scale;
    ctx.fillStyle='rgba(12,25,30,.86)';ctx.fillRect(pad,top,w*.84,lines.length*lineHeight+32*scale);
    ctx.fillStyle='#fff';ctx.textAlign='center';lines.forEach((line,i)=>ctx.fillText(line,w/2,top+16*scale+(i+.5)*lineHeight,w*.76));
  }
  if(guides){ctx.strokeStyle='rgba(255,235,177,.65)';ctx.lineWidth=1;ctx.setLineDash([8,8]);ctx.strokeRect(w*.08,h*.09,w*.84,h*.71);}
  ctx.restore();
}
