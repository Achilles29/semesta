import audio from './production-day1-audio.json' with {type:'json'};
import music from './production-day1-music.json' with {type:'json'};

export const DAY1_SPEAKERS={narrator:'Narator',prabowow:'Prabowow',sari:'Sari',joko:'Joko'};
export const day1Caption=key=>audio[key].text.replaceAll('Weka Weka','Wkwkwk').replaceAll('Dei Dua','Day Dua');

/** Complete, editable scene sequence. Each spoken turn uses one measured clip. */
export function day1Scenario(){
  const scenario={version:1,title:'Day 1 — Republik Wkwkwk baru buka',notice:'DAY 1 · PARODI FIKTIF',kind:'episode',set:'republic',props:['office'],
    cast:[{id:'a',preset:'v15-prabowo-inspired',position:[0,0],yaw:0},{id:'b',preset:'v15-laras',position:[-4,-2.5],yaw:1},{id:'c',preset:'v15-arka',position:[-4,-2.5],yaw:1}],shots:[]};
  const idle=(yaw=0,extra={})=>({action:'Idle',yaw,...extra});
  const add=(id,duration,label,options={})=>{
    const shot={id,label,duration,camera:'wide',focus:'a',caption:'',actors:{a:idle(),b:idle(1),c:idle(-.8)},...options};
    if(shot.speech){shot.caption=day1Caption(shot.speech);shot.speechOffset=.3;shot.duration=Math.max(duration,audio[shot.speech].duration+.9);}
    scenario.shots.push(shot);return shot;
  };
  const hidden={b:idle(1,{visible:false}),c:idle(1,{visible:false})};
  add('hari-pertama',3,'Narator membuka republik',{camera:'medium',speech:'narrator-01',overlay:'HARI PERTAMA',actors:{a:{action:'Dance',bpm:130},...hidden}});
  add('presiden-joget',3,'Presiden sudah siap',{camera:'medium',overlay:'PRESIDEN SUDAH SIAP.',sound:'beat',actors:{a:{action:'Dance',bpm:130,phase:3},...hidden}});
  add('lapangan-kosong',4,'Negara baru buka, rakyat belum ada',{speech:'narrator-02',frame:{target:[.3,1,-1],width:5.8},actors:{a:idle(.25,{gesture:'look'}),...hidden}});
  add('rakyat-mana',2.8,'Prabowow mencari rakyat',{camera:'close',speech:'prabowow-01',actors:{a:idle(-.25,{gesture:'look'}),...hidden}});
  add('sari-datang',2.7,'Sari masuk melalui jalan setapak',{frame:{target:[-1.25,1,-.8],width:4.8},actors:{a:idle(-.8),b:{action:'Walk',to:[-1.15,0],visible:true},c:hidden.c}});
  add('sari-menyapa',3.8,'Warga kedua menyapa',{speech:'sari-01',actors:{a:idle(-.65),b:idle(.8),c:hidden.c}});
  add('baru-buka',2.4,'Presiden menyambut',{speech:'prabowow-02',actors:{a:{action:'Wave',yaw:-.65},b:idle(.8,{gesture:'nod'}),c:hidden.c}});
  add('kantor-mana',2.3,'Sari menanyakan kantor',{speech:'sari-02',actors:{a:idle(-.65),b:idle(.8),c:hidden.c}});
  add('kantor-kursi',3.4,'Kursi menjadi kantor sementara',{speech:'prabowow-03',frame:{target:[1.05,1,-.6],width:4.4},actors:{a:{action:'Point',yaw:2.1},b:idle(1.9),c:hidden.c}});
  add('reaksi-kursi',1.6,'Tahan lelucon kursi',{frame:{target:[2.15,.7,-1.7],width:1.7},overlay:'KANTOR SEMENTARA',actors:{a:idle(2.1),b:idle(1.9),c:hidden.c}});
  add('joko-datang',2.4,'Joko masuk dari jalur yang sama',{frame:{target:[-.8,1,-.9],width:5.1},actors:{a:idle(-.7),b:idle(-.7),c:{action:'Walk',to:[-1.6,-1.65],visible:true}}});
  add('joko-mendekat',2.8,'Joko melewati belakang presiden',{actors:{a:idle(.5),b:idle(.8),c:{action:'Walk',to:[1.15,-1.3]}}});
  add('joko-berhenti',1.4,'Joko mengambil tempat di kanan',{actors:{a:idle(.65),b:idle(.8),c:{action:'Walk',to:[1.15,.05]}}});
  add('minta-konser',3.2,'Joko mengusulkan konser',{speech:'joko-01',actors:{a:idle(.65),b:idle(.8),c:{action:'Point',yaw:-.75}}});
  add('rumah-belum',2.6,'Sari mengingatkan kebutuhan dasar',{speech:'sari-03',actors:{a:idle(-.65),b:idle(.85),c:idle(-.85,{gesture:'nod'})}});
  add('narator-keinginan',3.4,'Narator menjembatani perbedaan',{speech:'narrator-03',actors:{a:idle(0,{gesture:'look'}),b:idle(.8),c:idle(-.8)}});
  add('bangun-bareng',6,'Presiden mengajak membangun bersama',{speech:'prabowow-04',actors:{a:idle(-.4,{gesture:'talk'}),b:idle(.8),c:idle(-.8)}});
  add('warga-memilih',3.6,'Sari memastikan keputusan warga',{speech:'sari-04',actors:{a:idle(-.65,{gesture:'nod'}),b:idle(.8),c:idle(-.8)}});
  add('pilihan-bangunan',5,'Usulan rumah, warung, dan jalan',{speech:'prabowow-05',card:'build',actors:{a:idle(-.3,{gesture:'talk'}),b:idle(.8),c:idle(-.8)}});
  add('usul-acara',2.5,'Joko menanyakan lomba dan konser',{speech:'joko-02',actors:{a:idle(.65),b:idle(.8),c:idle(-.8,{gesture:'talk'})}});
  add('semua-ditentukan-warga',5.5,'Acara, aturan, dan kegiatan',{speech:'prabowow-06',card:'events',actors:{a:idle(.4,{gesture:'talk'}),b:idle(.8,{gesture:'nod'}),c:idle(-.8)}});
  add('ajak-penonton',8.2,'Penonton menjadi warga republik',{speech:'prabowow-07',overlay:'REPUBLIK INI MAU DIBIKIN APA DULU?',actors:{a:idle(0,{gesture:'talk'}),b:idle(.15),c:idle(-.15)}});
  add('pilihan-day-dua',6.3,'Usulan warga menjadi cerita berikutnya',{speech:'prabowow-08',overlay:'USULKAN → DUKUNG → KITA WUJUDKAN',actors:{a:idle(0,{gesture:'talk'}),b:idle(.1,{gesture:'nod'}),c:idle(-.1,{gesture:'nod'})}});
  add('boleh-joget',2.8,'Joko meminta joget bersama',{speech:'joko-03',actors:{a:idle(.65),b:idle(.5),c:idle(-.8)}});
  add('boleh',1.4,'Presiden menyetujui',{speech:'prabowow-09',actors:{a:idle(.65,{gesture:'nod'}),b:idle(.3),c:idle(-.6)}});
  add('joget-bersama',3.5,'Warga pertama berjoget bersama',{sound:'beat',overlay:'FOLLOW · LIHAT HASILNYA DI DAY 2',actors:{a:{action:'Dance',bpm:130,delay:.2},b:{action:'Dance',bpm:130,delay:.7},c:{action:'Dance',bpm:130}}});
  for(const shot of scenario.shots){for(const cue of Object.values(shot.actors))if(cue.action==='Dance')cue.bpm=music.bpm;if(shot.sound==='beat')shot.sound='okeGas';}
  scenario.shots[0].sound='okeGas';scenario.shots[0].musicVolume=.08;
  scenario.shots[1].musicOffset=3;
  return scenario;
}
