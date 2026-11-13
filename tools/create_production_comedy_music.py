"""Original instrumental bed: light plucks, mallet replies, bass and wood taps.
No samples, borrowed melody, voices, time stretching or external service.
"""
from pathlib import Path
import json
import wave
import numpy as np

OUT = Path(__file__).resolve().parents[1] / 'public/audio/produksi/episode-002/music-v1'
OUT.mkdir(parents=True, exist_ok=True)
SR, BPM, BARS = 44100, 96, 32
BEAT = 60 / BPM
DURATION = BARS * 4 * BEAT
mix = np.zeros((round(DURATION * SR), 2), dtype=np.float64)
events = []


def note(kind, midi, beat, beats, volume, pan=0):
    start = round(beat * BEAT * SR)
    length = min(round((beats * BEAT + .16) * SR), len(mix) - start)
    if length <= 0:
        return
    t = np.arange(length) / SR
    freq = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * freq * t
    envelope = np.minimum(t / .004, 1) * np.exp(-t * (8 if kind != 'bass' else 5))
    envelope *= np.minimum((length / SR - t) / .04, 1)
    if kind == 'wood':
        signal = (np.sin(phase) + .25 * np.sin(phase * 1.73)) * np.exp(-t * 48)
    elif kind == 'mallet':
        signal = np.sin(phase) + .22 * np.sin(phase * 3.98) * np.exp(-t * 22)
    elif kind == 'bass':
        signal = np.sin(phase) + .15 * np.sin(phase * 2)
    else:
        signal = np.sin(phase) + .22 * np.sin(phase * 2) + .12 * np.sin(phase * 3)
    signal *= envelope * volume
    mix[start:start+length, 0] += signal * np.sqrt((1-pan)/2)
    mix[start:start+length, 1] += signal * np.sqrt((1+pan)/2)
    events.append({'kind':kind, 'midi':midi, 'beat':beat, 'length_beats':beats, 'volume':volume})


# Original eight-bar question/answer motif. Space between phrases protects dialogue.
chords = [(48, [60,64,67]), (45,[57,60,64]), (53,[60,65,69]), (55,[59,62,67])]
motifs = [[(0,76),(.75,79),(1.5,76),(2.75,72)],
          [(.5,74),(1.25,76),(2.5,69)],
          [(0,72),(1,77),(1.75,76),(3,72)],
          [(.5,74),(1.5,71),(2.75,67)]]
for bar in range(BARS):
    beat = bar * 4
    bass, chord = chords[bar % 4]
    note('bass',bass,beat,.75,.15)
    note('bass',bass+7,beat+2,.6,.12)
    for offset in [1,3]:
        for pitch in chord:
            note('pluck',pitch,beat+offset,.2,.052,-.3)
    for offset in [.5,1.5,2.5,3.5]:
        note('wood',89 if offset<2 else 84,beat+offset,.08,.025,.4)
    if bar%8<4:
        for offset,pitch in motifs[bar%4]:
            note('mallet',pitch,beat+offset,.28,.085,.25)
    elif bar%2:
        for offset,pitch in [(2.5,72),(3,76),(3.5,79)]:
            note('pluck',pitch,beat+offset,.18,.055,-.15)

mix *= min(1, .32 / max(np.max(np.abs(mix)), 1e-9))
mix[:round(.08*SR)] *= np.linspace(0,1,round(.08*SR))[:,None]
mix[-round(1.6*SR):] *= np.linspace(1,0,round(1.6*SR))[:,None]
pcm = np.round(mix * 32767).astype('<i2')
output = OUT / 'antre-rendang-komedi-80s.wav'
with output.open('xb') as file:
    with wave.open(file, 'wb') as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(SR); wav.writeframes(pcm.tobytes())
peak = float(np.max(np.abs(mix)))
assert np.isfinite(mix).all() and 0 < peak < 1
with wave.open(str(output), 'rb') as wav:
    assert wav.getnframes() == len(mix) and wav.getnchannels() == 2
metadata = {'title':'Antre Rendang', 'original_composition':True, 'duration_seconds':DURATION,
            'bpm':BPM, 'sample_rate_hz':SR, 'channels':2, 'peak_dbfs':round(20*np.log10(peak),2),
            'rms_dbfs':round(20*np.log10(np.sqrt(np.mean(mix**2))),2), 'events':events,
            'usage':'Music-only bed. Start low (about 0.15–0.25 gain) under dialogue; adjust by listening. Not yet mixed with new voices.',
            'review':'Wave format, duration, finite samples and peak checked; listening review pending.'}
with (OUT/'composition.json').open('x',encoding='utf-8') as file:
    json.dump(metadata,file,ensure_ascii=False,indent=2)
print(json.dumps({k:v for k,v in metadata.items() if k!='events'},indent=2))
