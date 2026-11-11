import { createHumanModel } from './avatar-character-3d.js?v=avatar-model-20261109-v5';
import { farmerCharacterOptions } from './avatar-farmer-config.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** One renderer, lazy visible-page jobs, actual game meshes (not concept images). */
export function createAvatarThumbnails(THREE) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setSize(240,280,false); renderer.setPixelRatio(1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  // PMREM render-target textures belong to their WebGL context. Generate a local
  // environment instead of reusing the studio renderer's GPU-only texture.
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eeea');scene.environment=environment.texture;
  scene.add(new THREE.HemisphereLight('#fff5df','#62735c',1.5));
  const light=new THREE.DirectionalLight('#fff4dc',2.4);light.position.set(3,5,4);scene.add(light);
  const fill=new THREE.DirectionalLight('#bdd9ef',.9);fill.position.set(-4,2,-3);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(33,240/280,.1,20);camera.position.set(1,1.5,4.1);camera.lookAt(0,1.05,0);
  const cache=new Map(); let disposed=false;
  return {
    async fill(items) {
      for(const {image,config} of items) {
        if(disposed)return;
        if(!image.isConnected)continue;
        const key=JSON.stringify(config);
        if(!cache.has(key)) {
          await new Promise(resolve=>requestAnimationFrame(resolve));
          if(disposed || !image.isConnected)continue;
          const model=createHumanModel(THREE,farmerCharacterOptions(config));
          try {
            model.mixer?.update(.15);scene.add(model.figure);renderer.render(scene,camera);
            if(cache.size>=100)cache.delete(cache.keys().next().value);
            cache.set(key,renderer.domElement.toDataURL('image/webp',.85));
          } finally {
            model.mixer?.stopAllAction();model.mixer?.uncacheRoot(model.figure);scene.remove(model.figure);
            const materials=new Set(),skeletons=new Set();
            model.figure.traverse(node=>{if(node.material)(Array.isArray(node.material)?node.material:[node.material]).forEach(m=>materials.add(m));if(node.skeleton)skeletons.add(node.skeleton);});
            materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());renderer.renderLists.dispose();
          }
        }
        image.src=cache.get(key);image.hidden=false;image.parentElement.classList.add('has-preview');
      }
    },
    dispose(){disposed=true;cache.clear();environment.dispose();renderer.dispose();renderer.forceContextLoss();},
  };
}
