"""Build Day 2 election audio, captions and an audio-locked visual timeline.

The HeyGen clone is copied at natural speed; synthetic draft voices are also
played at natural speed. This script never compresses a line to fit a target.
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/audio/produksi/episode-003"
SOURCE = BASE / "generated-election-v4"
OUT = BASE / "release-v4-election"
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100
FPS = 24
MIN_SCENE_SECONDS = {1:8, 2:14, 3:9, 4:12, 5:15, 6:15, 7:14, 8:11, 9:12, 10:14}
SCENE_IDS = {1:"hook_two_stamps", 2:"kampung_komen_road", 3:"gufron_registers",
    4:"pair_rejected", 5:"petition_moves_to_court", 6:"court_decision",
    7:"pair_rechecked", 8:"ten_ballots", 9:"winner_road_unfixed", 10:"documents_choice"}
PROVENANCE = json.loads((SOURCE/"speech-provenance.json").read_text())


def decode(path):
    p = subprocess.run(["ffmpeg","-v","error","-i",str(path),"-f","s16le",
         "-acodec","pcm_s16le","-ac","1","-ar",str(RATE),"-"],check=True,capture_output=True)
    return np.frombuffer(p.stdout,dtype="<i2").astype(np.float32)/32768


def trim_tts_pauses(audio, words):
    """Shorten only generated dead air; keep every spoken sample at 1.0x."""
    width=round(.01*RATE)
    rms=np.array([float(np.sqrt(np.mean(audio[i:i+width]**2)))
                  for i in range(0,len(audio),width)])
    quiet=rms<.006
    spans=[];begin=None
    for i,yes in enumerate(quiet.tolist()+[False]):
        if yes and begin is None:begin=i
        if not yes and begin is not None:
            a=begin*width;b=min(len(audio),i*width)
            if (b-a)/RATE>.43:spans.append((a,b))
            begin=None
    cuts=[]
    for a,b in spans:
        keep=.30 if a>0 and b<len(audio) else .17
        excess=(b-a)-round(keep*RATE)
        if excess<=0:continue
        start=a+round(keep*RATE/2)
        cuts.append((start,start+excess))
    if not cuts:return audio,words
    parts=[];cursor=0
    for a,b in cuts:parts.append(audio[cursor:a]);cursor=b
    parts.append(audio[cursor:])
    compact=np.concatenate(parts)
    def remap(t):
        sample=round(t*RATE)
        removed=sum(max(0,min(sample,b)-a) for a,b in cuts)
        return round((sample-removed)/RATE,3)
    adjusted=[{**w,"start":remap(w["start"]),
               "duration":max(.01,remap(w["start"]+w["duration"])-remap(w["start"]))}
              for w in words]
    return compact,adjusted


gufron_source = decode(BASE/"generated-election-v3/gufron-heygen.wav")
gufron_ranges = {"e04":(0,4.9),"e14":(4.9,11.1),"e18":(11.1,14.317256)}
scenes,cues=[],[]
clock=0.0
for scene in range(1,11):
    scene_start=clock
    cursor=scene_start + (3.35 if scene==4 else .32 if scene!=1 else .08)
    for item in [x for x in PROVENANCE if x["scene"]==scene]:
        if scene==8 and item["role"]=="bu_warung": cursor=max(cursor,scene_start+6.0)
        ident=item["id"]
        if item["role"]=="gufron":
            a,b=gufron_ranges[ident]
            clip=gufron_source[round(a*RATE):round(b*RATE)].copy()
            words=[]
            source=f"HeyGen private Gufron clone, {a:.2f}–{b:.2f}s of gufron-heygen.wav"
        else:
            clip=decode(SOURCE/item["file"])
            words=item["word_boundaries"]
            clip,words=trim_tts_pauses(clip,words)
            source=str(SOURCE/item["file"])
        peak=float(np.max(np.abs(clip)))
        rms=float(np.sqrt(np.mean(clip*clip)))
        gain=min(.68/max(peak,1e-6),.145/max(rms,1e-6))
        clip*=gain
        fade=min(len(clip)//5,round(.012*RATE))
        clip[:fade]*=np.linspace(0,1,fade,dtype=np.float32)
        clip[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)
        start=cursor
        end=start+len(clip)/RATE
        samples_per_frame=RATE/FPS
        window=max(1,round(samples_per_frame))
        envelope=[]
        for i in range(0,len(clip),window):
            energy=float(np.sqrt(np.mean(clip[i:i+window]**2)))
            envelope.append(round(min(1,energy/.19),3))
        cues.append({"id":ident,"scene":scene,"role":item["role"],"text":item["text"],
            "start":round(start,3),"end":round(end,3),"source":source,"gain":round(gain,3),
            "words":words,"envelope_fps":FPS,"envelope":envelope,"audio":clip})
        cursor=end+.25
    scene_end=max(scene_start+MIN_SCENE_SECONDS[scene],cursor+.30)
    scenes.append({"index":scene,"id":SCENE_IDS[scene],"start":round(scene_start,3),"end":round(scene_end,3)})
    clock=scene_end

duration=math.ceil(clock*FPS)/FPS
N=round(duration*RATE)
dialogue=np.zeros((N,2),dtype=np.float32)
music=np.zeros_like(dialogue)
fx=np.zeros_like(dialogue)


def add(track,clip,at,pan=0):
    i=round(at*RATE)
    if len(clip)+i>N: raise ValueError((at,len(clip),N))
    if clip.ndim==1:
        track[i:i+len(clip),0]+=clip*math.sqrt((1-pan)/2)
        track[i:i+len(clip),1]+=clip*math.sqrt((1+pan)/2)
    else:track[i:i+len(clip)]+=clip


for cue in cues:add(dialogue,cue.pop("audio"),cue["start"])

def tone(at,hz,seconds,amp,destination=music,pan=0):
    count=round(seconds*RATE)
    t=np.arange(count,dtype=np.float32)/RATE
    env=np.minimum(1,t/.018)*np.exp(-t/max(seconds*.42,.04))
    sound=(np.sin(2*np.pi*hz*t)+.15*np.sin(4*np.pi*hz*t))*env*amp
    add(destination,sound,at,pan)


def noise(at,seconds,amp,destination=fx):
    count=round(seconds*RATE)
    t=np.arange(count,dtype=np.float32)/RATE
    rng=np.random.default_rng(round(at*1000)+20261118)
    sound=rng.standard_normal(count).astype(np.float32)*np.exp(-t*42)*amp
    add(destination,sound,at)

def pad(at,seconds,root):
    count=round(seconds*RATE)
    t=np.arange(count,dtype=np.float32)/RATE
    fade=np.minimum(1,t/.45)*np.minimum(1,(seconds-t)/.48)
    pulse=.82+.18*np.sin(2*np.pi*1.6*t)
    sound=(.010*np.sin(2*np.pi*root*2*t)+
           .006*np.sin(2*np.pi*root*2*2**(3/12)*t)+
           .004*np.sin(2*np.pi*root*3*t))*fade*pulse
    add(music,sound*1.7,at,pan=-.1)


# Original satirical score: dry percussion and a plucked motif. Keep the
# registration, court and vote distinct; the photo gag drops the music out.
notes=[110,130.81,146.83,123.47]
for scene in scenes:
    s,e=scene["start"],scene["end"]
    pad(s,e-s,notes[(scene["index"]-1)%4])
    beat=60/(106 if scene["index"] in (1,4,5,6,7) else 92)
    i=0
    while s+i*beat<e-.15:
        at=s+i*beat
        part=scene["index"]
        if part==9 and at>s+(e-s)*.55:
            i+=1;continue
        note=notes[(i+part)%4]
        tone(at,note,min(.43,e-at),.010 if part in (4,5,6,7) else .014,pan=(-.18 if i%2 else .18))
        if i%2==0:tone(at,55,.12,.014)
        else:
            tone(at,note*2,min(.21,e-at),.0045,pan=.2)
            if part in (2,3,8,9,10):noise(at,.07,.0045,destination=music)
        i+=1

events={
    "hook_rejection":next(c["end"] for c in cues if c["scene"]==1 and c["role"]=="petugas")+.04,
    "hook_acceptance":scenes[0]["start"]+5.5,
    "day1_barrier":scenes[1]["start"]+2.0,
    "gufron_accepted":scenes[2]["end"]-2.0,
    "pair_rejected":next(c["end"] for c in cues if c["scene"]==4 and c["role"]=="petugas")+.04,
    "petition_received":scenes[4]["end"]-2.2,
    "ruling":next(c["end"] for c in cues if c["scene"]==6 and c["role"]=="hakim")+.04,
    "pair_accepted":next(c["end"] for c in cues if c["scene"]==7 and c["role"]=="petugas")+.04,
    "ballot_count":scenes[7]["end"]-2.0,
    "camera_click":scenes[8]["end"]-.7,
}
events.update({f"vote_{i+1:02d}":scenes[7]["start"]+.36+i*.6 for i in range(10)})
for name,at in events.items():
    if "camera" in name:noise(at,.10,.052)
    elif "barrier" in name:noise(at,.12,.028)
    elif "ballot" in name:tone(at,660,.18,.05,destination=fx)
    elif name.startswith("vote_"):
        tone(at,410,.095,.012,destination=fx)
        noise(at,.045,.009)
    else:
        tone(at,190 if "rejected" in name else 510,.16,.055,destination=fx)
        noise(at+.04,.08,.025)

activity=np.zeros(N,dtype=np.float32)
for cue in cues:
    a=max(0,round((cue["start"]-.07)*RATE));b=min(N,round((cue["end"]+.13)*RATE))
    activity[a:b]=1
music*=(1-.72*activity)[:,None]*8.0
click=events["camera_click"]
silence_distance=np.abs(np.arange(N,dtype=np.float32)/RATE-click)
photo_gap=np.clip((silence_distance-.09)/.22,0,1)
music*=((photo_gap*photo_gap*(3-2*photo_gap)))[:,None]
tail=np.minimum(1,(duration-np.arange(N,dtype=np.float32)/RATE)/1.1)
music*=tail[:,None]
master=dialogue+music+fx
peak=float(np.max(np.abs(master)))
if peak>.88:
    factor=.88/peak
    for track in (dialogue,music,fx,master):track*=factor


def save_wav(path,data):
    with wave.open(str(path),"wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
        w.writeframes(np.round(np.clip(data,-1,1)*32767).astype("<i2").tobytes())


for filename,data in [("day2-dialogue.wav",dialogue),("day2-music.wav",music),
                      ("day2-fx.wav",fx),("day2-master.wav",master)]:save_wav(OUT/filename,data)

def stamp(t,sep):
    m=round(t*1000);h,m=divmod(m,3600000);minute,m=divmod(m,60000);sec,m=divmod(m,1000)
    return f"{h:02}:{minute:02}:{sec:02}{sep}{m:03}"

captions=[]
for cue in cues:
    tokens=cue["text"].split()
    boundaries=cue["words"]
    if len(tokens)!=len(boundaries):
        span=cue["end"]-cue["start"]
        weights=np.array([max(1,len(re.sub(r'\W','',w))) for w in tokens],dtype=float)
        marks=np.cumsum(np.r_[0,weights])/weights.sum()*max(.2,span-.32)
        boundaries=[{"text":w,"start":float(marks[i])+.16,"duration":float(marks[i+1]-marks[i])} for i,w in enumerate(tokens)]
    group=[]
    for i,(word,mark) in enumerate(zip(tokens,boundaries)):
        if not group:line_start=cue["start"]+max(0,mark["start"])
        group.append(word)
        line=" ".join(group)
        if i==len(tokens)-1 or (len(group)>=3 and (word.endswith((".","?","!")) or len(line)>=32 or len(group)>=6)):
            line_end=cue["start"]+mark["start"]+mark["duration"]+.10
            captions.append({"role":cue["role"],"cue_id":cue["id"],"start":round(line_start,3),
                             "end":round(min(line_end,cue["end"]),3),"text":line})
            group=[]
for a,b in zip(captions,captions[1:]):a["end"]=min(a["end"],b["start"])
for extension,sep in [("srt",","),("vtt",".")]:
    rows=["WEBVTT",""] if extension=="vtt" else []
    for i,c in enumerate(captions,1):
        if c["end"]<=c["start"]:continue
        rows += [str(i),f"{stamp(c['start'],sep)} --> {stamp(c['end'],sep)}",c["text"],""]
    (OUT/f"subtitles.{extension}").write_text("\n".join(rows))

timeline={"version":"day2-election-v4","duration":duration,"fps":FPS,"sample_rate":RATE,
    "voice_source":"Gufron private HeyGen clone at natural speed; other characters use fixed Indonesian synthetic voices",
    "scenes":scenes,"cues":cues,"captions":captions,"events":events}
(OUT/"timeline.json").write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
print(json.dumps({"duration":duration,"cues":len(cues),"captions":len(captions),
    "peak_dbfs":round(20*math.log10(float(np.max(np.abs(master)))),2),
    "scenes":[(s["id"],round(s["end"]-s["start"],1)) for s in scenes]},indent=2))
