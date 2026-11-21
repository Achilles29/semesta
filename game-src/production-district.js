import {presets} from './avatar-v15-config.js';

// A physical extension of kota, NOT a replacement scene or a second server region.
// Keeping the region key preserves chat/presence and the saved town layout.
export const PRODUCTION_DISTRICT = Object.freeze({
  id:'balai-produksi', name:'Balai Produksi WkWkWk', region:'kota',
  center:{x:-48,z:-100}, spawn:{x:-48,z:-96},
  bounds:{minX:-70,maxX:-26,minZ:-122,maxZ:-74},
  route:[[-17,0],[-48,0],[-48,-86]],
  directions:'Dari jalan utama Kota Warga, ke barat lalu utara. Pulang melalui jalan yang sama.',
});

export function insideProductionDistrict(x,z) {
  const b=PRODUCTION_DISTRICT.bounds;
  return x>=b.minX && x<=b.maxX && z>=b.minZ && z<=b.maxZ;
}

export function productionReserved(x,z) {
  // Do not grow procedural trees through the set or the connecting road.
  return (x>=-74 && x<=-22 && z>=-126 && z<=-70)
    || (Math.abs(x+48)<6 && z>=-86 && z<=6)
    || (x>=-54 && x<=-17 && Math.abs(z)<6);
}

export function productionEntry(location,region) {
  return location===PRODUCTION_DISTRICT.id && region==='kota'
    ? {...PRODUCTION_DISTRICT.spawn} : null;
}

// Neutral studio crew; no former episode scripts remain in the active world.
export const PRODUCTION_CAST = [
  {id:'crew-arka',name:'Arka',position:[-51,-101],preset:'v15-arka'},
  {id:'crew-laras',name:'Laras',position:[-45,-101],preset:'v15-laras'},
].map(c=>({...c,icon:'film',config:presets.find(p=>p.id===c.preset).config,
  lines:['Selamat datang di Balai Produksi. Cerita baru dimulai dari Day 1.', 'Buka halaman Produksi untuk menyusun adegan dan mengunduh MP4.']}));
