/** Illustrated cartography; every coastline/road comes from the playable world. */
import {WORLD_LANDMASSES,WORLD_DISTRICTS,REGIONAL_LAYOUT} from './republic-world-layout.js';

const n=value=>Number(value.toFixed(2));
const project=([x,z],width,height,bounds)=>[n((x-bounds.minX)/(bounds.maxX-bounds.minX)*width),n((z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*height)];
const points=(outline,width,height,bounds)=>outline.map(p=>project(p,width,height,bounds).join(',')).join(' ');

export function landscapeSvg(width=1200,height=700,bounds=REGIONAL_LAYOUT.bounds,scope='atlas'){
  const id=`land-${scope}`,clip=`${id}-clip`;
  const outlines=WORLD_LANDMASSES.map(land=>points(land.outline,width,height,bounds));
  const defs=`<defs><linearGradient id="${id}-green" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#c7d99d"/><stop offset=".5" stop-color="#91b77f"/><stop offset="1" stop-color="#6b9e83"/></linearGradient><pattern id="${id}-grain" width="23" height="19" patternUnits="userSpaceOnUse"><circle cx="3" cy="8" r=".65" fill="#345d4b" opacity=".15"/><circle cx="17" cy="16" r=".7" fill="#f4edc4" opacity=".4"/></pattern><clipPath id="${clip}">${outlines.map(p=>`<polygon points="${p}"/>`).join('')}</clipPath></defs>`;
  const land=WORLD_LANDMASSES.map((m,i)=>{
    const p=outlines[i],[cx,cy]=project([m.center.x,m.center.z],width,height,bounds);
    const contour=[.86,.71,.56].map((scale,j)=>`<polygon points="${p}" transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})" fill="${j===2?'#dce3b1':'none'}" fill-opacity=".18" stroke="#456e56" stroke-opacity=".12" stroke-width="1.2"/>`).join('');
    return `<g data-landmass="${m.id}"><polygon points="${p}" fill="#082e45" opacity=".17" transform="translate(0 10)"/><polygon points="${p}" fill="none" stroke="#77c4bc" stroke-width="24" stroke-opacity=".15" stroke-linejoin="round"/><polygon points="${p}" fill="none" stroke="#93d5c6" stroke-width="12" stroke-opacity=".34" stroke-linejoin="round"/><polygon points="${p}" fill="url(#${id}-green)" stroke="#ece0ae" stroke-width="3" stroke-linejoin="round"/>${contour}<polygon points="${p}" fill="url(#${id}-grain)"/></g>`;
  }).join('');
  const natural=WORLD_DISTRICTS.filter(d=>['forest','mountains','countryside'].includes(d.kind)).map((d,index)=>{
    const [cx,cy]=project([d.rect.x,d.rect.z],width,height,bounds);
    const rx=d.rect.width/(bounds.maxX-bounds.minX)*width*.55,ry=d.rect.depth/(bounds.maxZ-bounds.minZ)*height*.55;
    if(cx+rx<0||cy+ry<0||cx-rx>width||cy-ry>height)return '';
    if(d.kind==='forest'){
      const trees=Array.from({length:19},(_,i)=>{const a=i*2.39996,r=Math.sqrt((i+.5)/19),x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r,s=Math.max(2,Math.min(8,rx/9))*(.8+(i%3)*.13);return `<g transform="translate(${n(x)} ${n(y)})"><ellipse cy="${s*.55}" rx="${s*.8}" ry="${s*.4}" fill="#2e6557" opacity=".18"/><path d="M0 ${-s*1.3}L${-s*.8} ${s*.4}H${s*.8}Z" fill="${['#477e62','#548e6c','#3c745e'][(i+index)%3]}"/><path d="M0 ${-s*1.3}V${s*.4}H${s*.8}Z" fill="#c2dca5" opacity=".17"/></g>`;}).join('');
      return `<g data-terrain-decoration="forest"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#4f8d70" opacity=".15"/>${trees}</g>`;
    }
    if(d.kind==='mountains')return `<g data-terrain-decoration="mountains">${[0,1,2,3].map(i=>{const x=cx+(i-1.5)*rx*.42,y=cy+(i%2)*ry*.3,s=Math.max(4,Math.min(32,rx*.4));return `<path d="M${n(x-s)} ${n(y+s*.45)}L${n(x)} ${n(y-s)}L${n(x+s)} ${n(y+s*.45)}Z" fill="#72947a"/><path d="M${n(x)} ${n(y-s)}L${n(x+s)} ${n(y+s*.45)}L${n(x+s*.1)} ${n(y+s*.25)}Z" fill="#436f66" opacity=".55"/><path d="M${n(x-s*.24)} ${n(y-s*.65)}L${n(x)} ${n(y-s)}L${n(x+s*.23)} ${n(y-s*.67)}L${n(x)} ${n(y-s*.76)}Z" fill="#dae2bd"/>`;}).join('')}</g>`;
    return `<g data-terrain-decoration="meadow" fill="none" stroke="#719c69" stroke-width="1.1" opacity=".35">${[0,1,2].map(i=>`<path d="M${n(cx-rx*.7)} ${n(cy+ry*(i-1)*.36)}q${n(rx*.7)} ${n(-ry*.3)} ${n(rx*1.4)} 0"/>`).join('')}</g>`;
  }).join('');
  return `${defs}${land}<g clip-path="url(#${clip})">${natural}</g>`;
}
