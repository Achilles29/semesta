/** Offline geometry proof; does not drive a browser or simulate WebGL acceptance. */
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createConstructionGeometry} from '../game-src/republic-construction-geometry.js';
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const out=path.resolve(process.argv[2]||'C:/tmp/republic-construction-review');await fs.mkdir(out,{recursive:true});
for(const installed of [0,4,9,12]){
  const scene=new THREE.Scene(),geometry=createConstructionGeometry({scene});
  geometry.applySnapshot({projects:[{id:'jakartawa-home-01',position:{x:29,z:-28},depot:{x:22,z:-10},workPoint:{x:29,z:-21.5},required:12,delivered:Math.min(12,installed+2),installed,status:installed===12?'completed':'active'}]});
  geometry.tick({now:0});
  const ground=new THREE.Mesh(new THREE.BoxGeometry(30,.1,30),new THREE.MeshStandardMaterial({color:'#9aaa7b'}));ground.position.set(27,-.06,-22);scene.add(ground);
  const camera=new THREE.OrthographicCamera(-8,8,5.333,-5.333,.1,200);camera.position.set(41,12,-13);camera.lookAt(28,1,-26);scene.add(camera);scene.updateMatrixWorld(true);
  const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await fs.writeFile(path.join(out,`construction-${String(installed).padStart(2,'0')}.glb`),Buffer.from(result));
  geometry.dispose();ground.geometry.dispose();ground.material.dispose();console.log('Exported construction stage',installed);
}
