import script from './production-day2-script.json' with {type:'json'};
import {STORY_CLIPS} from './production-audio-catalog.js';
import {citizens} from './citizen-roster.js';
import {WORLD_DESTINATIONS} from './republic-world-layout.js';
import {markBuiltInEpisode} from './production-episode-origin.js';
import music from './production-day1-music.json' with {type:'json'};
export const DAY2_TITLE='Day 2 · Sudah Dibangun, Baru Ditanya';
export const DAY2_SPEAKERS=Object.fromEntries(Object.entries(script.actors).map(([id,a])=>[id,a.displayName]));
const PI=Math.PI,F=(target,width,azimuth=0,elevation=.08)=>({target,width,azimuth,elevation});
const M=(type,from,to,hold=.12)=>({...from,motion:{type,from,to,hold}});
const T=(extra={})=>({action:'Idle',gesture:'talk',...extra});
const V=(key,offset=.08,volume=.95)=>({key,offset,volume});
const P=n=>`day2r2-pasca-${String(n).padStart(2,'0')}`,C=n=>`day2r2-climenzo-${String(n).padStart(2,'0')}`,A=n=>`day2r2-aulia-${String(n).padStart(2,'0')}`;
/** All 48 registered citizens are present; speech bridges visual cuts.
 * Only construction montage cuts use explicit time jumps. */
export function day2Scenario(){
  const aliases={'aulia-talita2':'aulia','climenzo-jr':'climenzo','aku-ardhyy':'ardhy','4ku-fek-smail':'kasir'};
  const front={aulia:[-6.4,2.8],eqa:[-4.9,2.4],cecil:[-3.5,2.8],nopal:[-2.2,3.2],climenzo:[-.7,1.1],xel:[1.2,3.2],ardhy:[2.3,4.4],kasir:[.2,4.3],dd:[-7.8,3.1],asila:[-7.1,4.7],sheaza:[-.4,5.6]};
  const cast=[{id:'pasca',name:'Pasca Bowow',role:'Presiden',preset:'v15-prabowo-inspired',position:[-5,-.1],height:.6,yaw:0},...citizens.map((c,i)=>{const id=aliases[c.id]||c.id.replace(/[^a-zA-Z0-9_-]/g,'_');return {id,name:c.name,role:c.role,preset:c.presetId,position:front[id]||[-10.3+i%8*1.55+(Math.floor(i/8)%2)*.3,6.7+Math.floor(i/8)*1.6],yaw:PI};})];
  const scenario={version:1,episode:'day2',day:2,title:DAY2_TITLE,notice:'DAY 2 · SUDAH DIBANGUN, BARU DITANYA',kind:'episode',set:'construction',props:[],template:'republic-series',worldPhaseOnComplete:'after-day2',cast,shots:[]};
  let progress=0;const state={board:'carried',table:'stage',folder:'closed',ribbon:'hidden',scissors:'tray',excavator:'parked',suitcase:'ground',phone:'recording',plan:'table'},facing=Object.fromEntries(cast.map(c=>[c.id,c.yaw])),moods=Object.fromEntries(cast.map(c=>[c.id,'neutral']));
  function add(id,label,duration,o={}){
    const actors=Object.fromEntries(cast.map(c=>[c.id,{action:'Idle',visible:true,yaw:facing[c.id],expression:moods[c.id],lookAt:c.id==='pasca'?'aulia':'pasca'}]));
    for(const [id,cue] of Object.entries(o.actors||{}))actors[id]={...actors[id],...cue};
    const s={id,editorialId:id,label,duration,camera:'medium',focus:'pasca',caption:'',buildProgress:progress,...o,actors,props:{...state,...o.props}};
    if(s.speeches?.length)s.duration=Math.max(duration,Math.max(...s.speeches.map(c=>c.offset+STORY_CLIPS[c.key].duration))-(s.speechTail||0)+.07);
    for(const [k,v] of Object.entries(s.props))state[k]=Array.isArray(v)?[v.at(-1),v.at(-1)]:typeof v==='object'?v.to:v;
    progress=Array.isArray(s.buildProgress)?s.buildProgress[1]:s.buildProgress;for(const [id,c] of Object.entries(actors)){facing[id]=c.yaw;moods[id]=c.expression;}
    scenario.shots.push(s);return s;
  }
  const crowd=()=>Object.fromEntries(cast.filter(c=>!['pasca','climenzo'].includes(c.id)).map((c,i)=>[c.id,{action:i%5===0?'Idle':'Protest',expression:'angry',delay:i%7*.055,lookAt:'pasca'}]));
  const president=()=>F([-5,1.9,-.1],2.1,.2,.08),two=()=>F([-4.5,1.85,-.1],2.5,.45,.13);
  const work=(id,action,at,yaw=PI,extra={})=>({[id]:{action,at,yaw,height:0,expression:'neutral',...extra}});
  add('W00',`Dari kepulauan ke ${WORLD_DESTINATIONS.jakarta.name}`,7.1,{camera:'wide',frame:M('descent',F([0,0,0],3000,-.6,2),F([-5,1.5,.6],5.2,.12,.16),0),speeches:[V('day2r4-narrator-01',.25)],overlay:`${WORLD_DESTINATIONS.jakarta.name.toUpperCase()} · IBU KOTA BARU`,actors:{pasca:T({gesture:'self',expression:'happy'})}});
  add('W01','DD mengincar jabatan Kapolri',1.5,{camera:'close',focus:'dd',frame:F([-7.8,1.5,3.1],2,2.5,.65),speeches:[V('day2r4-narrator-02',.02)],actors:{dd:T({yaw:2.5,gesture:'nod',expression:'happy',lookAt:'pasca'})}});
  add('W02','Asila mengincar kursi presiden',2.4,{camera:'close',focus:'asila',frame:F([-7.1,1.5,4.7],2.2,4.2,.65),speeches:[V('day2r4-narrator-03',.02)],actors:{asila:T({yaw:3.8,gesture:'self',expression:'happy',lookAt:'pasca'}),pasca:T({gesture:'look',expression:'confused',lookAt:'asila'})}});
  add('S01','Pasca menantang calon penggantinya',4,{frame:M('dolly',F([-5,1.9,-.1],2.65,.2,.1),president()),speeches:[V('day2r4-pasca-01',.02)],actors:{pasca:T({gesture:'self',expression:'happy',lookAt:'asila'}),asila:T({yaw:PI,gesture:'look',expression:'confused',lookAt:'pasca'})}});
  add('S02','Seluruh warga menagih kebutuhan',4.1,{camera:'wide',focus:'aulia',frame:M('truck',F([-5,1.2,7],13.8,PI-.25,.72),F([-4.5,1.3,7],12.6,PI-.12,.65)),speeches:[V(A(1),.05,.94),V('day2-eqa-01',.62,.45),V('day2-cecil-01',1.13,.47),V('day2-nopal-01',1.65,.66)],speechTail:.5,actors:{...crowd(),pasca:T({gesture:'dismiss',expression:'angry'})},protest:{level:.8}});
  add('S03','Pasca memotong keluhan',4.15,{frame:president(),speeches:[V(P(2),.02)],actors:{pasca:T({gesture:'stop',expression:'angry'})},protest:{level:.3,from:0,to:.25}});
  add('S04','Sumbangan disampaikan sambil maju',4.7,{focus:'climenzo',frame:M('truck',F([-1.1,1.35,.6],3.8,.55,.13),two(),.25),speeches:[V(C(1))],actors:{climenzo:{action:'Carry',path:[{to:[-1.3,-.3],height:0,at:.28},{to:[-2.7,-.3],height:.6,at:.65},{to:[-3.95,-.1],height:.6,at:1}],activeDuration:3.15,expression:'happy'},pasca:T({lookAt:'climenzo',expression:'happy'})},overlay:'SUMBANGAN WARGA · 5 TRILIUN'});
  add('S05','Pasca mengambil kredit',4.85,{frame:two(),speeches:[V(P(3))],actors:{pasca:{action:'Carry',expression:'happy',yaw:0},climenzo:{action:'Carry',yaw:0,expression:'confused'}},props:{board:'handover'}});
  add('S06','Donor belum selesai sudah disela',3.5,{frame:M('orbit',two(),F([-4.5,1.85,-.1],2.5,.15,.13)),speeches:[V(C(2)),V(P(4),1.62)],actors:{climenzo:T({expression:'confused'}),pasca:T({gesture:'self',expression:'happy'})},props:{board:{from:'handover',to:'stand',at:.06,until:.25}}});
  add('S07','Syarat donor diabaikan',2.7,{frame:two(),speeches:[V(C(3))],actors:{climenzo:T({expression:'confused',lookAt:'pasca'}),pasca:T({gesture:'dismiss',lookAt:'xel'})}});
  add('S08','Janji politik tetap didahulukan',5,{frame:M('dolly',president(),F([-5,1.8,-.1],3.1,.25,.12)),speeches:[V(P(5))],actors:{pasca:T({gesture:'stop',expression:'happy'})},overlay:'KOPLAK DESA + SATUAN PENGISI PERUT GRATIS'});
  add('S09','Protes warga bersahut-sahutan',3.2,{camera:'wide',focus:'eqa',frame:M('truck',F([-5.3,1.25,4.3],6.8,PI-.4,.40),F([-3.7,1.25,4.5],7.4,PI-.2,.38)),speeches:[V('day2-eqa-02',0,.94),V('day2-cecil-02',.15,.48),V(A(2),.25,.52),V('day2-nopal-02',.35,.44)],speechTail:.35,actors:{...crowd(),pasca:T({gesture:'dismiss',expression:'angry'}),climenzo:T({expression:'sad'})},protest:{level:1}});
  add('S10','Pasca merasa paling paham',4.95,{frame:president(),speeches:[V(P(6),.02)],actors:{pasca:T({gesture:'self',lookAt:'xel',expression:'angry'}),climenzo:T({expression:'sad'})},protest:{level:.4,from:0,to:.35}});
  add('S11','Mandor mulai bekerja',2.5,{timeJump:true,focus:'xel',frame:F([5.6,1.2,-3.7],4.8,.25,.16),speeches:[V('day2-xel-01')],actors:{...work('xel','Measure',[5.5,-3.5]),...work('ardhy','Idle',[7,-3.5],PI,{gesture:'nod',lookAt:'xel'})},props:{plan:'held'}});
  add('S12','Pengukuran dua tapak',2.2,{timeJump:true,focus:'xel',frame:F([3.5,.6,-4.8],3.4,.45,.55),actors:work('xel','Measure',[3.5,-4.7]),buildProgress:[0,1],overlay:'WAKTU PEMBANGUNAN DIPERCEPAT'});
  add('S13','Excavator menggali fondasi',4.3,{timeJump:true,focus:'ardhy',frame:F([9.2,1.3,-6.9],4.5,-.65,.18),actors:work('ardhy','Operate',[9.35,-7.38],-PI/2,{height:.8}),buildProgress:[1,2],props:{excavator:'digging'}});
  add('S14','Fondasi fasilitas dicor',3,{timeJump:true,camera:'wide',frame:F([-1.5,1.3,-7.2],22,.3,.65),actors:{...work('xel','Build',[3.6,-4.7]),...work('ardhy','Build',[-5.5,-5.7])},buildProgress:[2,3],props:{excavator:'parked'}});
  add('S15','Dinding berdiri',3.2,{timeJump:true,frame:M('truck',F([-.7,1.8,-4.6],7,.25,.15),F([6.8,1.8,-4.6],7,.25,.15)),actors:work('xel','Build',[3,-4.5]),buildProgress:[3,4]});
  add('S16','Dua atap terpasang',3.2,{timeJump:true,camera:'wide',frame:M('crane',F([-1.5,2.1,-7.2],22,.3,.15),F([-1.5,3.6,-7.2],22,.3,.55)),actors:{xel:{action:'Point',yaw:PI},ardhy:{action:'Build'}},buildProgress:[4,5]});
  add('S17','Cat pintu dan papan nama',2.8,{timeJump:true,frame:F([2.7,1.9,-4.5],6,.3,.1),actors:{...work('xel','Paint',[3.4,-4.3]),...work('ardhy','Paint',[-5.3,-5.7])},buildProgress:[5,6]});
  add('S18','Rak dan kasir Koplak Desa',2.4,{timeJump:true,interior:'koplak',focus:'kasir',frame:F([4,1.3,-7.4],3.8,.12,.28),actors:{...work('kasir','Build',[3.4,-6],-.5,{height:.24}),...work('xel','Idle',[-.9,-4.2],0)},buildProgress:[6,6.5],overlay:'KOPLAK DESA · TOKO DAN KASIR'});
  add('S19','Dapur dan konter SPPG',2.4,{timeJump:true,interior:'sppg',focus:'ardhy',frame:F([-7,1.1,-9],4.5,.12,.5),actors:work('ardhy','Build',[-5.4,-7],PI,{height:.24}),buildProgress:[6.5,7],overlay:'SPPG · DAPUR DAN KONTER'});
  add('S20','Dua gedung selesai presiden turun',5.2,{timeJump:true,camera:'wide',frame:M('dolly',F([-.6,2.4,-6.4],9.5,.4,.18),F([-1.5,2.3,-7],22,.4,.25)),actors:{pasca:{action:'Walk',path:[{to:[-2.7,-.3],height:.6,at:.35},{to:[-1.3,-.3],height:0,at:.55},{to:[0,-3.6],height:.05,at:1}],activeDuration:4.8},climenzo:{action:'Walk',path:[{to:[-2.7,-.3],height:.6,at:.35},{to:[-1.3,-.3],height:0,at:.6},{to:[-2.2,-4.4],height:0,at:1}],activeDuration:4.9},...work('kasir','Carry',[-2.4,-3.95],0,{to:[-1.45,-3.95],activeDuration:2}),...work('xel','Idle',[1.8,-3.5],0),...work('ardhy','Idle',[5.2,-4],0)},buildProgress:[7,8],extras:{cat:{visible:false,to:[-5.4,-4.7]},chicken:{visible:false,to:[-6.1,-4.2]}},props:{table:'moving',tableProgress:[.8,1],plan:'table',ribbon:{from:'hidden',to:'ready',at:.95}}});
  const ribbon=add('S21','Pasca meresmikan hasil kerja warga',7.05,{frame:F([0,1.15,-3.25],2.6,.2,.12),speeches:[V(P(7))],actors:{pasca:{action:'CutRibbon',yaw:0,expression:'happy',delay:6,activeDuration:.95},kasir:{action:'Walk',to:[-3.2,-3.4],activeDuration:1.7},xel:{action:'Applaud',delay:6,activeDuration:1}},props:{table:'ceremony',scissors:'hand',ribbon:{from:'ready',to:'cut',at:6.5/7.05}}});
  add('S22','Ayam dan kucing lebih dulu antre',2.2,{camera:'close',frame:F([-5.4,.5,-5.5],2.6,.15,.1),extras:{cat:{visible:true,to:[-5.4,-5.65],action:'walk'},chicken:{visible:true,to:[-5.9,-5.2],action:'walk'}},actors:{pasca:T({yaw:0,expression:'happy'}),climenzo:{action:'Applaud',yaw:0}},sound:'okeGas',musicOffset:0,musicVolume:.5});
  add('S23','Rumah warga masih sebatas fondasi',3.5,{camera:'wide',frame:M('crane',F([40,1,-28],27,.3,.42),F([47,1,-31],34,.3,.62)),speeches:[V('day2-narrator-02')],overlay:'PERMUKIMAN WARGA · BELUM SELESAI'});
  add('S24','Baru bertanya setelah membangun',2.6,{frame:F([0,1.4,-3.6],2.4,.15,.08),speeches:[V(P(8))],actors:{pasca:T({yaw:0,gesture:'self',expression:'happy'})}});
  add('S25','Warga menagih untuk didengar',3.35,{focus:'aulia',frame:F([-6.4,1.35,2.8],2.7,PI-.9,.1),speeches:[V(A(3))],actors:{aulia:T({expression:'angry'}),eqa:T({gesture:'nod',lookAt:'aulia'})}});
  add('S26','Pasca mengaku selalu mendengarkan',2.75,{frame:F([0,1.4,-3.6],2.5,.2,.08),speeches:[V(P(9))],actors:{pasca:T({yaw:0,gesture:'self',expression:'happy'})},props:{scissors:'tray',folder:'open'}});
  add('S27','Warga memilih pembangunan berikutnya',8.2,{camera:'wide',frame:M('crane',F([-1.5,2.1,-6.5],22,.4,.35),F([9,2,-12],44,.4,.55)),speeches:[V('day2r4-narrator-04')],survey:{title:'Selanjutnya, bangun apa?',choices:[{key:'A',label:'Sekolah'},{key:'B',label:'Rumah sakit'},{key:'C',label:'Rumah warga'},{key:'D',label:'Sentra usaha'},{key:'E',label:'Rumah ibadah'},{key:'F',label:'Jalan & transportasi'}],footer:'Pilih satu + alasan · usul lain boleh'}});
  let offset=0;for(const s of scenario.shots)if(/^S(12|13|14|15|16|17|18|19|20)$/.test(s.id)){if(offset+s.duration>music.duration)offset=0;s.sound='okeGas';s.musicOffset=offset;s.musicVolume=.38;offset+=s.duration;}
  ribbon.sound='okeGas';ribbon.musicOffset=0;ribbon.musicVolume=.25;
  scenario.audioStatus='recorded';return markBuiltInEpisode(scenario);
}
