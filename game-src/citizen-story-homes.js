import registry from './citizen-story-homes.json' with {type:'json'};
import {terrainHeight} from './republic-world-layout.js';

// Stable public addresses, not account ownership. Never match an account by name.
export const STORY_HOMES=Object.freeze(registry.homes.map(h=>Object.freeze({...h})));
export const STORY_NEIGHBORHOOD=Object.freeze({name:'Kampung Perintis',minX:124,maxX:241,minZ:-94,maxZ:28,entry:{x:125,z:10}});
export const PUBLIC_SITEPLAN_BOUNDS=Object.freeze({minX:-110,maxX:247,minZ:-115,maxZ:100});
export const STORY_ROADS=Object.freeze([
  {from:[122,10],to:[123,10],width:5},
  {from:[125,-81],to:[125,24],width:4},
  ...Array.from({length:6},(_,row)=>({from:[127,-79+row*20],to:[239,-79+row*20],width:4})),
]);
export function storyHomeLocation(id){
  const h=STORY_HOMES.find(h=>h.id===id);if(!h)return null;
  return {id:h.id,name:`Rumah ${h.name}`,entry:{x:h.x,z:h.z+6,yaw:Math.PI},tag:h.address,
    description:`Rumah disiapkan untuk ${h.name}, warga cerita gelombang pertama. Nama ini belum terhubung ke akun game. Klaim kepemilikan dan interior rumah tapak menunggu layanan verifikasi; nama akun yang sama tidak otomatis menjadi pemilik.`};
}
export const storyHomeGround=h=>Math.max(...[-4,4].flatMap(x=>[-4,4].map(z=>terrainHeight(h.x+x,h.z+z))))+.06;
