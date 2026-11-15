"""V13 audio assembly. Original speech stays at 1x; only silence is inserted at phrase boundaries."""
import json, math, wave, urllib.request
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/audio/produksi/episode-002'
SOURCE=BASE/'generated-v13';OUT=BASE/'release-v13';RATE=44100
plan=json.loads((SOURCE/'batch-plan.json').read_text(encoding='utf-8'))
assert not OUT.exists(), 'Do not overwrite a release'

def save(path,data):
    with path.open('x',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
def wav(path,data):
    a=np.asarray(data)
    if a.ndim==1:a=np.repeat(a[:,None],2,axis=1)
    with path.open('xb') as f:
        with wave.open(f,'wb') as w:
            w.setnchannels(a.shape[1]);w.setsampwidth(2);w.setframerate(RATE)
            w.writeframes(np.round(np.clip(a,-1,1)*32767).astype('<i2').tobytes())
def readwav(path):
    with wave.open(str(path),'rb') as w:
        assert w.getsampwidth()==2 and w.getframerate()==RATE
        a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,w.getnchannels())/32768
    return a if a.shape[1]==2 else np.repeat(a,2,axis=1)

parts={}
for req in plan['requests']:
    meta=json.loads((SOURCE/(req['role']+'.metadata.json')).read_text(encoding='utf-8'))
    assert not meta['provider'].get('isError')
    p=json.loads(next(c['text'] for c in meta['provider']['content'] if c['type']=='text'))
    assert 'audio_url' in p and not p.get('error')
    raw=SOURCE/(req['role']+'.source.pcm')
    if not raw.exists():urllib.request.urlretrieve(p['audio_url'],raw)
    assert raw.read_bytes()[:4]!=b'RIFF','Expected requested raw PCM'
    data=np.frombuffer(raw.read_bytes(),dtype='<i2').astype(float)/32768
    assert abs(len(data)/RATE-p['duration'])<.03
    original=SOURCE/(req['role']+'.original.wav')
    if not original.exists():wav(original,data)
    chars=p['original_characters'];text=''.join(c['text'] for c in chars)
    assert text==req['request']['text']
    for j,span in enumerate(req['spans']):
        start,end=span['start'],span['end']
        lo=max(0,chars[start]['start_time']-.14);hi=min(len(data)/RATE,chars[end-1]['end_time']+.14)
        if j:lo=max(lo,(chars[req['spans'][j-1]['end']-1]['end_time']+chars[start]['start_time'])/2)
        if j+1<len(req['spans']):hi=min(hi,(chars[end-1]['end_time']+chars[req['spans'][j+1]['start']]['start_time'])/2)
        a=math.floor(lo*RATE);b=math.ceil(hi*RATE)
        local=[{'text':c['text'],'start_time':c['start_time']-a/RATE,'end_time':c['end_time']-a/RATE} for c in chars[start:end]]
        parts[span['cue_id']]={'data':data[a:b],'chars':local,'text':text[start:end],'source_frame':a,'source_file':raw.name,'voice_id':req['request']['voiceId']}

# Short action/response holds, never rate changes or whole-sentence freezes.
holds={
 'v13-6':[('Oh, minta tepuk tangan.',.45)],
 'v13-7':[('Komeng akhirnya taruh gelas.',1.8),('Ajak satu warga,',1),('angkat rodanya.',1.2),('Gerobaknya jalan.',2)],
 'v13-8':[('Bu Warung kecapekan,',3.1)],
}
gaps={'v13-1':.25,'v13-2':.35,'v13-3':.35,'v13-4':.3,'v13-5':.8,'v13-6':.35,'v13-7':.4,'v13-8':.8,'v13-9':1.6}
OUT.mkdir();segments=[];cues=[];cursor=0
for cue in plan['cues']:
    part=parts[cue['id']];chars=part['chars'];text=part['text'];data=part['data'];inserts=[]
    for phrase,seconds in holds.get(cue['id'],[]):
        end=text.index(phrase)+len(phrase)
        # Insert into the existing punctuation gap, away from the last consonant.
        left=end-1
        while left>0 and not text[left].isalnum():left-=1
        right=end
        while right<len(text) and not text[right].isalnum():right+=1
        boundary=(chars[left]['end_time']+chars[right]['start_time'])/2 if right<len(chars) else chars[left]['end_time']+.1
        inserts.append((round(boundary*RATE),round(seconds*RATE),phrase))
    inserts.sort();chunks=[];mapping=[];previous=0;offset=0
    for at,n,phrase in inserts+[(len(data),0,'end')]:
        chunks.append(data[previous:at]);mapping.append({'source_start_frame':part['source_frame']+previous,'source_end_frame':part['source_frame']+at,'cue_start_frame':offset,'cue_end_frame':offset+at-previous})
        offset+=at-previous
        if n:chunks.append(np.zeros(n));offset+=n
        previous=at
    samples=np.concatenate(chunks)
    def shifted(t):return t+sum(n/RATE for at,n,_ in inserts if at/RATE<=t)
    aligned=[{'text':c['text'],'start_time':shifted(c['start_time']),'end_time':shifted(c['end_time'])} for c in chars]
    active=samples[np.abs(samples)>.008];rms=float(np.sqrt(np.mean(active**2)))
    gain=min(2,.12/max(rms,.001),.85/max(.001,float(np.max(np.abs(samples)))))
    samples*=gain
    name=cue['id']+'-'+cue['role']+'.wav';wav(OUT/name,samples)
    start=cursor/RATE;segments.append(samples);cursor+=len(samples);audio_end=cursor/RATE
    gap=round(gaps[cue['id']]*RATE);segments.append(np.zeros(gap));cursor+=gap
    cues.append({**cue,'provisional':False,'display_text':cue['text'],'spoken_text':text,'start':start,'audio_end':audio_end,'end':cursor/RATE,'file':name,'gain_db':20*math.log10(gain),'voice_id':part['voice_id'],'source_file':'generated-v13/'+part['source_file'],'source_to_cue_mapping':mapping,'inserted_holds':[{'source_local_frame':at,'added_frames':n,'after':p} for at,n,p in inserts],
        'characters':[{'text':c['text'],'start_time':start+c['start_time'],'end_time':start+c['end_time']} for c in aligned]})
voice=np.concatenate(segments);duration=len(voice)/RATE
by={c['id']:c for c in cues}
def phrase(cue_id,text,end=False):
    c=by[cue_id];i=c['spoken_text'].index(text)
    return c['characters'][i+len(text)-1]['end_time'] if end else c['characters'][i]['start_time']
events={
 'cup_put_start':by['v13-7']['start'],
 'cup_put_end':phrase('v13-7','gelas',True)+.1,
 'helper_walk_start':phrase('v13-7','gelas',True)+.35,
 'lift_start':phrase('v13-7','angkat'),
 'roll_start':phrase('v13-7','Gerobaknya jalan'),
 'roll_end':phrase('v13-7','Nggak')-.12,
 'rest_walk_start':by['v13-8']['start'],
 'sit_start':phrase('v13-8','duduk'),
 'look_start':phrase('v13-8','langsung nengok'),
 'clap_start':by['v13-5']['audio_end'],
}
assert events['lift_start']-events['cup_put_end']>3
assert events['roll_end']-events['roll_start']>2
assert events['sit_start']-events['rest_walk_start']>4
anchors=[(0,0),(11,by['v13-2']['start']),(13,by['v13-3']['start']),(27,by['v13-4']['start']),(32,by['v13-5']['start']),
 (39,events['clap_start']),(41,by['v13-6']['start']+.7),(53,events['cup_put_start']),(54.5,events['cup_put_end']),(55,events['helper_walk_start']),
 (58,events['lift_start']),(60,events['roll_start']),(65,events['roll_end']),(66,events['rest_walk_start']),
 (69,(events['rest_walk_start']+events['sit_start'])/2),(72,events['sit_start']),(73,events['look_start']),(83,by['v13-9']['start']),(94.8,duration-1.2),(96,duration)]
assert all(a[1]<b[1] for a,b in zip(anchors,anchors[1:])),anchors
names=['Kursi kosong, warga kesusahan','Sambutan tanpa bantuan','Komeng dan warga membantu','Yang dilihat kursinya']
bounds=[0,by['v13-4']['start'],by['v13-7']['start'],by['v13-8']['start'],duration]
scenes=[{'id':f'v13-{i+1}','name':n,'start':bounds[i],'end':bounds[i+1]} for i,n in enumerate(names)]
music=readwav(BASE/'music-v1/antre-rendang-komedi-80s.wav')
while len(music)<len(voice):
    n=RATE*2;r=np.linspace(0,1,n)[:,None];music=np.concatenate((music[:-n],music[-n:]*(1-r)+music[:n]*r,music[n:]))
music=music[:len(voice)].copy();duck=np.full(len(voice),.38)
for c in cues:duck[max(0,round((c['start']-.1)*RATE)):round((c['audio_end']+.15)*RATE)]=.16
t=np.arange(len(voice))/RATE
for a,b in [(phrase('v13-7','Nggak')-.15,by['v13-7']['audio_end']+.2),(phrase('v13-8','Dari tadi'),by['v13-8']['audio_end']+.25)]:duck[(t>=a)&(t<=b)]=.025
duck=np.convolve(duck,np.ones(1600)/1600,mode='same');duck*=np.clip(t/.6,0,1)*np.clip((duration-t)/1.2,0,1);music*=duck[:,None]
fx=np.zeros((len(voice),2));rng=np.random.default_rng(13013);effects=[]
def effect(kind,at,seconds,level):
    n=round(seconds*RATE);x=np.arange(n)/RATE
    if kind=='cart-roll':sound=np.convolve(rng.standard_normal(n),np.ones(8)/8,mode='same')*np.sin(np.pi*x/seconds)**2
    else:sound=(rng.standard_normal(n)*.5+np.sin(2*np.pi*220*x)*.25)*np.exp(-x*(45 if kind=='clap' else 28))
    sound*=level/max(.001,float(np.max(np.abs(sound))));a=round(at*RATE);b=min(len(fx),a+n);fx[a:b]+=sound[:b-a,None];effects.append({'type':kind,'time':at,'duration':seconds})
for offset in [0,.18,.39]:effect('clap',events['clap_start']+offset,.13,.035)
effect('cup',events['cup_put_end'],.12,.028)
effect('cart-roll',events['roll_start'],events['roll_end']-events['roll_start'],.024)
effect('chair',events['sit_start']+.6,.15,.028)
dialogue=np.repeat(voice[:,None],2,axis=1);mix=dialogue+music+fx;gain=min(1,.84/max(.001,float(np.max(np.abs(mix)))))
for name,a in [('master',mix),('dialogue',dialogue),('music',music),('fx',fx)]:wav(OUT/f'episode-002-v13-{name}.wav',a*gain)
values=[]
for i in range(math.ceil(duration*30)):
    a=voice[int(i*RATE/30):int((i+1)*RATE/30)]*gain;rms=float(np.sqrt(np.mean(a*a))) if len(a) else 0
    values.append(round(min(1,max(0,(rms-.008)/.12))**.65,3))
save(OUT/'speech-envelope.json',{'source':'episode-002-v13-dialogue.wav','fps':30,'method':'RMS, not phoneme alignment','values':values})
timeline={'version':'v13','duration':duration,'sample_rate':RATE,'audio_url':'public/audio/produksi/episode-002/release-v13/episode-002-v13-master.wav','cues':cues,'scenes':scenes,'events':events,'visual_anchors':[{'preview':p,'audio':a} for p,a in anchors],'effects':effects,'speech_speed':1,'speech_pitch':1,'review_status':'technical-checks-only; listening and browser review pending','timing_provenance':'Provider character alignment, not independent transcription','requested_model':'server-selected','returned_model':'not supplied','sample_peak_dbfs':20*math.log10(float(np.max(np.abs(mix*gain)))),'integrated_loudness_lufs':None,'true_peak_dbtp':None,'music_source':'music-v1/antre-rendang-komedi-80s.wav','music_provenance':'Existing project original instrumental; reused without speech retiming','script_source':plan['source']}
save(OUT/'timeline.json',timeline)
print(json.dumps({'duration':duration,'events':events,'scenes':scenes,'sample_peak_dbfs':timeline['sample_peak_dbfs']},ensure_ascii=False))
