/** Fit an archived paper prop to actual V15 hand surfaces after its authored IK.
 * Cache hand vertices once; identity morphs never alter hand geometry. This runs
 * only for held panels in the content preview, not for normal world characters.
 */
export function createHeldPanelFitter(THREE) {
  const bindings=new WeakMap(),point=new THREE.Vector3();
  return function fit(prop,actor,width,height,weight=1){
    if(weight<=0)return;
    let hands=bindings.get(actor.figure);
    if(!hands){
      hands=[];actor.figure.traverse(mesh=>{
        if(!mesh.isSkinnedMesh||mesh.userData.avatarSlot!=='skin')return;
        const bones=new Set(mesh.skeleton.bones.map((b,i)=>/^(hand|thumb|index|middle|ring|little)/.test(b.name)?i:-1));bones.delete(-1);
        const vertices=[],indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
        for(let i=0;i<indices.count;i++){let amount=0;for(let j=0;j<4;j++)if(bones.has(indices.getComponent(i,j)))amount+=weights.getComponent(i,j);if(amount>=.7)vertices.push(i);}
        hands.push({mesh,vertices});
      });bindings.set(actor.figure,hands);
    }
    actor.figure.updateWorldMatrix(true,true);
    // SkinnedMesh refreshes its attached bind inverse in updateMatrixWorld.
    // updateWorldMatrix alone leaves it stale after moving a cinematic actor.
    actor.figure.updateMatrixWorld(true);prop.updateWorldMatrix(true,true);
    const inverse=prop.matrixWorld.clone().invert(),points=[];
    for(const {mesh,vertices} of hands){mesh.skeleton.update();for(const index of vertices){point.fromBufferAttribute(mesh.geometry.attributes.position,index);mesh.applyBoneTransform(index,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);points.push(point.clone());}}
    if(!points.length)return;
    const distance=(p,z=0)=>Math.hypot(Math.max(0,Math.abs(p.x)-width/2),Math.max(0,Math.abs(p.y)-height/2),Math.max(0,Math.abs(p.z-z)-.011));
    const nearest=points.reduce((a,b)=>distance(a)<distance(b)?a:b);
    const dx=Math.sign(nearest.x)*Math.max(0,Math.abs(nearest.x)-width/2-.005),dy=Math.sign(nearest.y)*Math.max(0,Math.abs(nearest.y)-height/2-.005);
    for(const p of points){p.x-=dx;p.y-=dy;}
    // Exclude the complete hand surface from the paper's thickness, rather than
    // fixing one sampled finger while allowing another to pierce the panel.
    const intervals=points.filter(p=>Math.abs(p.x)<width/2+.004&&Math.abs(p.y)<height/2+.004).map(p=>[p.z-.017,p.z+.017]).sort((a,b)=>a[0]-b[0]);
    const merged=[];for(const interval of intervals){const last=merged.at(-1);if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push([...interval]);}
    const candidates=[0,...merged.flatMap(([a,b])=>[a-.001,b+.001]),nearest.z-.018,nearest.z+.018].filter(z=>!merged.some(([a,b])=>z>a&&z<b));
    const score=z=>Math.min(...points.map(p=>distance(p,z)))+Math.abs(z)*.08;
    const safe=candidates.length?candidates.reduce((a,b)=>score(a)<score(b)?a:b):0;
    prop.position.add(new THREE.Vector3(dx,dy,safe).applyQuaternion(prop.quaternion).multiplyScalar(weight));
    prop.updateWorldMatrix(true,true);
  };
}
