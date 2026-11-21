// Optional offline review: npm install --no-save @napi-rs/canvas
// Exports the actual posed scene for Blender. This does not control a browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCanvas,loadImage,ImageData,Canvas} from '@napi-rs/canvas';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import manifest from '../game-src/avatar-v15-runtime-manifest.json' with {type:'json'};
import {day1Scenario} from '../game-src/production-day1.js';
import {createProductionStage,compositeFrame} from '../game-src/production-stage.js';

globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;
const canvas=()=>{const c=createCanvas(1,1);Object.defineProperty(c,'data',{value:undefined});c.toBlob=async callback=>callback(new Blob([await c.encode('png')],{type:'image/png'}));return c;};
globalThis.document={createElement:name=>{if(name==='canvas')return canvas();throw new Error(name);}};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}};
const out=path.resolve(process.argv[2]||'C:/tmp/day1-render');await fs.mkdir(out,{recursive:true});
GLTFLoader.prototype.loadAsync=async function(url){
  const id=Object.entries(manifest).find(([,file])=>url.includes(file))?.[0];if(!id)throw new Error(url);
  const bytes=await fs.readFile(`public/models/characters/v15/${id}.glb`);
  this.register(parser=>({name:'OFFLINE_TEXTURE_REVIEW',async loadTexture(index){
    const textureDef=parser.json.textures[index],source=parser.json.images[textureDef.source];
    const bytes=await parser.getDependency('bufferView',source.bufferView),image=await loadImage(Buffer.from(bytes));
    const c=canvas();c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    // Material images must be snapshotted: the exporter may reuse its canvas cache.
    const pixels=ctx.getImageData(0,0,c.width,c.height);if(!pixels.data.some(v=>v))throw new Error('Empty decoded source texture '+index);
    const texture=new THREE.CanvasTexture(c);texture.flipY=false;texture.needsUpdate=true;return texture;
  }}));
  return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
const stage=await createProductionStage(day1Scenario());
const selections=['hari-pertama','joko-datang','ayam-daftar','kucing-kenalan','arti-orang-dalam','keputusan-perut'];
for(const id of selections){
  const shot=stage.compiled.shots.find(s=>s.id===id),time=shot.start+Math.min(shot.duration*.55,2.5);
  if(process.argv.includes('--composite')){
    const c=createCanvas(1080,1920),image=await loadImage(path.join(out,id+'.png'));compositeFrame(c.getContext('2d'),image,stage,time);await fs.writeFile(path.join(out,id+'-frame.png'),await c.encode('png'));
  }else{
    stage.pose(time);stage.scene.add(stage.camera);stage.camera.name='ReviewCamera';stage.scene.children.filter(n=>n.isHemisphereLight).forEach(n=>n.visible=false);
    const saved=[];stage.scene.traverse(n=>{saved.push([n,n.userData]);n.userData={};});
    try{const result=await new GLTFExporter().parseAsync(stage.scene,{binary:true,onlyVisible:true});await fs.writeFile(path.join(out,id+'.glb'),Buffer.from(result));}finally{saved.forEach(([n,data])=>n.userData=data);}
  }
  console.log(id);
}
stage.dispose();
