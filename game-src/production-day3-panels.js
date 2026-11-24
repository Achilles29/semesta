import {STORY_CLIPS} from './production-audio-catalog.js';
// Timeline-driven illustration of verified labels. No real account is submitted.
export const DAY3_PANELS=['register','profession','save','available','starter-plan','economy-plan','game-intro','proposal','closing','onboarding'];
// Readable draft pages only; these are not measured word timestamps or karaoke.
export function day3DraftCaption(sample){
  const text=sample.shot.plannedVoice?.text;
  if(typeof text!=='string'||(sample.shot.caption!==text&&!sample.shot.caption.endsWith(': '+text)))return sample.shot.caption;
  const words=text.split(/\s+/);if(!words.length)return sample.shot.caption;
  const pages=[],count=Math.ceil(words.length/6);let cursor=0;
  for(let i=0;i<count;i++){const size=Math.ceil((words.length-cursor)/(count-i));pages.push(words.slice(cursor,cursor+size).join(' '));cursor+=size;}
  return pages[Math.min(pages.length-1,Math.floor(Math.max(0,sample.elapsed)/sample.shot.duration*pages.length))];
}
export function drawDay3Panel(ctx,sample){
  const kind=sample?.shot.day3Panel;if(!kind)return;
  if(['onboarding','game-intro','starter-plan','available','proposal','closing'].includes(kind))return drawR3Flow(ctx,sample);
  const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w/1080,h/1080),left=w*.09,top=h*.21,width=w*.82,height=h*.37;
  ctx.save();const enter=Math.min(1,sample.elapsed/.5);ctx.globalAlpha=enter;ctx.translate(0,(1-enter)*35*s);
  ctx.shadowColor='#05182680';ctx.shadowBlur=40*s;ctx.fillStyle='rgba(12,34,53,.96)';ctx.beginPath();ctx.roundRect(left,top,width,height,24*s);ctx.fill();ctx.shadowBlur=0;
  const grad=ctx.createLinearGradient(left,top,left+width,top);grad.addColorStop(0,'#147c9a');grad.addColorStop(1,'#e66a60');ctx.fillStyle=grad;ctx.fillRect(left+20*s,top,Math.max(1,width-40*s),5*s);ctx.textAlign='left';ctx.textBaseline='middle';
  const text=(line,y,size=27,color='#f6eedb')=>{ctx.font=`600 ${size*s}px Arial`;ctx.fillStyle=color;ctx.fillText(line,left+width*.07,y,width*.86);};
  text(kind==='economy-plan'?'DALAM PENGEMBANGAN':'SIMULASI ALUR GAME',top+height*.1,22,'#e9c77c');
  const sets={
    'game-intro':['SEKARANG GILIRAN KAMU','01  Buat karakter & kartu warga','02  Terima rumah dan modal awal','03  Bertemu, membantu, mengusulkan','Hidupkan republik bersama warga'],
    proposal:['KOTA INI BUTUH APA?','Fasilitas: Taman bermain','Lokasi: Kampung Perintis','Alasan: Ruang bermain anak','Kirim → Inbox admin → Tinjauan'],
    closing:['BANGUN CERITAMU SENDIRI','republikwkwkwk.com','Usaha pertama kamu apa?','Tulis nama usaha + barang jualan','Ikuti kelanjutan kota warga'],
    register:['MASUK / DAFTAR WARGA','Jadi bagian dari republik','Username: warga.contoh','Email: warga@example.invalid','Kata sandi: ••••••••••'],
    profession:['Pilih karakter dan profesi','Karakter: perempuan','Profesi: petani','Saran pakaian mengikuti profesi','RACIK / PILIH AVATAR'],
    save:['BUAT AKUN & KARTU WARGA','Data contoh — tidak dikirim','Kartu warga terbit setelah berhasil','Tutup panel → jelajahi Jakartawa'],
    available:['YANG BISA DICOBA SEKARANG','Jelajahi peta dan temui warga','Chat pemain di sekitar','Rumah subsidi + tugas tanaman','Proyek P01 saat diaktifkan admin'],
    'starter-plan':['PAKET WARGA BARU','Rumah subsidi standar','1.000 Koin Republik','Alat dasar sesuai pekerjaan','Hadiah satu kali per akun'],
    'economy-plan':['CONTOH ALUR PETANI','Toko tani → benih + pupuk','Lahan → tanam dan panen','Pasar → jual hasil','Tabung → tingkatkan usaha / rumah'],
  };
  const lines=sets[kind]||[],fraction=Math.min(1,sample.elapsed/Math.max(1,sample.shot.duration*.65));
  lines.forEach((line,i)=>{
    const reveal=Math.max(0,Math.min(1,(fraction-i/lines.length)*lines.length));
    if(reveal>0){
      const y=top+height*(.24+i*.13);
      if(['register','profession'].includes(kind)&&reveal<1){ctx.fillStyle='rgba(233,199,124,.14)';ctx.fillRect(left+width*.04,y-21*s,width*.92,42*s);}
      ctx.globalAlpha=enter*reveal;const shift=(1-reveal)*12*s;
      if(i>0){ctx.fillStyle=i===lines.length-1?'#237486':'#ffffff0e';ctx.beginPath();ctx.roundRect(left+width*.04,y-22*s,width*.92,44*s,10*s);ctx.fill();}
      text(['register','profession'].includes(kind)&&i>1?line.slice(0,Math.max(1,Math.ceil(line.length*reveal))):line,y+shift,i===0?30:26);ctx.globalAlpha=enter;
    }
  });
  const steps=['game-intro','register','profession','save','starter-plan','available','proposal'],active=steps.indexOf(kind);
  if(active>=0){const gap=width*.86/steps.length;for(let i=0;i<steps.length;i++){ctx.fillStyle=i<=active?'#7edbc5':'#ffffff28';ctx.fillRect(left+width*.07+i*gap,top+height*.94,gap-6*s,4*s);}}
  ctx.restore();
}

/** A visibly staged interface walkthrough. Never submits an account or claim.
 * One state replaces the previous state; the viewer follows one example citizen.
 */
function drawR3Flow(ctx,sample){
  const kind=sample.shot.day3Panel,t=sample.elapsed,span=sample.shot.duration;
  const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w/1080,h/1080);
  const x=w*.07,y=h*(w>h?.34:.54),width=w*.86,height=h*(w>h?.40:.22);
  const box=(bx,by,bw,bh,color,r=18)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,r*s);ctx.fill();};
  const line=(value,by,size=29,color='#f3f7ff')=>{ctx.font=`700 ${size*s}px Arial`;ctx.fillStyle=color;ctx.fillText(value,x+width*.055,by,width*.89);};
  ctx.save();ctx.textAlign='left';ctx.textBaseline='middle';ctx.globalAlpha=Math.min(1,t/.18);
  box(x,y,width,height,'rgba(9,27,46,.95)');
  const steps=kind==='onboarding'?[
    ['MASUK KE REPUBLIK','republikwkwkwk.com','Pilih Daftar Warga','Satu akun, satu perjalanan'],
    ['DAFTAR WARGA','Nama: Warga Contoh','Username, email, kata sandi','Lengkapi data pendaftaran'],
    ['PILIH IDENTITASMU','Profesi: Petani','Pilih dan sesuaikan avatar','Buat Akun dan Kartu Warga'],
    ['KARTU WARGA TERBIT','WARGA CONTOH • PETANI','KTP virtual dalam game','Masuk → Jelajahi kota']
  ]:kind==='available'?[
    ['KETEMU WARGA LAIN','Jelajahi Jakartawa','Temui pemain yang sedang online','Berjalan bersama di kota'],
    ['NGOBROL LEWAT CHAT','Warga Contoh: Halo, tetangga!','Warga lain: Selamat datang!','Contoh percakapan pemain'],
    ['MULAI TUGAS PERTAMA','Temui Bu Rani','Buka tugas sambutan','Ikuti petunjuk di dalam game']
  ]:kind==='proposal'?[
    ['USULKAN PEMBANGUNAN','Fasilitas: Taman bermain','Lokasi: Kampung Perintis','Alasan: Tempat bermain warga'],
    ['USULAN TERKIRIM','Status: Menunggu tinjauan','Masuk ke inbox admin','Ditinjau dulu, bukan otomatis dibangun']
  ]:kind==='starter-plan'?[
    ['PAKET WARGA BARU','Rumah subsidi standar','1.000 Koin Republik','Alat dasar sesuai pekerjaan']
  ]:kind==='closing'?[
    ['GILIRAN KAMU MASUK','republikwkwkwk.com','Daftar → Buat Kartu Warga','Masuk dan hidupkan kotanya!']
  ]:[['SEKARANG BISA IKUT MAIN','Masuk langsung ke kota','Ketemu warga yang online','Buat perjalananmu sendiri']];
  // Change state at spoken concepts, then leave the result visible in the tail.
  const cue=sample.shot.speeches?.[0],words=STORY_CLIPS[cue?.key]?.words||[];
  const starts=kind==='onboarding'?['Daftar','profesi','Kartu']:kind==='available'?['chat','Bu']:kind==='proposal'?['Admin']:[];
  const boundaries=starts.map((word,i)=>{
    const found=words.find(w=>w.text.toLowerCase()===word.toLowerCase());
    return found?found.start+(cue?.offset??.08):span*(i+1)/steps.length;
  });
  const index=Math.min(steps.length-1,boundaries.filter(at=>t>=at).length),lines=steps[index];
  const accent=kind==='onboarding'&&index===3?'#76e3b8':'#ffcd73';
  box(x+width*.035,y+height*.04,width*.93,height*.16,'#173b59',8);
  line(kind==='closing'?'REPUBLIK WKWKWK':'SIMULASI ALUR GAME',y+height*.12,20,accent);
  line(lines[0],y+height*.30,32,accent);
  for(let i=1;i<lines.length;i++)line(lines[i],y+height*(.35+i*.16),i===1?31:25);
  const progress=Math.min(1,t/span);
  ctx.fillStyle='#ffffff24';ctx.fillRect(x+width*.055,y+height*.93,width*.89,5*s);
  ctx.fillStyle=accent;ctx.fillRect(x+width*.055,y+height*.93,width*.89*progress,5*s);
  ctx.restore();
}
