/** Offline review of actual runtime geometry, not a browser screenshot. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createCitizenHomeGeometry,createCitizenRoomGeometry} from '../game-src/citizen-home-geometry.js';
const {createCanvas,ImageData}=createRequire(import.meta.url)(process.env.SEMESTA_CANVAS_MODULE||'@napi-rs/canvas');
globalThis.ImageData=ImageData;globalThis.HTMLCanvasElement=createCanvas(1,1).constructor;
globalThis.document={createElement(name){if(name!=='canvas')throw Error(name);const c=createCanvas(1,1);Object.defineProperty(c,'data',{value:undefined});c.toBlob=callback=>queueMicrotask(()=>callback(new Blob([c.toBuffer('image/png')],{type:'image/png'})));return c;}};
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onloadend?.();}};
const out=path.resolve(process.argv[2]||'C:/tmp/citizen-home-review');await fs.mkdir(out,{recursive:true});
for(const spec of [
  {name:'wisma-warga',public:true,target:[38,1.9,-3],eye:[56,16,21],width:25},
  {name:'kamar-warga',target:[0,.7,0],eye:[10,9,12],width:11},
  {name:'rumah-subsidi',kind:'subsidy',target:[1.9,.7,1],eye:[17,15,20],width:27},
]){
  const scene=new THREE.Scene(),home=spec.public?createCitizenHomeGeometry({scene}):createCitizenRoomGeometry({scene,decorationPlaced:true,kind:spec.kind});
  if(spec.public){const ground=new THREE.Mesh(new THREE.BoxGeometry(60,.1,40),new THREE.MeshStandardMaterial({color:'#a7b68d'}));ground.position.set(27,-.06,-3);scene.add(ground);}
  const target=new THREE.Vector3(...spec.target),camera=new THREE.OrthographicCamera(-spec.width/2,spec.width/2,spec.width/3,-spec.width/3,.1,300);camera.position.fromArray(spec.eye);camera.lookAt(target);scene.add(camera);scene.updateMatrixWorld(true);
  const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await fs.writeFile(path.join(out,spec.name+'.glb'),Buffer.from(result));home.dispose();console.log('Exported',spec.name);
}
