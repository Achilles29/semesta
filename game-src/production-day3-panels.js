// Timeline-driven illustration of verified labels. No real account is submitted.
export const DAY3_PANELS=['register','profession','save','available','starter-plan','economy-plan'];
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
  const w=ctx.canvas.width,h=ctx.canvas.height,s=Math.min(w/1080,h/1080),left=w*.09,top=h*.21,width=w*.82,height=h*.37;
  ctx.save();ctx.fillStyle='rgba(17,43,51,.97)';ctx.fillRect(left,top,width,height);ctx.textAlign='left';ctx.textBaseline='middle';
  const text=(line,y,size=27,color='#f6eedb')=>{ctx.font=`600 ${size*s}px Arial`;ctx.fillStyle=color;ctx.fillText(line,left+width*.07,y,width*.86);};
  text(kind==='economy-plan'?'DALAM PENGEMBANGAN':'SIMULASI ALUR GAME',top+height*.1,22,'#e9c77c');
  const sets={
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
      text(['register','profession'].includes(kind)&&i>1?line.slice(0,Math.max(1,Math.ceil(line.length*reveal))):line,y,i===0?30:26);
    }
  });
  if(kind==='register')text('republikwkwkwk.com',top+height*.94,20,'#8ad1d0');
  ctx.restore();
}
