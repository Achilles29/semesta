"""V16 approved road satire: three original takes, sample-accurate dialogue and cues."""
import json, math, wave, urllib.request, hashlib
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/audio/produksi/episode-002'
SOURCE=BASE/'generated-v16'; OUT=BASE/'release-v16'; RATE=44100
plan=json.loads((SOURCE/'batch-plan.json').read_text(encoding='utf-8'))
assert not OUT.exists(), 'Keep released files immutable; use another version for revisions.'

def save(path,data):
    with path.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
def wav(path,data):
    a=np.asarray(data)
    if a.ndim==1:a=np.repeat(a[:,None],2,axis=1)
    with path.open('xb') as f:
        with wave.open(f,'wb') as w:
            w.setnchannels(a.shape[1]);w.setsampwidth(2);w.setframerate(RATE)
            w.writeframes(np.round(np.clip(a,-1,1)*32767).astype('<i2').tobytes())

parts={};sources=[]
for req in plan['requests']:
    meta=json.loads((SOURCE/(req['role']+'.metadata.json')).read_text(encoding='utf-8'))
    assert not meta['provider'].get('isError')
    p=json.loads(next(c['text'] for c in meta['provider']['content'] if c['type']=='text'))
    raw=SOURCE/(req['role']+'.source.pcm')
    if not raw.exists():urllib.request.urlretrieve(p['audio_url'],raw)
    contents=raw.read_bytes();assert contents[:4]!=b'RIFF'
    data=np.frombuffer(contents,dtype='<i2').astype(float)/32768
    assert abs(len(data)/RATE-p['duration'])<.03
    original=SOURCE/(req['role']+'.original.wav')
    if not original.exists():wav(original,data)
    chars=p['original_characters'];text=''.join(c['text'] for c in chars)
    assert text==req['request']['text']
    relative=raw.relative_to(BASE).as_posix()
    sources.append({'file':relative,'sha256':hashlib.sha256(contents).hexdigest(),'duration':len(data)/RATE,'voice_id':req['request']['voiceId'],'voice_name':req['voice_name']})
    for j,span in enumerate(req['spans']):
        start,end=span['start'],span['end'];lo=max(0,chars[start]['start_time']-.12);hi=min(len(data)/RATE,chars[end-1]['end_time']+.12)
        if j:lo=max(lo,(chars[req['spans'][j-1]['end']-1]['end_time']+chars[start]['start_time'])/2)
        if j+1<len(req['spans']):hi=min(hi,(chars[end-1]['end_time']+chars[req['spans'][j+1]['start']]['start_time'])/2)
        a=math.floor(lo*RATE);b=math.ceil(hi*RATE)
        parts[span['cue_id']]={'data':data[a:b].copy(),'chars':chars[start:end],'offset':a/RATE,'source_in':a,'source_out':b,'text':text[start:end],'source_file':relative,'voice_id':req['request']['voiceId']}

OUT.mkdir();segments=[];cues=[];cursor=0
for cue in plan['cues']:
    p=parts[cue['id']];a=p['data'];assert p['text']==cue['text'].replace('WKWKWK','wekawekaweka')
    active=a[np.abs(a)>.008];rms=float(np.sqrt(np.mean(active**2)))
    gain=min(2,.13/max(.001,rms),.8/max(.001,float(np.max(np.abs(a)))))
    a*=gain;start=cursor/RATE;segments.append(a);cursor+=len(a);end=cursor/RATE
    segments.append(np.zeros(round(cue['gap']*RATE)));cursor+=round(cue['gap']*RATE)
    filename=cue['id']+'-'+cue['role']+'.wav';wav(OUT/filename,a)
    cues.append({**cue,'spoken_text':p['text'],'start':start,'audio_end':end,'end':cursor/RATE,'file':filename,'voice_id':p['voice_id'],'source_file':p['source_file'],'gain_db':20*math.log10(gain),'inserted_holds':[],
      'source_to_cue_mapping':[{'source_start_frame':p['source_in'],'source_end_frame':p['source_out'],'cue_start_frame':0,'cue_end_frame':len(a)}],
      'characters':[{'text':c['text'],'start_time':start+c['start_time']-p['offset'],'end_time':start+c['end_time']-p['offset']} for c in p['chars']]})
voice=np.concatenate(segments);duration=len(voice)/RATE;by={c['id']:c for c in cues}
def at(n,phrase=None):
    c=by[f'v16-{n}'];return c['start'] if phrase is None else c['characters'][c['spoken_text'].index(phrase)]['start_time']
names=['Sandal dan lubang','Panggung datang','Jalan belum jadi','Rombongan tiba','Gunting bukan aspal','Kita mulai dulu','Nambalnya kapan','Di luar susunan acara','Geser untuk foto','Lubang disembunyikan','Potong pita','Sandal jadi bukti','Saatnya pulang','Mobil nyangkut','Turun langsung','Sekarang dorong','Aspal atau spanduk']
shots=[{'id':f'road-{i+1}','name':n,'start':cues[i]['start'],'end':cues[i]['end']} for i,n in enumerate(names)]
bounds=[at(1),at(4),at(7),at(9),at(13),at(15),duration]
scenes=[{'id':f'v16-scene-{i+1}','name':n,'start':bounds[i],'end':bounds[i+1]} for i,n in enumerate(['Jalan dan panggung','Harapan warga','Pertanyaan sederhana','Foto peresmian','Lubang menghadang','Turun langsung'])]
events={'arrival':at(4),'scissors':at(5),'question':at(7),'shuffle':at(9),'photo':at(10),'cut':at(11)-.45,'proof':at(12),'return':at(13),'drive':at(13)+1.6,'impact':at(14)-.45,'exit':at(14)+.25,'push':at(15)-.15,'clap':at(15,'Keprok'),'ending':at(17)}
assert events['impact']>events['drive']+.8

# Original playful pizzicato/marimba bed, arranged for this actual duration.
# No copied soundtrack and no tempo changes to any speech.
t=np.arange(len(voice))/RATE;music=np.zeros(len(voice));beat=60/112
def note(freq,when,length,level):
    start=round(when*RATE);n=min(round(length*RATE),len(music)-start)
    if n<=0:return
    x=np.arange(n)/RATE
    a=(np.sin(2*np.pi*freq*x)+.25*np.sin(2*np.pi*freq*3*x))*np.exp(-x*9)*np.clip(x/.007,0,1)
    music[start:start+n]+=a*level
chords=[[261.63,329.63,392],[293.66,349.23,440],[246.94,329.63,392],[261.63,349.23,440]]
for i in range(math.ceil(duration/beat)):
    when=i*beat;chord=chords[(i//8)%4]
    note(chord[0]/2,when,.35,.08)
    if i%2==0:note(chord[(i//2)%3]*2,when+beat/2,.28,.045)
    else:
        for f in chord:note(f,when,.23,.022)
duck=np.full(len(voice),.7)
for c in cues:duck[max(0,round((c['start']-.08)*RATE)):round((c['audio_end']+.1)*RATE)]=.35
duck[(t>=events['impact'])&(t<events['push'])]=0
duck=np.convolve(duck,np.ones(400)/400,mode='same')
music*=duck*np.clip(t/.12,0,1)*np.clip((duration-t)/.8,0,1)
fx=np.zeros(len(voice));rng=np.random.default_rng(16016);effects=[]
def effect(kind,when,length,level):
    n=round(length*RATE);x=np.arange(n)/RATE;noise=rng.standard_normal(n)
    if kind=='clap':a=noise*np.exp(-x*48)
    elif kind=='mud':a=np.convolve(noise,np.ones(30)/30,mode='same')*np.sin(np.pi*x/length)**2
    elif kind=='snip':a=noise*np.exp(-x*75)
    else:a=(np.sin(2*np.pi*(90*x-30*x*x))+.25*noise)*np.exp(-x*13)
    a*=level/max(.001,float(np.max(np.abs(a))));start=round(when*RATE);end=min(len(fx),start+n);fx[start:end]+=a[:end-start]
    effects.append({'type':kind,'time':when,'duration':length})
effect('mud',.55,.25,.07);effect('snip',events['cut'],.12,.08);effect('thud',events['impact'],.42,.17)
for start,count in [(at(11),4),(events['clap'],9)]:
    for i in range(count):effect('clap',start+.18*i,.14,.035)
dialogue=np.repeat(voice[:,None],2,axis=1);music=np.repeat(music[:,None],2,axis=1);fx=np.repeat(fx[:,None],2,axis=1)
mix=dialogue+music+fx;gain=min(1,.84/max(.001,float(np.max(np.abs(mix)))))
for name,a in [('master',mix),('dialogue',dialogue),('music',music),('fx',fx)]:wav(OUT/f'episode-002-v16-{name}.wav',a*gain)
values=[]
for i in range(math.ceil(duration*30)):
    a=voice[int(i*RATE/30):int((i+1)*RATE/30)]*gain;rms=float(np.sqrt(np.mean(a*a))) if len(a) else 0
    values.append(round(min(1,max(0,(rms-.008)/.12))**.65,3))
save(OUT/'speech-envelope.json',{'source':'episode-002-v16-dialogue.wav','fps':30,'method':'RMS, not phonemes','values':values})
save(OUT/'timeline.json',{'version':'v16','title':plan['title'],'duration':duration,'sample_rate':RATE,'cues':cues,'scenes':scenes,'shots':shots,'events':events,'effects':effects,'sources':sources,
 'speech_speed':1,'speech_pitch':1,'requested_model':'server-selected','returned_model':'not supplied','timing_provenance':'Provider character timestamps; not independent transcription',
 'review_status':'Technical checks only; full listening and delivery match not verified','sample_peak_dbfs':20*math.log10(float(np.max(np.abs(mix*gain)))),
 'music_provenance':'Original synthesized marimba/pizzicato; build_v16_release.py seed 16016','publication_caption':'Parodi fiksi / dialog rekaan / suara AI. Follow jadi warga Republik WKWKWK. Di tempatmu, duluan aspal atau spanduk?'})
print(json.dumps({'duration':duration,'events':events,'cues':len(cues)},ensure_ascii=False))
