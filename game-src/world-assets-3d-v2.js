// Modular, editable 3D props shared by the admin builder and free-play world.
// The BGN wordmark texture is an optimized copy of the official mark published
// at https://www.bgn.go.id/BGN_LOGO.png.
let bgnLogoImage;

function getBgnLogoImage() {
  if (bgnLogoImage) return bgnLogoImage;
  if (typeof Image === 'undefined') return null;
  bgnLogoImage = new Image();
  const root = globalThis.SEMESTA_MAP_ASSET_ROOT || '/assets/game/map-assets/';
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  bgnLogoImage.src = `${normalizedRoot}bgn-logo.webp?v=bgn-20261103`;
  return bgnLogoImage;
}

export async function preloadWorldAssets() {
  const image = getBgnLogoImage();
  if (!image || image.complete) return;
  await new Promise((resolve) => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

export function createWorldAsset(THREE, type, dimensions = {}) {
  const root = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mat = (color, roughness = .86) => new THREE.MeshStandardMaterial({ color, roughness });
  const add = (geometry, material, parent, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.set(rx, ry, rz); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const cube = (parent, color, x, y, z, sx, sy, sz, rz = 0) => add(box, mat(color), parent, x, y, z, sx, sy, sz, 0, 0, rz);
  const cylinder = (parent, color, x, y, z, radiusTop, radiusBottom, height, sides = 12) => add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), mat(color), parent, x, y, z, 1, 1, 1);
  const sphere = (parent, color, x, y, z, sx, sy, sz) => add(new THREE.SphereGeometry(1, 16, 12), mat(color), parent, x, y, z, sx, sy, sz);
  const addSign = (parent, text, background, x, y, z, sx = 2.3, sy = .55, ink = '#fff9e8') => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 120; const ctx = canvas.getContext('2d');
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 62px Arial'; ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 24);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = add(new THREE.PlaneGeometry(sx, sy), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }), parent, x, y, z + .035, 1, 1, 1); mesh.castShadow = false; mesh.renderOrder = 3;
  };
  const addIndonesianFlag = (parent, x, z, poleHeight = 8) => {
    cylinder(parent, '#d6d7d2', x, poleHeight / 2, z, .045, .055, poleHeight, 10);
    sphere(parent, '#d4b565', x, poleHeight + .05, z, .1, .11, .1);
    cube(parent, '#d52f37', x + .52, poleHeight - .62, z, 1.02, .48, .045);
    cube(parent, '#fffdf6', x + .52, poleHeight - 1.12, z, 1.02, .48, .045);
  };
  const roof = (parent, x, y, z, width, depth, color) => {
    cube(parent, color, x - width * .25, y, z, width * .57, .22, depth, -.48);
    cube(parent, color, x + width * .25, y, z, width * .57, .22, depth, .48);
    cube(parent, '#f6dfb5', x, y - .18, z, .08, .24, depth * 1.04);
  };
  const addGable = (parent, width, bottom, peak, z, color) => {
    const shape = new THREE.Shape(); shape.moveTo(-width/2, 0); shape.lineTo(width/2, 0); shape.lineTo(0, peak-bottom); shape.closePath();
    const face = add(new THREE.ShapeGeometry(shape), mat(color), parent, 0, bottom, z, 1, 1, 1); face.material.side = THREE.DoubleSide; return face;
  };
  const addFacadePanel = (parent, title, subtitle, x, y, z, width, height, base, accent) => {
    cube(parent, accent, x, y, z, width + .12, height + .12, .16);
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 220; const ctx = canvas.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0,0,900,220); ctx.strokeStyle = '#fff8e7'; ctx.lineWidth = 12; ctx.strokeRect(8,8,884,204);
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(105,110,72,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff9e8'; ctx.font = '900 52px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(title.startsWith('SPPG')?'BGN':'K',105,110);
    ctx.textAlign='left'; ctx.fillStyle='#fff9e8'; ctx.font='900 68px Arial'; ctx.fillText(title,205,93,660); ctx.font='700 29px Arial'; ctx.fillText(subtitle,208,157,650);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const face = add(new THREE.PlaneGeometry(width,height), new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}), parent, x,y,z+.09,1,1,1); face.castShadow=false;
  };
  const addSppgSign = (parent, x, y, z, width, height) => {
    cube(parent, '#173e70', x, y, z, width + .16, height + .16, .19);
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 270;
    const ctx = canvas.getContext('2d'); const logo = getBgnLogoImage();
    const paint = () => {
      ctx.fillStyle = '#f8fbfb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#d2ae59'; ctx.lineWidth = 10; ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
      if (logo?.complete && logo.naturalWidth) ctx.drawImage(logo, 22, 48, 405, 171);
      else {
        ctx.fillStyle = '#112b59'; ctx.beginPath(); ctx.arc(145, 135, 105, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d3b25f'; ctx.lineWidth = 8; ctx.stroke();
        ctx.fillStyle = '#f4d774'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 65px Arial'; ctx.fillText('BGN', 145, 138);
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#174878'; ctx.font = '800 35px Arial'; ctx.fillText('SATUAN PELAYANAN', 460, 62, 700);
      ctx.fillStyle = '#153b66'; ctx.font = '900 51px Arial'; ctx.fillText('PEMENUHAN GIZI', 460, 119, 700);
      ctx.fillStyle = '#1b6b9f'; ctx.font = '800 38px Arial'; ctx.fillText('SPPG · BADAN GIZI NASIONAL', 460, 197, 700);
    };
    paint();
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    if (logo && !(logo.complete && logo.naturalWidth)) logo.addEventListener('load', () => { paint(); texture.needsUpdate = true; }, { once: true });
    const face = add(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }), parent, x, y, z + .105, 1, 1, 1);
    face.castShadow = false;
  };
  const house = (parent, scale = 1, wall = '#ead7ae') => {
    cube(parent, wall, 0, .83 * scale, 0, 2.35 * scale, 1.65 * scale, 1.95 * scale);
    roof(parent, 0, 1.78 * scale, 0, 2.8 * scale, 2.3 * scale, '#a94738');
    cube(parent, '#76513a', 0, .48 * scale, .99 * scale, .42 * scale, .95 * scale, .08 * scale);
    for (const x of [-.72, .72]) { cube(parent, '#a8d4d8', x * scale, 1.12 * scale, .995 * scale, .42 * scale, .42 * scale, .06 * scale); cube(parent, '#f4ead0', x * scale, 1.12 * scale, 1.04 * scale, .045 * scale, .48 * scale, .045 * scale); }
    cube(parent, '#816147', 0, .08 * scale, 0, 2.55 * scale, .16 * scale, 2.1 * scale);
  };
  switch (type) {
    case 'road': {
      const length = dimensions.length || 9; const width = dimensions.width || 3;
      cube(root,'#9c8c6d',0,-.02,0,length,.16,width+1.15);
      cube(root,'#bdb7a7',0,.035,0,length,.08,width+.86);
      cube(root,'#424746',0,.105,0,length,.1,width);
      for(const side of [-1,1]){
        cube(root,'#e9dfc6',0,.17,side*(width*.43),length,.035,.09);
        cube(root,'#c4b99f',0,.04,side*(width/2+.32),length,.12,.48);
        for(let slab=-length/2+.6;slab<length/2;slab+=1.35) cube(root,'#d3cbb6',slab,.12,side*(width/2+.32),.035,.05,.44);
      }
      for(let x=-length/2+.7;x<length/2;x+=2.5) cube(root,'#eadba6',x,.17,0,1.3,.035,.12);
      break;
    }
    case 'river': {
      const length = dimensions.length || 10; const width = dimensions.width || 4;
      cube(root, '#8f805d', 0, -.08, 0, length + .4, .2, width + .55);
      cube(root, '#648d70', 0, .015, -width / 2 - .17, length + .5, .18, .35);
      cube(root, '#648d70', 0, .015, width / 2 + .17, length + .5, .18, .35);
      const flowCanvas = document.createElement('canvas'); flowCanvas.width = 256; flowCanvas.height = 128;
      const flowCtx = flowCanvas.getContext('2d'); flowCtx.fillStyle = '#55aebc'; flowCtx.fillRect(0, 0, 256, 128);
      for (let row = 0; row < 8; row++) {
        flowCtx.beginPath(); flowCtx.moveTo(-35, row * 19 + 8);
        flowCtx.bezierCurveTo(35, row * 19 - 3, 78, row * 19 + 17, 142, row * 19 + 7);
        flowCtx.bezierCurveTo(188, row * 19, 221, row * 19 + 17, 285, row * 19 + 5);
        flowCtx.strokeStyle = row % 2 ? '#d5f2e5' : '#b6e3dd'; flowCtx.globalAlpha = .7; flowCtx.lineWidth = row % 2 ? 4 : 2; flowCtx.stroke();
      }
      flowCtx.globalAlpha = 1;
      const flowTexture = new THREE.CanvasTexture(flowCanvas); flowTexture.colorSpace = THREE.SRGBColorSpace;
      flowTexture.wrapS = THREE.RepeatWrapping; flowTexture.wrapT = THREE.RepeatWrapping;
      flowTexture.repeat.set(Math.max(1, length / 3), Math.max(1, width / 2));
      const water = add(new THREE.PlaneGeometry(length, width, 1, 1), new THREE.MeshStandardMaterial({ color: '#a2d8d7', map: flowTexture, roughness: .27, metalness: .06, side: THREE.DoubleSide }), root, 0, .045, 0, 1, 1, 1, -Math.PI / 2);
      water.onBeforeRender = () => { flowTexture.offset.x = (performance.now() * .000045) % 1; };
      water.userData.waterFlow = true;
      for (let x = -length / 2 + 1; x < length / 2; x += 2.4) sphere(root, '#e7f1d5', x, .065, Math.sin(x) * width * .25, .35, .018, .06);
      break;
    }
    case 'house': {
      // Compact raised timber house retained for existing map scenes.
      cube(root,'#564a37',0,.14,0,6.1,.28,4.9);
      for(const x of [-2.25,-.75,.75,2.25]) for(const z of [-1.62,1.62]){
        cylinder(root,'#644a32',x,.67,z,.09,.11,1.04,8);
        cube(root,'#79563a',x,1.19,z,.16,.2,.16);
      }
      cube(root,'#806044',0,1.17,0,5.9,.2,4.35);
      cube(root,'#a98354',0,2.04,0,5.55,1.58,4.0);
      for(const x of [-2.58,-1.72,-.86,0,.86,1.72,2.58]) cube(root,'#765238',x,2.04,2.03,.1,1.62,.12);
      for(const y of [1.45,1.82,2.19,2.56,2.78]) cube(root,'#bd9360',0,y,2.07,5.45,.055,.055);
      const stiltRoofFront=cube(root,'#764336',0,3.12,1.1,6.25,.2,2.75); stiltRoofFront.rotation.x=.48;
      const stiltRoofBack=cube(root,'#764336',0,3.12,-1.1,6.25,.2,2.75); stiltRoofBack.rotation.x=-.48;
      addGable(root,5.58,2.79,3.83,2.08,'#ad8151');
      cube(root,'#644a32',0,1.91,2.14,1.0,1.52,.14);
      for(const x of [-1.82,1.82]){
        cube(root,'#3f5f5b',x,2.15,2.15,1.02,.76,.1);
        cube(root,'#d3b275',x,2.15,2.22,.08,.82,.06);
        cube(root,'#d3b275',x,2.15,2.22,1.08,.08,.06);
      }
      for(let stair=0;stair<5;stair++) cube(root,'#876847',0,.18+stair*.18,2.55+stair*.34,1.25-stair*.12,.14,.42);
      cube(root,'#b09061',0,.1,0,6.4,.18,5.15);
      break;
    }
    case 'house_village': {
      // Modest Indonesian plaster home based on the map reference: clay tiles,
      // a timber veranda, framed windows and a small front stair.
      cube(root,'#a99c82',0,.12,0,7.6,.24,6.2);
      cube(root,'#c8b99d',0,.36,0,7.22,.28,5.9);
      cube(root,'#e6d7bb',0,1.67,-.18,6.85,2.58,5.2);
      cube(root,'#d5c6a8',0,.55,2.46,6.86,.42,.14);
      cube(root,'#82745f',0,.39,-.15,7.32,.18,5.98);
      // Raised tiled gable roof with visible ridge caps and staggered tile rows.
      const houseRoofFront=cube(root,'#a94332',0,3.46,1.45,7.72,.2,3.42); houseRoofFront.rotation.x=.43;
      const houseRoofBack=cube(root,'#a94332',0,3.46,-1.45,7.72,.2,3.42); houseRoofBack.rotation.x=-.43;
      addGable(root,6.92,2.86,4.35,2.48,'#e1d1b3');
      cube(root,'#873b30',0,4.3,0, .22,.16,6.85);
      for(const side of [-1,1]) for(let row=0;row<5;row++){
        const z=side*(.35+row*.62); const y=4.02-row*.22;
        cube(root,row%2?'#bd5b3e':'#b34d36',0,y,z,7.72,.085,.13).rotation.x=side*.43;
        for(const x of [-3.15,-2.1,-1.05,0,1.05,2.1,3.15]) cube(root,'#d47a50',x,y+.035,z, .06,.045,.15).rotation.x=side*.43;
      }
      for(const x of [-3.38,3.38]) for(const z of [-2.55,2.55]){
        cube(root,'#76513a',x,1.67,z,.2,2.78,.2);
        cube(root,'#d8c9ad',x,.2,z,.34,.32,.34);
      }
      // Front veranda, timber brackets and stone steps.
      cube(root,'#8e6347',0,2.85,3.12,7.8,.2,1.35);
      for(const x of [-3.35,0,3.35]){
        cylinder(root,'#79543a',x,1.66,3.12,.11,.14,2.55,10);
        const bracket=cube(root,'#79543a',x,2.68,2.67,.12,.72,.12); bracket.rotation.x=-.72;
      }
      cube(root,'#745039',0,1.42,2.68,1.18,1.95,.15);
      cube(root,'#9b6a46',0,1.4,2.78,.91,1.68,.06);
      cube(root,'#65432f',.36,1.38,2.83,.06,1.25,.045);
      sphere(root,'#d3ad61',.39,1.44,2.88,.055,.055,.035);
      for(const x of [-2.25,2.25]){
        cube(root,'#6d4934',x,1.76,2.68,1.22,1.38,.16);
        cube(root,'#9bb8b5',x,1.78,2.78,1.02,1.14,.06);
        cube(root,'#754f37',x,1.78,2.83,.08,1.18,.05);
        cube(root,'#754f37',x,1.78,2.83,1.1,.08,.05);
        cube(root,'#754f37',x,2.47,2.82,1.12,.16,.1);
        for(const slat of [-.35,-.12,.12,.35]) cube(root,'#79543a',x+slat,2.48,2.84,.035,.15,.04);
      }
      for(let step=0;step<4;step++) cube(root,'#aaa18e',0,.11+step*.14,3.58+step*.3,2.2-step*.25,.16,.38);
      // Side window and a rainwater downpipe make the house read from every angle.
      cube(root,'#6c4935',-3.47,1.68,-.2,.12,1.15,1.24);
      cube(root,'#98b6b3',-3.54,1.68,-.2,.045,.94,1.02);
      const downpipe=cylinder(root,'#77766d',3.5,1.45,2.48,.045,.055,2.62,8); downpipe.rotation.z=.04;
      // Bench, clay planters, and leaves at the porch edge.
      cube(root,'#875d3e',-2.45,.62,3.28,1.55,.12,.38); cube(root,'#795339',-2.45,.36,3.28,.12,.5,.12);
      for(const x of [-2.8,2.78]){
        cylinder(root,'#a85f42',x,.32,3.42,.22,.28,.42,10);
        for(const leafSide of [-1,1]) { const leaf=cylinder(root,'#558347',x+leafSide*.1,.76,3.42,.035,.12,.68,7); leaf.rotation.z=leafSide*.32; }
      }
      break;
    }
    case 'house_mid': {
      // One-storey masonry family home with a red clay gable, veranda, and carport.
      cube(root,'#d3c6aa',0,.14,0,7.3,.28,6.2);
      cube(root,'#e7d8bc',0,1.55,-.18,6.85,2.74,5.35);
      cube(root,'#d8c7a4',0,.47,2.54,6.9,.48,.15);
      cube(root,'#9d4437',0,2.89,0,7.28,.18,5.95);
      const middleRoofF=cube(root,'#b34e3d',0,3.25,1.34,7.65,.18,3.55); middleRoofF.rotation.x=.42;
      const middleRoofB=cube(root,'#b34e3d',0,3.25,-1.34,7.65,.18,3.55); middleRoofB.rotation.x=-.42;
      addGable(root,6.95,2.88,4.05,2.52,'#eadcc0');
      cube(root,'#76513b',-.2,1.25,2.73,1.12,2.05,.14);
      cube(root,'#b77c50',-.2,1.28,2.82,.86,1.77,.07);
      for(const x of [-2.45,-1.05,1.25,2.55]){
        cube(root,'#6f4933',x,1.7,2.73,1.0,1.15,.13);
        cube(root,'#9ec4c4',x,1.7,2.82,.82,.95,.06);
        cube(root,'#f1e5d0',x,1.7,2.87,.07,1.0,.05);
        cube(root,'#f1e5d0',x,1.7,2.87,.9,.07,.05);
      }
      for(const x of [-1.95,-.35,1.25]) cylinder(root,'#eee4d0',x,1.48,3.05,.12,.16,2.55,12);
      cube(root,'#c7b391',-.3,.16,3.47,4.3,.18,1.08);
      // Side carport has a thin metal canopy rather than another house roof.
      cube(root,'#586b6a',2.45,2.62,-.35,2.55,.15,3.45);
      for(const x of [1.35,3.55]) for(const z of [-1.65,1.0]) cylinder(root,'#77796e',x,1.32,z,.065,.08,2.55,8);
      for(const x of [-2.8,2.85]) sphere(root,'#527e48',x,.46,3.7,.4,.5,.35);
      cube(root,'#d2c3a4',0,.08,0,7.5,.16,6.4);
      break;
    }
    case 'house_luxury': {
      // Two-storey contemporary villa: offset upper wing, deep balcony, glazing,
      // stone-clad entry, garage bay, and a flat roof terrace.
      cube(root,'#bfc1bb',0,.14,0,9.5,.28,7.6);
      cube(root,'#e4e1d8',0,1.62,-.12,8.9,2.9,6.4);
      cube(root,'#f2efe8',-.65,3.93,-.52,6.7,1.92,5.12);
      cube(root,'#4c5b60',0,3.22,0,9.05,.18,6.52);
      cube(root,'#353e42',0,5.0,-.45,7.25,.18,5.65);
      cube(root,'#c2bcae',-1.55,1.45,3.27,2.6,2.4,.18);
      cube(root,'#b9d0d1',-1.55,1.54,3.39,2.28,2.12,.06);
      cube(root,'#f0ece4',-.35,1.38,3.5,.16,2.3,.14);
      cube(root,'#eeeae1',2.6,1.28,3.23,2.25,2.28,.18);
      cube(root,'#3e494b',2.6,1.26,3.35,1.98,2.02,.08);
      for(const x of [-3.75,-2.45,-1.15,.15,1.45,2.75,4.05]){
        cube(root,'#22363c',x,4.05,2.08,.95,1.5,.12);
        cube(root,'#9fc4c7',x,4.05,2.16,.77,1.3,.055);
        cube(root,'#f2efe8',x,4.05,2.2,.055,1.38,.04);
      }
      cube(root,'#d4d1c8',-.4,2.96,2.55,7.2,.2,1.25);
      for(const x of [-3.6,-2.4,-1.2,0,1.2,2.4,3.6]) cylinder(root,'#444c4d',x,2.33,3.0,.055,.06,1.08,8);
      cube(root,'#9fa59f',0,.12,4.0,9.5,.2,1.3);
      for(const x of [-4.0,4.0]){
        cube(root,'#343a3a',x,.2,4.4,1.0,.35,.75);
        sphere(root,'#4f7d4d',x,.72,4.4,.5,.65,.42);
      }
      break;
    }
    case 'school': {
      cube(root,'#b49b79',0,.1,0,6.9,.22,4.45);
      cube(root,'#b9aa90',0,1.08,0,5.8,2.12,3.4);
      cube(root,'#786f5f',0,.22,1.73,5.75,.3,.14);
      roof(root,0,2.37,0,6.25,3.85,'#76534b');
      cube(root,'#4d4740',1.55,2.57,.9,1.45,.1,1.65,-.2);
      cube(root,'#67463d',2.35,2.34,1.65,1.5,.17,.56,.18);
      for(const x of [-2.3,-.7,.8,2.1]) cylinder(root,'#584333',x,2.26,1.72,.035,.045,1.2,7).rotation.z=x>1?.18:-.12;
      cube(root,'#95816c',-2.15,1.2,1.76,.78,1.12,.08);
      cube(root,'#92aa9e',1.55,1.32,1.76,.58,.55,.08);
      cube(root,'#564136',1.55,1.32,1.82,.07,.66,.05);
      for(const x of [-1.8,-.6,.6,1.8]) cube(root,'#553f34',x,1.32,1.82,.045,.66,.05);
      for(const [x,y,angle] of [[-2.15,1.15,-.52],[-2.15,1.15,.48],[1.55,1.3,-.45]]){
        const board=cube(root,'#806148',x,y,1.88,.74,.075,.06); board.rotation.z=angle;
      }
      for(const [x,y,length,angle] of [[-2.65,1.9,.68,.58],[.15,1.62,.54,-.62],[2.48,.88,.9,.2]]){
        const crack=cube(root,'#746f62',x,y,1.755,.035,length,.035); crack.rotation.z=angle;
      }
      cube(root,'#a79a82',-1.82,2.02,1.74,1.25,.18,.12);
      const pipe=cylinder(root,'#777367',2.66,.78,1.85,.04,.055,1.56,8); pipe.rotation.z=.08;
      addSign(root,dimensions.title||'SEKOLAH RUSAK','#5d5143',0,2.03,1.82,2.8,.43);
      for(const x of [-2.7,-2.25,2.35,2.75]){
        cylinder(root,'#526f43',x,.28,1.96,.07,.11,.48,7).rotation.z=x<0?-.18:.16;
        sphere(root,'#718d4c',x+.12,.45,1.96,.14,.16,.12);
      }
      for(const [x,z,size,color] of [[-2.7,2.15,.34,'#827966'],[-2.3,2.35,.24,'#b5aa91'],[2.45,2.2,.42,'#756e61'],[2.85,1.85,.25,'#c1b59a'],[-1.8,2.7,.3,'#918a78']]){
        const rubble=cube(root,color,x,.12,z,size,.2,size*.72); rubble.rotation.y=x*.1;
      }
      const brokenBeam=cube(root,'#76543b',2.45,.48,2.24,1.55,.12,.14); brokenBeam.rotation.z=-.24;
      break;
    }
    case 'school_ruined': {
      // Long one-storey public school based on the damaged-school map art:
      // red dado walls, joined tiled wings, broken roof, blue emergency tarp.
      cube(root,'#aa9b7d',0,.12,0,13.8,.24,8.35);
      cube(root,'#d8c7a9',0,.38,0,13.42,.32,7.92);
      cube(root,'#e6d8bd',0,1.93,-.12,13.0,2.92,6.9);
      cube(root,'#a8493d',0,.94,3.42,13.06,1.02,.13);
      cube(root,'#c16b55',0,1.49,3.5,13.08,.12,.12);
      // Three connected gabled roof sections give the school its familiar long profile.
      for(const [cx,width,depth] of [[-4.18,5.2,6.25],[0,5.0,7.15],[4.18,5.2,6.25]]){
        for(const side of [-1,1]){
          const panel=cube(root,'#a74836',cx,3.55,side*(depth*.22),width+.35,.2,depth*.56);
          panel.rotation.x=side*.48;
          for(let row=0;row<5;row++){
            const z=side*(.38+row*.55); const y=4.17-row*.2;
            if(cx< -3 && side===1 && row>=1 && row<=3) continue; // the collapsed roof opening exposes rafters
            const tile=cube(root,row%2?'#bb5940':'#ae4936',cx,y,z,width+.22,.075,.13);
            tile.rotation.x=side*.48;
          }
        }
        const frontGable=addGable(root,width,3.08,4.46,cx===0?3.55:3.13,'#e4d6bb'); frontGable.position.x=cx;
        const rearGable=addGable(root,width,3.08,4.46,cx===0?-3.55:-3.13,'#e4d6bb'); rearGable.position.x=cx; rearGable.rotation.y=Math.PI;
      }
      // Rafters are visible where several courses of tiles have fallen away.
      const roofOpening=cube(root,'#35312d',-4.1,3.4,1.72,1.55,.08,1.48); roofOpening.rotation.x=.48;
      for(const x of [-5.7,-4.9,-4.1,-3.3,-2.5]){
        const rafter=cylinder(root,'#5b4030',x,3.35,1.82,.045,.055,2.72,8); rafter.rotation.x=.48;
      }
      // A blue tarpaulin is tied over the opposite roof slope after the leak.
      const tarp=cube(root,'#2874a9',2.35,3.5,1.64,2.42,.12,1.78); tarp.rotation.x=.48;
      for(const x of [1.18,3.52]) for(const z of [.82,2.45]) cylinder(root,'#8d7654',x,3.58,z,.035,.045,.17,8);
      for(let fold=0;fold<5;fold++){
        const seam=cube(root,fold%2?'#3c86b8':'#216695',2.35,3.57,.94+fold*.34,2.28,.025,.035); seam.rotation.x=.48;
      }
      cube(root,'#5d4031',0,4.42,0,.22,.14,7.2);
      // Classroom windows: some panes are cracked or missing, with dark voids behind them.
      for(const x of [-5.3,-3.05,3.05,5.3]){
        cube(root,'#593c2d',x,2.03,3.52,1.55,1.48,.16);
        cube(root,'#76918a',x,2.03,3.62,1.31,1.22,.055);
        cube(root,'#754c36',x,2.03,3.68,.085,1.33,.06); cube(root,'#754c36',x,2.03,3.68,1.4,.085,.06);
        cube(root,'#754c36',x,2.03,3.68,.055,1.24,.05);
        for(let slat=0;slat<3;slat++) cube(root,'#604532',x,2.72+slat*.09,3.67,1.38,.035,.07);
      }
      cube(root,'#151d1d',-3.05,2.03,3.7,.46,.48,.025);
      for(const [x,y,z,angle] of [[-5.62,2.28,3.74,-.45],[-4.58,1.8,3.75,.58],[3.22,2.3,3.74,.3],[5.48,1.83,3.74,-.55]]){
        const shard=cube(root,'#a8c4bc',x,y,z,.48,.035,.025); shard.rotation.z=angle;
      }
      // Central double entry, modest entrance canopy, pillars and signboard.
      cube(root,'#634331',0,1.53,3.55,1.76,2.24,.18);
      cube(root,'#9a6745',-.43,1.53,3.67,.72,2.04,.06); cube(root,'#9a6745',.43,1.53,3.67,.72,2.04,.06);
      cube(root,'#4d382b',0,1.55,3.72,.06,1.92,.035);
      sphere(root,'#d5b46c',-.17,1.53,3.77,.05,.05,.035); sphere(root,'#d5b46c',.17,1.53,3.77,.05,.05,.035);
      cube(root,'#914338',0,3.12,3.63,3.75,.18,.45);
      cube(root,'#ede2ca',0,3.47,3.72,3.3,.5,.12);
      addSign(root,dimensions.title||'SEKOLAH DASAR','#eee4d1',0,3.48,3.81,3.05,.4,'#35434a');
      for(const x of [-1.65,1.65]) cylinder(root,'#e4d8c1',x,1.97,3.9,.13,.16,2.85,12);
      // Faded plaster, diagonal cracks, a bent drainpipe and a broken gutter.
      for(const [x,y,width,height,color] of [[-6.1,.88,.7,.9,'#c6b69a'],[2.45,1.02,.56,.7,'#c8b89c'],[6.18,1.48,.42,.55,'#cfc1a7']]) cube(root,color,x,y,3.51,width,height,.04);
      for(const [x,y,length,angle] of [[-6.0,1.8,.72,.56],[-1.05,.78,.84,-.45],[6.05,2.35,.65,.52]]){
        const crack=cube(root,'#786c5b',x,y,3.55,.035,length,.025); crack.rotation.z=angle;
      }
      const drainpipe=cylinder(root,'#777267',6.5,1.67,3.53,.045,.055,3.2,8); drainpipe.rotation.z=.035;
      const gutter=cube(root,'#756a59',0,3.1,4.02,13.25,.09,.1); gutter.rotation.z=.025;
      // Broken masonry, roof fragments, weeds, and rain-stained approach paving.
      cube(root,'#b7a98f',0,.09,5.15,13.4,.16,1.7);
      for(const [x,z,size,color,angle] of [[-6.35,4.22,.38,'#786f61',.2],[-5.7,4.72,.27,'#b2a38a',-.35],[-3.7,4.2,.46,'#8b7b65',.1],[3.9,4.38,.32,'#746c60',-.2],[5.9,4.72,.42,'#b9ad96',.3],[1.9,4.9,.28,'#877863',-.1]]){
        const rubble=cube(root,color,x,.14,z,size,.22,size*.78); rubble.rotation.y=angle;
      }
      for(const x of [-6.25,-5.75,5.95,6.35]){
        const weed=cylinder(root,'#537b43',x,.32,4.45,.04,.07,.56,7); weed.rotation.z=x<0?-.16:.14;
        sphere(root,'#6c914b',x+.1,.52,4.45,.16,.18,.13);
      }
      break;
    }
    case 'school_good': {
      // Indonesian public elementary school: broad tiled roof, cream walls,
      // maroon dado, a projecting SD Negeri gable, and a central entry porch.
      cube(root,'#c2b69b',0,.16,0,18.6,.3,8.0);
      cube(root,'#eee2bf',0,1.68,0,17.9,2.86,6.8);
      cube(root,'#8f3440',0,.65,3.43,17.95,1.18,.16);
      cube(root,'#d6c7a2',0,1.28,3.54,18.0,.12,.14);

      const schoolRoofFront=cube(root,'#9c3d34',0,3.74,1.73,18.35,.2,4.45); schoolRoofFront.rotation.x=.29;
      const schoolRoofBack=cube(root,'#9c3d34',0,3.74,-1.73,18.35,.2,4.45); schoolRoofBack.rotation.x=-.29;
      const roofTiles=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.07,.48),mat('#c35d42'),384);
      const tileTransform=new THREE.Object3D();
      for(let i=0;i<384;i++){
        const side=i<192?1:-1; const tile=i%192; const row=Math.floor(tile/32); const column=tile%32;
        tileTransform.position.set(-8.7+column*.56+(row%2)*.28,4.12-row*.19,side*(.35+row*.72));
        tileTransform.rotation.set(side*.29,0,0); tileTransform.updateMatrix(); roofTiles.setMatrixAt(i,tileTransform.matrix);
      }
      roofTiles.instanceMatrix.needsUpdate=true; roofTiles.castShadow=true; root.add(roofTiles);
      addGable(root,7.8,3.03,4.72,3.48,'#efe3c1');
      cube(root,'#7f3540',0,3.08,3.58,8.05,.16,.22);
      cube(root,'#eee5d1',0,3.72,3.62,6.1,.98,.18);
      const schoolSignCanvas=document.createElement('canvas'); schoolSignCanvas.width=1000; schoolSignCanvas.height=180;
      const schoolSignCtx=schoolSignCanvas.getContext('2d'); schoolSignCtx.fillStyle='#eee5d1'; schoolSignCtx.fillRect(0,0,1000,180);
      schoolSignCtx.fillStyle='#2464a4'; schoolSignCtx.beginPath(); schoolSignCtx.arc(110,90,76,0,Math.PI*2); schoolSignCtx.fill();
      schoolSignCtx.strokeStyle='#f7f2df'; schoolSignCtx.lineWidth=9; schoolSignCtx.beginPath(); schoolSignCtx.moveTo(65,108); schoolSignCtx.lineTo(110,132); schoolSignCtx.lineTo(155,108); schoolSignCtx.moveTo(110,51); schoolSignCtx.lineTo(110,132); schoolSignCtx.stroke();
      schoolSignCtx.fillStyle='#242f37'; schoolSignCtx.textAlign='center'; schoolSignCtx.textBaseline='middle'; schoolSignCtx.font='700 30px Arial'; schoolSignCtx.fillText('SEKOLAH DASAR NEGERI',590,48);
      schoolSignCtx.font='900 67px Arial'; schoolSignCtx.fillText('SD NEGERI',590,119);
      const schoolSignTexture=new THREE.CanvasTexture(schoolSignCanvas); schoolSignTexture.colorSpace=THREE.SRGBColorSpace;
      const schoolSignMesh=add(new THREE.PlaneGeometry(5.9,.82),new THREE.MeshBasicMaterial({map:schoolSignTexture,side:THREE.DoubleSide}),root,0,3.72,3.725,1,1,1); schoolSignMesh.castShadow=false;

      // Tall brown window frames and transom louvers run along both classroom wings.
      for(const x of [-8.05,-5.85,-3.65,3.65,5.85,8.05]){
        cube(root,'#5c4031',x,1.78,3.5,1.62,1.54,.12);
        cube(root,'#8eb7b6',x,1.78,3.58,1.4,1.3,.055);
        cube(root,'#76523d',x,1.78,3.62,.09,1.38,.055);
        cube(root,'#76523d',x,1.78,3.62,1.48,.09,.055);
        for(let slat=0;slat<4;slat++) cube(root,'#553e31',x,2.7+slat*.1,3.59,1.58,.045,.08);
      }
      // Recessed double doors, glass transom, porch columns, and entry steps.
      cube(root,'#4e392d',0,1.28,3.55,2.34,2.25,.18);
      cube(root,'#744d37',-.57,1.27,3.68,1.02,2.0,.08); cube(root,'#744d37',.57,1.27,3.68,1.02,2.0,.08);
      cube(root,'#a5c7c4',0,2.45,3.7,2.12,.44,.06);
      for(const x of [-1.65,1.65]) cylinder(root,'#f4edda',x,1.57,4.0,.17,.2,2.95,14);
      cube(root,'#d8d2c3',0,.18,4.25,5.6,.2,1.15);
      cube(root,'#e5dfd1',0,.32,4.0,4.9,.14,.55);
      cube(root,'#cbbf9e',0,.08,0,19.0,.16,8.4);
      addIndonesianFlag(root,-8.75,2.1,7.4);
      for(const x of [-7.0,-5.4,5.4,7.0]){
        cube(root,'#293b32',x,.16,4.42,1.32,.32,.62);
        for(let shrub=0;shrub<3;shrub++) sphere(root,['#43804d','#568c4e','#6a9651'][shrub],x-.36+shrub*.36,.55,4.42,.31,.42,.28);
      }
      break;
    }
    case 'mbg': {
      // Volume model of the MBG production kitchen, with a metal gable roof,
      // receiving shutter, washable kitchen windows, and a readable BGN sign.
      cube(root, '#d7d3c2', 0, .18, 0, 8.2, .3, 5.9);
      cube(root, '#eee6d4', 0, 1.62, 0, 7.65, 2.6, 5.15);
      cube(root, '#a8c5b9', 0, .48, 2.61, 7.7, .34, .14);
      cube(root, '#6f9a8b', 0, .66, 2.7, 7.72, .12, .12);
      roof(root, 0, 3.12, 0, 8.35, 5.85, '#718986');
      addGable(root, 7.75, 2.78, 3.92, 2.59, '#e4ddca'); addGable(root, 7.75, 2.78, 3.92, -2.59, '#e4ddca');
      // Ventilation louvers and three large windows reveal the cooking line.
      for (const x of [-1.7, .15, 1.95]) {
        cube(root, '#526b67', x, 2.08, 2.62, 1.58, .16, .1);
        cube(root, '#8bb9b6', x, 1.38, 2.63, 1.55, .9, .12);
        for (const dx of [-.77,.77]) cube(root, '#eee9d9', x+dx, 1.38, 2.71, .075, 1.02, .1);
        cube(root, '#eee9d9', x, 1.38, 2.72, 1.62, .075, .1);
        cube(root, '#b8c9b8', x, .82, 2.74, 1.42, .12, .22);
        cylinder(root, '#b9bfc0', x-.28, 1.0, 2.77, .15, .19, .28, 12);
        cylinder(root, '#7b8886', x-.28, 1.15, 2.77, .17, .17, .035, 12);
      }
      // Loading dock and roller shutter on the left end of the front elevation.
      cube(root, '#d2c6ad', -3.15, 1.06, 2.65, 1.45, 1.82, .12); cube(root, '#4d5955', -3.15, 1.02, 2.73, 1.22, 1.48, .08);
      for(let y=.42;y<1.75;y+=.16)cube(root,'#9b9e96',-3.15,y,2.79,1.2,.045,.04);
      cube(root, '#d2c6ad', 3.35, 1.05, 2.64, .78, 1.85, .13); cube(root, '#8a6048', 3.35, .91, 2.74, .58, 1.52, .08); cube(root, '#e7d6ad', 3.56, .94, 2.8, .035, .035, .035);
      addFacadePanel(root,'SPPG · BGN','DAPUR LAYANAN PEMENUHAN GIZI',0,2.57,2.69,3.75,.62,'#234c65','#c7a95d');
      // Exhausts, bollards, and a washable loading apron complete the site.
      for(const x of [-1.8,0,1.8]){cylinder(root,'#647b78',x,3.65,-.7,.18,.2,.8,10);cylinder(root,'#bac3bb',x,4.07,-.7,.24,.24,.1,10);}
      cube(root,'#c7b99d',-3.1,.07,3.3,2.5,.12,1.35);
      for(const x of [-4.0,-2.1]){cylinder(root,'#f1bd43',x,.45,3.02,.12,.15,.78,10);cube(root,'#303c3b',x,.49,3.02,.27,.13,.28);}
      break;
    }
    case 'sppg': {
      // Reference SPPG: blue-trimmed front gable, large branded sign, deep
      // blue entrance canopy, glazed kitchen lobby, and a side service shelter.
      cube(root, '#c9d2cf', 0, .16, 0, 12.2, .28, 9.6);
      cube(root, '#f1f0e8', 0, 1.8, 0, 10.65, 3.3, 7.8);
      cube(root, '#2877a8', 0, .52, 3.94, 10.42, .58, .13);
      cube(root, '#2877a8', 0, .52, -3.94, 10.42, .58, .13);
      cube(root, '#2877a8', -5.2, .52, 0, .13, .58, 7.85);
      cube(root, '#2877a8', 5.2, .52, 0, .13, .58, 7.85);
      const sppgFrontRoof=cube(root,'#173f76',0,3.91,1.82,11.5,.24,4.45); sppgFrontRoof.rotation.x=.39;
      const sppgRearRoof=cube(root,'#173f76',0,3.91,-1.82,11.5,.24,4.45); sppgRearRoof.rotation.x=-.39;
      addGable(root,10.55,3.2,4.9,3.94,'#e8edea');
      addGable(root,10.55,3.2,4.9,-3.94,'#e8edea');
      const gableLeft=cube(root,'#153e78',0,0,0,6.35,.38,.18); gableLeft.position.set(-2.88,4.04,4.13); gableLeft.rotation.z=.31;
      const gableRight=cube(root,'#153e78',0,0,0,6.35,.38,.18); gableRight.position.set(2.88,4.04,4.13); gableRight.rotation.z=-.31;
      // The front carries the official BGN identity and the full SPPG name.
      addSppgSign(root, 0, 4.08, 4.0, 7.0, .92);
      // Deep canopy, blue piers, and a glazed double-door lobby dominate the front.
      cube(root,'#123e78',0,2.94,4.55,8.65,.62,1.48);
      cube(root,'#f7f5ee',0,2.61,4.58,8.52,.12,1.42);
      for(const x of [-3.45,3.45]) cube(root,'#17477f',x,1.61,4.25,1.08,2.75,.72);
      cube(root,'#27343a',0,1.42,4.04,5.65,2.36,.14);
      cube(root,'#94b9bc',0,1.49,4.13,5.38,2.12,.05);
      for(const x of [-2.65,-1.75,-.88,0,.88,1.75,2.65]) cube(root,'#263337',x,1.49,4.18,.075,2.15,.08);
      for(const x of [-.48,.48]) cube(root,'#526b70',x,1.35,4.23,.84,1.88,.07);
      cube(root,'#242e32',0,2.58,4.18,5.6,.12,.1);
      // Side kitchen windows and the secondary receiving door.
      for(const x of [-4.45,4.45]){
        cube(root,'#203841',x,1.75,3.96,1.28,1.55,.12);
        cube(root,'#9dc6c8',x,1.75,4.04,1.1,1.36,.05);
        cube(root,'#27383c',x,1.75,4.08,.07,1.42,.05);
        cube(root,'#27383c',x,1.75,4.08,1.16,.07,.05);
      }
      cube(root,'#4e6268',-5.02,1.25,3.98,.45,1.9,.15);
      // Long side windows, roof vents, and a raised stainless water tank.
      for (const z of [-2.35, -.65, 1.05, 2.55]) {
        cube(root, '#1d4f70', 5.22, 1.83, z, .1, .94, 1.22);
        cube(root, '#9dced4', 5.29, 1.83, z, .04, .74, 1.02);
        cube(root, '#f5f1e5', 5.32, 1.83, z, .06, .82, .06);
      }
      for (const x of [-2.6, 1.8]) {
        cylinder(root, '#647c88', x, 4.12, -.8, .15, .19, .86, 12);
        cylinder(root, '#aebdc0', x, 4.58, -.8, .23, .23, .1, 12);
      }
      for (const x of [3.65, 4.45, 5.25, 6.05]) cylinder(root, '#71828a', x, 2.2, -2.9, .055, .065, 3.8, 8);
      cube(root, '#71828a', 4.85, 4.06, -2.9, 2.4, .12, 2.25);
      cylinder(root, '#a7b7bb', 4.85, 4.92, -2.9, .8, .8, 1.58, 20);
      cylinder(root, '#879da5', 4.85, 5.73, -2.9, .84, .84, .12, 20);
      // Side loading canopy and stainless tanks remain visible from the front.
      cube(root,'#aab4b5',8.05,2.84,-.15,4.35,.2,5.2);
      for(const x of [6.15,9.95]) cylinder(root,'#63777d',x,1.48,-.15,.1,.13,2.9,10);
      cube(root, '#c7d0c7', 0, .08, 4.95, 9.2, .12, 1.65);
      for(const x of [-4.75,-3.7,3.7,4.75]){
        cylinder(root, '#e2b74e', x, .47, 5.0, .13, .16, .78, 10);
        cylinder(root, '#335d79', x, .62, 5.0, .135, .135, .18, 10);
      }
      for(const x of [-5.0,-3.7,3.7,5.0]){
        cube(root,'#30383a',x,.14,5.52,1.06,.28,.74);
        sphere(root,'#47854d',x,.49,5.52,.38,.42,.32);
      }
      cube(root,'#d9ddd7',0,.2,0,12.5,.16,9.9);
      break;
    }
    case 'kopdes': {
      // Reference: long, low Kopdes building with maroon gable roof, six red
      // rolling shutters, a grey logo bay, and a separate tall store shutter.
      cube(root,'#99958a',0,.16,0,17.55,.3,7.9);
      cube(root,'#eeeDE6',0,1.76,0,16.95,3.0,7.2);
      cube(root,'#d4d0c7',0,.34,3.38,17.2,.34,.38);

      // Two broad sheet-metal roof planes meet along the building's long ridge.
      const frontRoof=cube(root,'#74364f',0,3.72,1.8,17.65,.2,4.45); frontRoof.rotation.x=.26;
      const rearRoof=cube(root,'#74364f',0,3.72,-1.8,17.65,.2,4.45); rearRoof.rotation.x=-.26;
      const roofRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.045,4.38),mat('#9b5367'),68);
      const ribTransform=new THREE.Object3D();
      for(let i=0;i<68;i++){
        const side=i<34?1:-1; const column=i%34;
        ribTransform.position.set(-8.25+column*.5,3.72,side*1.8); ribTransform.rotation.set(side*.26,0,0); ribTransform.updateMatrix(); roofRibs.setMatrixAt(i,ribTransform.matrix);
      }
      roofRibs.instanceMatrix.needsUpdate=true; roofRibs.castShadow=true; root.add(roofRibs);
      cube(root,'#e6e2d8',0,3.23,3.33,17.75,.18,.2);
      cube(root,'#dedbd2',0,3.23,-3.33,17.75,.18,.2);

      // Vent slot and six individual corrugated shop shutters.
      cube(root,'#303330',-.95,2.96,3.63,11.65,.22,.08);
      for(let x=-6.6;x<=4.6;x+=1.55) cube(root,'#eeeDE6',x,2.96,3.69,.08,.25,.1);
      const shopCenters=[-7.15,-5.25,-3.35,-1.45,.45,2.35];
      const shutterRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,1.54,.045),mat('#a83d4c'),6*35);
      const shutterTransform=new THREE.Object3D();
      shopCenters.forEach((center,bay)=>{
        cube(root,'#8e2538',center,1.23,3.64,1.76,1.62,.12);
        cube(root,'#a93646',center,2.12,3.66,1.86,.15,.68);
        for(let rib=0;rib<35;rib++){
          shutterTransform.position.set(center-.82+rib*.048,1.23,3.72); shutterTransform.rotation.set(0,0,0); shutterTransform.updateMatrix(); shutterRibs.setMatrixAt(bay*35+rib,shutterTransform.matrix);
        }
        cube(root,'#f5f3eb',center-.92,1.23,3.72,.11,1.92,.17);
        cube(root,'#f5f3eb',center+.92,1.23,3.72,.11,1.92,.17);
      });
      shutterRibs.instanceMatrix.needsUpdate=true; shutterRibs.castShadow=true; root.add(shutterRibs);
      cube(root,'#8d293c',-.95,2.18,3.74,11.7,.2,.68);
      cube(root,'#f4f1e8',-.95,2.06,4.08,11.85,.1,.12);

      // Grey identity panel and its red Kopdes mark, set into the right facade.
      cube(root,'#a9aaa4',4.85,1.86,3.65,3.2,2.92,.16);
      const signCanvas=document.createElement('canvas'); signCanvas.width=720; signCanvas.height=340;
      const signCtx=signCanvas.getContext('2d'); signCtx.clearRect(0,0,720,340);
      signCtx.fillStyle='#bfc0ba'; signCtx.fillRect(0,0,720,340);
      signCtx.strokeStyle='#c92f43'; signCtx.lineWidth=17; signCtx.lineCap='round'; signCtx.lineJoin='round'; signCtx.beginPath(); signCtx.moveTo(70,135); signCtx.lineTo(150,58); signCtx.lineTo(230,135); signCtx.stroke();
      signCtx.fillStyle='#c92f43'; signCtx.fillRect(91,132,118,7);
      for(const personX of [112,150,188]){ signCtx.beginPath(); signCtx.arc(personX,158,13,0,Math.PI*2); signCtx.fill(); signCtx.fillRect(personX-10,175,20,48); }
      signCtx.fillStyle='#333b38'; signCtx.textAlign='left'; signCtx.textBaseline='middle'; signCtx.font='800 52px Arial'; signCtx.fillText('KOPERASI',250,91);
      signCtx.fillText('DESA',250,153);
      signCtx.fillStyle='#c92f43'; signCtx.font='900 58px Arial'; signCtx.fillText('MERAH PUTIH',250,221);
      signCtx.fillStyle='#4b504c'; signCtx.font='600 24px Arial'; signCtx.fillText('KOPERASI DESA / KELURAHAN',250,278);
      const signTexture=new THREE.CanvasTexture(signCanvas); signTexture.colorSpace=THREE.SRGBColorSpace;
      const logoPlane=add(new THREE.PlaneGeometry(2.85,1.34),new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide}),root,4.85,1.88,3.755,1,1,1); logoPlane.castShadow=false;

      // The right-hand loading door is taller and wider than each shop bay.
      cube(root,'#f1efe8',7.45,1.72,3.62,2.35,2.94,.18);
      cube(root,'#59283a',7.45,1.62,3.74,1.91,2.53,.1);
      const storeRibs=new THREE.InstancedMesh(new THREE.BoxGeometry(.04,2.42,.045),mat('#853247'),24);
      for(let rib=0;rib<24;rib++){
        ribTransform.position.set(6.58+rib*.075,1.62,3.81); ribTransform.rotation.set(0,0,0); ribTransform.updateMatrix(); storeRibs.setMatrixAt(rib,ribTransform.matrix);
      }
      storeRibs.instanceMatrix.needsUpdate=true; root.add(storeRibs);
      cube(root,'#f2f0e8',6.25,1.7,3.78,.16,2.95,.24); cube(root,'#f2f0e8',8.65,1.7,3.78,.16,2.95,.24);

      // Concrete delivery apron and side walls complete the simple depot form.
      cube(root,'#c5c1b7',-1.3,.09,4.05,13.1,.16,1.3);
      cube(root,'#e4e1d8',0,1.75,-3.52,16.8,2.86,.16);
      break;
    }
    case 'market': {
      // Open-sided village market with three independent stalls around a center aisle.
      cube(root,'#a79776',0,.1,0,9.3,.2,8.2);
      for(const x of [-4.15,4.15]) for(const z of [-3.35,3.35]) cylinder(root,'#72563d',x,1.85,z,.12,.16,3.55,10);
      for(const x of [-2.75,0,2.75]){
        cube(root,'#79553d',x,.86,-1.42,2.28,1.48,3.35);
        cube(root,'#d2b17d',x,1.65,-1.42,2.43,.16,3.52);
        cube(root,'#413d34',x,.95,.27,2.02,1.25,.12);
        cube(root,x===0?'#bd3e43':x<0?'#e1ad3e':'#458b69',x,2.35,-1.42,2.7,.15,3.85);
        for(const z of [-2.4,-1.65,-.9]) cylinder(root,'#5c4633',x,1.55,z,.035,.04,.65,8);
        for(let bin=0;bin<3;bin++) cube(root,'#b8935f',x- .65+bin*.65,1.98,.36,.52,.58,.52);
        for(let item=0;item<4;item++){
          const produce=item%2?'#d4473f':'#72a14d';
          sphere(root,produce,x-.72+(item%2)*.48,1.57,.44+Math.floor(item/2)*.34,.2,.2,.2);
          sphere(root,item%2?'#e1b445':'#d76a3e',x+.15+(item%2)*.45,1.57,.44+Math.floor(item/2)*.34,.2,.2,.2);
        }
      }
      // Corrugated raised market roof and colored awning edge.
      const marketRoofF=cube(root,'#65706a',0,3.52,1.58,9.8,.2,3.9); marketRoofF.rotation.x=.34;
      const marketRoofB=cube(root,'#65706a',0,3.52,-1.58,9.8,.2,3.9); marketRoofB.rotation.x=-.34;
      cube(root,'#f1e5ce',0,2.78,3.34,9.5,.18,.22);
      addSign(root,'PASAR WARGA','#526e54',0,2.77,3.48,3.5,.48);
      cube(root,'#d6c39a',0,.08,0,9.6,.16,8.5);
      break;
    }
    case 'hall': {
      // Open Javanese pendopo / joglo hall with tiered roof and timber posts.
      cube(root,'#bda77f',0,.12,0,9.2,.24,8.0);
      cube(root,'#79543a',0,.34,-.25,3.8,.44,3.6);
      for(const x of [-3.55,-1.2,1.2,3.55]) for(const z of [-2.95,2.95]){
        cylinder(root,'#6a4934',x,1.78,z,.13,.17,3.0,10);
        cube(root,'#8a6849',x,3.32,z,.32,.18,.32);
      }
      for(const x of [-3.55,3.55]) cube(root,'#805b3e',x,3.1,0,.18,.18,6.1);
      for(const z of [-2.95,2.95]) cube(root,'#805b3e',0,3.1,z,7.3,.18,.18);
      const jogloBase=new THREE.Mesh(new THREE.ConeGeometry(5.05,2.65,4),mat('#583b2d'));
      jogloBase.position.set(0,4.34,0); jogloBase.rotation.y=Math.PI/4; jogloBase.castShadow=true; root.add(jogloBase);
      const jogloUpper=new THREE.Mesh(new THREE.ConeGeometry(2.55,1.75,4),mat('#744632'));
      jogloUpper.position.set(0,5.72,0); jogloUpper.rotation.y=Math.PI/4; jogloUpper.castShadow=true; root.add(jogloUpper);
      cylinder(root,'#6a4934',0,6.65,0,.16,.22,.28,8);
      for(const x of [-2.35,2.35]){
        cube(root,'#425b50',x,1.25,2.58,1.75,1.3,.12);
        cube(root,'#abc3b3',x,1.28,2.66,1.5,1.03,.05);
        cube(root,'#72533c',x,1.33,2.72,.07,1.14,.06);
        cube(root,'#72533c',x,1.33,2.72,1.62,.07,.06);
      }
      cube(root,'#e8ddc5',0,2.65,3.12,3.6,.56,.2);
      addSign(root,'BALAI DESA','#526b56',0,2.65,3.25,3.3,.42);
      cube(root,'#d5c19a',0,.08,0,9.5,.16,8.3);
      break;
    }
    case 'office': {
      // Three-storey kecamatan office with a recessed entry, formal columns,
      // repeated window bays, name board, flag, and front stair.
      cube(root,'#aeb6b2',0,.14,0,11.3,.28,8.0);
      cube(root,'#e4e7e2',0,3.05,-.1,10.4,5.8,6.6);
      cube(root,'#cbd2ce',0,5.98,-.1,10.75,.28,6.9);
      for(const y of [1.55,3.25,4.95]) for(const x of [-4.05,-2.55,-1.05,1.05,2.55,4.05]){
        cube(root,'#314a4b',x,y,3.25,1.08,1.18,.12);
        cube(root,'#9ab8b7',x,y,3.34,.88,.98,.05);
        cube(root,'#e8ece5',x,y,3.38,.065,1.08,.04);
        cube(root,'#e8ece5',x,y,3.38,.98,.065,.04);
      }
      cube(root,'#1d4b68',0,.5,3.27,10.5,.62,.2);
      cube(root,'#f0f0e9',0,5.58,3.31,7.2,.7,.2);
      addSign(root,'KANTOR KECAMATAN','#f0f0e9',0,5.58,3.45,6.7,.48,'#20405a');
      cube(root,'#223b48',0,1.4,3.34,2.3,2.6,.2);
      cube(root,'#86b7bc',0,1.62,3.47,1.9,2.12,.08);
      for(const x of [-1.0,0,1.0]) cube(root,'#e8ece5',x,1.6,3.53,.055,2.1,.06);
      for(const x of [-1.8,1.8]) cylinder(root,'#f4f2e9',x,1.76,3.73,.16,.2,2.8,14);
      cube(root,'#d4d6d0',0,.12,4.02,5.4,.18,1.45);
      for(let step=0;step<4;step++) cube(root,'#d7d8d2',0,.16+step*.15,4.65+step*.28,4.8-step*.35,.14,.34);
      addIndonesianFlag(root,4.8,4.4,7.8);
      break;
    }
    case 'dpr_mpr': {
      // Match the reference: sweeping shallow green roof, white A-frame portal,
      // glass-fronted legislative wings, monumental central stair, and flag.
      cube(root,'#c8c6bd',0,.18,0,25.0,.34,13.0);
      cube(root,'#e7e6df',0,1.7,0,23.8,3.0,8.8);
      cube(root,'#d2d3cf',0,3.28,0,24.0,.28,9.0);
      cube(root,'#202d31',0,.83,4.47,22.8,1.05,.16);
      cube(root,'#f1f0e9',0,2.46,4.47,23.0,1.72,.18);
      for(const x of [-10.4,-8.55,-6.7,-4.85,-3.0,3.0,4.85,6.7,8.55,10.4]){
        cube(root,'#26383b',x,1.58,4.58,1.42,1.58,.11);
        cube(root,'#76a0a1',x,1.58,4.65,1.22,1.35,.045);
        cube(root,'#dce4de',x,1.58,4.69,.07,1.43,.05);
      }
      // Deep dark soffit gives the broad green roof the floating profile in the photo.
      const soffit=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.34,64),mat('#4d5148'));
      soffit.position.set(0,4.42,0); soffit.scale.set(12.7,1,8.2); soffit.castShadow=true; root.add(soffit);
      const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,64,28,0,Math.PI*2,0,Math.PI*.43),mat('#71b27d'));
      canopy.position.set(0,3.92,0); canopy.scale.set(12.65,2.65,8.15); canopy.castShadow=true; canopy.receiveShadow=true; root.add(canopy);

      // Monumental white portal pieces frame the centre of the green canopy.
      for(const side of [-1,1]){
        const support=cube(root,'#f1f0e9',side*1.8,4.52,4.83,.74,5.2,.9);
        support.rotation.z=side*.63;
      }
      cube(root,'#f1f0e9',0,6.94,4.83,1.35,.4,.95);
      cube(root,'#202d31',0,2.85,4.82,7.8,.48,.18);
      for(const x of [-3.2,-1.9,-.65,.65,1.9,3.2]){
        cube(root,'#26383b',x,1.58,4.95,.9,1.45,.12);
        cube(root,'#78a3a3',x,1.58,5.025,.73,1.22,.045);
      }
      // Broad stepped approach occupies the entire centre of the forecourt.
      for(let step=0;step<16;step++){
        const rise=.15+(15-step)*.145; const z=5.08+step*.34;
        cube(root,step%2?'#d2d0c8':'#e2e0d9',0,rise,z,10.8-step*.16,.14,.48);
      }
      cube(root,'#e8e6df',0,2.55,4.88,11.0,.24,.72);
      // Name plaque and a small raised golden Garuda mark on the left wing.
      addSign(root,'GEDUNG DPR/MPR RI','#f0f0e9',-7.3,2.62,4.7,7.2,.6,'#273137');
      sphere(root,'#c7a75b',-10.2,2.47,4.76,.34,.32,.12);
      for(const side of [-1,1]){
        for(let feather=0;feather<4;feather++){
          const wing=cube(root,'#c7a75b',-10.2+side*(.48+feather*.15),2.48+feather*.08,4.77,.62,.12,.09);
          wing.rotation.z=side*(.18+feather*.08);
        }
      }
      cube(root,'#c43e38',-10.2,2.26,4.87,.24,.3,.1);
      addIndonesianFlag(root,6.8,8.7,10.5);
      // Twin low fountain basins and trimmed planting echo the reference forecourt.
      for(const x of [-10.7,10.7]){
        cylinder(root,'#bfc7c4',x,.22,7.25,1.75,1.8,.36,32);
        cylinder(root,'#6dbac0',x,.53,7.25,.38,.42,.34,24);
        sphere(root,'#b6e4dc',x,.78,7.25,.32,.25,.32);
      }
      break;
    }
    case 'istana_negara': {
      // A broad symmetrical neoclassical facade with a continuous colonnade,
      // balustrade, central name frieze, Garuda, flag, bunting, and red carpet.
      cube(root,'#d4d3cc',0,.14,.2,23.8,.28,9.4);
      cube(root,'#f1efe7',0,1.92,0,22.6,3.22,7.7);
      cube(root,'#e2e0d8',0,3.64,0,23.0,.25,8.0);
      cube(root,'#faf8f1',0,4.05,1.1,11.8,.62,5.9);
      cube(root,'#fffdf6',0,4.34,3.93,22.95,.4,.5);

      // Shallow roofline balustrade across the central block and the two wings.
      cube(root,'#fffdf7',0,4.65,-.1,22.9,.16,7.9);
      for(let x=-11.1;x<=11.11;x+=.48){
        if(Math.abs(x)<5.8) continue;
        cylinder(root,'#f8f6ef',x,4.42,3.53,.055,.065,.42,8);
      }
      cube(root,'#fffdf7',-8.45,4.65,1.0,5.0,.14,5.9);
      cube(root,'#fffdf7',8.45,4.65,1.0,5.0,.14,5.9);

      // Long wings: evenly spaced green-tinted windows below white parapets.
      for(const x of [-10.0,-8.0,-6.0,-4.0,-2.0,2.0,4.0,6.0,8.0,10.0]){
        cube(root,'#34413e',x,1.52,3.91,1.52,1.72,.12);
        cube(root,'#a5b9a9',x,1.52,3.99,1.3,1.5,.055);
        cube(root,'#f4f2e9',x,1.52,4.03,.075,1.58,.06);
        cube(root,'#f4f2e9',x,1.52,4.03,1.42,.075,.06);
      }
      // Sixteen fluted columns carry the deep ceremonial portico roof.
      const columnXs=[]; for(let i=0;i<16;i++) columnXs.push(-9.15+i*1.22);
      columnXs.forEach((x)=>{
        cylinder(root,'#fffdf6',x,2.05,4.08,.21,.3,3.55,20);
        cylinder(root,'#e8e5dc',x,.31,4.08,.39,.42,.25,20);
        cylinder(root,'#fffdf8',x,3.83,4.08,.36,.38,.2,20);
        cylinder(root,'#fffdf8',x,1.0,4.08,.225,.225,2.2,20);
      });
      cube(root,'#fffdf8',0,3.98,4.08,20.4,.3,.78);
      addSign(root,'ISTANA NEGARA','#f8f6ef',0,4.3,4.52,8.6,.48,'#202925');

      // A stylized raised Garuda above the name plate.
      sphere(root,'#c5a24d',0,5.15,4.38,.25,.44,.16);
      for(const side of [-1,1]){
        for(let feather=0;feather<6;feather++){
          const wing=cube(root,'#c5a24d',side*(.42+feather*.31),5.12+feather*.08,4.39,.58,.13,.12);
          wing.rotation.z=side*(.12+feather*.07);
        }
      }
      cube(root,'#b33439',0,4.98,4.54,.35,.36,.1); cube(root,'#eee8d4',0,4.98,4.6,.22,.24,.06);

      // Alternating red and white ceremonial swags hang between the columns.
      for(let span=0;span<columnXs.length-1;span++){
        const left=columnXs[span],right=columnXs[span+1];
        for(let piece=0;piece<7;piece++){
          const t=(piece+.5)/7; const x=left+(right-left)*t; const sag=Math.sin(t*Math.PI)*.24;
          const cloth=cube(root,piece%2?'#fffdf6':'#d9343d',x,3.48-sag,4.42,(right-left)/7+.03,.22,.075);
          cloth.rotation.z=(t-.5)*.42;
        }
      }

      // Central double door and wide ceremonial steps with a red runner.
      cube(root,'#4b554a',0,1.6,4.0,2.8,2.55,.14);
      cube(root,'#60715e',-.68,1.55,4.1,1.18,2.35,.08); cube(root,'#60715e',.68,1.55,4.1,1.18,2.35,.08);
      for(let step=0;step<6;step++) cube(root,'#f5f2e9',0,.15+(5-step)*.2,5.0+step*.42,7.8-step*.24,.18,.75);
      cube(root,'#b82c38',0,.8,6.62,2.5,.06,3.1);
      addIndonesianFlag(root,0,-1.25,10.6);
      for(const x of [-9.9,-7.7,7.7,9.9]){
        sphere(root,'#3f7e4c',x,.85,5.18,.65,.7,.52);
        sphere(root,'#5b934e',x+.24,1.1,5.15,.42,.48,.4);
      }
      cube(root,'#6ca25b',0,.03,8.0,16.0,.1,1.6);
      break;
    }
    case 'bridge': {
      const length = dimensions.length || 7; const width = dimensions.width || 2.4;
      // The deck stays close to ground height so walking characters can cross it.
      cube(root,'#606967',0,.13,0,length,.22,width+.45);
      cube(root,'#aeb1a7',0,.255,0,length-.18,.045,width-.18);
      for(const x of [-length*.34,0,length*.34]){
        cube(root,'#68716e',x,.18,0,.46,.32,width+.18);
        cube(root,'#89908a',x,.08,0,.72,.12,width+.48);
      }
      for(const side of [-1,1]){
        cube(root,'#53615d',0,.62,side*(width/2+.08),length,.12,.18);
        cube(root,'#aab0a8',0,1.02,side*(width/2+.08),length,.12,.14);
        for(let x=-length/2+.25;x<length/2;x+=.72){
          cube(root,'#73807a',x,.82,side*(width/2+.08),.13,.48,.14);
          cube(root,'#c2c4bc',x,.82,side*(width/2+.08),.045,.43,.17);
        }
      }
      break;
    }
    case 'car': {
      cube(root,'#303638',0,.54,0,4.05,.32,1.92);
      cube(root,'#367c84',0,.88,0,3.88,.62,1.82);
      cube(root,'#367c84',-.12,1.36,0,2.05,.72,1.58);
      cube(root,'#a9cdd0',-.12,1.37,.81,1.25,.48,.055); cube(root,'#a9cdd0',-.12,1.37,-.81,1.25,.48,.055);
      cube(root,'#25363b',-.88,1.36,0,.07,.54,1.63); cube(root,'#25363b',.64,1.36,0,.07,.54,1.63);
      for(const x of [-1.32,1.25]) for(const z of [-.98,.98]){
        cylinder(root,'#25292b',x,.43,z,.38,.38,.2,20).rotation.x=Math.PI/2;
        cylinder(root,'#aeb1ac',x,.43,z*1.035,.19,.19,.21,16).rotation.x=Math.PI/2;
      }
      cube(root,'#222a2c',-1.96,.79,0,.09,.31,1.14);
      cube(root,'#e3d9af',-2.02,.94,-.58,.06,.19,.33); cube(root,'#e3d9af',-2.02,.94,.58,.06,.19,.33);
      cube(root,'#b9c8c4',1.98,.8,0,.06,.16,.68);
      for(const z of [-.49,.49]) cube(root,'#c94c42',2.0,.83,z,.06,.18,.24);
      cube(root,'#eee7d5',2.04,.59,0,.055,.14,.46);
      for(const side of [-1,1]) for(const x of [-.68,.9]) cube(root,'#d1c6a4',x,1.02,side*.94,.2,.065,.06);
      break;
    }
    case 'truck': {
      // Cab-over delivery lorry with a distinct cab, chassis, axles, and cargo box.
      cube(root,'#293235',.15,.55,0,7.45,.32,2.18);
      cube(root,'#bd4a40',1.55,1.75,0,3.75,2.48,2.22);
      for(let y=.63;y<2.92;y+=.42) cube(root,'#d98268',1.55,y,1.13,3.62,.035,.035);
      for(const x of [-2.55,-.2,2.55]) for(const z of [-1.13,1.13]){
        cylinder(root,'#25292b',x,.5,z,.52,.52,.24,20).rotation.x=Math.PI/2;
        cylinder(root,'#a3a6a1',x,.5,z*1.04,.24,.24,.25,16).rotation.x=Math.PI/2;
      }
      cube(root,'#c54d42',-2.63,1.38,0,1.78,2.1,2.08);
      cube(root,'#9fc4c8',-2.66,1.83,1.06,1.22,.88,.08); cube(root,'#9fc4c8',-2.66,1.83,-1.06,1.22,.88,.08);
      cube(root,'#282f32',-2.64,2.32,0,.14,.11,2.2);
      cube(root,'#313b3c',-2.92,.95,0,.13,.72,.12);
      cube(root,'#f3df9e',-3.55,1.0,-.68,.08,.24,.32); cube(root,'#f3df9e',-3.55,1.0,.68,.08,.24,.32);
      cube(root,'#ece7d8',3.47,1.2,0,.06,.2,.68);
      cube(root,'#b7c1bd',-.4,.33,0,6.5,.12,1.58);
      break;
    }
    case 'bus': {
      // Full-height Indonesian city bus with route windows, front glass, and doors.
      cube(root,'#253237',0,.55,0,8.55,.3,2.46);
      cube(root,'#e9bf50',0,1.69,0,8.35,2.35,2.36);
      cube(root,'#e5e6dd',.15,2.94,0,8.4,.18,2.4);
      for(const side of [-1,1]){
        for(const x of [-3.25,-2.02,-.79,.44,1.67,2.9]){
          cube(root,'#26373c',x,2.15,side*1.2,1.04,1.16,.08);
          cube(root,'#96c0c5',x,2.15,side*1.25,.88,.99,.04);
          cube(root,'#e9bf50',x,2.15,side*1.28,.055,1.07,.04);
        }
        cube(root,'#c7433e',1.77,1.48,side*1.22,.9,1.88,.12);
        cube(root,'#8ebbc1',1.77,1.54,side*1.3,.68,1.68,.05);
        cube(root,'#e9bf50',1.77,1.54,side*1.34,.06,1.76,.05);
      }
      cube(root,'#26373b',-4.29,2.02,0,.08,1.47,2.05);
      cube(root,'#98c3c7',-4.35,2.05,0,.05,1.2,1.78);
      cube(root,'#283237',4.27,1.78,0,.08,1.72,2.1);
      for(const x of [-2.85,0,2.85]) for(const z of [-1.25,1.25]){
        cylinder(root,'#25292b',x,.5,z,.53,.53,.23,22).rotation.x=Math.PI/2;
        cylinder(root,'#b0b4af',x,.5,z*1.04,.24,.24,.24,16).rotation.x=Math.PI/2;
      }
      cube(root,'#f4eee0',-4.34,.82,0,.055,.2,.72);
      cube(root,'#d7a947',0,1.15,1.25,3.8,.15,.055);
      break;
    }
    case 'car_economy': case 'car_family': case 'car_luxury': {
      const luxury = type === 'car_luxury'; const family = type === 'car_family';
      const paint=luxury?'#182c3b':family?'#687f61':'#d6d8d3';
      const length=luxury?5.15:family?4.65:3.72;
      const wheelX=length*.34;
      cube(root,'#262b2d',0,.52,0,length,.34,1.92);
      cube(root,paint,0,.83,0,length,.56,1.82);
      if(luxury){
        cube(root,paint,-.13,1.17,0,2.68,.48,1.58);
        cube(root,'#829398',.93,1.18,0,1.22,.47,1.58);
        cube(root,paint,1.76,.88,0,1.12,.52,1.76);
      }else if(family){
        cube(root,paint,-.08,1.46,0,2.86,1.18,1.61);
        cube(root,'#87b9c0',-.08,1.46,.83,2.45,.86,.055);
        cube(root,'#87b9c0',-.08,1.46,-.83,2.45,.86,.055);
        cube(root,paint,-.2,2.08,0,1.85,.12,1.42);
      }else{
        cube(root,paint,-.12,1.29,0,1.92,.72,1.55);
        cube(root,'#9bbfc3',-.12,1.31,.79,1.52,.5,.055);
        cube(root,'#9bbfc3',-.12,1.31,-.79,1.52,.5,.055);
      }
      for(const side of [-1,1]){
        const windowY=family?1.56:luxury?1.18:1.31;
        const windowH=family ? .8 : luxury ? .38 : .43;
        const frontWindowX=luxury?-.02:-.12;
        cube(root,'#a9cbd0',frontWindowX,windowY,side*.94,family?1.22:luxury?1.1:1.18,windowH,.055);
        cube(root,paint,luxury ? .66 : .58,windowY,side*.94,.08,windowH+.08,.07);
        cube(root,paint,family?1.56:luxury?1.72:1.1,windowY,side*.94,.08,windowH+.08,.07);
        cube(root,'#f2eee1',.25,.91,side*.93,.22,.055,.05);
      }
      for(const x of [-wheelX,wheelX]) for(const z of [-1.01,1.01]){
        cylinder(root,'#25292b',x,.43,z,luxury ? .4 : .35,luxury ? .4 : .35,.2,22).rotation.x=Math.PI/2;
        cylinder(root,'#b4b6b0',x,.43,z*1.04,.18,.18,.21,16).rotation.x=Math.PI/2;
      }
      cube(root,'#242a2b',-length*.49,.81,0,.07,.28,1.24);
      for(const z of [-.62,.62]) cube(root,luxury?'#f0e3ad':'#f4eed9',-length*.5,.95,z,.055,.2,.25);
      cube(root,'#d9d8ce',length*.5,.58,0,.055,.12,.5);
      if(family){
        cube(root,'#30383a',-1.35,2.2,0,1.5,.06,.7);
        for(const z of [-.48,.48]) cylinder(root,'#454c4d',-.8,2.26,z,.035,.04,.65,8).rotation.z=Math.PI/2;
      }
      if(luxury){
        cube(root,'#b4b6b1',-.42,1.69,0,.94,.045,1.24);
        cube(root,'#c5b991',2.15,.77,0,.08,.18,.26);
      }
      break;
    }
    case 'pickup': {
      // Compact double-cab pickup: separate bonnet, cabin, open cargo bed and tailgate.
      const green = '#477b50';
      cube(root, '#292e2e', 0, .43, 0, 4.15, .22, 1.96);
      cube(root, green, -.92, .79, 0, 1.55, .53, 1.83);
      cube(root, green, -.56, 1.06, 0, .74, .22, 1.76);
      cube(root, green, -.34, 1.4, 0, 1.88, .68, 1.72);
      cube(root, '#9fc6c9', -.34, 1.43, .875, 1.44, .47, .055); cube(root, '#9fc6c9', -.34, 1.43, -.875, 1.44, .47, .055);
      cube(root, green, -.33, 1.82, 0, 1.96, .12, 1.76);
      cube(root, '#383f3c', 1.18, .98, 0, 1.55, .12, 1.72);
      cube(root, '#55765b', 1.18, 1.14, .84, 1.48, .33, .09); cube(root, '#55765b', 1.18, 1.14, -.84, 1.48, .33, .09);
      cube(root, '#55765b', 1.9, 1.14, 0, .1, .33, 1.62);
      cube(root, '#343a39', -2.0, .83, 0, .13, .33, 1.38);
      cube(root, '#d7d4c8', -2.08, .91, 0, .055, .14, .64);
      for (const x of [-1.32, 1.32]) for (const z of [-1.0, 1.0]) {
        cylinder(root, '#262a2b', x, .43, z, .39, .39, .2, 20).rotation.x = Math.PI / 2;
        cylinder(root, '#b6b7ae', x, .43, z * 1.04, .19, .19, .21, 16).rotation.x = Math.PI / 2;
      }
      for (const z of [-.61, .61]) { cube(root, '#eee4be', -2.1, 1.0, z, .05, .19, .24); cube(root, '#bd4540', 2.08, .86, z, .05, .2, .22); }
      cube(root, '#555c58', -.31, .91, 0, .26, .1, .5);
      break;
    }
    case 'tractor': {
      // Rear-wheel-drive field tractor with glazed cab, exhaust, lights and hitch.
      cube(root, '#aa781e', .15, .6, 0, 3.55, .22, 1.38);
      cube(root, '#d69a28', -.8, .94, 0, 1.2, .62, 1.3);
      cube(root, '#dca52c', -.89, 1.28, 0, .95, .18, 1.24);
      cube(root, '#d69a28', .63, 1.45, 0, 1.72, .18, 1.38);
      for (const z of [-.69, .69]) cube(root, '#b77e20', .95, 1.25, z, 1.16, .12, .14);
      cube(root, '#3e4b47', .62, 2.05, 0, 1.42, 1.02, 1.12);
      cube(root, '#91bdc0', .62, 2.08, .575, 1.14, .78, .045); cube(root, '#91bdc0', .62, 2.08, -.575, 1.14, .78, .045);
      cube(root, '#91bdc0', 1.34, 2.08, 0, .045, .78, 1.1);
      cube(root, '#d69a28', .62, 2.62, 0, 1.58, .12, 1.26);
      cylinder(root, '#323936', -.69, 1.61, 0, .07, .09, 1.15, 10);
      cylinder(root, '#353a37', .38, 2.55, -.34, .075, .085, .82, 10);
      for (const x of [-.82, 1.02]) for (const z of [-.84, .84]) {
        const rear = x > 0; const radius = rear ? .78 : .43; const y = rear ? .72 : .48;
        cylinder(root, '#262a29', x, y, z, radius, radius, .3, 22).rotation.x = Math.PI / 2;
        cylinder(root, '#a09b88', x, y, z * 1.08, rear ? .3 : .17, rear ? .3 : .17, .31, 14).rotation.x = Math.PI / 2;
        if (rear) for (let tread = 0; tread < 12; tread++) { const angle = tread * Math.PI / 6; cube(root, '#343936', x + Math.sin(angle) * .78, y + Math.cos(angle) * .78, z, .28, .12, .34, angle); }
      }
      cube(root, '#f5df8f', -1.43, 1.03, -.48, .08, .2, .2); cube(root, '#f5df8f', -1.43, 1.03, .48, .08, .2, .2);
      cube(root, '#b94d37', 1.85, .66, 0, .45, .18, .16); cube(root, '#a93432', 2.08, .7, 0, .14, .28, .18);
      break;
    }
    case 'hand_tractor': {
      // Walk-behind tiller: engine, belt cover, steel cage wheels and operator handles.
      cube(root, '#aa3f30', -.92, .77, 0, 1.05, .55, .92);
      cube(root, '#ce5036', -.95, 1.1, 0, .58, .18, .7);
      cube(root, '#d5d1c2', -1.38, .9, 0, .18, .35, .62);
      cylinder(root, '#333936', -.52, .8, 0, .22, .24, .5, 12);
      cylinder(root, '#51483c', .02, .67, 0, .09, .1, .44, 10);
      for (const z of [-.48, .48]) {
        cylinder(root, '#2e3230', .27, .44, z, .55, .55, .12, 18).rotation.x = Math.PI / 2;
        cylinder(root, '#776d59', .27, .44, z * 1.12, .22, .22, .14, 12).rotation.x = Math.PI / 2;
        for (let spoke = 0; spoke < 8; spoke++) { const a = spoke * Math.PI / 4; cube(root, '#665a47', .27 + Math.sin(a) * .54, .44 + Math.cos(a) * .54, z, .2, .11, .16, a); }
      }
      cylinder(root, '#51483c', -1.13, 1.42, -.36, .04, .05, 1.36, 8).rotation.z = -.43;
      cylinder(root, '#51483c', -1.13, 1.42, .36, .04, .05, 1.36, 8).rotation.z = -.43;
      for (const z of [-.36, .36]) cylinder(root, '#292d2b', -1.69, 1.7, z, .055, .06, .24, 8).rotation.x = Math.PI / 2;
      cube(root, '#6b5944', .92, .36, 0, 1.0, .15, .7);
      for (let blade = 0; blade < 5; blade++) { const a = blade * Math.PI * 2 / 5; const tine = cube(root, '#6d6251', 1.22, .22, Math.sin(a) * .28, .44, .07, .08, a); tine.rotation.x = .35; }
      break;
    }
    case 'combine_harvester': {
      // Self-propelled rice combine with crawler tracks, grain tank, unloading auger and cutter header.
      cube(root, '#343a36', .25, .47, -.88, 3.25, .44, .52); cube(root, '#343a36', .25, .47, .88, 3.25, .44, .52);
      for (const z of [-.88, .88]) {
        for (let roller = -1.1; roller <= 1.51; roller += .52) cylinder(root, '#72766b', roller, .47, z * 1.06, .19, .19, .12, 14).rotation.x = Math.PI / 2;
        cube(root, '#59615a', .25, .72, z * 1.05, 3.0, .09, .1);
      }
      cube(root, '#d3a22b', .12, 1.0, 0, 3.3, .84, 1.8);
      cube(root, '#c29425', .83, 1.55, 0, 1.72, .34, 1.78);
      cube(root, '#dfb53c', .66, 1.96, 0, 1.62, .58, 1.46);
      cube(root, '#94c4c6', .66, 1.98, .755, 1.19, .4, .055); cube(root, '#94c4c6', .66, 1.98, -.755, 1.19, .4, .055);
      cube(root, '#dfb53c', .66, 2.28, 0, 1.66, .1, 1.52);
      cube(root, '#343a37', .05, 1.78, 0, .1, .72, 1.56);
      cylinder(root, '#343936', .05, 2.12, -.4, .06, .07, 2.35, 9).rotation.z = Math.PI / 2.8;
      cylinder(root, '#88836c', -.53, 2.52, -.4, .09, .11, .12, 10);
      cube(root, '#4e554f', -1.94, .71, 0, .32, .16, 2.78);
      cylinder(root, '#77796e', -1.95, .61, 0, .12, .12, 2.75, 20).rotation.x = Math.PI / 2;
      for (let z = -1.28; z <= 1.29; z += .22) {
        cylinder(root, '#979486', -1.96, .83, z, .07, .07, .56, 8).rotation.x = Math.PI / 2;
        cube(root, '#d4a52c', -1.96, .91, z, .12, .32, .09);
      }
      cube(root, '#d8ae3c', -1.94, 1.12, 0, .17, .1, 2.9);
      for (const z of [-.63, .63]) { cube(root, '#ece0b2', -1.57, 1.1, z, .08, .18, .18); cube(root, '#c64536', 1.84, .91, z, .08, .17, .18); }
      break;
    }
    case 'motorcycle': {
      for (const x of [-.78, .78]) { cylinder(root, '#252b2c', x, .31, 0, .3, .3, .17, 16).rotation.x = Math.PI / 2; cylinder(root, '#a9aaa2', x, .31, .1, .12, .12, .18, 12).rotation.x = Math.PI / 2; }
      cube(root, '#333b3c', 0, .56, 0, .88, .16, .25); cube(root, '#d04b3f', -.08, .76, 0, .76, .34, .37);
      cylinder(root, '#464e4d', .13, .55, 0, .2, .23, .4, 12);
      cube(root, '#292e2e', .4, .86, 0, .66, .14, .36); cube(root, '#b54235', .79, .79, 0, .28, .24, .41);
      cylinder(root, '#464d4b', -.24, 1.04, 0, .16, .17, .46, 12);
      cube(root, '#353c3b', -.38, 1.17, 0, .78, .1, .42);
      for (const z of [-.2, .2]) cube(root, '#303635', -.79, .95, z, .16, .26, .09);
      cylinder(root, '#515a58', -.53, 1.31, 0, .045, .05, .72, 8).rotation.z = Math.PI / 3.5;
      cylinder(root, '#3d4543', -.86, 1.3, 0, .04, .045, .62, 8).rotation.x = Math.PI / 2;
      sphere(root, '#f3d277', -.95, 1.02, 0, .13, .12, .13); cube(root, '#bf3935', .99, .88, 0, .11, .19, .3);
      cylinder(root, '#757a73', .52, .38, .27, .065, .075, .54, 8).rotation.z = Math.PI / 2.8;
      break;
    }
    case 'forest_lush': {
      // A small tropical forest clearing inspired by the lush map illustration:
      // broadleaf crowns, palms, bamboo, ground cover and weathered stones.
      const island=new THREE.Mesh(new THREE.CylinderGeometry(5.25,5.65,.34,16),mat('#806442'));
      island.position.y=.02; island.receiveShadow=true; root.add(island);
      cylinder(root,'#567c48',0,.22,0,5.17,5.35,.12,16);
      for(const [x,z,sx,sy,sz,color] of [[-4.15,-1.7,.75,.45,.65,'#68724f'],[3.7,2.65,.85,.52,.7,'#797457'],[-1.7,3.6,.56,.3,.42,'#8a805f'],[2.0,-3.65,.72,.38,.54,'#6d6b58']]){
        const rock=sphere(root,color,x,.35,z,sx,sy,sz); rock.rotation.z=x*.04;
      }
      const forestTrees=[[-2.5,-.4,5.0,1.9],[-.1,1.05,6.2,2.2],[2.35,-.35,5.1,1.85],[-.55,-3.05,4.55,1.55]];
      const forestCanopy=new THREE.InstancedMesh(new THREE.SphereGeometry(1,16,10),mat('#ffffff'),forestTrees.length*4);
      const canopyTransform=new THREE.Object3D(); let canopyIndex=0;
      for(const [x,z,height,radius] of forestTrees){
        cylinder(root,'#76513a',x,.24+height/2,z,.22,.38,height,10);
        for(const side of [-1,1]){
          const branch=cylinder(root,'#76513a',x+side*.62,height*.56,z,.09,.17,1.65,8); branch.rotation.z=side*.64;
          const upper=cylinder(root,'#805a3d',x+side*.72,height*.7,z,.06,.1,1.1,8); upper.rotation.z=side*-.43;
        }
        for(const [dx,dy,dz,sx,sy,sz,color] of [[0,height-.1,0,radius,radius*.56,radius*.83,'#3e7440'],[-radius*.53,height-.08,.05,radius*.63,radius*.43,radius*.58,'#376c3f'],[radius*.52,height-.14,-.08,radius*.62,radius*.42,radius*.58,'#4c8245'],[.08,height+.72,.04,radius*.56,radius*.42,radius*.55,'#6f994e']]){
          canopyTransform.position.set(x+dx,dy,z+dz); canopyTransform.scale.set(sx,sy,sz); canopyTransform.updateMatrix(); forestCanopy.setMatrixAt(canopyIndex,canopyTransform.matrix); forestCanopy.setColorAt(canopyIndex,new THREE.Color(color)); canopyIndex++;
        }
      }
      forestCanopy.count=canopyIndex; forestCanopy.instanceMatrix.needsUpdate=true; forestCanopy.instanceColor.needsUpdate=true; forestCanopy.castShadow=true; forestCanopy.receiveShadow=true; root.add(forestCanopy);
      // Two leaning coconut palms break up the broadleaf canopy silhouette.
      const palmFronds=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),mat('#ffffff'),16); let palmFrondIndex=0;
      for(const [x,z,height,lean] of [[-4.05,1.3,4.6,-.35],[4.05,-1.25,4.9,.28]]){
        const trunk=cylinder(root,'#8b6543',x,height/2+.2,z,.12,.24,height,10); trunk.rotation.z=lean;
        for(let frond=0;frond<8;frond++){
          const angle=frond*Math.PI/4; canopyTransform.position.set(x+Math.cos(angle)*.9,height+.18,z+Math.sin(angle)*.9); canopyTransform.scale.set(.18,.1,1.22); canopyTransform.rotation.set(Math.sin(angle)*.5,angle,Math.cos(angle)*.72); canopyTransform.updateMatrix(); palmFronds.setMatrixAt(palmFrondIndex,canopyTransform.matrix); palmFronds.setColorAt(palmFrondIndex,new THREE.Color(frond%3?'#3e7041':'#5d8d46')); palmFrondIndex++;
        }
        for(let nut=0;nut<3;nut++) sphere(root,'#795339',x+Math.cos(nut*2.1)*.22,height-.18,z+Math.sin(nut*2.1)*.22,.14,.17,.14);
      }
      palmFronds.count=palmFrondIndex; palmFronds.instanceMatrix.needsUpdate=true; palmFronds.instanceColor.needsUpdate=true; palmFronds.castShadow=true; root.add(palmFronds);
      // Bamboo culms and dense understory plants fill the open ground between trunks.
      for(const [x,z,height] of [[-4.1,-2.75,3.2],[-3.65,-3.25,2.6],[-4.4,-3.35,2.85]]){
        const culm=cylinder(root,'#547544',x,height/2+.18,z,.07,.1,height,9);
        for(let node=1;node<5;node++) cylinder(root,'#91a866',x,height*node/5,z,.105,.1,.055,8);
        culm.rotation.z=(x+4)*.08;
        for(const side of [-1,1]){ const twig=cylinder(root,'#608348',x+side*.28,height*.7,z,.025,.05,.75,7); twig.rotation.z=side*-.45; }
      }
      const understoryBushes=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),mat('#ffffff'),16);
      const understoryLeaves=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.025,.72,7),mat('#ffffff'),48);
      let bushIndex=0; let understoryLeafIndex=0;
      for(let plant=0;plant<16;plant++){
        const angle=plant*2.399; const radius=2.4+(plant%4)*.46; const x=Math.cos(angle)*radius; const z=Math.sin(angle)*radius;
        canopyTransform.position.set(x,.39,z); canopyTransform.scale.set(.42,.26,.34); canopyTransform.rotation.set(0,0,0); canopyTransform.updateMatrix(); understoryBushes.setMatrixAt(bushIndex,canopyTransform.matrix); understoryBushes.setColorAt(bushIndex,new THREE.Color(plant%3?'#4c8048':'#77964d')); bushIndex++;
        for(let leafIndex=0;leafIndex<3;leafIndex++){
          canopyTransform.position.set(x+(leafIndex-1)*.13,.68,z); canopyTransform.rotation.set(0,0,(leafIndex-1)*.38); canopyTransform.scale.set(1,1,1); canopyTransform.updateMatrix(); understoryLeaves.setMatrixAt(understoryLeafIndex,canopyTransform.matrix); understoryLeaves.setColorAt(understoryLeafIndex,new THREE.Color(leafIndex%2?'#71954a':'#598341')); understoryLeafIndex++;
        }
      }
      understoryBushes.instanceMatrix.needsUpdate=true; understoryBushes.instanceColor.needsUpdate=true; understoryBushes.castShadow=true; root.add(understoryBushes);
      understoryLeaves.instanceMatrix.needsUpdate=true; understoryLeaves.instanceColor.needsUpdate=true; understoryLeaves.castShadow=true; root.add(understoryLeaves);
      break;
    }
    case 'forest_burned': {
      // Burn scar diorama: blackened soil, snapped trunks, fallen timber,
      // ember pockets, a few living edge trees and drifting smoke.
      const burnedGround=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.55,.38,16),mat('#71543a'));
      burnedGround.position.y=.03; burnedGround.receiveShadow=true; root.add(burnedGround);
      const ashPatch=cube(root,'#38342d',0,.23,0,7.8,.13,6.2); ashPatch.rotation.y=-.18;
      for(const [x,z,sx,sz,color] of [[-3.2,-1.5,1.15,.72,'#54453a'],[1.5,-2.0,1.5,.82,'#493b32'],[2.7,1.1,1.25,.78,'#5a4936'],[-1.4,2.2,1.5,.76,'#4b3b31']]){
        const scorched=cube(root,color,x,.31,z,sx,.06,sz); scorched.rotation.y=x*.13;
      }
      const charred='#302d2b';
      const standingTrunks=[[-3.65,-1.15,3.8],[-1.55,-2.6,2.3],[.35,-1.2,4.7],[2.55,-1.65,3.5],[3.15,1.35,2.7],[-2.35,2.05,3.25],[.15,2.6,2.0]];
      for(const [x,z,height] of standingTrunks){
        cylinder(root,charred,x,.22+height/2,z,.16,.34,height,8);
        for(const side of [-1,1]){
          const branchHeight=height*(.57+(side>0?.12:-.08));
          const branch=cylinder(root,charred,x+side*.45,branchHeight,z,.045,.14,.95,7); branch.rotation.z=side*(.65+(x%2)*.05);
        }
        sphere(root,'#4d4035',x,.28,z,.45,.22,.42);
      }
      // Sawed stumps and two fallen trunks with broken branch tips.
      for(const [x,z,height,radius] of [[-4.05,1.75,.9,.3],[-2.9,-3.05,1.15,.34],[1.25,3.05,.72,.28],[4.0,-.15,.86,.31],[-.55,.2,1.35,.38]]){
        cylinder(root,'#302d2b',x,.2+height/2,z,radius*.75,radius,height,9);
        cylinder(root,'#8b6e4e',x,.22+height,z,radius*.68,radius*.75,.045,9);
        for(let ring=0;ring<2;ring++) cylinder(root,'#65543f',x,.25+height+ring*.025,z,radius*(.42+ring*.14),radius*(.42+ring*.14),.012,9);
      }
      for(const [x,z,length,angle] of [[-1.9,.15,4.1,-.42],[2.4,2.15,3.0,.66],[-3.4,-2.35,2.7,.3]]){
        const log=cylinder(root,'#3b302a',x,.36,z,.2,.32,length,9); log.rotation.z=angle;
        for(const side of [-1,1]){ const twig=cylinder(root,'#332c29',x+side*.7,.46,z+side*.2,.055,.11,.9,7); twig.rotation.z=angle+side*.72; }
      }
      // Small exposed flame clusters and several semi-transparent smoke puffs.
      const fireOuter=new THREE.MeshStandardMaterial({color:'#ef6924',emissive:'#b9340a',emissiveIntensity:1.4,roughness:.5});
      const fireInner=new THREE.MeshStandardMaterial({color:'#ffd25d',emissive:'#df690b',emissiveIntensity:1.8,roughness:.45});
      for(const [x,z,size] of [[.85,.7,1.0],[2.0,.2,.72],[-.55,1.4,.62]]){
        const flame=new THREE.Mesh(new THREE.ConeGeometry(.34*size,1.25*size,7),fireOuter); flame.position.set(x,.46+.62*size,z); flame.castShadow=true; root.add(flame);
        const core=new THREE.Mesh(new THREE.ConeGeometry(.16*size,.72*size,7),fireInner); core.position.set(x-.04,.4+.36*size,z+.03); root.add(core);
      }
      for(const [x,y,z,size] of [[.8,2.0,.7,.62],[1.0,2.65,.72,.78],[1.5,3.3,.8,.9],[2.1,2.35,-.2,.54]]){
        const smoke=sphere(root,'#66645b',x,y,z,size,size*.8,size*.86); smoke.material.transparent=true; smoke.material.opacity=.28; smoke.material.depthWrite=false;
      }
      for(const [x,z] of [[-4.15,-2.7],[-4.3,2.9],[4.25,2.65],[4.2,-2.8]]){
        cylinder(root,'#76513a',x,1.24,z,.13,.19,2.45,9);
        for(const [dx,dy,dz,color] of [[0,2.45,0,'#52794a'],[-.48,2.3,.04,'#648d4c'],[.46,2.24,-.06,'#779553']]) sphere(root,color,x+dx,dy,z+dz,.68,.64,.7);
      }
      for(let ember=0;ember<14;ember++){
        const a=ember*2.4; const x=Math.cos(a)*(1.2+(ember%4)*.45); const z=Math.sin(a)*(1.0+(ember%3)*.5);
        sphere(root,ember%2?'#f18a32':'#d95321',x,.32,z,.11,.045,.09);
      }
      break;
    }
    case 'tree_canopy': {
      // Single mature tropical shade tree with a gnarled trunk, spreading limbs,
      // buttress roots and a broad layered canopy like the source illustration.
      cylinder(root,'#795139',0,.22,0,1.6,1.86,.34,14);
      const trunkLower=cylinder(root,'#77503a',-.12,1.67,0,.43,.85,3.0,11); trunkLower.rotation.z=.08;
      const trunkUpper=cylinder(root,'#80563c',.25,3.45,0,.2,.43,3.0,10); trunkUpper.rotation.z=-.13;
      for(const side of [-1,1]) for(const spread of [-1,1]){
        const rootLimb=cylinder(root,'#77513a',side*.72,.4,spread*.24,.08,.46,2.1,9); rootLimb.rotation.z=side*.96;
        const branch=cylinder(root,'#81583d',side*1.12,3.2,spread*.08,.09,.25,3.05,9); branch.rotation.z=side*-.72;
        const branchTip=cylinder(root,'#8a5e40',side*2.1,4.15,spread*.12,.045,.12,1.95,8); branchTip.rotation.z=side*-.58;
      }
      for(const [x,z,angle] of [[-1.3,.45,-.85],[1.45,.28,.75],[-.82,-.65,-.58],[.85,-.76,.56]]){
        const rootflare=cylinder(root,'#80583e',x*.62,.25,z*.5,.07,.32,2.0,8); rootflare.rotation.z=angle;
      }
      const crown=[
        [-2.05,4.55,-.15,1.4,1.0,1.35,'#376c3f'],[-1.15,5.15,.1,1.65,1.12,1.48,'#477d43'],[.15,5.48,-.08,1.75,1.18,1.52,'#4c8245'],
        [1.62,4.95,.12,1.55,1.06,1.42,'#3e7440'],[2.55,4.36,-.05,1.25,.9,1.2,'#477e43'],[-2.15,3.95,.18,1.34,.94,1.24,'#416f3c'],
        [-.72,4.35,.72,1.52,1.02,1.3,'#548946'],[.95,4.4,-.72,1.58,1.05,1.34,'#578b48'],[-.22,5.92,-.42,1.3,.82,1.22,'#64954a'],
        [2.08,4.82,.74,1.08,.78,1.12,'#6b984c'],[-1.72,4.68,-.78,1.1,.78,1.15,'#6a994a'],[.18,4.75,1.05,1.15,.82,.98,'#719e4c'],
      ];
      const shadeCanopy=new THREE.InstancedMesh(new THREE.SphereGeometry(1,18,12),mat('#ffffff'),crown.length+6);
      const shadeTransform=new THREE.Object3D();
      let leafIndex=0;
      for(const [x,y,z,sx,sy,sz,color] of crown){
        shadeTransform.position.set(x,y,z); shadeTransform.scale.set(sx,sy,sz); shadeTransform.rotation.set(0,0,x*.035); shadeTransform.updateMatrix(); shadeCanopy.setMatrixAt(leafIndex,shadeTransform.matrix); shadeCanopy.setColorAt(leafIndex,new THREE.Color(color)); leafIndex++;
      }
      // Lighter leaf pads on top catch sunlight and make the crown read as foliage.
      for(const [x,y,z] of [[-1.7,5.45,.55],[-.55,6.08,-.05],[.85,5.8,.32],[1.88,5.25,-.3],[-.95,4.95,-1.02],[.38,5.2,1.2]]){ shadeTransform.position.set(x,y,z); shadeTransform.scale.set(.58,.31,.54); shadeTransform.rotation.set(0,0,0); shadeTransform.updateMatrix(); shadeCanopy.setMatrixAt(leafIndex,shadeTransform.matrix); shadeCanopy.setColorAt(leafIndex,new THREE.Color('#82a94e')); leafIndex++; }
      shadeCanopy.instanceMatrix.needsUpdate=true; shadeCanopy.instanceColor.needsUpdate=true; shadeCanopy.castShadow=true; shadeCanopy.receiveShadow=true; root.add(shadeCanopy);
      break;
    }
    case 'tree': case 'forest': {
      const forest=type==='forest';
      if(forest){
        cylinder(root,'#72543c',0,1.55,0,.2,.3,3.1,10);
        for(const [y,radius,height] of [[2.55,1.55,2.0],[3.55,1.22,1.8],[4.42,.86,1.6]]){
          const tier=new THREE.Mesh(new THREE.ConeGeometry(radius,height,9),mat(y<3?'#315b3c':y<4?'#3b7046':'#4c8050'));
          tier.position.set(0,y,0); tier.castShadow=true; root.add(tier);
        }
        for(const y of [1.5,2.0,2.5]) for(const side of [-1,1]){
          const branch=cylinder(root,'#74563d',side*.42,y,0,.07,.12,.9,8); branch.rotation.z=side*-.72;
        }
      }else{
        cylinder(root,'#75533b',0,1.35,0,.24,.34,2.7,12);
        for(const side of [-1,1]) for(const z of [-.2,.25]){
          const branch=cylinder(root,'#80583c',side*.48,2.05,z,.075,.12,1.35,8); branch.rotation.z=side*-.72;
        }
        sphere(root,'#4c7e48',0,3.12,0,1.62,1.22,1.55);
        sphere(root,'#5e914f',-.93,2.96,.22,.98,.86,1.08);
        sphere(root,'#6b9b53',.94,3.03,-.14,1.0,.92,1.05);
        sphere(root,'#77a85b',.08,3.78,-.04,1.08,.8,1.0);
        for(const [x,y,z,color] of [[-.84,3.08,.95,'#d94f3f'],[.66,3.38,.78,'#e0b640'],[1.18,2.78,.2,'#cf4739'],[-.25,3.82,-.65,'#d9b345'],[-1.12,2.8,-.28,'#d74c3f']]) sphere(root,color,x,y,z,.12,.13,.12);
      }
      break;
    }
    case 'rice_field': case 'crop_field': {
      const rice = type === 'rice_field';
      const plotWidth = dimensions.width || 8; const plotLength = dimensions.length || 10;
      cube(root,rice?'#71583c':'#826342',0,-.02,0,plotLength,.18,plotWidth);
      cube(root,rice?'#83b9b8':'#795b39',0,.09,0,plotLength-.4,.035,plotWidth-.4);
      for(const side of [-1,1]){
        cube(root,rice?'#9aa965':'#92744b',0,.16,side*(plotWidth/2-.15),plotLength,.24,.34);
        cube(root,rice?'#b8ad7a':'#ab9060',side*(plotLength/2-.15),.16,0,.34,.24,plotWidth);
      }
      // Narrow irrigation channel and a simple timber sluice at the head of the plot.
      cube(root,'#557d78',0,.035,plotWidth/2+.45,plotLength,.12,.58);
      cube(root,'#a99b73',0,.14,plotWidth/2+.75,plotLength,.24,.12);
      cube(root,'#6e5840',-plotLength/2+.25,.38,plotWidth/2+.45,.18,.78,.68);
      for(let gate=0;gate<4;gate++) cube(root,'#bba77b',-plotLength/2+.25,.15+gate*.16,plotWidth/2+.45,.21,.045,.72);
      if (rice) {
        // Flooded paddy rows with individual rice clumps and drooping grain heads.
        const clumps=[];
        for(let z=-plotWidth/2+.68;z<plotWidth/2-.62;z+=.82){
          cube(root,'#617d6b',0,.12,z,plotLength-.8,.045,.055);
          for(let x=-plotLength/2+.72;x<plotLength/2-.5;x+=.72){
            const seed=Math.abs(Math.sin(x*19.17+z*43.71));
            const height=.58+seed*.22;
            clumps.push({x,z,height});
          }
        }
        const stemInstances=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.055,1,7),mat('#587d43'),clumps.length);
        const leafInstances=new THREE.InstancedMesh(new THREE.ConeGeometry(.055,.68,5),mat('#69974a'),clumps.length*2);
        const grainInstances=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),mat('#d9c777'),clumps.length*3);
        const instanceTransform=new THREE.Object3D(); let leafIndex=0,grainIndex=0;
        clumps.forEach(({x,z,height},plantIndex)=>{
          instanceTransform.position.set(x,.2+height*.45,z); instanceTransform.rotation.set(0,0,0); instanceTransform.scale.set(1,height*.9,1); instanceTransform.updateMatrix(); stemInstances.setMatrixAt(plantIndex,instanceTransform.matrix);
          for(const side of [-1,1]){
            instanceTransform.position.set(x+side*.11,.2+height*.48,z); instanceTransform.rotation.set(0,0,side*.37); instanceTransform.scale.set(1,height,1); instanceTransform.updateMatrix(); leafInstances.setMatrixAt(leafIndex++,instanceTransform.matrix);
          }
          for(let grain=0;grain<3;grain++){
            instanceTransform.position.set(x+.12,.25+height+grain*.07,z-.04+grain*.045); instanceTransform.rotation.set(0,0,-.3); instanceTransform.scale.set(.055,.11,.055); instanceTransform.updateMatrix(); grainInstances.setMatrixAt(grainIndex++,instanceTransform.matrix);
          }
        });
        stemInstances.instanceMatrix.needsUpdate=true; leafInstances.instanceMatrix.needsUpdate=true; grainInstances.instanceMatrix.needsUpdate=true;
        root.add(stemInstances,leafInstances,grainInstances);
      } else {
        // Dry furrows carry maize stalks, broad leaves, and visible ears.
        const plants=[];
        for(let z=-plotWidth/2+.76;z<plotWidth/2-.52;z+=1.06){
          cube(root,'#523f2d',0,.12,z,plotLength-.7,.05,.22);
          for(let x=-plotLength/2+.8;x<plotLength/2-.5;x+=1.12){
            const height=.94+Math.abs(Math.sin(x*13+z*29))*.42;
            plants.push({x,z,height});
          }
        }
        const stalkInstances=new THREE.InstancedMesh(new THREE.CylinderGeometry(.065,.105,1,8),mat('#56803f'),plants.length);
        const leafInstances=new THREE.InstancedMesh(new THREE.ConeGeometry(.085,.72,5),mat('#659142'),plants.length*4);
        const earInstances=new THREE.InstancedMesh(new THREE.CylinderGeometry(.04,.09,.46,8),mat('#c9aa4b'),plants.length);
        const kernelInstances=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),mat('#e0c361'),plants.length*4);
        const instanceTransform=new THREE.Object3D(); let leafIndex=0,kernelIndex=0;
        plants.forEach(({x,z,height},plantIndex)=>{
          instanceTransform.position.set(x,.2+height/2,z); instanceTransform.rotation.set(0,0,0); instanceTransform.scale.set(1,height,1); instanceTransform.updateMatrix(); stalkInstances.setMatrixAt(plantIndex,instanceTransform.matrix);
          for(const side of [-1,1]) for(const level of [0,1]){
            instanceTransform.position.set(x+side*(.2+level*.1),.42+level*.31,z+side*.07); instanceTransform.rotation.set(side*.22,0,side*(.64-level*.13)); instanceTransform.scale.set(1,1,1); instanceTransform.updateMatrix(); leafInstances.setMatrixAt(leafIndex++,instanceTransform.matrix);
          }
          instanceTransform.position.set(x+.1,height*.79,z); instanceTransform.rotation.set(0,0,.12); instanceTransform.scale.set(1,1,1); instanceTransform.updateMatrix(); earInstances.setMatrixAt(plantIndex,instanceTransform.matrix);
          for(let kernel=0;kernel<4;kernel++){
            instanceTransform.position.set(x+.2,height-.02+kernel*.1,z+.06); instanceTransform.rotation.set(0,0,0); instanceTransform.scale.set(.045,.06,.045); instanceTransform.updateMatrix(); kernelInstances.setMatrixAt(kernelIndex++,instanceTransform.matrix);
          }
        });
        stalkInstances.instanceMatrix.needsUpdate=true; leafInstances.instanceMatrix.needsUpdate=true; earInstances.instanceMatrix.needsUpdate=true; kernelInstances.instanceMatrix.needsUpdate=true;
        root.add(stalkInstances,leafInstances,earInstances,kernelInstances);
      }
      break;
    }
    case 'chicken': case 'duck': {
      const duck = type === 'duck'; const feathers = duck ? '#c9a66d' : '#f1e4ca';
      sphere(root, feathers, 0, .48, 0, duck ? .49 : .43, duck ? .35 : .34, duck ? .62 : .55);
      sphere(root, feathers, -.02, .91, .34, .27, .27, .28);
      sphere(root, duck ? '#b55342' : '#d84f42', -.02, 1.14, .35, .13, .15, .13);
      add(new THREE.ConeGeometry(.13, .23, 8), mat(duck ? '#e6a63d' : '#e6a63d'), root, -.02, .86, .61, 1, 1, 1, Math.PI / 2);
      for (const side of [-1, 1]) {
        sphere(root, feathers, side * .33, .52, -.03, .17, .21, .36);
        sphere(root, '#fffdf0', side * .115, .95, .56, .07, .08, .04);
        sphere(root, '#25292a', side * .115, .95, .594, .035, .045, .025);
      }
      for (const x of [-.2, .16]) {
        cylinder(root, duck ? '#e99d34' : '#b87b3e', x, .19, .08, .035, .04, .29, 8);
        if (duck) cube(root, '#e99d34', x, .055, .2, .25, .045, .19);
      }
      for (const side of [-1, 1]) { const tail = add(new THREE.ConeGeometry(.12, .38, 7), mat(feathers), root, side * .2, .66, -.48); tail.rotation.x = -.8; }
      if(duck){
        cube(root,'#d9a85a',-.02,.86,.75,.3,.11,.32);
        sphere(root,'#e0bd72',-.02,.35,.1,.27,.13,.44);
      }else{
        for(const x of [-.12,0,.12]) sphere(root,'#c84236',x,1.19,.32,.075,.12,.065);
        sphere(root,'#c84236',-.02,.69,.63,.07,.13,.055);
        for(const side of [-1,1]) sphere(root,'#d9b37f',side*.07,.25,-.47,.08,.12,.1);
      }
      break;
    }
    case 'goat': {
      const coat = '#d7c8a9';
      sphere(root, coat, 0, .7, -.03, .45, .38, .75);
      sphere(root, coat, 0, .94, .53, .31, .32, .34);
      sphere(root, '#b6a185', 0, .78, .82, .22, .17, .2);
      for (const x of [-.27, .27]) for (const z of [-.48, .42]) {
        cylinder(root, coat, x, .43, z, .07, .1, .56, 9);
        cylinder(root, '#51473a', x, .12, z, .085, .09, .16, 8);
      }
      for (const x of [-.2, .2]) {
        const horn = add(new THREE.ConeGeometry(.08, .52, 9), mat('#7c725f'), root, x, 1.34, .52); horn.rotation.z = x * .8;
        const ear = add(new THREE.ConeGeometry(.08, .38, 7), mat('#b99581'), root, x * 1.8, 1.13, .45); ear.rotation.z = x * -1.5; ear.rotation.x = Math.PI / 2;
        sphere(root, '#1d2422', x * .75, .98, .82, .035, .045, .03);
      }
      sphere(root,'#80684e',0,.49,.78,.105,.26,.12);
      sphere(root,'#f0e7d2',-.28,.82,-.36,.13,.11,.16);
      sphere(root,'#f0e7d2',.28,.79,-.12,.12,.1,.14);
      cylinder(root, '#a49174', 0, .57, .77, .08, .1, .24, 8);
      const tail = add(new THREE.ConeGeometry(.055, .32, 7), mat(coat), root, 0, .87, -.76); tail.rotation.x = -.55;
      break;
    }
    case 'cow': case 'buffalo': {
      const buffalo = type === 'buffalo'; const coat = buffalo ? '#454944' : '#eee9dc';
      sphere(root, coat, 0, .92, -.02, buffalo ? .72 : .68, .56, 1.02);
      sphere(root, buffalo ? '#555a51' : '#f5f1e8', 0, 1.08, .83, .4, .43, .4);
      sphere(root, buffalo ? '#282d29' : '#da9c96', 0, .84, 1.14, .3, .19, .17);
      for (const x of [-.4, .4]) for (const z of [-.66, .66]) {
        cylinder(root, coat, x, .48, z, .095, .12, .83, 10);
        cylinder(root, '#403d35', x, .105, z, .11, .12, .17, 8);
      }
      if (!buffalo) {
        sphere(root, '#30302d', -.39, 1.08, -.08, .25, .21, .34);
        sphere(root, '#30302d', .36, 1.0, .32, .2, .24, .28);
        sphere(root, '#c99287', 0, .36, -.38, .3, .24, .3);
        for (const x of [-.3, .3]) { const horn = add(new THREE.ConeGeometry(.09, .42, 8), mat('#cbbd9e'), root, x, 1.49, .83); horn.rotation.z = x * -.65; }
        for(const side of [-1,1]){
          sphere(root,'#353633',side*.48,.9,-.35,.2,.24,.32);
          sphere(root,'#eee9dc',side*.48,.96,.24,.2,.19,.23);
        }
        sphere(root,'#d59791',0,.3,-.48,.28,.22,.28);
        const tail=cylinder(root,'#eee9dc',.05,.77,-.92,.04,.055,.7,8); tail.rotation.x=-.8;
        sphere(root,'#3b3832',.05,.48,-1.17,.11,.16,.12);
      } else {
        for(const side of [-1,1]){
          const hornBase=cylinder(root,'#c5b99d',side*.33,1.38,.86,.11,.16,.42,12); hornBase.rotation.z=side*-.55;
          const hornTip=cylinder(root,'#b3a58b',side*.63,1.5,.9,.025,.11,.38,12); hornTip.rotation.z=side*.86;
          sphere(root,'#383d37',side*.46,1.06,-.42,.25,.31,.38);
        }
        sphere(root,'#55594f',0,1.3,-.67,.48,.52,.5);
        sphere(root,'#655f51',0,.62,-.42,.38,.28,.35);
        const tail=cylinder(root,'#454943',0,.85,-1.02,.04,.06,.55,8); tail.rotation.x=-.8;
      }
      for (const x of [-.17, .17]) { sphere(root, '#fffdf1', x, 1.14, 1.06, .075, .08, .04); sphere(root, '#171b19', x, 1.14, 1.1, .035, .045, .025); }
      break;
    }
    case 'cat': case 'dog': {
      const dog = type === 'dog'; const coat = dog ? '#a8744e' : '#c58248';
      sphere(root, coat, 0, .48, -.02, dog ? .42 : .33, dog ? .29 : .24, dog ? .68 : .59);
      sphere(root, coat, 0, .7, .47, dog ? .31 : .26, dog ? .32 : .26, .31);
      sphere(root, dog ? '#76503e' : '#e1bd9a', 0, .55, .72, dog ? .22 : .17, .14, .23);
      for (const x of [-.21, .21]) {
        cylinder(root, coat, x, .24, -.38, .065, .085, .42, 9);
        cylinder(root, coat, x, .23, .39, .065, .085, .4, 9);
        sphere(root, '#fffdf1', x * .52, .75, .72, .055, .06, .03); sphere(root, '#1c211f', x * .52, .75, .75, .026, .032, .02);
      }
      if (dog) {
        const leftEar = sphere(root, '#76513d', -.24, .69, .43, .12, .22, .13); leftEar.rotation.z = -.45;
        const rightEar = sphere(root, '#76513d', .24, .69, .43, .12, .22, .13); rightEar.rotation.z = .45;
        const tail = cylinder(root, coat, 0, .88, -.69, .045, .07, .48, 8); tail.rotation.x = -.7;
        cube(root,'#4b5946',0,.62,.26,.5,.1,.1);
        sphere(root,'#e7d8b8',-.17,.53,-.25,.19,.17,.22);
      } else {
        for (const x of [-.14, .14]) { const ear = add(new THREE.ConeGeometry(.12, .34, 6), mat(coat), root, x, .97, .56); ear.rotation.z = x * 1.5; }
        const tail = cylinder(root, coat, .05, .55, -.65, .06, .085, .68, 9); tail.rotation.x = -.9;
        cube(root,'#dbad4e',0,.57,.28,.42,.1,.1);
        sphere(root,'#e8c957',-.12,.49,-.18,.12,.1,.15);
      }
      for (const side of [-1, 1]) { cube(root, '#eee7db', side * .29, .53, .78, .2, .018, .018); cube(root, '#eee7db', side * .29, .59, .77, .2, .018, .018); }
      break;
    }
    case 'lamp': {
      cylinder(root,'#394b48',0,.18,0,.24,.28,.36,12);
      cylinder(root,'#53615d',0,2.35,0,.075,.12,4.25,12);
      const lampArm=cylinder(root,'#53615d',.43,4.33,0,.055,.065,.92,10); lampArm.rotation.z=Math.PI/2;
      cube(root,'#3b4845',.86,4.24,0,.78,.2,.34);
      cube(root,'#e6e0bc',.86,4.12,0,.61,.045,.24);
      sphere(root,'#f5e6a1',.86,4.09,0,.25,.07,.17);
      break;
    }
    default: return null;
  }
  root.userData.assetType = type;
  root.traverse((child) => { if (child.isMesh) child.userData.assetType = type; });
  return root;
}

export const WORLD_ASSET_LIBRARY = [
  ['road', 'Jalan'], ['house', 'Rumah sederhana'], ['house_village', 'Rumah warga · referensi'], ['house_mid', 'Rumah menengah'], ['house_luxury', 'Rumah mewah'],
  ['school', 'Sekolah rusak'], ['school_ruined', 'Sekolah rusak · referensi'], ['school_good', 'Sekolah bagus'], ['mbg', 'Dapur MBG'], ['sppg', 'Gedung SPPG · BGN'],
  ['kopdes', 'Kopdes Merah Putih'], ['market', 'Pasar'], ['hall', 'Balai warga'], ['office', 'Kantor pemerintahan'], ['dpr_mpr', 'Gedung DPR · MPR · DPD'], ['istana_negara', 'Istana Negara'],
  ['river', 'Sungai mengalir'], ['bridge', 'Jembatan'], ['rice_field', 'Petak sawah'], ['crop_field', 'Ladang tanaman'],
  ['car', 'Mobil warga'], ['car_economy', 'Mobil ekonomis'], ['car_family', 'Mobil keluarga'], ['car_luxury', 'Mobil mewah'], ['pickup', 'Mobil pikap'], ['truck', 'Truk'], ['bus', 'Bus'], ['motorcycle', 'Sepeda motor'],
  ['tractor', 'Traktor sawah'], ['hand_tractor', 'Traktor tangan'], ['combine_harvester', 'Mesin panen padi'],
  ['tree', 'Pohon'], ['tree_canopy', 'Pohon rindang · tajuk lebar'], ['forest', 'Pohon hutan'], ['forest_lush', 'Hutan lestari · tropis'], ['forest_burned', 'Hutan terbakar'],
  ['chicken', 'Ayam'], ['duck', 'Bebek'], ['goat', 'Kambing'], ['cow', 'Sapi'], ['buffalo', 'Kerbau'], ['cat', 'Kucing'], ['dog', 'Anjing kampung'], ['lamp', 'Lampu jalan'],
];

// Starter set for each editable region. These are the actual objects rendered
// in free play until an admin saves a custom scene.
export const DEFAULT_WORLD_SCENES = {
  kota: [
    {id:'kota-road-center',type:'road',x:3,z:0,rotation:0,length:40,width:4,scale:1},
    {id:'kota-road-north',type:'road',x:-12,z:0,rotation:90,length:34,width:3.2,scale:1},
    {id:'kota-road-south',type:'road',x:8,z:13,rotation:90,length:22,width:3,scale:1},
    {id:'kota-river',type:'river',x:17,z:0,rotation:90,length:42,width:4.2,scale:1},
    {id:'kota-bridge',type:'bridge',x:17,z:0,rotation:0,length:9,width:4.3,scale:1},
    {id:'kota-home-01',type:'house_village',x:-22,z:-9,rotation:0,length:9,width:3,scale:.9},
    {id:'kota-home-02',type:'house_mid',x:-5,z:-10,rotation:180,length:9,width:3,scale:.9},
    {id:'kota-home-03',type:'house_village',x:-22,z:9,rotation:0,length:9,width:3,scale:.88},
    {id:'kota-home-04',type:'house_mid',x:-4,z:9,rotation:180,length:9,width:3,scale:.9},
    {id:'kota-home-05',type:'house',x:23,z:-10,rotation:0,length:9,width:3,scale:.85},
    {id:'kota-home-06',type:'house_village',x:26,z:10,rotation:180,length:9,width:3,scale:.88},
    {id:'kota-school',type:'school_ruined',x:-20,z:19,rotation:0,length:9,width:3,scale:.86},
    {id:'kota-mbg',type:'sppg',x:-19,z:-20,rotation:0,length:9,width:3,scale:.78},
    {id:'kota-kopdes',type:'kopdes',x:24,z:20,rotation:180,length:9,width:3,scale:.8},
    {id:'kota-market',type:'market',x:3,z:-19,rotation:0,length:9,width:3,scale:.9},
    {id:'kota-hall',type:'hall',x:2,z:19,rotation:180,length:9,width:3,scale:.82},
    {id:'kota-park-tree-01',type:'tree_canopy',x:-2,z:4,rotation:0,length:9,width:3,scale:.75},
    {id:'kota-park-tree-02',type:'tree',x:4,z:6,rotation:0,length:9,width:3,scale:1},
    {id:'kota-park-tree-03',type:'tree',x:-4,z:-6,rotation:0,length:9,width:3,scale:.9},
    {id:'kota-lamp-01',type:'lamp',x:-8,z:-3,rotation:0,length:9,width:3,scale:1},
    {id:'kota-lamp-02',type:'lamp',x:10,z:3,rotation:0,length:9,width:3,scale:1},
    {id:'kota-car-01',type:'car_family',x:8,z:-2.8,rotation:90,length:9,width:3,scale:.85},
    {id:'kota-bebek-01',type:'duck',x:21,z:-6,rotation:0,length:9,width:3,scale:.8},
    {id:'kota-cat-01',type:'cat',x:-8,z:6,rotation:0,length:9,width:3,scale:.9},
  ],
  desa: [
    {id:'desa-road-main',type:'road',x:0,z:0,rotation:0,length:42,width:3.5,scale:1},
    {id:'desa-river',type:'river',x:15,z:0,rotation:90,length:38,width:3.6,scale:1},
    {id:'desa-bridge',type:'bridge',x:15,z:0,rotation:0,length:8,width:3.8,scale:1},
    {id:'desa-home-01',type:'house_village',x:-18,z:-8,rotation:0,length:9,width:3,scale:1},
    {id:'desa-home-02',type:'house',x:-7,z:-9,rotation:180,length:9,width:3,scale:.9},
    {id:'desa-home-03',type:'house_village',x:-18,z:9,rotation:0,length:9,width:3,scale:1},
    {id:'desa-home-04',type:'house_mid',x:-6,z:10,rotation:180,length:9,width:3,scale:.9},
    {id:'desa-school',type:'school_ruined',x:-20,z:19,rotation:0,length:9,width:3,scale:.85},
    {id:'desa-mbg',type:'sppg',x:-18,z:-19,rotation:0,length:9,width:3,scale:.72},
    {id:'desa-kopdes',type:'kopdes',x:23,z:14,rotation:180,length:9,width:3,scale:.76},
    {id:'desa-field-01',type:'rice_field',x:24,z:-8,rotation:0,length:10,width:8,scale:1},
    {id:'desa-field-02',type:'rice_field',x:25,z:-19,rotation:0,length:10,width:8,scale:.9},
    {id:'desa-crops',type:'crop_field',x:3,z:19,rotation:0,length:10,width:8,scale:.9},
    {id:'desa-tree-01',type:'tree_canopy',x:-2,z:6,rotation:0,length:9,width:3,scale:.9},
    {id:'desa-tree-02',type:'tree',x:7,z:9,rotation:0,length:9,width:3,scale:1.1},
    {id:'desa-tree-03',type:'tree',x:8,z:-12,rotation:0,length:9,width:3,scale:1.1},
    {id:'desa-chicken-01',type:'chicken',x:-3,z:-5,rotation:0,length:9,width:3,scale:.8},
    {id:'desa-goat-01',type:'goat',x:5,z:5,rotation:0,length:9,width:3,scale:.78},
  ],
  hutan: [
    {id:'hutan-road',type:'road',x:0,z:0,rotation:0,length:22,width:2.8,scale:1},
    {id:'hutan-river',type:'river',x:6,z:0,rotation:90,length:36,width:3.5,scale:1},
    {id:'hutan-bridge',type:'bridge',x:6,z:0,rotation:0,length:8,width:3.8,scale:1},
    {id:'hutan-forest-01',type:'forest_lush',x:-16,z:-13,rotation:0,length:9,width:3,scale:1.2},
    {id:'hutan-forest-02',type:'forest_lush',x:-18,z:13,rotation:0,length:9,width:3,scale:1.15},
    {id:'hutan-forest-03',type:'forest',x:18,z:-14,rotation:0,length:9,width:3,scale:1.15},
    {id:'hutan-forest-04',type:'forest',x:19,z:15,rotation:0,length:9,width:3,scale:1.2},
    {id:'hutan-tree-01',type:'tree_canopy',x:-8,z:-6,rotation:0,length:9,width:3,scale:.8},
    {id:'hutan-tree-02',type:'tree_canopy',x:-10,z:7,rotation:0,length:9,width:3,scale:.8},
    {id:'hutan-tree-03',type:'tree',x:12,z:7,rotation:0,length:9,width:3,scale:.9},
    {id:'hutan-hut',type:'house',x:-20,z:0,rotation:90,length:9,width:3,scale:.6},
    {id:'hutan-lamp',type:'lamp',x:-8,z:0,rotation:0,length:9,width:3,scale:1},
    {id:'hutan-dog',type:'dog',x:-4,z:11,rotation:0,length:9,width:3,scale:.85},
  ],
};
export const DEFAULT_WORLD_SCENE = DEFAULT_WORLD_SCENES.kota;
export function getDefaultWorldScene(region = 'kota') { return (DEFAULT_WORLD_SCENES[region] || DEFAULT_WORLD_SCENE).map((entry) => ({ ...entry })); }
