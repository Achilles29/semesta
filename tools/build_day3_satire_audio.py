"""Assemble Day 3 satire v2 with existing authorized Gufron and Bu Warung takes.

The official Richard Jersey song is identified in music-cue.json for platform
sound placement. The downloadable MP4 contains a distinct original cue.
"""
from __future__ import annotations

import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/audio/produksi/episode-004"
SOURCE = BASE / "generated-satire-v2"
OUT = BASE / "release-v2"
OLD = ROOT / "public/audio/produksi/episode-003/generated"
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100
DURATION = 94.0
N = round(DURATION * RATE)

SLOTS = [
    ("g1", "gufron", "Kemarin pita dulu, jalan belakangan.", .30),
    ("n1", "narrator", None, 2.80),
    ("n2", "narrator", None, 12.85),
    ("t1", "tedi", None, 22.35),
    ("p1", "prabowow", None, 26.10),
    ("n3", "narrator", None, 32.20),
    ("g2", "gufron", "Sekarang stempel dulu, syarat belakangan?", 37.75),
    ("n4", "narrator", None, 40.40),
    ("w1", "bu_warung", "Berkasnya sudah dicek?", 52.45),
    ("t2", "tedi", None, 53.80),
    ("n5", "narrator", None, 59.40),
    ("n6", "narrator", None, 70.70),
    ("n7", "narrator", None, 74.20),
]
edge = {item["id"]: item for item in json.loads((SOURCE / "speech-provenance.json").read_text())}
old_provenance = json.loads((OLD / "voice-provenance.json").read_text())
voice = np.zeros((N, 2), dtype=np.float32)
music = np.zeros((N, 2), dtype=np.float32)
fx = np.zeros((N, 2), dtype=np.float32)
cues = []


def decode(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-acodec", "pcm_s16le",
                        "-ac", "1", "-ar", str(RATE), "-"], check=True, capture_output=True)
    return np.frombuffer(p.stdout, dtype="<i2").astype(np.float32) / 32768


def add(track, data, at, gain=1):
    i = round(at * RATE)
    j = min(len(data), len(track) - i)
    if j > 0:
        track[i:i+j] += data[:j] * gain


def old_clip(role, start, end):
    raw = np.fromfile(OLD / f"{role}.source.pcm", dtype="<i2").astype(np.float32) / 32768
    return raw[round(start*RATE):round(end*RATE)]


for ident, role, override_text, start in SLOTS:
    if ident in edge:
        item = edge[ident]
        clip = decode(SOURCE / item["file"])
        words = item["word_boundaries"]
        text = item["text"]
        provenance = str(SOURCE / item["file"])
    else:
        old_role = "gufron" if ident.startswith("g") else "bu_warung"
        a, b = {"g1": (2.20, 4.36), "g2": (4.72, 6.99), "w1": (5.02, 6.22)}[ident]
        clip = old_clip(old_role, a, b)
        text = override_text
        old_words = old_provenance[old_role]["words"]
        words = [{"text": w["text"], "start": round(w["start_time"]-a, 3),
                  "duration": round(w["end_time"]-w["start_time"], 3)}
                 for w in old_words if w["start_time"] >= a and w["end_time"] <= b]
        provenance = f"Day 2 HeyGen private clone, source {old_role}.source.pcm {a:.2f}–{b:.2f}s"
    rms = float(np.sqrt(np.mean(clip*clip)))
    peak = float(np.max(np.abs(clip)))
    gain = min(.16/max(rms, 1e-6), .70/max(peak, 1e-6))
    clip = clip * gain
    fade = min(round(.012*RATE), len(clip)//5)
    clip[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
    clip[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    end = start + len(clip)/RATE
    assert end <= DURATION-.2, (ident, end)
    assert not cues or start >= cues[-1]["end"] + .04, (ident, cues[-1]["id"], start)
    add(voice[:,0], clip, start, .7071)
    add(voice[:,1], clip, start, .7071)
    cues.append({"id":ident,"role":role,"text":text,"start":round(start,3),"end":round(end,3),
                 "source":provenance,"gain":round(gain,3),"words":words})

reveal = next(c["start"] + w["start"] for c in cues if c["id"] == "n2"
              for w in c["words"] if "Prabowow" in w["text"])
assert 14 < reveal < 18, reveal

rng = np.random.default_rng(20261118)


def tone(at, hz, seconds, amp, dest=music, pan=0):
    count = round(seconds*RATE)
    t = np.arange(count, dtype=np.float32)/RATE
    env = np.minimum(1, t/.008)*np.exp(-t/max(seconds*.42,.04))
    sound = (np.sin(2*np.pi*hz*t)+.26*np.sin(4*np.pi*hz*t))*env*amp
    add(dest[:,0], sound, at, math.sqrt((1-pan)/2))
    add(dest[:,1], sound, at, math.sqrt((1+pan)/2))


def hit(at, kind, amp):
    count = round((.17 if kind == "kick" else .09)*RATE)
    t = np.arange(count, dtype=np.float32)/RATE
    if kind == "kick":
        sound = np.sin(2*np.pi*(61*t + 75*(1-np.exp(-t*27))/27))*np.exp(-t*21)*amp
    else:
        sound = rng.standard_normal(count).astype(np.float32)*np.exp(-t*43)*amp
    add(music[:,0], sound, at, .70)
    add(music[:,1], sound, at, .70)


def bed(begin, end, bpm, mode):
    step=60/bpm
    notes={"intro":[146.83,164.81,130.81,146.83],
           "dance":[164.81,196,246.94,220],
           "doubt":[130.81,146.83,123.47,130.81],
           "coop":[146.83,130.81,123.47,110],
           "close":[130.81,146.83,123.47,110]}[mode]
    for i in range(math.ceil((end-begin)/step)):
        at=begin+i*step
        if at>=end-.05:break
        if mode=="dance":
            hit(at,"kick",.09)
            if i%2:hit(at,"snare",.025)
            tone(at,notes[i%4],step*.8,.034,pan=.12 if i%2 else -.12)
            if i%2==0:tone(at+step*.34,notes[(i+2)%4]*2,step*.25,.012,pan=.25)
        else:
            if i%2==0:hit(at,"kick",.020 if mode in ("doubt","coop") else .03)
            tone(at,notes[i%4],step*.7,.009 if mode in ("doubt","coop") else .014)


bed(0,reveal,100,"intro")
bed(reveal,22.35,148,"dance")
bed(22.35,40.4,92,"doubt")
bed(40.4,70.7,103,"coop")
bed(70.7,DURATION,88,"close")

# An abrupt cut and camera clicks are the satirical rhythm, not a heroic score.
for at, hz, amp in [(0.05,520,.12),(22.35,120,.12),(37.75,240,.08),
                    (59.25,650,.10),(70.6,650,.09),(74.1,510,.07)]:
    tone(at,hz,.14,amp,dest=fx)

for start,end in [(22.35,22.95),(37.75,39.9),(70.7,74.1)]:
    music[round(start*RATE):round(end*RATE)] *= .04

activity=np.zeros(N,dtype=np.float32)
for cue in cues:
    a=max(0,round((cue["start"]-.05)*RATE));b=min(N,round((cue["end"]+.12)*RATE))
    activity[a:b]=1
music *= (1-.42*activity)[:,None]*4.0
music *= np.minimum(1,(DURATION-np.arange(N)/RATE)/.8)[:,None]
master=voice+music+fx
peak=float(np.max(np.abs(master)))
if peak>.88:
    for track in (voice,music,fx,master):track *= .88/peak


def write_wav(name,data):
    with wave.open(str(OUT/name),"wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
        w.writeframes(np.round(np.clip(data,-1,1)*32767).astype("<i2").tobytes())


for name,data in [("day3-dialogue.wav",voice),("day3-music.wav",music),
                  ("day3-fx.wav",fx),("day3-master.wav",master)]:write_wav(name,data)
platform_master=master.copy()
platform_master[round(reveal*RATE):round(22.35*RATE)] -= music[round(reveal*RATE):round(22.35*RATE)]
write_wav("day3-platform-master.wav",platform_master)


def stamp(t,sep):
    m=round(t*1000);h,m=divmod(m,3600000);minute,m=divmod(m,60000);sec,m=divmod(m,1000)
    return f"{h:02}:{minute:02}:{sec:02}{sep}{m:03}"


captions=[]
for cue in cues:
    original=cue["text"].split()
    boundaries=cue["words"]
    assert len(original)==len(boundaries),(cue["id"],len(original),len(boundaries),original,[w["text"] for w in boundaries])
    group=[]
    for i,(word,timing) in enumerate(zip(original,boundaries)):
        if not group:start=cue["start"]+max(0,timing["start"])
        group.append(word)
        line=" ".join(group)
        if i==len(original)-1 or (len(group)>=3 and (word.endswith((".","?","!",":")) or len(line)>=31 or len(group)>=6)):
            end=cue["start"]+timing["start"]+timing["duration"]+.12
            captions.append({"cue_id":cue["id"],"role":cue["role"],"start":round(start,3),
                             "end":round(end,3),"text":line})
            group=[]
for a,b in zip(captions,captions[1:]):
    a["end"]=min(a["end"],b["start"])
    assert a["end"]>a["start"]
for ext,sep in [("srt",","),("vtt",".")]:
    lines=["WEBVTT",""] if ext=="vtt" else []
    for i,c in enumerate(captions,1):
        lines += [str(i),f"{stamp(c['start'],sep)} --> {stamp(c['end'],sep)}",c["text"],""]
    (OUT/f"subtitles.{ext}").write_text("\n".join(lines))

timeline={"version":"day3-v2-satire","duration":DURATION,"fps":12,"reveal_music_start":round(reveal,3),
          "music_source":"Original placeholder; official Oke Gas identified in music-cue.json for platform sound picker",
          "voice_source":"Gufron and Bu Warung are existing HeyGen takes; narrator, Tedi, Prabowow are synthetic draft voices",
          "cues":cues,"captions":captions,
          "scenes":[{"id":"box_hook","start":0,"end":12.85},
                    {"id":"reveal","start":12.85,"end":22.35},
                    {"id":"kitchen","start":22.35,"end":40.4},
                    {"id":"cooperative","start":40.4,"end":59.4},
                    {"id":"consequence","start":59.4,"end":74.2},
                    {"id":"cta","start":74.2,"end":DURATION}]}
(OUT/"timeline.json").write_text(json.dumps(timeline,ensure_ascii=False,indent=2))
(OUT/"music-cue.json").write_text(json.dumps({
    "entry_seconds":round(reveal,3),"out_seconds":22.35,
    "official_sound":"Oke Gas Prabowo Gibran Paling Pas — Richard Jersey",
    "official_source":"https://www.youtube.com/watch?v=jwYRwOj9RdA",
    "rights_note":"Use the official sound via a platform sound picker or a licensed file; not embedded in MP4."
},ensure_ascii=False,indent=2))
print(json.dumps({"duration":DURATION,"reveal":round(reveal,3),"cues":len(cues),
                  "captions":len(captions),"peak_dbfs":round(20*math.log10(float(np.max(np.abs(master)))),2)},indent=2))
