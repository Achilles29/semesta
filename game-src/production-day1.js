import audio from './production-day1-audio.json' with {type:'json'};
import script from './production-day1-script.json' with {type:'json'};
import music from './production-day1-music.json' with {type:'json'};
import {displaySpeechText} from './production-speech-text.js';
export const DAY1_SPEAKERS={narrator:'Narator',prabowow:'Pasca Bowow',sari:'Sari',joko:'Joko · musisi'};
export const day1Caption=key=>displaySpeechText(audio[key].text);
export function day1Scenario(){
  const idle=(yaw=0,extra={})=>({action:'Idle',yaw,...extra});
  const base=()=>({a:idle(.25),b:idle(-.7),c:idle(-.65)});
  const scenario={version:1,title:script.title,notice:'DAY 1 · ORANG DALAM',kind:'episode',set:'republic',props:['office'],template:'republic-series',
    cast:[{id:'a',preset:'v15-prabowo-inspired',position:[-.6,0],yaw:0},{id:'b',preset:'v15-laras',position:[2.35,.2],yaw:-1.57},{id:'c',preset:'v15-joko-rockstar',position:[2.8,-1.1],yaw:-1.57,prop:'guitar'}],shots:[]};
  const add=(id,label,key,options={})=>{
    const shot={id,label,duration:options.duration||2,camera:'medium',focus:'a',caption:'',actors:base(),...options};
    if(key){
      const [actor,num]=key.split('-'),text=script.actors[actor].lines[Number(num)-1].replace(' [laughs]','');
      shot.caption=displaySpeechText(text);shot.speaker=actor;
      if(audio[key]?.text===text){shot.speech=key;shot.speechOffset=.18;shot.duration=Math.max(1.6,audio[key].duration+.5);}
      else {shot.plannedSpeech=key;shot.duration=Math.max(2,text.split(/\s+/).length/2.5+.55);}
    }
    scenario.shots.push(shot);return shot;
  };
  const hidden={b:idle(-1.57,{visible:false}),c:idle(-1.57,{visible:false})};
  const wide={camera:'wide',frame:{target:[.25,1,-.45],width:3.4,azimuth:-.12,push:.05}};
  const close=(x,y=1.35,z=0,azimuth=.12)=>({camera:'close',frame:{target:[x,y,z],width:1.05,azimuth,push:.07}});
  const animal=(x,z)=>({camera:'close',frame:{target:[x,.43,z],width:.85,azimuth:.12,push:.08}});
  add('hari-pertama','Hari pertama, jalur orang dalam','narrator-01',{...close(-.6),actors:{a:{action:'Dance',bpm:music.bpm},...hidden},sound:'okeGas',musicVolume:.2});
  const intro=scenario.shots[0].duration;
  add('presiden-joget','Pasca Bowow menyambut republik',null,{duration:2,camera:'medium',actors:{a:{action:'Dance',bpm:music.bpm,phase:intro},...hidden},sound:'okeGas',musicOffset:intro,musicVolume:.65});
  add('kantor-sekursi','Perkenalan presiden dan kantor','narrator-02',{camera:'wide',frame:{target:[.6,.8,-.8],width:3.7,azimuth:.2,elevation:.65,push:.1},actors:{a:idle(.4,{gesture:'look'}),...hidden},overlay:'MODAL: SEMANGAT · KANTOR: SATU KURSI'});
  add('rakyat-mana','Presiden mencari warga','prabowow-01',{...close(-.6),actors:{a:idle(.3,{gesture:'look',expression:'confused'}),...hidden}});
  add('sari-datang','Sari masuk cepat dari kanan',null,{duration:1.5,camera:'follow',focus:'b',actors:{a:idle(.7),b:{action:'Walk',to:[.85,.2],visible:true},c:hidden.c}});
  add('sari-menyapa','Warga baru mendaftar','sari-01',{...close(.85,1.35,.2,-.2),focus:'b',actors:{a:idle(.7),b:idle(-.7,{gesture:'talk',expression:'happy'}),c:hidden.c}});
  add('tanya-keahlian','Presiden menanyakan kemampuan','prabowow-02',{...close(-.6),actors:{a:idle(.7,{gesture:'talk'}),b:idle(-.7),c:hidden.c}});
  add('bukan-keluarga','Sari ingin dinilai dari kerja','sari-02',{...close(.85,1.35,.2,-.2),focus:'b',actors:{a:idle(.7),b:idle(-.7,{gesture:'talk'}),c:hidden.c}});
  add('janji-kemampuan','Narator menjelaskan ukuran yang adil','narrator-03',{...wide,actors:{a:idle(.7,{gesture:'nod'}),b:idle(-.7),c:hidden.c},overlay:'KEMAMPUAN > KENALAN'});
  add('joko-datang','Musisi masuk dari kanan dengan gitar',null,{duration:1.6,camera:'follow',focus:'c',frame:{target:[1.9,1.15,-1.1],width:1.8,azimuth:.55,push:.06},actors:{a:idle(.75),b:idle(.8),c:{action:'Walk',to:[1.45,-1.1],visible:true}}});
  add('minta-konser','Joko mengusulkan panggung','joko-01',{...close(1.45,1.35,-1.1,-.25),focus:'c',actors:{a:idle(.8),b:idle(.7),c:idle(-.8,{gesture:'talk',expression:'happy'})}});
  add('rumah-belum','Presiden mengingatkan rumah warga','prabowow-03',{...close(-.6),actors:{a:idle(.75,{gesture:'talk'}),b:idle(-.7),c:idle(-.8)}});
  add('ayam-daftar','Ayam menawarkan jasa alarm','narrator-04',{...animal(.2,1.15),followExtra:'chicken',extras:{chicken:{visible:true,to:[.2,1.15],action:'walk'}},overlay:'KEAHLIAN: ALARM PAGI'});
  add('hewan-ditolak','Pendaftaran hewan ditolak','prabowow-04',{...close(-.6),actors:{a:idle(.45,{gesture:'talk'}),b:idle(-.7,{expression:'confused'}),c:idle(-.8)},extras:{chicken:{action:'sad'},cat:{visible:true,to:[1.05,1.4],action:'walk'}},overlay:'PENDAFTARAN MANUSIA DULU'});
  add('kucing-kenalan','Kucing mengaku keluarga orang dalam','narrator-05',{...animal(1.05,1.4),extras:{cat:{action:'proud'},chicken:{action:'idle'}},overlay:'PONAKAN KUCING PAK RT'});
  add('jalur-khusus','Kenalan langsung mendapat jalan','prabowow-05',{...close(-.6),actors:{a:{action:'Point',yaw:.6},b:idle(-.7,{expression:'surprised'}),c:idle(-.8)},extras:{cat:{to:[.15,.8],action:'walk'},chicken:{action:'sad'}},overlay:'JALUR KEKELUARGAAN DIBUKA'});
  add('sari-protes','Sari menangkap perlakuan berbeda','sari-03',{...close(.85,1.35,.2,-.2),focus:'b',actors:{a:idle(.65),b:idle(-.7,{gesture:'talk',expression:'confused'}),c:idle(-.8)}});
  add('alasan-keluarga','Presiden mencari alasan','prabowow-06',{...close(-.6),actors:{a:idle(.3,{gesture:'talk',expression:'confused'}),b:idle(-.7),c:idle(-.8)}});
  add('arti-orang-dalam','Narator menjelaskan nepotisme','narrator-06',{...wide,overlay:'ANTREAN ATAU SILSILAH?',extras:{cat:{action:'proud'},chicken:{action:'sad'}}});
  add('gitar-atau-kk','Musisi menyindir syarat keluarga','joko-02',{...close(1.45,1.35,-1.1,-.2),focus:'c',actors:{a:idle(.75),b:idle(.7,{expression:'happy'}),c:idle(-.8,{gesture:'talk'})}});
  add('reaksi-hewan','Ayam menatap kucing yang lolos',null,{...animal(.25,.9),duration:1.5,overlay:'CV KALAH SAMA KK',extras:{chicken:{action:'sad'},cat:{action:'proud'}}});
  add('warga-menentukan','Pembangunan, acara dan aturan milik warga','prabowow-07',{...wide,actors:{a:idle(0,{gesture:'talk',lookAt:'camera'}),b:idle(-.4),c:idle(-.5)},overlay:'BANGUNAN · ACARA · ATURAN'});
  add('aturan-antrean','Sari mengusulkan antrean setara','sari-04',{...close(.85,1.35,.2,-.2),focus:'b',actors:{a:idle(.65,{gesture:'nod'}),b:idle(-.6,{gesture:'talk'}),c:idle(-.8)}});
  add('ajak-penonton','Narator mengajak warga berpendapat','narrator-07',{...wide,overlay:'USULKAN SATU HAL + ALASANNYA',extras:{chicken:{action:'idle'},cat:{action:'idle'}}});
  add('keputusan-koplak','Pasca Bowow memutuskan Koplak Desa','prabowow-08',{...close(-.6),actors:{a:idle(0,{gesture:'talk',lookAt:'camera'}),b:idle(-.6,{expression:'confused'}),c:idle(-.8)},overlay:'KOPLAK DESA DULU!'});
  add('keputusan-perut','SPPG dulu, lalu presiden tertawa','prabowow-09',{camera:'medium',focus:'a',actors:{a:idle(0,{gesture:'talk',lookAt:'camera'}),b:idle(-.6,{expression:'confused'}),c:idle(-.8,{expression:'surprised'})},overlay:'SATUAN PENGISI PERUT GRATIS'});
  add('narator-penutup','Narator menutup kontradiksi','narrator-08',{...wide,extras:{chicken:{action:'sad'},cat:{action:'proud'}},actors:{a:idle(0,{expression:'happy'}),b:idle(-.6,{lookAt:'c',expression:'confused'}),c:idle(-.8,{lookAt:'b',expression:'confused'})}});
  add('reaksi-keputusan','Warga menentukan cerita berikutnya',null,{...wide,duration:2.4,overlay:'AYAM DITOLAK, ORANG DALAM LOLOS? · KOMEN',extras:{chicken:{to:[-1.4,1.3],action:'walk'},cat:{action:'proud'}}});
  let musicOffset=0;for(const shot of scenario.shots.slice(-4)){shot.sound='okeGas';shot.musicOffset=musicOffset;shot.musicVolume=.68;musicOffset+=shot.duration;}
  return scenario;
}
