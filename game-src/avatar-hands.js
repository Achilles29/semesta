import { Quaternion, Vector3, PropertyBinding } from 'three';

/** Optional V13 extension. Only the thirty declared finger joints are owned here. */
export function createHandController(figure) {
  let contract;
  figure.traverse(node => {
    if (!node.userData.avatarHandContract) return;
    try { contract = typeof node.userData.avatarHandContract === 'string' ? JSON.parse(node.userData.avatarHandContract) : node.userData.avatarHandContract; }
    catch { /* Legacy assets have no articulated hand extension. */ }
  });
  if (contract?.version !== 1) return null;
  const joints = Object.entries(contract.bones).map(([name, data]) => {
    const bone = figure.getObjectByName(PropertyBinding.sanitizeNodeName(name));
    return bone && { bone, ...data, axis: new Vector3(...data.axis).normalize(), rest: bone.quaternion.clone(), position: bone.position.clone() };
  }).filter(Boolean);
  const rotation = new Quaternion();
  const offset = new Vector3(), correction = new Vector3();
  const reset = () => joints.forEach(j => { j.bone.quaternion.copy(j.rest); j.bone.position.copy(j.position); });
  return {
    contract,
    update({ pose = 'clip', side = 'both', intensity = 1 } = {}) {
      const values = contract.poses[pose];
      const weight = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 1;
      const appearance = figure.userData.appearance;
      const body = figure.userData.avatarBodyMorphs?.[`${appearance?.bodyFrame}/${appearance?.bodyType}`];
      for (const joint of joints) {
        if (values && (side === 'both' || joint.side === side)) {
          const angle = (values[joint.finger] || values.fingers)[joint.segment] * weight;
          joint.bone.quaternion.copy(joint.rest).multiply(rotation.setFromAxisAngle(joint.axis, angle));
        }
        // Body morphs displace the hands. Conjugate each rotation around the
        // fitted pivot without translating the already-morphed mesh twice.
        offset.fromArray(joint.bodyOffsets?.[body] || [0, 0, 0]);
        correction.copy(offset).applyQuaternion(joint.rest).sub(offset.applyQuaternion(joint.bone.quaternion));
        joint.bone.position.copy(joint.position).add(correction);
      }
      for (const [name, socket] of Object.entries(figure.userData.gripSockets || {})) {
        const palm = joints.find(j => j.side === name.slice(-1) && j.finger === 'middle' && j.segment === 0);
        if (!palm) continue;
        offset.fromArray(palm.bodyOffsets?.[body] || [0, 0, 0]).applyQuaternion(palm.rest);
        socket.position.fromArray(socket.userData.basePosition).add(offset);
      }
    },
    reset, dispose: reset,
  };
}
