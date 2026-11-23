import designs from './citizen-accessory-designs.json' with {type:'json'};
import roster from './citizen-roster.json' with {type:'json'};
import professions from './citizen-professions.json' with {type:'json'};

const citizens = new Map(roster.citizens.map(c => [c.presetId, c]));
const disposeGroup = group => {
  group.traverse(n => { n.geometry?.dispose(); if(n.material) n.material.dispose(); });
  group.removeFromParent();
};

/** Role props share their design source with the offline portrait renderer. */
export function attachCitizenAccessories(THREE, actor, presetId) {
  const profession = /^profession-(.+)-(male|female)$/.exec(presetId || '');
  const figure = actor.figure, citizen = citizens.get(presetId) || (profession && professions[profession[1]]);
  if(figure.userData.citizenAccessoryPreset === (presetId || '')) return;
  for(const group of figure.userData.citizenAccessoryGroups || []) disposeGroup(group);
  figure.userData.citizenAccessoryGroups = [];
  figure.userData.citizenAccessoryPreset = presetId || '';
  const profileId = figure.userData.avatarConfig?.profileId || figure.userData.profile?.id;
  const fit = designs.profiles[profileId];
  if(!fit || !citizen) return;
  // Bone inverse matrices describe the bind pose even when switching a preset
  // midway through an animation. Never derive fitting from the current pose.
  let skeleton;
  figure.traverse(n => { if(!skeleton && n.isSkinnedMesh) skeleton = n.skeleton; });
  for(const kind of citizen.accessories || []) {
    const definition = designs.accessories[kind];
    if(!definition) continue;
    const bone = figure.getObjectByName(definition.bone);
    const index = skeleton?.bones.indexOf(bone);
    if(!bone || index < 0) continue;
    const group = new THREE.Group(); group.name = `Citizen_${kind}`;
    group.userData.citizenAccessory = kind;
    group.matrixAutoUpdate = false;
    group.matrix.copy(skeleton.boneInverses[index]);
    bone.add(group);
    const origin = fit[definition.bone];
    for(const part of definition.parts) {
      let geometry;
      if(part.shape === 'box') geometry = new THREE.BoxGeometry(2,2,2);
      else if(part.shape === 'hemisphere') geometry = new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2);
      else if(part.shape === 'cylinder') geometry = new THREE.CylinderGeometry(1,1,2,32);
      else if(part.shape === 'tube') {
        const points = part.points.map(p => new THREE.Vector3(...p));
        const curve = new THREE.CurvePath();
        for(let i=1;i<points.length;i++) curve.add(new THREE.LineCurve3(points[i-1],points[i]));
        geometry = new THREE.TubeGeometry(curve,Math.max(32,points.length*3),part.radius,8,false);
      } else geometry = new THREE.SphereGeometry(1,24,16);
      const material = new THREE.MeshStandardMaterial({color:part.color,roughness:part.roughness ?? .55,metalness:part.metalness ?? 0});
      const mesh = new THREE.Mesh(geometry,material);
      const position = part.position || [0,0,0];
      mesh.position.set(...origin.map((v,i)=>v+position[i]));
      if(part.scale) mesh.scale.fromArray(part.scale);
      if(part.rotation) mesh.rotation.fromArray([...part.rotation,'XYZ']);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.citizenAccessory = kind;
      group.add(mesh);
    }
    figure.userData.citizenAccessoryGroups.push(group);
  }
  figure.updateMatrixWorld(true);
}
