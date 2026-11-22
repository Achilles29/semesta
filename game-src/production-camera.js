import {MathUtils} from 'three';

/** All paths use absolute shot time, so seeking/exporting reproduces playback. */
export function cameraFrameAt(frame,elapsed,duration){
  if(!frame?.motion)return frame;
  const {from,to,hold=0}=frame.motion;
  const t=MathUtils.smoothstep(Math.max(0,Math.min(1,elapsed/(duration*(1-hold)))),0,1);
  const lerp=(a,b)=>a+(b-a)*t;
  const width=frame.motion.type==='descent'?Math.exp(lerp(Math.log(from.width),Math.log(to.width))):lerp(from.width,to.width);
  return {...frame,target:from.target.map((v,i)=>lerp(v,to.target[i])),width,azimuth:lerp(from.azimuth??0,to.azimuth??0),elevation:lerp(from.elevation??.055,to.elevation??.055),fov:lerp(from.fov??35,to.fov??35),...(frame.motion.type==='zoom'?{distanceWidth:from.width,distanceFov:from.fov??35}:{}),push:0};
}
