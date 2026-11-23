/** Offline proof uses the same city geometry as the runtime, not a mockup. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas,ImageData,loadImage} from '@napi-rs/canvas';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createCapitalContext,createRepublicTerrainStream} from '../game-src/republic-capital-scene.js';
import {setRepublicBuildingLogoImage} from '../game-src/republic-building-identity.js';
import {CAPITAL_LAYOUT,projectWorldPoint} from '../game-src/republic-world-layout.js';

globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;
globalThis.document={createElement(name){if(name!=='canvas')throw Error(name);const c=createCanvas(1,1);Object.defineProperty(c,'data',{value:undefined});c.toBlob=callback=>{const bytes=c.toBuffer('image/png');queueMicrotask(()=>callback(new Blob([bytes],{type:'image/png'})));};return c;}};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}};
const bgnImage=await loadImage('game-src/assets/bgn-logo-official.png'),bgnCanvas=document.createElement('canvas');bgnCanvas.width=bgnImage.width;bgnCanvas.height=bgnImage.height;bgnCanvas.getContext('2d').drawImage(bgnImage,0,0);setRepublicBuildingLogoImage(bgnCanvas);
const out=path.resolve(process.argv[2]||'C:/tmp/republic-world-review');await fs.mkdir(out,{recursive:true});
const selected=process.argv.find(v=>v.startsWith('--views='))?.slice(8).split(',');
for(const spec of [
  {name:'mulamula-before',phase:'before-day2',eye:[154,165,137],target:[39,0,-32],width:205},
  {name:'mulamula-after',phase:'after-day2',eye:[25,21,30],target:[-1,0,-5],width:49},
  {name:'future-city-site',city:'bandung',phase:'before-day2',eye:[-975,15,-397],target:[-1000,0,-430],width:51},
  {name:'republic-archipelago',phase:'before-day2',eye:[0,6500,1700],target:[0,0,100],width:6200},
]){
  if(selected&&!selected.includes(spec.name))continue;
  const scene=new THREE.Scene(),resources={geometries:new Set(),materials:new Set(),textures:new Set()},context=createCapitalContext({parent:scene,...resources,phase:spec.phase,city:spec.city||'jakarta',includeCore:true});
  const stream=createRepublicTerrainStream({parent:scene,city:spec.city||'jakarta'});stream.update(spec.target[0],spec.target[2]);
  const target=new THREE.Vector3(...spec.target),camera=new THREE.OrthographicCamera(-spec.width/2,spec.width/2,spec.width/3,-spec.width/3,.1,Math.max(12000,spec.width*3));camera.position.fromArray(spec.eye).sub(target).normalize().multiplyScalar(Math.max(200,spec.width*2)).add(target);camera.lookAt(target);camera.name='WorldReviewCamera';scene.add(camera);scene.updateMatrixWorld(true);
  const saved=[];scene.traverse(n=>{saved.push([n,n.userData]);n.userData={};});
  try{const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await fs.writeFile(path.join(out,spec.name+'.glb'),Buffer.from(result));}finally{for(const [node,data] of saved)node.userData=data;}
  stream.dispose();context.dispose();for(const set of Object.values(resources))for(const item of set)item.dispose();console.log('World review exported',spec.name);
}

// A shareable site plan is generated from the same canonical arrays.
const escape=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const xy=(x,z)=>{const p=projectWorldPoint(x,z);return [80+p.x*8.1,138+p.y*6.2];};
const rect=(r,style)=>{const [x,y]=xy(r.x-r.width/2,r.z-r.depth/2),[right,bottom]=xy(r.x+r.width/2,r.z+r.depth/2);return `<rect x="${x}" y="${y}" width="${right-x}" height="${bottom-y}" ${style}/>`;};
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="900" viewBox="0 0 1100 900"><rect width="1100" height="900" fill="#edf0e3"/><text x="64" y="61" fill="#23474a" font-family="Arial" font-size="32" font-weight="700">${CAPITAL_LAYOUT.name.toUpperCase()}</text><text x="66" y="91" fill="#677e75" font-family="Arial" font-size="15">DENAH KANONIS • tahap awal republik • satu koordinat untuk peta, jelajah dan episode</text><rect x="57" y="119" width="855" height="667" rx="20" fill="#d5dfbf" stroke="#a8b99d"/>`;
for(const zone of CAPITAL_LAYOUT.zones){svg+=rect(zone.rect,`rx="9" fill="${zone.status==='foundation'?'#c8cbb0':zone.status==='active'?'#c9d8bd':'#c2d1b3'}" stroke="#94a58c" stroke-dasharray="7 6"`);if(zone.id==='civic')continue;const [x,y]=xy(zone.rect.x,zone.rect.z-zone.rect.depth/2);svg+=`<text x="${x}" y="${y+15}" text-anchor="middle" font-family="Arial" font-size="11" fill="#4a655c">${escape(zone.name)}</text>`;}
for(const road of CAPITAL_LAYOUT.roads){const [x1,y1]=xy(...road.from),[x2,y2]=xy(...road.to);svg+=`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#ede6cf" stroke-width="${road.width*3.1}" fill="none" stroke-linecap="round"/>`;}
for(const plot of CAPITAL_LAYOUT.housingPlots){svg+=rect(plot,`fill="#dfd8c2" stroke="#8c9689" stroke-width="2"`);const [x,y]=xy(plot.x,plot.z);svg+=`<text x="${x}" y="${y+4}" text-anchor="middle" font-family="Arial" font-size="9" fill="#5c6c61">${plot.id}</text>`;}
for(const [id,label,color] of [['stage','PANGGUNG','#b45b49'],['koplak','KOPLAK','#a7b3a1'],['sppg','SPPG','#a7b3a1']]){const r=CAPITAL_LAYOUT[id];svg+=rect(r,`fill="${color}" stroke="#6e8674" stroke-width="1.5" ${id!=='stage'?'stroke-dasharray="3 2"':''}`);const [x,y]=xy(r.x,r.z),right=id==='koplak',labelX=right?558:374,labelY=id==='stage'?477:444,lineEnd=right?labelX-5:labelX+5;svg+=`<path d="M${x} ${y}L${lineEnd} ${labelY-4}" stroke="#55796b" fill="none"/><text x="${labelX}" y="${labelY}" text-anchor="${right?'start':'end'}" font-family="Arial" font-size="10" font-weight="700" fill="#32544c">${label}</text>`;}
svg+=`<g font-family="Arial" fill="#365b54"><text x="940" y="174" font-size="18" font-weight="700">UTARA ↑</text><text x="940" y="223" font-size="12">Tahap awal:</text><text x="940" y="248" font-size="12">• Panggung warga</text><text x="940" y="271" font-size="12">• 24 fondasi petak</text><text x="940" y="294" font-size="12">• Jalan kerikil</text><text x="940" y="337" font-size="12">Setelah Day 2:</text><text x="940" y="362" font-size="12">• Koplak Desa</text><text x="940" y="385" font-size="12">• SPPG</text><text x="940" y="431" font-size="12">Lahan rencana:</text><text x="940" y="456" font-size="12">belum ada gedung</text><text x="940" y="479" font-size="12">atau rumah jadi.</text></g><text x="65" y="823" fill="#3d6257" font-family="Arial" font-size="14">48 warga, 24 petak fondasi berkapasitas rancangan 2 warga/petak. Penempatan rumah masih PR.</text><text x="65" y="850" fill="#6f8074" font-family="Arial" font-size="12">Batas denah adalah kawasan perencanaan; dunia jelajah berlanjut melewatinya. Fase dan progres proyek resmi disimpan di server.</text></svg>`;
await fs.mkdir('docs/world',{recursive:true});await fs.writeFile('docs/world/kota-mulamula-siteplan.svg',svg);
