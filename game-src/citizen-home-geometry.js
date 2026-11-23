import * as THREE from 'three';
import {HOME_LAYOUT} from './citizen-home-layout.js';

// The public lodge and the private room deliberately use separate scene roots.
// No account, address, or interior position belongs in the public scene.
function geometryKit(name, scene) {
  const root = new THREE.Group(); root.name = name; scene?.add(root);
  const materials = new Map(), geometries = new Set(), textures = new Set();
  const unit = new THREE.BoxGeometry(1, 1, 1); geometries.add(unit);
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: .82}));
    return materials.get(color);
  };
  const mesh = (parent, name, geometry, color, position, size = [1, 1, 1]) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material(color)); object.name = name;
    object.position.set(...position); object.scale.set(...size); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  };
  const box = (parent, name, color, position, size) => mesh(parent, name, unit, color, position, size);
  const group = (parent, name, position = [0, 0, 0]) => {
    const object = new THREE.Group(); object.name = name; object.position.set(...position); parent.add(object); return object;
  };
  function sign(parent, text, position, width, height) {
    const board = box(parent, 'Sign_' + text, '#31594f', position, [width, height, .08]);
    board.userData.label = text;
    // A plain physical sign remains available to CPU/offline renderers.
    if (typeof document === 'undefined') return board;
    try {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 160;
      const context = canvas.getContext('2d'); if (!context) return board;
      context.fillStyle = '#31594f'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fff0c8'; context.textAlign = 'center'; context.textBaseline = 'middle';
      context.font = 'bold 54px sans-serif'; context.fillText(text, 384, 80, 720);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      const faceMaterial = new THREE.MeshStandardMaterial({map: texture, roughness: .8}); materials.set(Symbol(), faceMaterial);
      const plane = new THREE.PlaneGeometry(width, height); geometries.add(plane);
      const face = new THREE.Mesh(plane, faceMaterial); face.position.set(position[0], position[1], position[2] + .045); parent.add(face);
    } catch { /* A label in the game HUD remains readable without canvas textures. */ }
    return board;
  }
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true; root.removeFromParent();
    for (const value of geometries) value.dispose();
    for (const value of materials.values()) value.dispose();
    for (const value of textures) value.dispose();
  };
  return {root, box, mesh, group, sign, dispose};
}

export function createCitizenHomeGeometry({scene} = {}) {
  const kit = geometryKit('CitizenHousingPublic', scene), {root, box, mesh, group, sign} = kit;
  const colliders = [], surfaces = [], occluders = [];
  const building = group(root, 'WismaWarga', [HOME_LAYOUT.x, 0, HOME_LAYOUT.z]);
  const halfWidth = HOME_LAYOUT.width / 2, halfDepth = HOME_LAYOUT.depth / 2;
  const solid = (name, color, position, size) => {
    const object = box(building, name, color, position, size); occluders.push(object);
    colliders.push({minX: HOME_LAYOUT.x + position[0] - size[0] / 2, maxX: HOME_LAYOUT.x + position[0] + size[0] / 2,
      minZ: HOME_LAYOUT.z + position[2] - size[2] / 2, maxZ: HOME_LAYOUT.z + position[2] + size[2] / 2,
      minY: position[1] - size[1] / 2, maxY: position[1] + size[1] / 2});
    return object;
  };
  box(building, 'FlushFloor', '#cfc5a8', [0, -.09, 0], [HOME_LAYOUT.width, .18, HOME_LAYOUT.depth]);
  surfaces.push({minX: HOME_LAYOUT.x-halfWidth, maxX: HOME_LAYOUT.x+halfWidth, minZ: HOME_LAYOUT.z-halfDepth, maxZ: HOME_LAYOUT.z+halfDepth, y: 0});
  solid('BackWall', '#e5d8b5', [0, 1.8, -halfDepth+.15], [HOME_LAYOUT.width, 3.6, .3]);
  for (const side of [-1, 1]) {
    solid('SideWall', '#efe4c7', [side*(halfWidth-.15), 1.8, 0], [.3, 3.6, HOME_LAYOUT.depth]);
    // Two wings leave a 2.6 m clear doorway; there is no invisible door blocker.
    solid('FrontWall', '#f2e5c4', [side*4.15, 1.8, halfDepth-.15], [5.7, 3.6, .3]);
    box(building, 'WindowFrame', '#416256', [side*4.15, 1.9, halfDepth+.025], [2.4, 1.65, .12]);
    box(building, 'WindowGlass', '#a9d4d3', [side*4.15, 1.9, halfDepth+.1], [2.16, 1.41, .04]);
    box(building, 'WindowMullion', '#f1dfbb', [side*4.15, 1.9, halfDepth+.14], [.09, 1.45, .05]);
    box(building, 'WindowSill', '#aa7957', [side*4.15, 1.03, halfDepth+.2], [2.65, .16, .48]);
    box(building, 'LowWallTrim', '#c5ae85', [side*4.15, .3, halfDepth+.03], [5.7, .35, .12]);
  }
  // Door header is above player head height, preserving a fully walkable portal.
  solid('DoorHeader', '#e5d8b5', [0, 3.15, halfDepth-.15], [2.6, .9, .3]);
  for (const side of [-1, 1]) box(building, 'DoorTrim', '#b0875a', [side*1.33, 1.35, halfDepth+.04], [.13, 2.7, .2]);
  box(building, 'EntranceMat', '#658577', [0, .012, halfDepth+.55], [2.55, .024, 1.05]);
  sign(building, 'WISMA WARGA', [0, 3.17, halfDepth+.08], 5.8, .68);
  // A closed triangular gable prevents seeing through the roof from the plaza.
  const gable = new THREE.Shape(); gable.moveTo(-halfWidth-.35, 0); gable.lineTo(halfWidth+.35, 0); gable.lineTo(0, 2); gable.closePath();
  const gableGeometry = new THREE.ShapeGeometry(gable);
  for (const z of [-halfDepth, halfDepth]) {
    const triangle = mesh(building, 'Gable', gableGeometry, '#dac6a0', [0, 3.6, z]);
    if (z < 0) triangle.rotation.y = Math.PI;
    occluders.push(triangle);
  }
  const run = halfWidth+.6, rise = 2.05, pitch = Math.atan2(rise, run);
  for (const side of [-1, 1]) {
    const roof = box(building, 'TerracottaRoof', '#ae664c', [side*run/2, 3.6+rise/2, 0], [Math.hypot(run, rise), .17, HOME_LAYOUT.depth+1.1]);
    roof.rotation.z = -side*pitch; occluders.push(roof);
  }
  box(building, 'RoofRidge', '#914d3a', [0, 5.69, 0], [.24, .18, HOME_LAYOUT.depth+1.15]);
  // Public furniture only: the real avatar NPC is owned by the open-world roster.
  const desk = group(root, 'WargaClerkDesk', [HOME_LAYOUT.clerk.x, 0, HOME_LAYOUT.clerk.z-1.3]);
  box(desk, 'CounterTop', '#b28558', [0, .91, 0], [2.25, .16, .85]);
  box(desk, 'CounterBase', '#698579', [0, .43, 0], [2.05, .86, .68]);
  box(desk, 'DeliveryParcel', '#d5b67d', [.68, 1.09, 0], [.5, .22, .4]);
  sign(desk, 'LAYANAN WARGA', [0, .55, .45], 1.8, .3);
  colliders.push({minX: HOME_LAYOUT.clerk.x-1.125, maxX: HOME_LAYOUT.clerk.x+1.125,
    minZ: HOME_LAYOUT.clerk.z-1.725, maxZ: HOME_LAYOUT.clerk.z-.875, minY: 0, maxY: 1});
  const markerGeometry = new THREE.RingGeometry(.6, .72, 32);
  const marker = mesh(root, 'HomeEntranceMarker', markerGeometry, '#dcb76a', [HOME_LAYOUT.entrance.x, .024, HOME_LAYOUT.entrance.z]); marker.rotation.x = -Math.PI/2;
  let disposed = false;
  function dispose() {if(disposed)return; disposed=true;kit.dispose();colliders.length=surfaces.length=occluders.length=0;}
  return {root, colliders, surfaces, occluders, dispose};
}

/** Account-free room template shared by runtime and offline inspection. */
export function createCitizenRoomGeometry({scene, decorationPlaced = false} = {}) {
  const kit = geometryKit('CitizenPrivateRoom', scene), {root, box, mesh, group} = kit;
  const room = group(root, 'RoomTemplate');
  box(room, 'Floor', '#caad82', [0, -.1, 0], [7, .2, 6]);
  for (let x = -3; x <= 3; x += .5) box(room, 'FloorJoint', '#b59870', [x, .004, 0], [.012, .008, 5.9]);
  box(room, 'BackWall', '#f3e4c7', [0, 1.5, -3], [7, 3, .14]);
  box(room, 'LeftWall', '#e1dcc4', [-3.5, 1.5, 0], [.14, 3, 6]);
  box(room, 'Skirting', '#ac8c64', [0, .12, -2.9], [7, .24, .1]);
  box(room, 'WindowFrame', '#a58562', [.4, 1.97, -2.89], [2.2, 1.5, .12]);
  box(room, 'WindowSky', '#a8d5da', [.4, 1.97, -2.8], [1.98, 1.28, .04]);
  box(room, 'WindowCross', '#f9efdc', [.4, 1.97, -2.75], [.08, 1.3, .04]);
  box(room, 'WindowCross', '#f9efdc', [.4, 1.97, -2.75], [2, .08, .04]);
  for (const x of [-.85, 1.65]) box(room, 'Curtain', '#87a79b', [x, 1.95, -2.68], [.35, 1.75, .08]);
  const bed = group(room, 'BasicBed', [-2.25, 0, -.8]);
  box(bed, 'BedFrame', '#a0805b', [0, .29, 0], [1.75, .38, 2.6]);
  box(bed, 'Mattress', '#f9edda', [0, .56, 0], [1.66, .22, 2.48]);
  box(bed, 'Blanket', '#6b9e99', [0, .70, .37], [1.68, .09, 1.7]);
  box(bed, 'Pillow', '#fff6e4', [0, .75, -.85], [1.15, .2, .45]);
  box(bed, 'Headboard', '#b4946a', [0, .7, -1.3], [1.8, 1.05, .13]);
  const desk = group(room, 'BasicDesk', [2.25, 0, -2.1]);
  box(desk, 'DeskTop', '#c39869', [0, .93, 0], [1.8, .14, .85]);
  for(const x of [-.7,.7]) for(const z of [-.28,.28]) box(desk, 'DeskLeg', '#a1805c', [x,.43,z],[.1,.86,.1]);
  box(desk, 'Notebook', '#cf805d', [-.25, 1.03, .05], [.42,.06,.32]);
  box(room, 'ChairSeat', '#9cbaab', [2.2, .52, -1], [.65,.13,.65]);
  box(room, 'ChairBack', '#709187', [2.2, .95, -.71], [.65,.8,.1]);
  for(const x of [1.95,2.45]) for(const z of [-1.25,-.75]) box(room,'ChairLeg','#9a7a53',[x,.23,z],[.07,.46,.07]);
  box(room, 'WovenRug', '#d6a56f', [0, .015, .95], [2.75,.03,1.6]);
  box(room, 'RugStripe', '#f4dfb7', [0, .035, .5], [2.6,.01,.1]);
  box(room, 'RugStripe', '#f4dfb7', [0, .035, 1.4], [2.6,.01,.1]);
  const shelf = group(room, 'WelcomeShelf', [2.65, 0, .7]); shelf.userData.slotId = HOME_LAYOUT.slotId;
  box(shelf, 'ShelfTop', '#b68f61', [0,.92,0], [1.1,.13,.8]);
  box(shelf, 'ShelfBottom', '#b68f61', [0,.23,0], [1.1,.12,.8]);
  for(const x of [-.47,.47]) box(shelf, 'ShelfSide', '#c4a174', [x,.52,0], [.12,1.04,.8]);
  shelf.traverse(object => {if(object.isMesh)object.userData.slotId=HOME_LAYOUT.slotId;});
  const plant = group(shelf, 'WelcomePlant', [0,1,0]); plant.userData.slotId=HOME_LAYOUT.slotId;
  mesh(plant, 'TerracottaPot', new THREE.CylinderGeometry(.24,.18,.35,20), '#bd7858', [0,.175,0]);
  mesh(plant, 'PlantSoil', new THREE.CylinderGeometry(.215,.215,.015,20), '#594836', [0,.353,0]);
  mesh(plant, 'PlantStem', new THREE.CylinderGeometry(.027,.03,.57,10), '#4f7650', [0,.62,0]);
  const leafGeometry = new THREE.SphereGeometry(1,12,8);
  for(const [x,y,z,angle] of [[-.16,.61,0,-.65],[.16,.79,.02,.6],[-.12,.94,.02,-.35],[.04,1.03,0,.2]]) {
    const leaf=mesh(plant,'PlantLeaf',leafGeometry,'#658f63',[x,y,z],[.16,.27,.06]);leaf.rotation.z=angle;leaf.userData.slotId=HOME_LAYOUT.slotId;
  }
  plant.traverse(object => {if(object.isMesh)object.userData.slotId=HOME_LAYOUT.slotId;});
  function applyState(state) {plant.visible = !!state?.decorationPlaced;}
  applyState({decorationPlaced});
  return {root, slot: shelf, plant, applyState, dispose: kit.dispose};
}
