import { Box3, Vector3 } from 'three';

const MAPS = ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'];

/** Inspect a loaded GLTF without mutating its shared scene or materials. */
export function inspectCharacterAsset(gltf) {
  const root=gltf?.scene;
  if(!root) return {valid:false,error:'GLTF tidak memiliki scene utama.'};
  root.updateMatrixWorld(true);
  const meshes=[];const materials=new Map();const bones=new Set();const textures=new Set();let triangles=0;let skinnedMeshes=0;let vertices=0;
  root.traverse((object)=>{
    if(object.isBone)bones.add(object.name);
    if(!object.isMesh)return;
    meshes.push(object);
    const position=object.geometry?.attributes?.position;
    const count=object.geometry?.index?.count??position?.count??0;
    vertices+=position?.count||0;
    if(object.geometry?.index)triangles+=Math.floor(count/3);
    else if(object.geometry?.primitiveMode===undefined||object.geometry.primitiveMode===4)triangles+=Math.floor(count/3);
    if(object.isSkinnedMesh&&object.skeleton){skinnedMeshes++;object.skeleton.bones.forEach((bone)=>bones.add(bone.name));}
    for(const material of (Array.isArray(object.material)?object.material:[object.material])){
      if(!material)continue;
      materials.set(material.uuid,material);
      MAPS.forEach((slot)=>{if(material[slot]?.isTexture)textures.add(material[slot].uuid);});
    }
  });
  const box=new Box3().setFromObject(root);const size=box.isEmpty()?null:box.getSize(new Vector3()).toArray().map((value)=>Number(value.toFixed(3)));
  const clips=(gltf.animations||[]).map((clip)=>({name:clip.name,duration:Number(clip.duration.toFixed(2)),tracks:clip.tracks.length}));
  const expected=['Idle','Walk','Run','Interact','Wave','Hoe','Watering','Harvest'];
  const available=new Set(clips.map((clip)=>clip.name.toLowerCase()));
  return {
    valid:meshes.length>0,
    meshCount:meshes.length,
    skinnedMeshCount:skinnedMeshes,
    boneCount:bones.size,
    vertexCount:vertices,
    triangleCount:triangles,
    materialCount:materials.size,
    textureCount:textures.size,
    clips,
    missingClips:expected.filter((name)=>!available.has(name.toLowerCase())),
    materialNames:[...materials.values()].map((material)=>material.name||'Material'),
    materialDetails:[...materials.values()].map((material)=>({name:material.name||'Material',model:material.type,roughness:material.roughness??null,metalness:material.metalness??null,maps:MAPS.filter((slot)=>material[slot]?.isTexture)})),
    bounds:size,
    warnings:[
      ...(meshes.length===0?['Tidak ditemukan mesh.']:[]),
      ...(skinnedMeshes===0?['Tidak ditemukan mesh berskeleton; klon tidak akan memiliki animasi tulang.']:[]),
      ...(clips.length===0?['GLB tidak menyediakan klip animasi.']:[]),
      ...(meshes.length>50?['Jumlah mesh/primitive tinggi; pertimbangkan menggabungkan bagian yang tidak perlu.']:[]),
    ],
  };
}

export function formatCharacterAssetSummary(report) {
  if(!report?.valid)return report?.error||'Aset karakter tidak valid.';
  const clips=report.clips.length?report.clips.map((clip)=>`${clip.name} (${clip.duration}s)`).join(', '):'tidak ada';
  const missing=report.missingClips?.length?`Belum tersedia: ${report.missingClips.join(', ')}.`:'Semua state yang diminta tersedia.';
  return `GLB terbaca · ${report.meshCount} mesh · ${report.triangleCount.toLocaleString('id-ID')} segitiga · ${report.skinnedMeshCount} mesh berskeleton · ${report.boneCount} tulang · ${report.materialCount} material · ${report.textureCount} tekstur · Animasi: ${clips}. ${missing}`;
}
