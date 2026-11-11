// Seconds, not frames: identical clip speed on 30/60/144/240 Hz displays.
export function createStudioClock() {
  let previous=null, elapsed=0;
  return {
    tick(now,{active=true,paused=false,speed=1}={}) {
      if(!active){previous=null;return {delta:0,time:elapsed};}
      const delta=previous===null?0:Math.min(.1,Math.max(0,(now-previous)/1000));
      previous=now;
      const step=paused?0:delta*Math.min(2,Math.max(.25,Number(speed)||1));
      elapsed+=step;
      return {delta:step,time:elapsed};
    },
    reset(){previous=null;},
  };
}

export function createStudioAnimation(parts) {
  let active=parts.activeAction||'Idle';
  return {
    select(name,restart=false) {
      const next=parts.actions?.[name];if(!next)return false;
      if(active===name&&!restart)return true;
      // Preview switches must also work while paused, without stale fade weights.
      parts.mixer.stopAllAction();next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      active=name;parts.mixer.update(0);return true;
    },
    update(delta){parts.mixer?.update(delta);},
    dispose(){parts.mixer?.stopAllAction();parts.mixer?.uncacheRoot(parts.figure);},
  };
}
