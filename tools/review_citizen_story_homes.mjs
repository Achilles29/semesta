/** Offline review of actual runtime geometry, not a browser screenshot. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createStoryHomes} from '../game-src/citizen-story-homes-geometry.js';
import {createRepublicTerrainStream} from '../game-src/republic-capital-scene.js';
import {STORY_NEIGHBORHOOD} from '../game-src/citizen-story-homes.js';
const {createCanvas,ImageData}=createRequire(import.meta.url)(process.env.SEMESTA_CANVAS_MODULE||'@napi-rs/canvas');
globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;
globalThis.document={createElement(name){if(name!=='canvas')throw Error(name);const c=createCanvas(1,1);Object.defineProperty(c,'data',{value:undefined});c.toBlob=callback=>queueMicrotask(()=>callback(new Blob([c.toBuffer('image/png')],{type:'image/png'})));return c;}};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}};
const out=path.resolve(process.argv[2]||'C:/tmp/citizen-story-homes-review');await fs.mkdir(out,{recursive:true});
for(const spec of [
  {name:'kampung-perintis',target:[180,3,-32],eye:[290,150,150],width:170},
  {name:'rumah-perintis-detail',target:[141,3,-84],eye:[147,11,-65],width:23},
]){
  const scene=new THREE.Scene(),homes=createStoryHomes({scene}),terrain=createRepublicTerrainStream({parent:scene,reservedBounds:[STORY_NEIGHBORHOOD]});terrain.update(180,-32);
  const camera=new THREE.OrthographicCamera(-spec.width/2,spec.width/2,spec.width/3,-spec.width/3,.1,1500);camera.position.fromArray(spec.eye);camera.lookAt(new THREE.Vector3(...spec.target));scene.add(camera);scene.updateMatrixWorld(true);
  const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await fs.writeFile(path.join(out,spec.name+'.glb'),Buffer.from(result));homes.dispose();terrain.dispose();console.log('Exported',spec.name);
}
