import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// Shared Blender-authored character asset used by Avatar Studio and the live world.
let chibiAsset = null;
let flannelTexture = null;
let wovenTexture = null;
export function setHumanAsset(gltf) { chibiAsset = gltf || null; }
export function hasHumanAsset() { return Boolean(chibiAsset?.scene); }

function fabricTexture(THREE, woven = false) {
  let texture = woven ? wovenTexture : flannelTexture;
  if (texture) return texture;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (woven) {
    ctx.fillStyle = '#b98248'; ctx.fillRect(0, 0, 256, 256);
    for (let n = 0; n < 16; n++) { const p=n*16; ctx.fillStyle=n%2?'#e0b86f':'#80532e'; ctx.globalAlpha=.32;ctx.fillRect(p,0,5,256);ctx.fillRect(0,p,256,5); }
  } else {
    ctx.fillStyle = '#455f82'; ctx.fillRect(0, 0, 256, 256);
    for (let n = 0; n < 4; n++) { const p=n*64;ctx.fillStyle='#e8dfcb';ctx.globalAlpha=.26;ctx.fillRect(p+12,0,20,256);ctx.fillRect(0,p+12,256,20);ctx.fillStyle='#253d61';ctx.globalAlpha=.65;ctx.fillRect(p,0,8,256);ctx.fillRect(0,p,256,8);ctx.fillStyle='#b55448';ctx.globalAlpha=.9;ctx.fillRect(p+39,0,5,256);ctx.fillRect(0,p+39,256,5); }
  }
  ctx.globalAlpha=1;
  texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.repeat.set(1,1); texture.anisotropy=4; texture.userData.sharedCharacterTexture=true;
  if (woven) wovenTexture=texture; else flannelTexture=texture;
  return texture;
}

function addFlannelPattern(THREE, figure) {
  const cream=new THREE.MeshStandardMaterial({color:'#e6deca',roughness:.91});
  const red=new THREE.MeshStandardMaterial({color:'#a64f47',roughness:.9});
  const blue=new THREE.MeshStandardMaterial({color:'#293f62',roughness:.92});
  const surface=(x,y)=>{const t=Math.max(0,Math.min(1,(y-.70)/.53));const rx=.18+t*.045;const rz=.11+t*.045;const ratio=Math.min(.98,(x/rx)**2);return new THREE.Vector3(x,y,rz*Math.sqrt(1-ratio)+.006);};
  const line=(points,material,radius)=>{const curve=new THREE.CatmullRomCurve3(points);const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(10,points.length*2),radius,6,false),material);mesh.castShadow=true;figure.add(mesh);};
  for(let i=-4;i<=4;i++){
    const x=i*.038;const points=[];for(let n=0;n<=12;n++){const y=.72+n*.038;points.push(surface(x,y));}
    line(points,i%3===0?red:cream,i%3===0?.0045:.0035);
  }
  for(let i=0;i<7;i++){
    const y=.75+i*.069;const t=(y-.70)/.53;const rx=.18+t*.045;const points=[];
    for(let n=0;n<=12;n++){const x=-rx*.86+n*(rx*1.72/12);points.push(surface(x,y));}
    line(points,i%3===1?blue:cream,i%3===1?.004:.0035);
  }
}

function cloneChibiAsset(THREE, options) {
  const figure = cloneSkeleton(chibiAsset.scene);
  const leader = options.role === 'pemimpin';
  const selectedHeadwear = options.headwear || (leader ? 'peci' : 'tanpa');
  const hasHeadwear = selectedHeadwear !== 'tanpa' && options.hairStyle !== 'hijab';
  const tint = (material, color) => { if (color && material.color) material.color.set(color); };
  figure.traverse((node) => {
    if (node.isMesh) {
      node.userData.sharedCharacterGeometry = true;
      node.castShadow = true; node.receiveShadow = true;
      const recolor = (source) => {
        const material = source.clone();
        const name = material.name.toLowerCase();
        const selectedColor = ['skin','hair','canvas','denim','cotton','sarong','leader uniform','leader trousers','pack'].some((key) => name.startsWith(key));
        if (material.map && selectedColor) material.map = null;
        if (node.name.startsWith('Hair_Hijab')) tint(material, options.hair);
        else if (name.startsWith('skin')) tint(material, options.skin);
        else if (name.startsWith('hair')) tint(material, options.hair);
        else if (name.startsWith('canvas')) tint(material, node.name.startsWith('Top_Petani_') ? '#785638' : options.shirt);
        else if (name.startsWith('denim')) tint(material, leader ? '#d9cfb8' : options.trousers);
        else if (name.startsWith('sarong')) tint(material, leader ? '#d9cfb8' : options.trousers);
        else if (name.startsWith('cotton')) tint(material, leader ? '#f3ecdd' : options.shirt);
        else if (name.startsWith('leader uniform')) tint(material, '#e9dfc7');
        else if (name.startsWith('leader trousers')) tint(material, '#d9cfb8');
        else if (name.startsWith('pack')) tint(material, options.pack || '#9d6948');
        if (name.includes('headwear · dark') && options.headwear === 'topi') tint(material, '#735135');
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(recolor) : recolor(node.material);
      if (options.topStyle === 'flanel' && node.name.startsWith('Top_Base_Sleeve_')) {
        for (const material of (Array.isArray(node.material) ? node.material : [node.material])) { material.map=fabricTexture(THREE); material.color.set('#ffffff'); material.needsUpdate=true; }
      }
    }
    if (node.name.startsWith('Hair_Short_Lock')) node.visible = (options.hairStyle || 'pendek') === 'pendek' && !hasHeadwear;
    else if (node.name.startsWith('Hair_Short')) node.visible = (options.hairStyle || 'pendek') === 'pendek' && !hasHeadwear;
    else if (node.name.startsWith('Hair_Cepak')) node.visible = options.hairStyle === 'cepak' && !hasHeadwear;
    else if (node.name.startsWith('Hair_Curly')) node.visible = ['ikal', 'keriting'].includes(options.hairStyle) && !hasHeadwear;
    else if (node.name.startsWith('Hair_Long')) node.visible = options.hairStyle === 'panjang' && !hasHeadwear;
    else if (node.name.startsWith('Hair_Kuncir')) node.visible = options.hairStyle === 'kuncir' && !hasHeadwear;
    else if (node.name.startsWith('Hair_Hijab')) node.visible = options.hairStyle === 'hijab';
    else if (node.name.startsWith('Hair_Bald')) node.visible = options.hairStyle === 'botak';
    else if (node.name.startsWith('Outfit_Leader')) node.visible = leader;
    else if (node.name.startsWith('Outfit_Worker')) node.visible = !leader;
    else if (node.name.startsWith('Top_Base_Sleeve_')) node.visible = !leader && !['jaket','hoodie','jas'].includes(options.topStyle);
    else if (node.name.startsWith('Top_Base_')) node.visible = !leader && !(['jaket','hoodie','jas'].includes(options.topStyle) && node.name.includes('_spine')) && (!node.name.includes('Collar') || !['jaket','hoodie','jas'].includes(options.topStyle));
    else if (node.name.startsWith('Top_')) {
      const style = options.topStyle || 'kemeja';
      const stylePrefix = style === 'flanel' ? 'Kemeja' : style.charAt(0).toUpperCase() + style.slice(1);
      node.visible = !leader && node.name.startsWith(`Top_${stylePrefix}_`);
    }
    else if (node.name.startsWith('Bottom_Base_')) node.visible = !leader && !['rok','sarung'].includes(options.bottomStyle);
    else if (node.name.startsWith('Bottom_')) {
      const style = options.bottomStyle || 'celana';
      const stylePrefix = style.charAt(0).toUpperCase() + style.slice(1);
      node.visible = !leader && (node.name.startsWith(`Bottom_${stylePrefix}_`) || (['rok','sarung','pendek'].includes(style) && node.name.startsWith('Bottom_ExposedLeg_')));
    }
    else if (node.name.startsWith('Accessory_Peci')) node.visible = options.hairStyle !== 'hijab' && (options.headwear || (leader ? 'peci' : '')) === 'peci';
    else if (node.name.startsWith('Accessory_Caping')) node.visible = options.hairStyle !== 'hijab' && options.headwear === 'caping';
    else if (node.name.startsWith('Accessory_Helmet')) node.visible = options.hairStyle !== 'hijab' && options.headwear === 'helm';
    else if (node.name.startsWith('Accessory_Topi')) node.visible = options.hairStyle !== 'hijab' && options.headwear === 'topi';
    else if (node.name.startsWith('Accessory_Bandana')) node.visible = options.hairStyle !== 'hijab' && options.headwear === 'bandana';
    else if (node.name.startsWith('Accessory_Backpack')) node.visible = !leader && (options.showBackpack ?? options.accessory === 'ransel');
    else if (node.name.startsWith('Accessory_Glasses')) node.visible = options.accessory === 'kacamata';
    else if (node.name.startsWith('Accessory_Badge')) node.visible = options.accessory === 'lencana';
    else if (node.name.startsWith('Accessory_Sash')) node.visible = options.accessory === 'selempang';
    else if (node.name.startsWith('Accessory_Scarf')) node.visible = options.accessory === 'syal';
    else if (node.name.startsWith('Accessory_Map')) node.visible = options.accessory === 'map';
    else if (node.name.startsWith('Accessory_Jam')) node.visible = options.accessory === 'jam';
  });
  figure.scale.setScalar(options.scale || 1);
  const bone = (name) => figure.getObjectByName(name) || new THREE.Group();
  const head = bone('head');
  if (!leader && ['kumis','kumis-janggut'].includes(options.facialHair)) {
    const facialHair = new THREE.Group(); const hairMat = new THREE.MeshStandardMaterial({ color:options.hair||'#292522', roughness:.92 });
    const addHair = (position, scale) => { const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),hairMat);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;facialHair.add(mesh); };
    addHair([-.035,1.492,.166],[.042,.018,.016]);addHair([.035,1.492,.166],[.042,.018,.016]);
    if(options.facialHair==='kumis-janggut')addHair([0,1.425,.15],[.026,.045,.02]);
    figure.add(facialHair);figure.updateMatrixWorld(true);head.attach(facialHair);
  }
  if (!leader && options.topStyle === 'flanel') addFlannelPattern(THREE,figure);
  if (!leader && options.accessory === 'tas-anyaman') {
    const satchel=new THREE.Group();const bagMat=new THREE.MeshStandardMaterial({color:'#ffffff',map:fabricTexture(THREE,true),roughness:.96});const strapMat=new THREE.MeshStandardMaterial({color:'#8b5a31',roughness:.94});
    const strapCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.19,1.24,.11),new THREE.Vector3(.11,1.08,.17),new THREE.Vector3(-.04,.91,.18),new THREE.Vector3(-.2,.72,.16)]);
    const strap=new THREE.Mesh(new THREE.TubeGeometry(strapCurve,24,.025,8,false),strapMat);satchel.add(strap);
    const pouch=new THREE.Mesh(new THREE.BoxGeometry(.2,.24,.115),bagMat);pouch.position.set(-.2,.68,.165);pouch.rotation.y=-.08;satchel.add(pouch);
    const flap=new THREE.Mesh(new THREE.BoxGeometry(.205,.095,.025),bagMat);flap.position.set(-.2,.77,.232);satchel.add(flap);
    const button=new THREE.Mesh(new THREE.SphereGeometry(.018,12,10),new THREE.MeshStandardMaterial({color:'#dbaf5b',roughness:.45}));button.position.set(-.2,.76,.25);satchel.add(button);
    satchel.traverse((node)=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});figure.add(satchel);
  }
  figure.userData.animations = chibiAsset.animations || [];
  const mixer = new THREE.AnimationMixer(figure);
  const actions = Object.fromEntries((chibiAsset.animations || []).map((clip) => [clip.name, mixer.clipAction(clip)]));
  actions.Idle?.play();
  figure.userData.animate = (time) => { head.rotation.z = Math.sin(time * .0007) * .012; };
  return {
    figure,
    arms: [bone('upper_arm.L'), bone('upper_arm.R')],
    legs: [bone('thigh.L'), bone('thigh.R')],
    head,
    eyes: [],
    backpack: null,
    shirt: null,
    trousers: null,
    skin: null,
    mixer,
    actions,
    activeAction: actions.Idle ? 'Idle' : null,
  };
}

// Procedural fallback stays available for devices where the GLB cannot load.
export function createHumanModel(THREE, options = {}) {
  if (chibiAsset?.scene) return cloneChibiAsset(THREE, options);
  const figure = new THREE.Group();
  const mat = (color, roughness = .78) => new THREE.MeshStandardMaterial({ color: color || '#888888', roughness });
  const skin = mat(options.skin || '#d99b71', .72);
  const hair = mat(options.hair || '#49352f', .92);
  const leader = options.role === 'pemimpin';
  const shirt = mat(leader ? '#e9dfc7' : options.shirt || '#2f8791');
  if (options.topStyle === 'flanel') { shirt.map=fabricTexture(THREE);shirt.color.set('#ffffff'); }
  const trousers = mat(options.trousers || (leader ? '#ded4bd' : '#345172'), .84);
  const footwear = mat(leader ? '#292a2e' : '#49372e', .48);
  const gold = mat('#b89555', .48);
  const sphereGeometry = new THREE.SphereGeometry(1, 24, 18);
  const ellipsoid = (parent, material, position, scale, segments = 24) => {
    const geometry = segments === 24 ? sphereGeometry : new THREE.SphereGeometry(1, segments, Math.max(10, segments - 5));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const capsule = (parent, material, radius, length, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 12), material);
    mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const tube = (parent, points, radius, material, segments = 12) => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, false), material);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  // Torso, hips, neck, and garments form a complete rounded body silhouette.
  ellipsoid(figure, trousers, [0, .67, -.005], [.265, .19, .17]);
  ellipsoid(figure, shirt, [0, .99, 0], [.33, .33, .215]);
  ellipsoid(figure, shirt, [0, .76, 0], [.285, .17, .19]);
  capsule(figure, skin, .09, .15, [0, 1.31, 0]);
  if (['rok', 'sarung', 'kulot'].includes(options.bottomStyle)) {
    ellipsoid(figure, trousers, [0, .43, .015], [.285, .29, .19]);
    if (options.bottomStyle === 'sarung') {
      const woven = mat('#d9b86b', .86);
      for (let index = 0; index < 4; index++) tube(figure, [[-.2,.27+index*.075,.145],[0,.27+index*.075,.205],[.2,.27+index*.075,.145]], .008, woven, 10);
    }
  }
  if (options.topStyle === 'batik') {
    const motif = mat('#e5bd78', .82);
    for (let index = -3; index <= 3; index++) tube(figure, [[index*.038,.73,.17],[index*.038,.91,.205],[index*.038,.99,.17]], .006, motif, 8);
  } else if (['jaket', 'rompi', 'pekerja'].includes(options.topStyle)) {
    const panel = mat(options.topStyle === 'pekerja' ? '#f2d367' : options.topStyle === 'rompi' ? '#e7c35d' : '#314940', .84);
    for (const side of [-1, 1]) tube(figure, [[side*.055,1.22,.15],[side*.16,.96,.204],[side*.22,.72,.15]], .022, panel, 12);
  } else if (options.topStyle === 'kebaya') {
    tube(figure, [[-.18,1.2,.14],[0,.93,.208],[.18,.72,.15]], .014, mat('#f0d6bb', .78), 18);
  }
  if (options.apron && !leader) {
    const apron = mat(options.apron, .84);
    ellipsoid(figure, apron, [0, .91, .207], [.235, .29, .035]);
    capsule(figure, apron, .035, .16, [0, 1.15, .19]);
    for (const side of [-1, 1]) tube(figure, [[side*.13,1.12,.19],[side*.2,1.07,.17],[side*.23,.99,.16]], .018, apron, 10);
  }

  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * .14, .62, 0); figure.add(leg); legs.push(leg);
    capsule(leg, trousers, .105, .31, [0, -.235, 0]);
    ellipsoid(leg, trousers, [0, -.39, 0], [.105, .12, .11]);
    ellipsoid(leg, leader ? gold : trousers, [0, -.397, .018], [.107, .035, .11]);
    ellipsoid(leg, footwear, [0, -.51, .075], [.125, .085, .19]);
    ellipsoid(leg, mat(leader ? '#3a3a3d' : '#654632', .48), [0, -.56, .12], [.128, .035, .14]);

    const arm = new THREE.Group(); arm.position.set(side * .28, 1.19, 0); figure.add(arm); arms.push(arm);
    capsule(arm, shirt, .09, .24, [0, -.16, 0], [0, 0, side * -.08]);
    ellipsoid(arm, shirt, [side * -.012, -.29, 0], [.09, .11, .09]);
    ellipsoid(arm, leader ? gold : shirt, [0, -.31, .005], [.093, .045, .095]);
    capsule(arm, skin, .067, .21, [0, -.47, .015]);
    ellipsoid(arm, skin, [0, -.59, .035], [.075, .085, .07]);
    for (let finger = 0; finger < 4; finger++) capsule(arm, skin, .014, .045, [(finger - 1.5) * .031, -.655, .051]);
    capsule(arm, skin, .018, .04, [side * .073, -.61, .04], [0, 0, -side * .55]);
    arm.rotation.z = leader && side === 1 ? 2.35 : side * -.055;
  }

  // The face has a shaped jaw, ears, cheeks, eyes with catchlights, brows, nose and mouth.
  const head = new THREE.Group(); head.position.set(0, 1.50, 0); head.scale.set(1.3, 1.3, 1.22); figure.add(head);
  ellipsoid(head, skin, [0, 0, 0], [leader ? .255 : .225, leader ? .27 : .29, .22], 32);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side*.224, -.005, -.005], [.052, .075, .055], 20);
    ellipsoid(head, mat('#e5a58b', .76), [side*.237, -.008, .025], [.024, .043, .029], 16);
    ellipsoid(head, mat('#fff4e5', .5), [side*.082, .005, .201], [.049, .037, .027], 20);
    ellipsoid(head, mat('#49382f', .5), [side*.078, .003, .225], [.021, .027, .012], 16);
    ellipsoid(head, mat('#fffaf0', .35), [side*.071, .014, .235], [.007, .009, .005], 10);
    capsule(head, hair, .012, .06, [side*.082, .064, .2], [0, 0, side * -.08]);
  }
  ellipsoid(head, skin, [0, -.055, .2], [.032, .061, .04], 18);
  ellipsoid(head, skin, [0, -.086, .225], [.043, .03, .028], 16);
  ellipsoid(head, mat('#754b46', .72), [0, -.132, .194], [.052, .012, .014], 16);
  ellipsoid(head, mat('#f4d7c6', .75), [0, -.151, .19], [.032, .009, .01], 12);
  if (!leader && ['kumis','kumis-janggut'].includes(options.facialHair)) {
    const facialHair=mat(options.hair||'#292522',.94);
    ellipsoid(head,facialHair,[-.045,-.105,.218],[.046,.018,.018],16);ellipsoid(head,facialHair,[.045,-.105,.218],[.046,.018,.018],16);
    if(options.facialHair==='kumis-janggut')ellipsoid(head,facialHair,[0,-.15,.205],[.027,.025,.045],16);
  }

  const hairstyle = options.hairStyle || 'pendek';
  if (hairstyle !== 'botak' && hairstyle !== 'hijab') {
    ellipsoid(head, hair, [0, .19, -.035], [.238, .105, .205], 24);
    ellipsoid(head, hair, [0, .095, -.16], [.22, .19, .09], 20);
    for (const side of [-1, 1]) ellipsoid(head, hair, [side*.205, .045, -.015], [.06, .16, .09], 16);
    const locks = hairstyle === 'ikal' || hairstyle === 'keriting' ? 9 : hairstyle === 'panjang' ? 7 : 5;
    for (let i = 0; i < locks; i++) {
      const x = ((i % 5) - 2) * .075;
      ellipsoid(head, hair, [x, .132 + (i % 2) * .018, .163], [.055, hairstyle === 'keriting' ? .071 : .065, .05], 14);
    }
    if (['pendek', 'ikal'].includes(hairstyle)) {
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.058, .15 + (i % 2) * .035, 8), hair);
        spike.position.set((i - 2) * .066, .245 + (i % 2) * .012, -.025); spike.rotation.z = (i - 2) * -.11;
        spike.castShadow = true; head.add(spike);
      }
    }
    if (hairstyle === 'panjang') for (const side of [-1, 1]) ellipsoid(head, hair, [side*.195, -.075, -.015], [.058, .25, .085], 18);
  }
  if (hairstyle === 'hijab') {
    const scarf = mat(options.hair || '#536d72', .92);
    ellipsoid(head, scarf, [0, .015, -.045], [.27, .3, .23], 24);
    ellipsoid(head, scarf, [0, -.19, -.005], [.25, .12, .19], 20);
  }

  // Tailored clothes get seams, collars, pockets, buttons, and role-specific accessories.
  if (leader) {
    const pocket = mat('#eee5d1', .82);
    for (const side of [-1, 1]) {
      ellipsoid(figure, pocket, [side*.15, 1.04, .185], [.095, .105, .035], 18);
      ellipsoid(figure, shirt, [side*.15, 1.125, .201], [.101, .023, .03], 16);
      tube(figure, [[side*.055,1.2,.13],[side*.09,1.14,.19],[side*.17,1.11,.19]], .012, gold, 10);
      ellipsoid(figure, gold, [side*.265, 1.2, 0], [.063, .027, .105], 16);
    }
    for (let index = 0; index < 5; index++) ellipsoid(figure, gold, [.012, .78 + index*.105, .203], [.014, .014, .01], 12);
    ellipsoid(figure, gold, [0, .69, .015], [.28, .045, .18], 18);
    ellipsoid(figure, mat('#242326', .48), [0, .69, .197], [.055, .042, .025], 16);
    tube(figure, [[-.07,1.2,.15],[-.025,1.04,.207],[.055,.83,.17]], .018, mat('#b43c3e', .72), 16);
    ellipsoid(head, mat('#242326', .5), [0, .275, -.012], [.205, .075, .19], 24);
    ellipsoid(head, mat('#171719', .55), [0, .315, -.01], [.187, .13, .17], 24);
    ellipsoid(head, gold, [0, .284, .178], [.055, .036, .018], 16);
  } else {
    for (const side of [-1, 1]) {
      const collar = ellipsoid(figure, shirt, [side*.075, 1.26, .135], [.075, .065, .035], 16); collar.rotation.z = side * -.38;
    }
    tube(figure, [[0,1.20,.18],[0,1.05,.205],[0,.82,.2]], .008, mat('#d8c9a8', .7), 12);
    for (let index = 0; index < 3; index++) ellipsoid(figure, gold, [.012, .88 + index*.09, .204], [.012, .012, .008], 10);
    if (!options.apron && !['kaos', 'kebaya'].includes(options.topStyle)) {
      const pocketFabric = mat(options.topStyle === 'pekerja' ? '#f2d367' : '#f0e8d8', .9);
      for (const side of [-1, 1]) {
        ellipsoid(figure, pocketFabric, [side*.17, 1.035, .187], [.074, .075, .027], 16);
        ellipsoid(figure, shirt, [side*.17, 1.098, .199], [.078, .018, .025], 14);
      }
    }
    if (options.topStyle === 'petani') {
      const denim = mat('#426d91', .9);
      ellipsoid(figure, denim, [0, .96, .216], [.205, .22, .045], 20);
      for (const side of [-1, 1]) tube(figure, [[side*.105,1.28,.14],[side*.145,1.17,.21],[side*.18,1.05,.19]], .025, denim, 12);
      ellipsoid(figure, mat('#d4be8d', .9), [0, .98, .264], [.09, .065, .012], 14);
    }
    if (options.headwear === 'peci') {
      ellipsoid(figure, mat('#29292c', .5), [0, 1.94, 0], [.205, .12, .19], 24);
      ellipsoid(figure, mat('#171719', .58), [0, 1.89, .012], [.214, .025, .2], 20);
    } else if (options.headwear === 'helm') {
      ellipsoid(figure, mat('#edbd35', .5), [0, 1.92, 0], [.26, .15, .24], 24);
      ellipsoid(figure, mat('#d49926', .55), [0, 1.84, .045], [.31, .025, .25], 20);
    } else if (options.headwear === 'topi') {
      ellipsoid(figure, mat('#765638', .82), [0, 1.94, -.015], [.19, .12, .17], 20);
      ellipsoid(figure, mat('#9b7953', .8), [0, 1.88, .045], [.29, .025, .23], 20);
    } else if (options.headwear === 'caping') {
      const cap = mat('#b9955d', .88); const mesh = new THREE.Mesh(new THREE.ConeGeometry(.31, .22, 32), cap);
      mesh.position.set(0, 1.98, 0); mesh.castShadow = true; figure.add(mesh); ellipsoid(figure, cap, [0, 1.88, 0], [.31, .025, .31], 24);
    } else if (options.headwear === 'bandana') ellipsoid(figure, mat('#b4443e', .78), [0, 1.78, 0], [.237, .035, .205], 20);
  }

  const showBackpack = options.showBackpack ?? !!options.pack;
  const backpack = leader || !showBackpack ? null : ellipsoid(figure, mat(options.pack || '#c76a45', .9), [0, .99, -.235], [.2, .25, .105], 20);
  if (backpack) for (const side of [-1, 1]) tube(figure, [[side*.22,1.17,.04],[side*.24,.98,.04],[side*.20,.78,.04]], .012, mat('#564537', .85), 12);
  if (options.accessory === 'kacamata') {
    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(.043, .007, 8, 20), mat('#393631', .5));
      frame.position.set(side*.082, 1.555, .226); frame.castShadow = true; figure.add(frame);
    }
    tube(figure, [[-.04,1.555,.23],[0,1.558,.24],[.04,1.555,.23]], .006, mat('#393631', .5), 8);
  } else if (options.accessory === 'lencana') {
    ellipsoid(figure, gold, [.15, 1.04, .221], [.033, .033, .018], 16);
    ellipsoid(figure, mat('#d9473f', .55), [.15, 1.04, .24], [.014, .014, .009], 12);
  } else if (options.accessory === 'selempang') {
    tube(figure, [[-.2,1.17,.12],[-.08,1.03,.204],[.14,.76,.17]], .026, mat('#a74d40', .72), 18);
  } else if (options.accessory === 'syal') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 10, 24), mat('#df9d52', .86));
    scarf.rotation.x = Math.PI / 2; scarf.position.set(0, 1.275, 0); scarf.castShadow = true; figure.add(scarf);
    ellipsoid(figure, scarf.material, [.09, 1.17, .17], [.045, .16, .035], 16);
  } else if (options.accessory === 'map') {
    const map = new THREE.Mesh(new THREE.BoxGeometry(.17, .23, .025), mat('#d7c89a', .88));
    map.position.set(.37, .67, .1); map.rotation.z = -.12; map.castShadow = true; figure.add(map);
    tube(figure, [[.31,.76,.11],[.35,.7,.12],[.37,.61,.1]], .035, skin, 8);
  } else if (options.accessory === 'tas-anyaman') {
    const bagMat=mat('#ffffff',.96);bagMat.map=fabricTexture(THREE,true);bagMat.color.set('#ffffff');
    tube(figure, [[-.19,1.19,.12],[-.11,1.04,.19],[.06,.88,.2],[.22,.72,.17]], .024, mat('#8b5a31',.94), 18);
    ellipsoid(figure,bagMat,[.22,.69,.19],[.15,.18,.055],20);ellipsoid(figure,bagMat,[.22,.79,.205],[.15,.07,.045],18);
    ellipsoid(figure,mat('#dbaf5b',.5),[.22,.77,.247],[.018,.018,.01],12);
  }
  return { figure, arms, legs, head, eyes: [], backpack, shirt, trousers, skin };
}
