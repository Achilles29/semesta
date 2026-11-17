"""Reproducible V15 mix. One new narrator take; unchanged V13 cast takes, all 1x."""
import json, math, wave, urllib.request, hashlib
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/audio/produksi/episode-002'
SOURCE=BASE/'generated-v15'; OUT=BASE/'release-v15'; RATE=44100
plan=json.loads((SOURCE/'batch-plan.json').read_text(encoding='utf-8'))
assert not OUT.exists(), 'Release exists; retain originals and use a new release path.'

def save(path,data):
    with path.open('x',encoding='utf-8') as f: json.dump(data,f,ensure_ascii=False,indent=2)
def wav(path,data):
    a=np.asarray(data)
    if a.ndim==1:a=np.repeat(a[:,None],2,axis=1)
    with path.open('xb') as f:
        with wave.open(f,'wb') as w:
            w.setnchannels(a.shape[1]);w.setsampwidth(2);w.setframerate(RATE)
            w.writeframes(np.round(np.clip(a,-1,1)*32767).astype('<i2').tobytes())
def readwav(path):
    with wave.open(str(path),'rb') as w:
        assert w.getframerate()==RATE and w.getsampwidth()==2
        a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,w.getnchannels())/32768
    return np.repeat(a,2,axis=1) if a.shape[1]==1 else a

parts={}; sources=[]
requests=plan['requests'].copy()
for reuse in plan['reuse']:
    old=json.loads((BASE/'generated-v13/batch-plan.json').read_text(encoding='utf-8'))
    req=next(r for r in old['requests'] if r['role']==reuse['role'])
    requests.append({**req,'reuse':True,'spans':[{'cue_id':reuse['cue_id'],'start':0,'end':len(req['request']['text'])}]})
for req in requests:
    folder=BASE/'generated-v13' if req.get('reuse') else SOURCE
    meta=json.loads((folder/(req['role']+'.metadata.json')).read_text(encoding='utf-8'))
    assert not meta['provider'].get('isError')
    p=json.loads(next(c['text'] for c in meta['provider']['content'] if c['type']=='text'))
    raw=folder/(req['role']+'.source.pcm')
    if not raw.exists():urllib.request.urlretrieve(p['audio_url'],raw)
    contents=raw.read_bytes();assert contents[:4]!=b'RIFF'
    data=np.frombuffer(contents,dtype='<i2').astype(float)/32768
    assert abs(len(data)/RATE-p['duration'])<.03
    original=folder/(req['role']+'.original.wav')
    if not original.exists():wav(original,data)
    chars=p['original_characters'];text=''.join(c['text'] for c in chars)
    assert text==req['request']['text']
    relative=raw.relative_to(BASE).as_posix()
    sources.append({'file':relative,'sha256':hashlib.sha256(contents).hexdigest(),'duration':len(data)/RATE,'voice_id':req['request']['voiceId'],'reused':bool(req.get('reuse'))})
    for j,span in enumerate(req['spans']):
        start,end=span['start'],span['end']
        lo=max(0,chars[start]['start_time']-.12);hi=min(len(data)/RATE,chars[end-1]['end_time']+.12)
        if j:lo=max(lo,(chars[req['spans'][j-1]['end']-1]['end_time']+chars[start]['start_time'])/2)
        if j+1<len(req['spans']):hi=min(hi,(chars[end-1]['end_time']+chars[req['spans'][j+1]['start']]['start_time'])/2)
        a=math.floor(lo*RATE);b=math.ceil(hi*RATE)
        parts[span['cue_id']]={'data':data[a:b].copy(),'chars':chars[start:end],'offset':a/RATE,'source_in':a,'source_out':b,'text':text[start:end],'source_file':relative,'voice_id':req['request']['voiceId']}

OUT.mkdir();segments=[];cues=[];cursor=0
for cue in plan['cues']:
    p=parts[cue['id']];a=p['data'];assert p['text']==cue['text'].replace('WKWKWK','wekawekaweka')
    active=a[np.abs(a)>.008];rms=float(np.sqrt(np.mean(active**2)))
    gain=min(2,.13/max(.001,rms),.8/max(.001,float(np.max(np.abs(a)))))
    a*=gain
    start=cursor/RATE;segments.append(a);cursor+=len(a);end=cursor/RATE
    gap=.75 if cue['id']=='v15-10' else .16
    segments.append(np.zeros(round(gap*RATE)));cursor+=round(gap*RATE)
    file=cue['id']+'-'+cue['role']+'.wav';wav(OUT/file,a)
    cues.append({**cue,'display_text':cue['text'],'spoken_text':p['text'],'start':start,'audio_end':end,'end':cursor/RATE,'file':file,'voice_id':p['voice_id'],'source_file':p['source_file'],'gain_db':20*math.log10(gain),'inserted_holds':[],
        'source_to_cue_mapping':[{'source_start_frame':p['source_in'],'source_end_frame':p['source_out'],'cue_start_frame':0,'cue_end_frame':len(a)}],
        'characters':[{'text':c['text'],'start_time':start+c['start_time']-p['offset'],'end_time':start+c['end_time']-p['offset']} for c in p['chars']]})
voice=np.concatenate(segments);duration=len(voice)/RATE;by={c['id']:c for c in cues}
def at(n,phrase=None):
    c=by['v15-'+str(n)]
    return c['start'] if phrase is None else c['characters'][c['spoken_text'].index(phrase)]['start_time']
shotdefs=[
 ('chair','Kursi, bukan warisan',at(1)),('bahlil','Saya siap',at(2)),('establish','Pendaftaran',at(3)),
 ('cv','Pengalaman',at(4)),('photo','Foto keluarga',at(4,'foto keluarga')),('rules','Syarat berubah',at(4,'Syaratnya')),
 ('leader','Pak Ketua hemat',at(5)),('committee','Kursi bertambah',at(5,'Ada ketua')),('reveal','Jalur terhalang',at(5,'Ini nyari')),
 ('gufron','Keprok atuh',at(6)),('complaint','Warga maju',at(7)),('receipts','Tiga kunjungan',at(7,'Sudah tiga')),
 ('move','Kursi dipindah',at(8)),('challenge','Tadi paling siap',at(8,'Bahlil')),('sit','Silakan duduk',at(8,'Silakan')),
 ('reaction','Mulai bekerja',at(9)),('queue','Antrean warga',at(9,'Di belakang')),('ending','Kursi dan kerjaan',at(10)),
]
shots=[{'id':id,'name':name,'start':start,'end':shotdefs[i+1][2] if i+1<len(shotdefs) else duration} for i,(id,name,start) in enumerate(shotdefs)]
assert all(s['end']>s['start'] for s in shots)
events={'photo':at(4,'foto keluarga'),'rules':at(4,'Malah'),'committee':[at(5,'ketua,'),at(5,'wakil,'),at(5,'penasihat')],
 'complaint':at(7,'Dia maju'),'chair_move':at(8,'Kursinya'),'challenge':at(8,'Bahlil'),'sit':at(8,'Silakan'),
 'folder':at(9),'smile_drop':at(9,'senyumnya'),'write':at(9,'Di belakang')}
bounds=[at(1),at(4),at(5),at(6),at(8),at(9),duration]
names=['Kursi bukan warisan','Foto dan syarat','Efisiensi kursi','Pengaduan warga','Tes pertama','Mau kursi? Kerja.']
scenes=[{'id':f'v15-scene-{i+1}','name':n,'start':bounds[i],'end':bounds[i+1]} for i,n in enumerate(names)]
music=readwav(BASE/'music-v1/antre-rendang-komedi-80s.wav')
assert len(music)>=len(voice),'Arrange another section rather than stretch speech.'
music=music[:len(voice)].copy();t=np.arange(len(voice))/RATE;duck=np.full(len(voice),.20)
for c in cues:duck[max(0,round((c['start']-.08)*RATE)):round((c['audio_end']+.1)*RATE)]=.115
duck[(t>=at(7))&(t<at(8))]=.035
duck=np.convolve(duck,np.ones(1200)/1200,mode='same');duck*=np.clip(t/.15,0,1)*np.clip((duration-t)/.75,0,1);music*=duck[:,None]
fx=np.zeros((len(voice),2));rng=np.random.default_rng(14014);effects=[]
def effect(kind,time,length,level):
    n=round(length*RATE);x=np.arange(n)/RATE
    noise=rng.standard_normal(n)
    if kind=='paper':a=np.convolve(noise,np.ones(13)/13,mode='same')*np.sin(np.pi*x/length)**2
    elif kind=='slide':a=np.convolve(noise,np.ones(70)/70,mode='same')*np.sin(np.pi*x/length)**2
    else:a=(.35*noise+np.sin(2*np.pi*160*x))*np.exp(-x*35)
    a*=level/max(.001,float(np.max(np.abs(a))));start=round(time*RATE);end=min(len(fx),start+n);fx[start:end]+=a[:end-start,None]
    effects.append({'type':kind,'time':time,'duration':length})
effect('paper',events['rules'],.3,.023)
for e in events['committee']:effect('chair',e+.25,.15,.035)
effect('slide',events['chair_move'],1.4,.022)
effect('chair',events['sit']+.65,.15,.035)
effect('paper',events['folder']+.2,.25,.027)
dialogue=np.repeat(voice[:,None],2,axis=1);mix=dialogue+music+fx;gain=min(1,.84/max(.001,float(np.max(np.abs(mix)))))
for name,a in [('master',mix),('dialogue',dialogue),('music',music),('fx',fx)]:wav(OUT/f'episode-002-v15-{name}.wav',a*gain)
values=[]
for i in range(math.ceil(duration*30)):
    a=voice[int(i*RATE/30):int((i+1)*RATE/30)]*gain;rms=float(np.sqrt(np.mean(a*a))) if len(a) else 0
    values.append(round(min(1,max(0,(rms-.008)/.12))**.65,3))
save(OUT/'speech-envelope.json',{'source':'episode-002-v15-dialogue.wav','fps':30,'method':'RMS, not phonemes','values':values})
save(OUT/'timeline.json',{'version':'v15','duration':duration,'sample_rate':RATE,'cues':cues,'scenes':scenes,'shots':shots,'events':events,'effects':effects,'sources':sources,
 'speech_speed':1,'speech_pitch':1,'requested_model':'server-selected','returned_model':'not supplied','timing_provenance':'Provider character timestamps; not independent transcription',
 'review_status':'Technical checks; listening not yet verified','sample_peak_dbfs':20*math.log10(float(np.max(np.abs(mix*gain)))),'integrated_loudness_lufs':None,'true_peak_dbtp':None,
 'music_source':'music-v1/antre-rendang-komedi-80s.wav','music_provenance':'Existing original project instrumental','script_source':plan['source']})
print(json.dumps({'duration':duration,'cues':len(cues),'shots':len(shots),'events':events},ensure_ascii=False))
