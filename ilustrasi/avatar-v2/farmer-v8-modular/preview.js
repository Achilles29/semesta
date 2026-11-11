import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createHumanModel, setFarmerAsset } from '../../../game-src/avatar-character-3d.js';

const form = document.querySelector('#appearance');
const canvas = document.querySelector('#view');
const status = document.querySelector('#status');
const config = () => Object.fromEntries(new FormData(form));
try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#73777a');
  const camera = new THREE.PerspectiveCamera(33, 1, .01, 100); camera.position.set(2.1, 1.3, 3.8);
  const controls = new OrbitControls(camera, canvas);controls.target.set(0,.96,0);controls.update();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5847', 2.2));
  for (const [x,y,z,power] of [[-3,4,4,3],[3,2,-2,2]]) {
    const light=new THREE.DirectionalLight('#fff5e8',power);light.position.set(x,y,z);scene.add(light);
  }
  const asset = await new GLTFLoader().loadAsync(canvas.dataset.model || './farmer-v8-modular.glb');
  setFarmerAsset(asset);
  const model = createHumanModel(THREE, { ps2Farmer: true, ...config() });
  model.mixer.stopAllAction();scene.add(model.figure);
  const select=document.querySelector('#animation');
  for (const clip of asset.animations) select.add(new Option(clip.name,clip.name));
  const update = () => {
    const appearance=model.figure.userData.setAppearance(config());
    status.textContent=`${asset.animations.length} klip · ${Object.keys(model.actions).length} aksi runtime\n${appearance.warnings.join('\n') || 'Warna dan slot aktif pada satu model/skeleton.'}`;
  };
  form.addEventListener('input',update);update();
  const presets={
    farmer:{outfit:'overalls',headwear:'cap',accessory:'satchel',gloves:'work',hairStyle:'short',skin:'#c18b60'},
    casual:{outfit:'tee',headwear:'none',accessory:'none',gloves:'none',hairStyle:'short',skin:'#c18b60'},
    dark:{skin:'#704020'},
  };
  document.querySelectorAll('[data-appearance]').forEach(button=>button.addEventListener('click',()=>{
    for(const [key,value] of Object.entries(presets[button.dataset.appearance]))form.elements[key].value=value;
    update();
  }));
  select.addEventListener('change',()=>{model.mixer.stopAllAction();model.actions[select.value]?.reset().play();});
  const views={front:[0,.96,4.5],left:[-4.5,.96,0],back:[0,.96,-4.5],three:[2.1,1.3,3.8],face:[0,1.68,1.05],faceLeft:[-1.05,1.68,0]};
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{camera.position.set(...views[b.dataset.view]);controls.target.set(0,b.dataset.view.startsWith('face')?1.68:.96,0);controls.update();}));
  document.querySelector('#wire').addEventListener('change',e=>model.figure.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m.wireframe=e.target.checked;}));
  document.querySelector('#save').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({contract:'semesta-farmer-v8-legacy19',appearance:config()},null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='farmer-appearance.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  new ResizeObserver(()=>{const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas.parentElement);
  let previous=performance.now();
  renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;model.mixer.update(dt);controls.update();renderer.render(scene,camera);});
  // Read-only handles for automated WebGL smoke checks.
  window.avatarV8Preview={model,scene,renderer,config};
} catch(error) {status.textContent=`Pratinjau gagal: ${error.message}. Buka lewat http://localhost/project/, bukan file://.`;console.error(error);}
