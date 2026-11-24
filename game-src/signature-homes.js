// Stable story addresses; value is fictional, never a wallet transaction.
export const signatureHome = home => ({livia:{floors:2,wall:'#e88bae',accent:'#fff1df',name:'Vila Pink Livia'},angel:{floors:3,wall:'#f2e5cb',accent:'#b39a59',name:'Angel Grand Residence',storyValueIdr:200000000000}}[home.name.toLowerCase()]||null);

/** Shared public/filmed model. Footprint remains inside the original 8 m lot. */
export function buildSignatureHome(g,parent,home){
  const spec=signatureHome(home);if(!spec)return null;
  const parts=[];const layer=(name,at)=>{const o=g.group(parent,name);parts.push({o,at});return o;};
  const slab=layer('SignatureFoundation',.05),frame=layer('SignatureFrame',.25),walls=layer('SignatureWalls',.45),roof=layer('SignatureRoof',.65),finish=layer('SignatureDetails',.85);
  const height=spec.floors*3.3;
  g.box(slab,'TravertinePlinth','#c6baa0',[0,.12,0],[8,.24,8]);
  for(const x of [-3.6,3.6])for(const z of [-3.5,3.5])g.box(frame,'TallColumn',spec.accent,[x,height/2,z],[.35,height,.35]);
  g.box(walls,'Residence',spec.wall,[0,height/2,-.4],[7.3,height,6.7]);
  for(let floor=0;floor<spec.floors;floor++){
    const y=floor*3.3;
    g.box(finish,'FloorCornice',spec.accent,[0,y+.15,-.2],[7.8,.24,7.3]);
    for(const x of [-2.3,2.3]){
      g.box(finish,'FullHeightGlazing','#294a59',[x,y+1.75,3],[1.7,2.25,.13]);
      for(const dx of [-.86,0,.86])g.box(finish,'WindowMullion',spec.accent,[x+dx,y+1.75,3.1],[.07,2.3,.1]);
    }
    if(floor){g.box(finish,'Balcony',spec.accent,[0,y,3.45],[7.8,.2,1.05]);for(const x of [-3.7,3.7])g.box(finish,'BalconyEnd',spec.wall,[x,y+.5,3.45],[.18,1,1]);g.box(finish,'GlassBalustrade','#719b9f',[0,y+.55,3.93],[7.5,.9,.08]);g.box(finish,'Handrail',spec.accent,[0,y+1.03,3.93],[7.7,.08,.1]);}
  }
  g.box(finish,'DoubleEntrance','#293c42',[0,1.35,3],[1.8,2.6,.15]);
  g.box(finish,'Portico',spec.accent,[0,3.1,3.45],[2.7,.22,1.1]);
  for(const x of [-1.25,1.25])g.cylinder(finish,'PorticoColumn',spec.accent,[x,1.5,3.8],.13,3);
  g.box(roof,'RoofTerrace',spec.accent,[0,height+.15,-.2],[7.8,.3,7.4]);
  if(spec.floors===2){for(const side of [-1,1]){const r=g.box(roof,'RoseRoof','#a94070',[side*1.9,height+1.1,-.2],[4.2,.2,7.5]);r.rotation.z=-side*.4;}}
  else{g.box(roof,'Penthouse','#303e45',[0,height+1.1,-1.7],[5,2.1,3.7]);g.box(roof,'PenthouseGlass','#427b88',[0,height+1.1,.18],[4.5,1.8,.1]);for(const x of [-3.6,3.6])g.box(roof,'RoofGarden',spec.accent,[x,height+.5,.9],[.4,.6,4.5]);g.box(roof,'RooftopPool','#218baf',[0,height+.35,2],[3.2,.12,1.5]);}
  for(const x of [-3.35,3.35]){g.box(finish,'Planter',spec.accent,[x,.45,3.5],[.6,.7,.7]);g.ball(finish,'Topiary','#296245',[x,1,3.5],[.45,.6,.45]);}
  return {parts,height:height+2.3,spec};
}
