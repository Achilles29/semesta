// Server time anchors the world; changing the device clock cannot change night.
let anchor=null;
const monotonic=()=>globalThis.performance?.now?.()??0;
export function syncRepublicClock(iso,clock={},now=monotonic()){
  const epoch=Date.parse(iso);if(!Number.isFinite(epoch))return false;
  anchor={epoch,at:now,offset:Number.isFinite(clock.utcOffsetMinutes)?clock.utcOffsetMinutes:420};return true;
}
export function republicDaylight(epoch,offset=420){
  const hour=((epoch/3600000+offset/60)%24+24)%24,altitude=Math.sin((hour-6)/24*Math.PI*2);
  const t=Math.max(0,Math.min(1,(altitude+.12)/.42)),day=t*t*(3-2*t);
  return {hour,day,ambient:.6+day*.8,sun:.22+day*2.2,label:String(Math.floor(hour)).padStart(2,'0')+':'+String(((Math.floor(epoch/60000)+offset)%60+60)%60).padStart(2,'0')};
}
export function currentRepublicLight(now=monotonic()){
  if(!anchor)return {...republicDaylight(3*3600000),synced:false,label:'Menyinkronkan waktu'};
  return {...republicDaylight(anchor.epoch+Math.max(0,now-anchor.at),anchor.offset),synced:true};
}
