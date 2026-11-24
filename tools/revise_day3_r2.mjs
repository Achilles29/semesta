import fs from 'node:fs';
const path='game-src/production-day3-script.json',s=JSON.parse(fs.readFileSync(path,'utf8'));
if(s.revision==='day3-r2')throw Error('Revision already applied');
const shot=(id,speaker,beat,text,duration=7)=>({id,label:text.split('. ')[0],speaker,beat,text,spokenText:text,duration});
s.shots.unshift(
  shot('I00','narrator','arrival','Hari ketiga Republik Weka Weka Weka. Lima triliun sudah masuk. Hari ini, warga mau lihat uangnya berubah jadi apa.',9),
  shot('I01','narrator','river-intro','Dari tepi sungai Jakartawa, kita menuju alun-alun. Warganya membawa kebutuhan. Presidennya membawa rasa percaya diri.',8));
const changes={D00:'Tenang! Semua pembangunan ini berkat kerja keras saya!',D03:'Sekolah, rumah sakit, tempat ibadah, sampai rumah warga. Hari ini, janji itu harus kelihatan bentuknya.',D09:'Masjid, gereja Kristen, dan gereja Katolik. Halamannya berbeda, jalan bertetangganya tetap tersambung.',D24:'Buka republik weka weka weka titik kom. Pilih Daftar Warga. Sekarang, giliran kamu masuk ke ceritanya.',D28:'Jelajahi kota, sapa pemain di dekatmu, lalu mampir ke rumah. Bantu Bu Rani untuk mendapat tanaman. Proyek bersama tersedia saat dibuka admin.',D29:'Rumah bernama warga cerita tetap menunggu verifikasi klaim. Nama yang sama belum tentu orang yang sama. Jadi rumahmu jangan sampai salah penghuni.',D30:'Kalau usaha warga ramai, berarti ide saya berhasil.',D31:'Kalau sepi, siapa yang tanggung jawab, Pak?',D32:'Republiknya mulai berdiri. Sekarang, warga yang bikin hidup. Usaha pertama apa yang kamu buka? Tulis nama usahamu dan barang yang mau dijual.'};
for(const r of s.shots)if(changes[r.id])r.text=r.spokenText=changes[r.id];
const insertAfter=(id,rows)=>s.shots.splice(s.shots.findIndex(r=>r.id===id)+1,0,...rows);
insertAfter('D23',[shot('G00','narrator','game-intro','Betul. Ini bukan cuma tontonan. Republik Weka Weka Weka sedang jadi game kehidupan warga. Kamu punya karakter, rumah, dan awal perjalananmu sendiri.',9)]);
insertAfter('D29',[shot('W00','narrator','waiting','Yang namanya belum kebagian muncul, sabar dulu, ya. Kita tata warga dan rumahnya bertahap. Belum tampil bukan berarti dilupakan. Yang penting, jangan rebutan kursi presiden dulu.',11)]);
insertAfter('D31',[shot('E00','pasca','plaza','Kita bentuk tim evaluasi.',3),shot('E01','demian','plaza','Timnya butuh kantor lagi, kan?',4)]);
s.actors.demian.voice='Brodie - Breezy & Genuine';s.actors.demian.voiceId='c30ecab014cb4a8d816d07f6b2b625c8';
s.revision='day3-r2';s.status='audio-production';
for(const r of s.shots)r.audioKey=`day3r2-${r.id.toLowerCase()}`;
fs.writeFileSync(path,JSON.stringify(s,null,2)+'\n');
const takes=Object.entries(s.actors).flatMap(([id,a])=>{const rows=s.shots.filter(r=>r.speaker===id);return rows.length?[{actor:id,voiceId:a.voiceId,voiceName:a.voice,text:rows.map(r=>r.spokenText).join('\n\n'),sourceCues:rows.map(r=>({key:r.audioKey,shot:r.id,text:r.text,spokenText:r.spokenText,speaker:id}))}]:[]});
fs.mkdirSync('docs/script/day3-audio-work',{recursive:true});fs.writeFileSync('docs/script/day3-audio-work/takes.json',JSON.stringify(takes,null,2)+'\n');console.log(takes.map(t=>({actor:t.actor,characters:t.text.length,cues:t.sourceCues.length})));
