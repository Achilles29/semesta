import * as THREE from 'three';

/** Exact downloaded BGN emblem, not a redrawn approximation.
 * Source: https://www.bgn.go.id/logo-bgn.png (22 November 2026).
 * Architecture remains fictional; texture ownership stays with each scene. */
export const BGN_LOGO_URL=new URL('./assets/bgn-logo-official.png',import.meta.url).href;
export const BGN_PALETTE=Object.freeze({navy:'#071e49',sky:'#b5e0ea',green:'#92d05d',gold:'#d1b06c'});
let logoImage=null,logoPromise=null;
export function setRepublicBuildingLogoImage(image){logoImage=image;return image;}
export function preloadRepublicBuildingLogo(){
  if(logoImage)return Promise.resolve(logoImage);
  if(logoPromise)return logoPromise;
  if(typeof globalThis.Image!=='function')return Promise.resolve(null);
  logoPromise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(setRepublicBuildingLogoImage(image));image.onerror=()=>{logoPromise=null;reject(new Error('Lambang BGN tidak dapat dimuat.'));};image.src=BGN_LOGO_URL;});
  return logoPromise;
}
export function addRepublicBGNEmblem(g,parent,pos,size=.76){
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:0,alphaTest:.08,roughness:.7,side:THREE.FrontSide});
  const object=g.mesh(parent,'SPPG_official_BGN_emblem',new THREE.PlaneGeometry(size,size),material,pos,[1,1,1],false);
  object.userData.source='https://www.bgn.go.id/logo-bgn.png';object.userData.cutawayFor='sppg';
  let disposed=false;material.addEventListener('dispose',()=>{disposed=true;});
  const apply=image=>{if(!image||disposed)return;const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;g.trackTexture(texture);material.map=texture;material.opacity=1;material.needsUpdate=true;};
  if(logoImage)apply(logoImage);else preloadRepublicBuildingLogo().then(apply).catch(()=>{object.visible=false;});
  return object;
}
