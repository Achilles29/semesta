"""Approved longer ending: one retained HeyGen take, original 1–16, aligned captions.
Run once after generation. No paid service calls and no overwrite of prior releases.
"""
import copy, hashlib, importlib.util, json, math, re, urllib.request, wave
from pathlib import Path
import numpy as np
from PIL import ImageFont

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/audio/produksi/episode-002'
OLD=BASE/'release-v16'; PREV=BASE/'release-v16-r2'
SOURCE=BASE/'generated-v16-r3'; OUT=BASE/'release-v16-r3'; SR=44100
assert not OUT.exists(), 'Keep previous exports immutable; choose a new release.'
plan=json.loads((SOURCE/'ending-plan.json').read_text(encoding='utf-8'))
meta=json.loads((SOURCE/'ending.metadata.json').read_text(encoding='utf-8'))
assert not meta['provider'].get('isError')
result=json.loads(next(c['text'] for c in meta['provider']['content'] if c['type']=='text'))
chars=result['original_characters']
assert ''.join(c['text'] for c in chars)==plan['request']['text']
raw=SOURCE/'ending.source.pcm'
if not raw.exists(): urllib.request.urlretrieve(result['audio_url'],raw)
assert raw.read_bytes()[:4]!=b'RIFF'
take=np.frombuffer(raw.read_bytes(),dtype='<i2').astype(float)/32768
assert abs(len(take)/SR-result['duration'])<1/SR

def wav(path,data):
    if data.ndim==1: data=np.repeat(data[:,None],2,axis=1)
    assert np.isfinite(data).all() and np.max(np.abs(data))<1
    with wave.open(str(path),'wb') as w:
        w.setnchannels(data.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.round(data*32768).astype('<i2').tobytes())

def read(path):
    with wave.open(str(path),'rb') as w:
        assert (w.getframerate(),w.getnchannels(),w.getsampwidth())==(SR,2,2)
        return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768

def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

if not (SOURCE/'ending.original.wav').exists(): wav(SOURCE/'ending.original.wav',take)
timeline=json.loads((OLD/'timeline.json').read_text(encoding='utf-8'))
start=timeline['cues'][16]['start']; join=round(start*SR)
active=take[np.abs(take)>.008]
gain=min(2,.13/np.sqrt(np.mean(active**2)),.74/np.max(np.abs(take)))
frames=join+len(take)+round(1.1*SR); duration=frames/SR
voice=np.zeros((frames,2));fx=np.zeros_like(voice)
voice[:join]=read(PREV/'episode-002-v16-r2-dialogue.wav')[:join]
voice[join:join+len(take)]=take[:,None]*gain
old_fx=read(PREV/'episode-002-v16-r2-fx.wav');fx[:len(old_fx)]=old_fx
ending=dict(id='v16-17',role='narator',text=plan['approved_text'],spoken_text=plan['request']['text'],
    gap=1.1,start=start,audio_end=(join+len(take))/SR,end=duration,file='v16-17-narator.wav',
    voice_id=plan['request']['voiceId'],source_file='../generated-v16-r3/ending.source.pcm',
    gain_db=20*math.log10(gain),inserted_holds=[],
    source_to_cue_mapping=[dict(source_start_frame=0,source_end_frame=len(take),cue_start_frame=0,cue_end_frame=len(take))],
    characters=[dict(text=c['text'],start_time=start+c['start_time'],end_time=start+c['end_time']) for c in chars])
timeline['cues']=timeline['cues'][:16]+[ending]
timeline.update(version='v16-r3',duration=duration,review_status='Technical and layout review; full listening/browser review not performed')
timeline['scenes'][-1]['end']=duration

def at(phrase): return ending['characters'][ending['spoken_text'].index(phrase)]['start_time']

anchors=[('Dorong dulu',start),('Warga menentukan',at('Sekarang,')),('Daftar jadi warga',at('Follow')),
         ('Komentar membangun republik',at('Republik ini kita bangun')),('Pilihan untuk jalan',at('Mulai')),
         ('Usulan jadi episode berikutnya',at('Tulis')),('Bukan spanduk saja',at('Biar'))]
timeline['shots']=timeline['shots'][:16]+[dict(id=f'road-{17+i}',name=name,start=a,end=anchors[i+1][1] if i+1<len(anchors) else duration) for i,(name,a) in enumerate(anchors)]
timeline['events'].update(ending=start,warga=at('Sekarang,'),follow=at('Follow'),comments=at('Republik ini kita bangun'),
    choice=at('Mulai'),proposal=at('Tulis'),banner=at('Biar'))
timeline['sources'].append(dict(file='../generated-v16-r3/ending.source.pcm',sha256=hashlib.sha256(raw.read_bytes()).hexdigest(),
    duration=len(take)/SR,voice_id=plan['request']['voiceId']))
timeline['publication_caption']='Parodi fiksi / dialog rekaan / suara AI. Follow jadi warga Republik WKWKWK! Republik ini kita bangun dari komentar kalian. Jalan ditambal, kolam lele, atau ide lain? Usulan terpilih kita wujudkan di episode berikutnya.'

# Continue the existing original 128 BPM composition at its musical position.
spec=importlib.util.spec_from_file_location('hepi',ROOT/'ilustrasi/musik/warga-lagi-hepi/buat_musik.py')
score=importlib.util.module_from_spec(spec);spec.loader.exec_module(score)
music=np.zeros_like(voice);rng=np.random.default_rng(161702);notes=[]
t=np.arange(frames)/SR; impact=timeline['events']['impact'];push=timeline['events']['push']
last_word=ending['characters'][-1]['end_time']

def note(kind,pitch,when,hold,level,pan=0):
    a=round(when*SR)
    if a>=frames:return
    sound=score.synth(kind,pitch,hold,rng)*level;n=min(len(sound),frames-a)
    theta=(pan+1)*math.pi/4
    music[a:a+n,0]+=sound[:n]*math.cos(theta);music[a:a+n,1]+=sound[:n]*math.sin(theta)
    notes.append(dict(kind=kind,pitch=pitch,start=when,duration=hold))

for offset,end in [(0,impact),(push,last_word-.2)]:
    for e in score.events:
        when=offset+e['beat']*score.BEAT
        if when>=end:continue
        balance=.48 if e['kind']=='whistle' else .8 if e['kind']=='reed' else 1
        note(e['kind'],e['pitch'],when,e['duration']*score.BEAT,e['gain']*balance,e['pan'])
for i,pitch in enumerate([72,76,79]): note('marimba',pitch,timeline['events']['cut']+i*.085,.15,.10,.18)
# A brief C-major landing AFTER the final line. No endless loop or cutoff over speech.
for i,pitch in enumerate([60,64,67,72]): note('pluck',pitch,last_word+.08+i*.018,.35,.07,-.12)
note('bass',36,last_word+.08,.4,.11)
note('marimba',84,last_word+.14,.35,.07,.2)
gate=1-np.clip((t-impact+.055)/.055,0,1)+np.clip((t-push)/.065,0,1)
gate*=np.clip((duration-t)/.5,0,1)
speech=np.zeros(frames)
for c in timeline['cues']:
    # Duck each phrase; longer paragraph gaps may let the bed breathe naturally.
    words=list(re.finditer(r'[^.!?\n]+[.!?]?',c['spoken_text']))
    for match in words:
        a,b=match.span()
        if not c['spoken_text'][a:b].strip():continue
        lo=c['characters'][a]['start_time'];hi=c['characters'][b-1]['end_time']
        speech=np.maximum(speech,np.minimum(np.clip((t-lo+.09)/.09,0,1),np.clip((hi+.22-t)/.22,0,1)))
music*=((.64-.34*speech)*gate)[:,None]
# Preserve the existing first 16 cues and all preceding mix samples exactly.
previous_music=read(PREV/'episode-002-v16-r2-music.wav')
cross=round(.08*SR)
blend=np.linspace(0,1,cross)[:,None]
music[join:join+cross]=previous_music[join:join+cross]*(1-blend)+music[join:join+cross]*blend
music[:join]=previous_music[:join]
mix=voice+music+fx
mix[:join]=read(PREV/'episode-002-v16-r2-master.wav')[:join]
assert np.max(np.abs(mix))<.85

# Captions 1–16 remain byte-equivalent in meaning and timing; only ending changes.
subtitle_doc=json.loads((PREV/'subtitles.json').read_text(encoding='utf-8'))
captions=[c for c in subtitle_doc['cues'] if c['cue_id']!='v16-17']
phrases=['Pejabatnya dorong dulu.','Sekarang, warga yang nentuin!',
    'Follow buat jadi warga','Republik wekawekaweka.','Di sini, kalian bukan cuma penonton.',
    'Kalian ikut nentuin','republik ini mau jadi apa!','Republik ini kita bangun','dari komentar kalian.',
    'Mulai dari jalan ini:','mau ditambal,','atau dibikin kolam lele?','Tulis usulanmu!',
    'Yang terpilih kita wujudkan','di episode berikutnya.','Biar yang nambah','bukan spanduk doang!']
font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',52);width=1080*.6-32

def wrap(text):
    if font.getlength(text)<=width:return [text]
    words=text.split();options=[(' '.join(words[:i]),' '.join(words[i:])) for i in range(1,len(words))]
    options=[x for x in options if max(map(font.getlength,x))<=width]
    assert options,'Caption too wide: '+text
    return list(min(options,key=lambda x:abs(font.getlength(x[0])-font.getlength(x[1]))))

cursor=0
for i,phrase in enumerate(phrases):
    a=ending['spoken_text'].index(phrase,cursor);b=a+len(phrase)
    assert not ending['spoken_text'][cursor:a].strip()
    cursor=b;text=phrase.replace('wekawekaweka','WKWKWK')
    captions.append(dict(id=f'v16-r3-ending-{i+1}',cue_id='v16-17',speaker='narator',
        start=ending['characters'][a]['start_time'],speech_end=ending['characters'][b-1]['end_time'],
        end=ending['characters'][b-1]['end_time']+.18,text=text,spoken_text=phrase,lines=wrap(text),
        source_character_start=a,source_character_end=b,mode='subtitle'))
assert not ending['spoken_text'][cursor:].strip()
warnings=[]
for i,c in enumerate(captions):
    if c['cue_id']=='v16-17' and i+1<len(captions):c['end']=min(c['end'],captions[i+1]['start'])
    assert 0<=c['start']<c['end']<=duration
    if i:assert c['start']>=captions[i-1]['end']
    cps=len(c['text'])/(c['end']-c['start']);c['characters_per_second']=round(cps,2)
    if cps>20 or c['end']-c['start']<.8:warnings.append(dict(id=c['id'],cps=round(cps,2),duration=c['end']-c['start']))
for c in timeline['cues']:
    assert ' '.join(x['spoken_text'] for x in captions if x['cue_id']==c['id']).split()==c['spoken_text'].split()
subtitle_doc.update(version='v16-r3',duration=duration,cues=captions,timing_source='timeline.json:characters')

def stamp(seconds,sep=','):
    ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}{sep}{ms:03}'

OUT.mkdir()
for name,a in [('master',mix),('dialogue',voice),('music',music),('fx',fx)]:wav(OUT/f'episode-002-v16-r3-{name}.wav',a)
wav(OUT/'v16-17-narator.wav',take*gain)
for extension,sep in [('srt',','),('vtt','.')]:
    content='WEBVTT\n\n' if extension=='vtt' else ''
    for i,c in enumerate(captions,1):content+=f"{i}\n{stamp(c['start'],sep)} --> {stamp(c['end'],sep)}\n"+'\n'.join(c['lines'])+'\n\n'
    (OUT/f'subtitles.{extension}').write_text(content,encoding='utf-8')
for c in timeline['cues'][:16]:c['file']='../release-v16/'+c['file']
save('timeline.json',timeline);save('subtitles.json',subtitle_doc)
values=[]
for i in range(math.ceil(duration*30)):
    segment=voice[int(i*SR/30):int((i+1)*SR/30)]
    rms=float(np.sqrt(np.mean(segment**2))) if len(segment) else 0
    values.append(round(min(1,max(0,(rms-.008)/.12))**.65,3))
save('speech-envelope.json',dict(source='episode-002-v16-r3-dialogue.wav',fps=30,method='RMS, not phonemes',values=values))
save('music-score.json',dict(bpm=128,composition_source='ilustrasi/musik/warga-lagi-hepi/buat_musik.py',events=notes,ending_landing=last_word+.08))
save('review.json',dict(version='v16-r3',duration=duration,ending_source_duration=len(take)/SR,
    retained_prefix_frames=join,retained_prefix_seconds=start,speech_speed=1,speech_pitch=1,
    peak_dbfs=20*math.log10(np.max(np.abs(mix))),subtitles=len(captions),shots=len(timeline['shots']),
    timing_warnings=warnings,full_spoken_text_covered=True,listening_review='not_performed',browser_av_review='not_performed'))
print(json.dumps(dict(duration=duration,ending_duration=len(take)/SR,shots=len(timeline['shots']),subtitles=len(captions),warnings=warnings),indent=2))
