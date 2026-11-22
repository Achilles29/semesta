export {republicGeometry as day2Geometry} from './republic-geometry.js';

export const smooth01=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
export function resolveDay2Prop(value,fallback,progress){
  if(!value||typeof value==='string')return {from:value||fallback,to:value||fallback,mix:1};
  const at=Number.isFinite(value.at)?value.at:.5,until=Number.isFinite(value.until)?value.until:at;
  const mix=until>at?smooth01((progress-at)/(until-at)):Number(progress>=at);
  return {from:value.from||fallback,to:value.to||fallback,mix};
}
