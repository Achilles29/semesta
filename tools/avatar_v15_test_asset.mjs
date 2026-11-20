import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../game-src/avatar-v15-runtime-manifest.json' with {type:'json'};
import {preloadAvatars} from '../game-src/avatar-runtime.js';
export async function loadTestAvatars(){
  const original=GLTFLoader.prototype.loadAsync;
  GLTFLoader.prototype.loadAsync=async function(url){
    const id=Object.entries(manifest).find(([,file])=>url.includes(file))?.[0];
    if(!id)throw new Error('Unexpected avatar URL in CPU fixture');
    const bytes=await fs.readFile(new URL(`../public/models/characters/v15/${id}.glb`,import.meta.url));
    this.register(()=>({name:'CPU_TEXTURE_AUDIT',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
    return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  };
  try{await preloadAvatars();}finally{GLTFLoader.prototype.loadAsync=original;}
}
