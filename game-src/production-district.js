import { FARMER_PRESET, farmerAppearance } from './avatar-farmer-config.js';

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

const cast = (id,name,appearance,colors,position,lines,detail={}) => ({
  id,name,position,lines,icon:'🎭',...detail,
  config:{...FARMER_PRESET,farmer:farmerAppearance({farmer:{
    headwear:'none',accessory:'none',gloves:'none',footwearStyle:'sandals',
    ...appearance,colors,
  }})},
});

// Original cartoon interpretations. These are not claims of real candidacy,
// real quotes, identity-accurate scans, or impersonations of their voices.
export const PRODUCTION_CAST = [
  cast('bu-warung','Bu Warung · tokoh fiktif',
    {bodyFrame:'female',bodyType:'mature',outfit:'loose-tee',bottomStyle:'relaxed',headwear:'hijab',hairStyle:'none',faceShape:'round',eyeStyle:'almond',mouthStyle:'smile'},
    {skin:'#d8ac88',hair:'#302820',shirt:'#ae7650',trousers:'#526a60',headwearColor:'#698779',footwear:'#514137'},[-55,-102],
    ['Kursi sudah terisi. Sekarang tagih kerjanya! Ini parodi republik game.', 'Jatah kerja. Bawa ember.']),
  cast('pemandu','Pemandu · tokoh fiktif',
    {bodyType:'slender',outfit:'blazer',bottomStyle:'relaxed',hairStyle:'swept',faceShape:'angular',eyeStyle:'relaxed'},
    {skin:'#d9ae8d',hair:'#302c29',shirt:'#245d62',trousers:'#354549',footwear:'#433d35'},[-52,-99],
    ['Selamat datang di set audisi parodi Republik WkWkWk. Bukan pencalonan nyata.',
     'Ini kursi jabatan, Pak. Bukan kursi kondangan.',
     'Usulkan satu nama dan satu alasan. Ini obrolan warga, bukan pemilihan resmi.']),
  cast('pak-sandal','Pak Sandal · tokoh fiktif',
    {bodyType:'mature',outfit:'loose-tee',bottomStyle:'sarong',headwear:'peci',hairStyle:'short',faceShape:'round',eyeStyle:'round',mouthStyle:'grin'},
    {skin:'#cfa17e',hair:'#5e5145',shirt:'#e1b654',trousers:'#667b61',headwearColor:'#343834',footwear:'#6b4936'},[-47,-97],
    ['Saya duluan. Sudah saya booking! Ini dialog tokoh fiktif, ya.',
     'Sandal saya sudah duluan. Masa nggak dihitung?',
     'Kalau nggak kepilih, masih boleh makan?']),
  cast('mama-ghufron','Mama Ghufron · parodi',
    {bodyType:'skinny',outfit:'koko',bottomStyle:'sarong',headwear:'peci',hairStyle:'none',faceShape:'oval',eyeStyle:'relaxed',noseStyle:'defined',mouthStyle:'neutral'},
    {skin:'#dfb998',hair:'#343735',shirt:'#eee8d9',trousers:'#484d45',headwearColor:'#151a1c',footwear:'#544638'},[-42,-99],
    ['Adegan rekaan: visi-misi sudah saya siapkan.',
     'Bisa diringkas? Ini judulnya dulu. Dialog parodi, bukan ucapan asli.'],
    {longHair:true,facialHair:true}),
  cast('bahlil','Bahlil · parodi',
    {bodyType:'mature',outfit:'work-shirt',bottomStyle:'relaxed',hairStyle:'none',faceShape:'angular',eyeStyle:'relaxed',noseStyle:'defined',mouthStyle:'smile'},
    {skin:'#aa714e',hair:'#252523',shirt:'#f0ebdf',trousers:'#374450',footwear:'#3a302a'},[-42,-105],
    ['Adegan rekaan: saya siap maju!',
     'Satu langkah saja? Oh, panggungnya sempit. Ini dialog parodi.']),
  cast('komeng','Komeng · parodi',
    {bodyType:'skinny',outfit:'batik',bottomStyle:'relaxed',hairStyle:'swept',faceShape:'oval',eyeStyle:'round',noseStyle:'defined',mouthStyle:'grin'},
    {skin:'#d6a783',hair:'#2e2722',shirt:'#a2764c',trousers:'#384349',footwear:'#534231'},[-53,-105],
    ['Adegan rekaan: saya mundur dulu.',
     'Biar ada ruang buat maju! Ini dialog parodi, bukan pernyataan pencalonan.']),
];
