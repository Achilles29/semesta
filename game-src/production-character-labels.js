import * as THREE from 'three';
import {castIdentity} from './citizen-roster.js';

/** Names belong to readable close/medium compositions, not a distant crowd. */
export function characterLabelAnchors(stage){
  if(!stage.actors||!stage.camera?.isCamera)return [];
  let peopleInFrame=0;
  const candidates=[],project=(head,feet,name,id,offset,human=true)=>{
    if(!head||!feet?.visible)return;
    const base=feet.getWorldPosition(new THREE.Vector3()).project(stage.camera);
    const crown=head.getWorldPosition(new THREE.Vector3());
    const point=crown.clone();point.y+=offset;point.project(stage.camera);
    if(point.z < -1||point.z>1||Math.abs(point.x)>1||point.y>1||point.y< -1)return;
    if(human&&Math.abs(point.y-base.y)>.04)peopleInFrame++;
    if(Math.abs(point.y-base.y)<.24)return; // Less than 12% of image height.
    candidates.push({id,name,x:(point.x+1)/2,y:(1-point.y)/2,crown});
  };
  for(const cast of stage.compiled.scenario.cast){const actor=stage.actors.get(cast.id);if(actor)project(actor.head,actor.figure,castIdentity(cast,stage.compiled.scenario).name,cast.id,.20);}
  for(const [id,item] of Object.entries(stage.extras?.items||{}))project(item.head,item.root,id==='cat'?'Kucing':'Ayam',id,.13,false);
  // Decide density before expensive occlusion work. Never fill a crowd shot
  // with displaced plates and leader lines just to show every name.
  if(peopleInFrame>8||candidates.length>5)return [];
  const origin=stage.camera.getWorldPosition(new THREE.Vector3()),ray=new THREE.Raycaster();
  // Terrain is beneath this staged cast. Testing its tens of thousands of
  // triangles for each head used to consume hundreds of ms per frame.
  const occluders=(stage.occluders||[]).filter(object=>{
    if(object.userData.backgroundTerrain)return false;
    for(let node=object;node;node=node.parent)if(!node.visible)return false;
    return true;
  });
  return candidates.filter(({crown})=>{
    if(!occluders.length)return true;
    const direction=crown.clone().sub(origin),distance=direction.length();
    ray.set(origin,direction.normalize());ray.far=Math.max(0,distance-.08);
    return !ray.intersectObjects(occluders,false).some(hit=>!(hit.object.material?.transparent&&hit.object.material.opacity<.5));
  }).map(({crown,...anchor})=>anchor);
}

/** Omit plates that cannot fit near their own head; no leader lines. */
export function layoutCharacterLabels(anchors,{width,height,measure,subtitleTop=height*.61}){
  if(anchors.length>7)return [];
  const scale=Math.min(width/1080,height/1080),size=30*scale,lineHeight=46*scale,gap=8*scale,pad=width*.045;
  const top=height*.17,bottom=Math.min(height*.65,subtitleTop-16*scale),placed=[];
  for(const anchor of [...anchors].sort((a,b)=>a.y-b.y)){
    const boxWidth=Math.min(width*.65,Math.max(64*scale,measure(anchor.name,size)+28*scale));
    const x=Math.max(pad,Math.min(width-pad-boxWidth,anchor.x*width-boxWidth/2));
    const y=anchor.y*height-lineHeight;
    if(y<top||y+lineHeight>bottom)continue;
    const overlaps=cy=>placed.some(p=>x<p.x+p.width+gap&&x+boxWidth+gap>p.x&&cy<p.y+p.height+gap&&cy+lineHeight+gap>p.y);
    const cy=[y,y-lineHeight-gap].find(cy=>cy>=top&&!overlaps(cy));
    if(cy===undefined)continue;
    placed.push({...anchor,x,y:cy,width:boxWidth,height:lineHeight,fontSize:size});
  }
  return placed;
}

export function drawCharacterLabels(ctx,stage,{subtitleTop}={}){
  const {width,height}=ctx.canvas;
  ctx.save();
  const labels=layoutCharacterLabels(characterLabelAnchors(stage),{width,height,subtitleTop,measure:(name,size)=>{ctx.font=`700 ${size}px Arial`;return ctx.measureText(name).width;}});
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const label of labels){
    ctx.fillStyle='rgba(13,30,40,.83)';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(label.x,label.y,label.width,label.height,label.height/3);ctx.fill();}else ctx.fillRect(label.x,label.y,label.width,label.height);
    ctx.fillStyle='#fff';ctx.font=`700 ${label.fontSize}px Arial`;ctx.fillText(label.name,label.x+label.width/2,label.y+label.height/2,label.width-18*Math.min(width/1080,height/1080));
  }
  ctx.restore();return labels;
}
