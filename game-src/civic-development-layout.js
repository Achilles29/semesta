import {terrainHeight} from './republic-world-layout.js';
// Planned public parcels. Rendering an episode never publishes these services.
export const CIVIC_FACILITIES=Object.freeze([
  ['masjid','Masjid Kerukunan','worship',-90,145,30,28,'Islam'],
  ['gereja-kristen','Gereja Kristen Kasih','worship',-35,145,30,28,'Kristen'],
  ['gereja-katolik','Gereja Katolik Damai','worship',20,145,30,28,'Katolik'],
  ['pura','Pura Kerukunan','worship',75,145,30,28,'Hindu'],
  ['vihara','Vihara Metta','worship',130,145,30,28,'Buddha'],
  ['kelenteng','Kelenteng Kebajikan','worship',185,145,30,28,'Konghucu'],
  ['sekolah','Sekolah Raya Republik','education',-70,215,48,38,'Pendidikan'],
  ['rumah-sakit','RSUD Republik Wkwkwk','health',0,215,50,38,'Kesehatan'],
  ['stadion','Stadion Warga','sport',160,265,100,76,'Olahraga'],
  ['damkar','Markas Damkar Republik','safety',-70,290,36,28,'Pemadam kebakaran'],
  ['polisi','Kepolisian Republik Wkwkwk','safety',-15,290,36,28,'Keamanan'],
  ['kodim','Markas Komando Tentara Nasional Wkwkwk','safety',40,290,36,28,'Layanan pertahanan fiktif'],
  ['agro','Toko Tani & Sewa Alat','economy',-80,365,36,28,'Benih, pupuk, alat dan penyewaan'],
  ['pasar','Pasar Warga','economy',-20,365,42,28,'Jual hasil panen dan barang'],
  ['gudang','Gudang & Logistik','economy',40,365,38,28,'Simpan barang dan pesanan kurir'],
  ['bengkel','Bengkel & Bahan Bangunan','economy',100,365,38,28,'Perbaikan alat dan bahan rumah'],
  ['hunian','Balai Hunian & Usaha','economy',160,365,38,28,'Subsidi, peningkatan rumah dan izin usaha'],
].map(([id,name,category,x,z,width,depth,service])=>Object.freeze({id,name,category,x,z,width,depth,service,status:'planned'})));
export const DEVELOPMENT_ROADS=Object.freeze([
  {from:[-20,87],to:[-20,100],width:6},
  {from:[-112,100],to:[17,100],width:6},
  {from:[17,83],to:[17,100],width:5},
  {from:[-112,100],to:[-112,394],width:6},
  {from:[235,28],to:[235,394],width:6},
  {from:[-112,245],to:[70,245],width:6},
  ...[170,315,390].map(z=>({from:[-112,z],to:[235,z],width:6})),
]);
export const facilityById=id=>CIVIC_FACILITIES.find(f=>f.id===id);
export const facilityEntry=f=>({x:f.x,z:f.z+f.depth/2+3,yaw:Math.PI});

// Grading belongs to the development preview until an explicit world publication.
export function developmentGroundHeight(x,z,city='jakarta'){
  const outside=Math.max(-132-x,x-255,112-z,z-410,0),t=Math.min(1,outside/24),blend=t*t*(3-2*t);
  return terrainHeight(x,z,city)*blend;
}
