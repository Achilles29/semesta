"""Approved V10 ensemble, matched unchanged V9 cues, measured character boundaries. No synthesis, pitch or speed changes."""
import json, math, wave, urllib.request
from pathlib import Path
import numpy as np

root=Path(__file__).resolve().parents[1]
audio=root/'public/audio/produksi/episode-002'
source=audio/'generated-v10';out=audio/'release-v10';rate=44100
plan=json.loads((audio/'revision-v10/dialogue-plan.json').read_text(encoding='utf-8'))
batch=json.loads((source/'batch-plan.json').read_text(encoding='utf-8'))
old=json.loads((audio/'release-v9/timeline.json').read_text(encoding='utf-8'))

def read(path):
    if path.suffix=='.pcm':
        a=np.frombuffer(path.read_bytes(),dtype='<i2').astype(float).reshape(-1,1)/32768
        return np.repeat(a,2,axis=1)
    with wave.open(str(path),'rb') as w:
        assert w.getsampwidth()==2 and w.getframerate()==rate
        a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,w.getnchannels())/32768
    return a if a.shape[1]==2 else np.repeat(a,2,axis=1)
def wav(path,a):
    with path.open('xb') as f:
        with wave.open(f,'wb') as w:
            w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate)
            w.writeframes(np.round(np.clip(a,-1,1)*32767).astype('<i2').tobytes())
def save(path,data):
    with path.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)

assert not out.exists(),'Do not overwrite a release'
parts={}
for reuse in batch['reuse']:
    c=next(x for x in plan['cues'] if x['id']==reuse['cue_id'])
    old_c=next(x for x in old['cues'] if x['id']==reuse['old_id'])
    assert old_c['spoken_text']==c['spoken_text'] and old_c['role']==c['role']
    parts[c['id']]=(read(audio/reuse['file']),{'file':reuse['file'],'reused_unchanged':True})
for req in batch['requests']:
    metadata=json.loads((source/(req['role']+'.metadata.json')).read_text(encoding='utf-8'))
    assert not metadata['provider'].get('isError')
    p=next(json.loads(c['text']) for c in metadata['provider']['content'] if c['type']=='text')
    assert not p.get('error')
    url=p.get('audio_url') or p.get('audioUrl') or p.get('url')
    assert isinstance(url,str) and url.startswith('https://'),list(p)
    path=source/(req['role']+'.source.pcm')
    if not path.exists():urllib.request.urlretrieve(url,path)
    samples=read(path);assert abs(len(samples)/rate-p['duration'])<.03
    chars=p['original_characters'];assert ''.join(c['text'] for c in chars)==req['request']['text']
    for j,span in enumerate(req['spans']):
        start,end=span['start'],span['end']
        first=max(0,chars[start]['start_time']-.12);last=min(len(samples)/rate,chars[end-1]['end_time']+.12)
        if j: first=max(first,(chars[req['spans'][j-1]['end']-1]['end_time']+chars[start]['start_time'])/2)
        if j+1<len(req['spans']):last=min(last,(chars[end-1]['end_time']+chars[req['spans'][j+1]['start']]['start_time'])/2)
        a=math.floor(first*rate);b=math.ceil(last*rate)
        parts[span['cue_id']]=(samples[a:b],{'file':'generated-v10/'+path.name,'source_start_frame':a,'source_end_frame':b,'voice_id':req['request']['voiceId']})
assert len(parts)==len(plan['cues'])==19
out.mkdir()
pauses={'vacancy_promise':.35,'claim_chair':.35,'check_before_seat':1.2,'verification_satire':.65,'open_test':1.5,
 'form_committee':.4,'committee_payoff':.6,'service_claim':.35,'ask_for_help':.4,'ask_applause':.6,'applause_payoff':1,
 'open_valve':3.6,'claim_credit':.3,'credit_payoff':3.2,'declare_winner':4.5,'accept_and_serve':.7,
 'citizen_challenge':.4,'ask_allocation':.35,'work_not_spoils':3}
segments=[];cues=[];cursor=0
for c in plan['cues']:
    samples,provenance=parts[c['id']];gain=1
    if not provenance.get('reused_unchanged'):
        active=samples[np.max(np.abs(samples),axis=1)>.008]
        rms=float(np.sqrt(np.mean(active**2))) if active.size else .05
        gain=min(2,max(.6,.1/max(.001,rms)),.88/max(.001,float(np.max(np.abs(samples)))))
    data=samples*gain;name=f"{c['id']}-{c['role']}.wav";wav(out/name,data)
    start=cursor/rate;segments.append(data);cursor+=len(data);end=cursor/rate
    gap=round(pauses[c['beat']]*rate);segments.append(np.zeros((gap,2)));cursor+=gap
    cues.append({**c,'start':start,'audio_end':end,'end':cursor/rate,'file':name,'gain_db':20*math.log10(gain),'source':provenance})
voice=np.concatenate(segments);by={c['beat']:c for c in cues};duration=len(voice)/rate
music=read(audio/'music-v1/antre-rendang-komedi-80s.wav');original_length=len(music)
while len(music)<len(voice):
    n=rate*2;ramp=np.linspace(0,1,n)[:,None]
    music=np.concatenate((music[:-n],music[-n:]*(1-ramp)+music[:n]*ramp,music[n:]))
music=music[:len(voice)].copy();duck=np.full(len(voice),.55)
for c in cues:duck[max(0,round((c['start']-.12)*rate)):min(len(voice),round((c['audio_end']+.2)*rate))]=.24
window=round(.04*rate);duck=np.convolve(duck,np.ones(window)/window,mode='same')
time=np.arange(len(voice))/rate
duck*=np.clip((time-by['claim_chair']['audio_end'])/.7,0,1)*np.clip((duration-time)/1.2,0,1)
duck*=np.where((time>by['work_not_spoils']['start']-.4)&(time<by['work_not_spoils']['audio_end']+.3),0,1)
music*=duck[:,None];fx=np.zeros_like(voice);rng=np.random.default_rng(902);effects=[]
def effect(kind,at,duration,level):
    n=round(duration*rate);t=np.arange(n)/rate
    if kind=='sweep':
        noise=rng.standard_normal(n);sound=(noise-np.roll(noise,1))*.18*np.sin(np.pi*t/duration)**2
    else:sound=(rng.standard_normal(n)*.45+np.sin(2*np.pi*180*t)*.4)*np.exp(-t*45)
    sound*=level/max(.001,float(np.max(np.abs(sound))));a=round(at*rate);b=min(len(fx),a+n);fx[a:b]+=sound[:b-a,None]
    effects.append({'type':kind,'time':at,'duration':duration})
# Quiet water Foley begins only after the valve has opened. No extra spoken words.
at=by['open_valve']['audio_end']+1.2
n=min(round(8*rate),len(fx)-round(at*rate));noise=rng.standard_normal(n)
water=np.convolve(noise,np.ones(7)/7,mode='same')*.018
water*=np.minimum(np.arange(n)/(.25*rate),1)*np.minimum(np.arange(n)[::-1]/rate,1)
fx[round(at*rate):round(at*rate)+n]+=water[:,None]
effects.append({'type':'running-water','time':at,'duration':n/rate})
effect('chair',by['declare_winner']['audio_end']+3.4,.16,.04)
effect('bucket',by['work_not_spoils']['audio_end']+1.4,.12,.05)
mix=voice+music+fx;gain=min(1,.94/max(.001,float(np.max(np.abs(mix)))))
for name,a in [('master',mix),('dialogue',voice),('music-fx',music+fx)]:wav(out/f'episode-002-v10-{name}.wav',a*gain)
names=[s['title'] for s in plan['scenes']]
scenes=[]
for i,name in enumerate(names,1):
    group=[c for c in cues if c['scene']==i];scenes.append({'id':f'v10-{i}','name':name,'start':group[0]['start'],'end':group[-1]['end']})
timeline={'version':'v10','duration':duration,'cues':cues,'scenes':scenes,'effects':effects,
 'audio_url':'public/audio/produksi/episode-002/release-v10/episode-002-v10-master.wav',
 'review_status':'technical-checks-only-listening-and-browser-review-pending','speed':1,'pitch':1,
 'peak_dbfs':20*math.log10(float(np.max(np.abs(mix*gain)))),'music_looped':len(voice)>original_length}
save(out/'timeline.json',timeline)
mono=(voice*gain).mean(axis=1);values=[]
for i in range(math.ceil(duration*30)):
    a=mono[int(i*rate/30):int((i+1)*rate/30)];rms=float(np.sqrt(np.mean(a*a))) if len(a) else 0
    values.append(round(min(1,max(0,(rms-.008)/.12))**.65,3))
save(out/'speech-envelope.json',{'source':'episode-002-v10-dialogue.wav','fps':30,'method':'RMS, not phoneme alignment','values':values})
print(json.dumps({'duration':duration,'scenes':scenes,'peak_dbfs':timeline['peak_dbfs'],'reused':len(batch['reuse'])},ensure_ascii=False))
