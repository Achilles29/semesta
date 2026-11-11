import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createHumanModel, setFarmerAsset } from '../../../game-src/avatar-character-3d.js';

const form = document.querySelector('#appearance');
const status = document.querySelector('#status');
const version = Number(document.querySelector('#view').dataset.version || 10);
const labels = {
  outfit: ['Atasan', { overalls: 'Overall + kaus', tee: 'Kaos oblong', 'loose-tee': 'Kaos oversized', 'work-shirt': 'Kemeja kerja', batik: 'Kemeja motif batik', koko: 'Baju koko', kebaya: 'Kebaya sederhana', hoodie: 'Hoodie', tunic: 'Tunik', blazer: 'Blazer santai' }],
  hairStyle: ['Rambut', { short: 'Pendek berlapis', swept: 'Sisir samping', curtain: 'Belah tengah', tied: 'Ikat belakang', bob: 'Bob panjang', none: 'Tanpa rambut' }],
  headwear: ['Penutup kepala', { cap: 'Topi terbalik', beanie: 'Kupluk', peci: 'Peci', hijab: 'Hijab sederhana', none: 'Tanpa penutup' }],
  accessory: ['Aksesori', { satchel: 'Tas selempang', backpack: 'Ransel', scarf: 'Syal', none: 'Tanpa aksesori' }],
  gloves: ['Tangan', { work: 'Sarung tangan kerja', none: 'Tangan biasa' }],
  faceShape: ['Bentuk wajah', { oval: 'Oval', round: 'Bulat', angular: 'Rahang ramping' }],
  eyeStyle: ['Mata', { almond: 'Almond', round: 'Bulat', relaxed: 'Rileks' }],
  noseStyle: ['Hidung', { defined: 'Batang & ujung jelas', button: 'Kecil membulat', upturned: 'Sedikit terangkat' }],
  mouthStyle: ['Mulut', { smile: 'Senyum tipis', neutral: 'Netral', grin: 'Senyum lebar' }],
  bodyFrame: ['Versi tubuh', { male: 'Cowok', female: 'Cewek' }],
  bodyType: ['Postur', { skinny: 'Kurus', slender: 'Langsing', muscular: 'Berotot', full: 'Berisi / gendut', plus: 'Besar / obesitas', fit: 'Atletis / body goals', mature: 'Dewasa (bapak-bapak)', 'soft-mature': 'Dewasa berisi (ibu-ibu)' }],
  bottomStyle: ['Bawahan', { relaxed: 'Celana lurus longgar', cargo: 'Celana kargo', sarong: 'Sarung kotak', skirt: 'Rok panjang' }],
  footwearStyle: ['Alas kaki', { boots: 'Boot kerja', sandals: 'Sandal' }],
};
const defaultColors = { skin: '#c18b60', hair: '#483024', shirt: '#ddd7c9', trousers: '#354f79', footwear: '#70482e', headwearColor: '#344f7c', gloveColor: '#a42a29', pack: '#79502d' };
const colorLabels = { skin: 'Kulit', hair: 'Rambut', shirt: 'Kaus/kemeja', trousers: 'Celana', footwear: 'Sepatu', headwearColor: 'Topi', gloveColor: 'Sarung tangan', pack: 'Tas/syal' };
const defaults = { outfit: 'overalls', hairStyle: 'short', headwear: 'cap', accessory: 'satchel', gloves: 'work', faceShape: 'oval', eyeStyle: 'almond', noseStyle: 'defined', mouthStyle: 'smile', ...defaultColors,
  ...(version >= 11 ? { outfit: 'tee', headwear: 'none', accessory: 'none', gloves: 'none', bodyFrame: 'male', bodyType: 'slender', bottomStyle: 'relaxed', footwearStyle: 'sandals' } : {}) };
const presets = {
  farmer: {},
  casual: { outfit: 'loose-tee', hairStyle: 'curtain', headwear: 'none', accessory: 'none', gloves: 'none', faceShape: 'round', eyeStyle: 'round', noseStyle: 'button', mouthStyle: 'grin', shirt: '#638e79' },
  worker: { outfit: 'work-shirt', hairStyle: 'swept', headwear: 'none', accessory: 'scarf', gloves: 'none', faceShape: 'angular', eyeStyle: 'relaxed', mouthStyle: 'neutral', shirt: '#b6aa88', pack: '#974946' },
  traveler: { outfit: 'loose-tee', hairStyle: 'tied', headwear: 'beanie', accessory: 'backpack', gloves: 'none', skin: '#704020', shirt: '#bf8f50', noseStyle: 'upturned' },
  sarong: { outfit: 'tee', bottomStyle: 'sarong', headwear: 'peci', bodyType: 'mature', shirt: '#e6e2d8', trousers: '#3e7568', headwearColor: '#202329' },
  batik: { outfit: 'batik', bottomStyle: 'relaxed', bodyFrame: 'male', shirt: '#60402e', trousers: '#383b44' },
  kebaya: { outfit: 'kebaya', bottomStyle: 'skirt', bodyFrame: 'female', bodyType: 'fit', hairStyle: 'bob', shirt: '#b9697e', trousers: '#78543c' },
  tunic: { outfit: 'tunic', bottomStyle: 'skirt', bodyFrame: 'female', bodyType: 'soft-mature', headwear: 'hijab', shirt: '#598d86', headwearColor: '#cfb18c', trousers: '#374953' },
  muscle: { outfit: 'tee', bottomStyle: 'cargo', bodyType: 'muscular', shirt: '#617782' },
  plus: { outfit: 'koko', bottomStyle: 'sarong', bodyFrame: 'female', bodyType: 'plus', hairStyle: 'tied', shirt: '#957eaf' },
};
const config = () => Object.fromEntries(new FormData(form));
try {
  const canvas = document.querySelector('#view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#73777a');
  const camera = new THREE.PerspectiveCamera(33, 1, .01, 100); camera.position.set(2.1, 1.3, 3.8);
  const controls = new OrbitControls(camera, canvas); controls.target.set(0, .96, 0); controls.update();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a5847', 2.2));
  for (const [x, y, z, power] of [[-3, 4, 4, 3], [3, 2, -2, 2]]) {
    const light = new THREE.DirectionalLight('#fff5e8', power); light.position.set(x, y, z); scene.add(light);
  }
  const asset = await new GLTFLoader().loadAsync(canvas.dataset.model || './farmer-v10-customization.glb');
  setFarmerAsset(asset);
  const model = createHumanModel(THREE, { ps2Farmer: true, ...defaults });
  model.mixer.stopAllAction(); scene.add(model.figure);
  for (const [field, choices] of Object.entries(model.figure.userData.avatarCapabilities)) {
    if (field === 'colors') continue;
    const label = document.createElement('label'); label.textContent = labels[field][0];
    const select = document.createElement('select'); select.name = field;
    for (const choice of choices) select.add(new Option(labels[field][1][choice] || choice, choice));
    select.value = defaults[field]; label.append(select);
    document.querySelector(['bodyFrame', 'bodyType'].includes(field) ? '#body' : (['faceShape', 'eyeStyle', 'noseStyle', 'mouthStyle'].includes(field) ? '#face' : '#slots')).append(label);
  }
  for (const [field, color] of Object.entries(defaultColors)) {
    const label = document.createElement('label'); label.textContent = colorLabels[field];
    const input = document.createElement('input'); input.type = 'color'; input.name = field; input.value = color;
    label.append(input); document.querySelector('#colors').append(label);
  }
  const update = () => {
    const resolved = model.figure.userData.setAppearance(config());
    let visible = 0; model.figure.traverseVisible(n => { if (n.isMesh) visible++; });
    status.textContent = `${asset.animations.length} animasi · ${visible} mesh aktif\n${resolved.warnings.join('\n') || 'Pilihan bentuk dan warna diterapkan ke GLB.'}`;
  };
  form.addEventListener('input', update); update();
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    for (const [key, value] of Object.entries({ ...defaults, ...presets[button.dataset.preset] })) form.elements[key].value = value;
    update();
  }));
  const animations = document.querySelector('#animation');
  for (const clip of asset.animations) animations.add(new Option(clip.name, clip.name));
  animations.addEventListener('change', () => { model.mixer.stopAllAction(); model.actions[animations.value]?.reset().play(); });
  const views = { front: [0, .96, 4.5], left: [-4.5, .96, 0], back: [0, .96, -4.5], three: [2.1, 1.3, 3.8], face: [0, 1.68, 1.2], faceLeft: [-1.2, 1.68, 0] };
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    camera.position.set(...views[button.dataset.view]); controls.target.set(0, button.dataset.view.startsWith('face') ? 1.68 : .96, 0); controls.update();
  }));
  document.querySelector('#wire').addEventListener('change', e => model.figure.traverse(n => {
    if (n.isMesh) for (const material of Array.isArray(n.material) ? n.material : [n.material]) material.wireframe = e.target.checked;
  }));
  document.querySelector('#save').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version, contract: 'semesta-farmer-v8-legacy19', appearance: config() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `farmer-v${version}-appearance.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  new ResizeObserver(() => {
    const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }).observe(canvas.parentElement);
  let previous = performance.now();
  renderer.setAnimationLoop(now => { const dt = Math.min(.05, (now - previous) / 1000); previous = now; model.mixer.update(dt); controls.update(); renderer.render(scene, camera); });
  window.avatarV10Preview = { model, scene, renderer, config };
  window.avatarPreview = window.avatarV10Preview;
} catch (error) { status.textContent = `Gagal: ${error.message}. Buka melalui HTTP, bukan file://.`; console.error(error); }
