"""Install the approved R3 script and write the per-voice synthesis plan.

No network calls or speech generation. Existing audio takes remain immutable.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'game-src/production-day3-script.json'
old = json.loads(path.read_text(encoding='utf-8'))
actors = old['actors']
actors['sari'] = dict(name='Sari', preset='v15-laras', voice='Annie - Excited', gender='female', voiceId='3e3d02302c2f4da498ea6d8a4d9ffbf6')
actors['livia'] = dict(name='livia', preset='v15-warga-livia', voice='Tidak berdialog', gender='female')
actors['angel'] = dict(name='angel', preset='v15-warga-angel', voice='Tidak berdialog', gender='female')
shots=[]
def speech(id, who, beat, text, **extra):
    shots.append(dict(id=id,label=text[:75],speaker=who,beat=beat,text=text,spokenText=text,audioKey='day3r3-'+id.lower(),duration=4,**extra))
def silent(id, beat, duration, label, **extra):
    shots.append(dict(id=id,label=label,speaker=None,beat=beat,text='',duration=duration,**extra))

speech('I00','narrator','arrival','Hari ketiga Republik Wekawekaweka. Duitnya dari warga. Tapi yang paling bangga… presidennya.',minDuration=7)
speech('D00','pasca','plaza','Semua ini berkat kerja keras saya!',gesture='boast',expression='happy',gestureDelay=.3)
speech('D01','climenzo','plaza','Pak, lima triliunnya dari saya.',reactions={'pasca':dict(action='Idle',gesture='sneer',expression='angry',gestureDelay=.6)})
shots[-1]['audioKey']='day3r2-d01'
speech('D02','pasca','plaza','Saya yang menerima!',gesture='boast',expression='happy',gestureDelay=.25)
speech('D04','eqa','plaza','Pak, sekolahnya!',gesture='talk')
speech('D05','cecil','plaza','Rumah sakit juga!',gesture='talk')
speech('D07','xel','start-build','Siap. Mulai dari fondasi!',gesture='talk')
for i,ids in enumerate([['masjid','gereja-kristen'],['gereja-katolik','pura'],['vihara','kelenteng']]):
    silent('M0'+str(i+1),'worship-pair',2,'Enam rumah ibadah',buildIds=ids,music=True)
silent('M04','school',2.5,'Sekolah Raya Republik',music=True,overlay='SEKOLAH RAYA REPUBLIK')
silent('M05','hospital',2.5,'Rumah sakit megah',music=True,overlay='RSUD REPUBLIK WKWKWK')
silent('M06','stadium',2,'Stadion warga',music=True,overlay='STADION WARGA')
silent('M07','safety',3,'Damkar, polisi dan tentara',music=True,overlay='DAMKAR • POLISI • MARKAS TENTARA')
silent('M08','homes-build',4,'Rumah untuk warga perintis',music=True,overlay='KAMPUNG PERINTIS')
silent('H00','home-sign',2,'Papan rumah Demian')
speech('D18','demian','homes-reaction','Ada nama saya! Pak, jangan sekalian dipasang foto Bapak.',gesture='talk')
speech('D19','pasca','homes-reaction','Ide bagus.',gesture='nod',expression='happy',gestureDelay=.1,minDuration=1.6,reactions={'demian':dict(action='Idle',expression='surprised')})
silent('H01','livia-home',3.5,'Rumah pink Livia',overlay='LIVIA • RUMAH PINK BERTINGKAT')
silent('H02','angel-home',3.5,'Vila Angel',overlay='ANGEL • VILA Rp200 MILIAR DALAM CERITA')
speech('D23','demian','game-question','Kita bisa masuk beneran ke sini?',gesture='talk')
speech('G00','narrator','game-intro','Bisa. Sekarang warga bisa masuk langsung, ketemu pemain lain yang sedang online.')
speech('D24','sari','register','Buka republik wekawekaweka dot kom. Daftar, pilih profesi dan avatar, lalu buat Kartu Warga. Ini KTP kamu di game.',minDuration=12)
speech('D27','sari','starter','Setelah pendaftaran lengkap, dapat rumah subsidi, seribu Koin Republik, dan alat dasar sesuai pekerjaan.',minDuration=7)
speech('G02','demian','starter-reaction','Nah, ada modalnya!',gesture='talk')
speech('D28','sari','available','Bisa jelajah kota, ngobrol lewat chat dengan warga yang online, dan mengerjakan tugas Bu Rani.',minDuration=8)
speech('G03','demian','proposal-question','Kalau mau taman?',gesture='talk')
speech('G01','sari','proposal','Buka Usulkan pembangunan. Tulis lokasi dan alasannya. Admin meninjau dulu.',minDuration=7)
speech('W00','narrator','waiting','Belum muncul di cerita? Sabar, kamu nggak dilupakan. Warganya kami masukkan bertahap. Mainnya sudah bisa ikut.')
speech('D30','pasca','final-credit','Yang penting, ingat siapa yang berjasa!',gesture='boast',expression='happy',gestureDelay=.3)
speech('E01','demian','final-answer','Climenzo!',gesture='talk',minDuration=1.5)
silent('E02','final-reaction',1.2,'Pasca kehilangan panggung',reactions={'pasca':dict(action='Idle',gesture='shrug',expression='angry',gestureDelay=.1)})
speech('D32','sari','closing','Giliran kamu. Daftar dan masuk ke kotanya!',minDuration=4)

script=dict(version=1,revision='r3',title=old['title'],status='r3_audio_preparing',website=old['website'],actors=actors,shots=shots)
path.write_text(json.dumps(script,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
plans=[]
for who,a in actors.items():
    cues=[dict(key=r['audioKey'],shot=r['id'],**r) for r in shots if r.get('speaker')==who and r.get('audioKey','').startswith('day3r3-')]
    if cues: plans.append(dict(actor=who,voiceId=a['voiceId'],voiceName=a['voice'],language='id',submittedText='\n\n'.join(r['spokenText'] for r in cues),sourceCues=cues))
out=ROOT/'docs/script/day3-audio-work/r3-plan.json'
out.write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(shots)} shots; {len(plans)} new voice masters planned; Climenzo take reused.')
