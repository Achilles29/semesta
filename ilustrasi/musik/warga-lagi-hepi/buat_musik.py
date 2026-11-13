"""Original playful instrumental. Standalone numpy synthesis, no borrowed audio.

Run: python ilustrasi/musik/warga-lagi-hepi/buat_musik.py
Creates a listening master, a short hook, editable MIDI, and QA metadata.
Does not modify the game or previous compositions.
"""
from pathlib import Path
import json
import math
import struct
import wave
import numpy as np

OUT = Path(__file__).resolve().parent
SR, BPM, PPQ = 44100, 128, 480
BEAT = 60 / BPM
rng = np.random.default_rng(131126)
events = []
CHANNEL = {'whistle': 0, 'marimba': 1, 'pluck': 2, 'bass': 3,
           'reed': 4, 'kick': 9, 'rim': 9, 'shaker': 9, 'wood': 9}
PROGRAM = {0: 78, 1: 12, 2: 24, 3: 32, 4: 71, 9: 0}
PERC = {'kick': 36, 'rim': 37, 'shaker': 82, 'wood': 76}


def add(kind, pitch, beat, duration, gain, pan=0):
    assert 0 <= pitch <= 127 and beat >= 0 and duration > 0
    events.append(dict(kind=kind, pitch=pitch, beat=beat, duration=duration,
                       gain=gain, pan=pan))


def envelope(t, hold, attack=.008, release=.06):
    return np.minimum(t / attack, 1) * np.clip((hold + release - t) / release, 0, 1) ** 1.5


def synth(kind, pitch, hold, noise_rng):
    tail = .4 if kind in ('pluck', 'marimba') else .12
    t = np.arange(round((hold + tail) * SR)) / SR
    frequency = 440 * 2 ** ((pitch - 69) / 12)
    # Tiny scooped attacks give the whistle personality without siren-like slides.
    if kind == 'whistle':
        f = frequency * (1 - .013 * np.exp(-t * 55)
                         + .0017 * np.sin(2 * np.pi * 5.4 * t) * np.minimum(t / .15, 1))
        p = 2 * np.pi * np.cumsum(f) / SR
        return (np.sin(p) + .085 * np.sin(2*p) + .018 * np.sin(3*p)) * envelope(t, hold, .014, .09)
    p = 2 * np.pi * frequency * t
    if kind == 'marimba':
        return (np.sin(p) * np.exp(-t*7) + .18 * np.sin(p*4) * np.exp(-t*25)) * envelope(t, hold, .002, .4)
    if kind == 'pluck':
        y = sum(np.sin(h*p) * np.sin(h*.22*np.pi) / h**1.45 * np.exp(-t*(5+h)) for h in range(1, 13))
        return y * envelope(t, hold, .002, .4)
    if kind == 'bass':
        return (np.sin(p) + .28*np.sin(2*p) + .09*np.sin(3*p)) * np.exp(-t*3.4) * envelope(t, hold, .009, .1)
    if kind == 'reed':
        return (np.sin(p) + .24*np.sin(3*p) + .055*np.sin(5*p)) * envelope(t, hold, .018, .08)
    if kind == 'kick':
        p = 2*np.pi*(49*t + 70*.023*(1-np.exp(-t/.023)))
        return np.sin(p) * np.exp(-t*24) * envelope(t, hold, .002, .06)
    if kind in ('rim', 'wood'):
        f = 820 if kind == 'wood' else 1350
        return (np.sin(2*np.pi*f*t) + .35*np.sin(2*np.pi*f*1.49*t)) * np.exp(-t*72) * envelope(t, hold, .001, .05)
    noise = noise_rng.normal(0, .6, len(t))
    return (noise - np.convolve(noise, np.ones(6)/6, 'same')) * np.exp(-t*65) * envelope(t, hold, .002, .05)


# Short repeated motif, deliberate rests, and low-register comic replies.
# Every tuple is beat offset, MIDI pitch, held beats. Original notes, not a cover.
A = [
    [(0,76,.24),(.5,79,.26),(1,76,.25),(1.75,72,.45),(2.5,74,.24),(3,76,.5)],
    [(0,74,.24),(.5,79,.28),(1,74,.25),(1.75,71,.42),(2.5,69,.24),(3,67,.5)],
    [(0,76,.24),(.5,81,.28),(1,79,.25),(1.75,76,.45),(2.5,74,.24),(3,72,.5)],
    [(0,77,.28),(.5,76,.25),(1,74,.6),(2,72,.7)],
    [(0,76,.24),(.5,79,.26),(1,76,.25),(1.75,72,.45),(2.5,74,.24),(3,76,.5)],
    [(0,77,.24),(.5,81,.28),(1,79,.25),(1.75,77,.45),(2.5,76,.24),(3,74,.5)],
    [(0,74,.24),(.5,71,.27),(1,67,.4),(2,71,.23),(2.5,74,.23),(3,79,.38)],
    [(0,76,.24),(.5,74,.24),(1,72,1.1)],
]
B = [
    [(.5,77,.65),(1.5,81,.35),(2.5,79,.35),(3.25,77,.3)],
    [(0,76,.6),(1,79,.3),(1.75,76,.3),(2.5,72,.65)],
    [(0,74,.24),(.5,77,.24),(1,81,.5),(2,79,.3),(2.75,77,.5)],
    [(.5,74,.3),(1.25,71,.3),(2,67,.7)],
    [(0,76,.24),(.5,81,.26),(1,84,.65),(2.5,81,.25),(3,79,.45)],
    [(0,77,.28),(.5,76,.25),(1,74,.6),(2,69,.65)],
    [(0,74,.26),(.5,71,.25),(1,67,.4),(2,69,.25),(2.5,71,.25),(3,74,.4)],
    [(0,79,.5),(1,77,.25),(1.5,74,.35),(2.5,71,.3)],
]
CHORDS = {'C': (36,[60,64,67]), 'G': (43,[59,62,67]),
          'Am': (45,[60,64,69]), 'F': (41,[60,65,69]), 'Dm': (38,[62,65,69])}
AH = ['C','G','Am','F','C','F','G','C']
BH = ['F','C','Dm','G','Am','Dm','G','G']
progression = AH + BH + AH + ['G','C']

for bar, name in enumerate(progression):
    root, chord = CHORDS[name]
    base = bar*4
    final = bar == 25
    # Short tonic landing instead of a long repetitive outro.
    if final:
        add('bass',root,base,1.4,.20)
        for i,p in enumerate(chord):
            add('pluck',p,base+i*.025,1.4,.09,-.3)
        add('whistle',72,base,.8,.14,.02)
        add('marimba',84,base+.15,.65,.055,.25)
        continue
    # A half-bar stop before the final return: the motif pops back into focus.
    stop_at = 2 if bar in (7,15,23) else 4
    for b,p in [(0,root),(1.5,root+12),(2,root+7),(3.5,root+12)]:
        if b < stop_at:
            add('bass',p,base+b,.38,.16 if b in (0,2) else .09,-.03)
    for b in (.5,1.5,2.5,3.5):
        if b >= stop_at:
            continue
        for i,p in enumerate(chord):
            add('pluck',p,base+b+i*.018,.25,.065,-.35)
    for b in range(stop_at):
        add('kick',36,base+b,.12,.13 if b%2==0 else .055)
        if b%2:
            add('rim',37,base+b,.08,.034,.15)
        for sub in (0,.56):
            add('shaker',82,base+b+sub,.06,.012 if sub else .007,.4)
    phrase = A[bar%8] if bar < 8 or 16 <= bar < 24 else B[bar-8] if bar < 16 else [(0,74,.25),(.5,71,.25),(1,67,.5),(2,71,.25),(2.5,74,.25),(3,79,.4)]
    for b,p,d in phrase:
        if 8 <= bar < 16:
            add('marimba',p,base+b,d,.19,.18)
            add('reed',p-12,base+b,d,.042,-.12)
        else:
            add('whistle',p,base+b,d,.145,.02)
            if 16 <= bar < 24:
                add('marimba',p-12,base+b,d,.066,.25)
    if bar in (3,11,19):
        for b,p in [(3,60),(3.33,62),(3.66,64)]:
            add('reed',p,base+b,.19,.105,-.15)
    if bar in (7,23):
        # Comedic descending answer, resolved to C; no next-bar contamination.
        for b,p in [(2.5,67),(2.85,64),(3.2,60)]:
            add('marimba',p,base+b,.22,.15,.23)
        add('wood',76,base+3.7,.07,.06,-.2)
    if bar == 15:
        for b in (2.5,3,3.5):
            add('wood',76,base+b,.07,.045,-.2)


def render(name, selected, beats):
    noise_rng = np.random.default_rng(2206)
    mix = np.zeros((round((beats*BEAT+1.5)*SR),2),dtype=np.float64)
    for e in selected:
        # Keep rhythmic attacks crisp; tiny strum offsets supply human variation.
        y = synth(e['kind'],e['pitch'],e['duration']*BEAT,noise_rng)*e['gain']
        start = round(e['beat']*BEAT*SR)
        n = min(len(y),len(mix)-start)
        angle = (e['pan']+1)*np.pi/4
        mix[start:start+n,0] += y[:n]*math.cos(angle)
        mix[start:start+n,1] += y[:n]*math.sin(angle)
    dry = mix.copy()
    for seconds,gain in [(.043,.08),(.079,.06),(.127,.04),(.191,.025),(.271,.012)]:
        offset = round(seconds*SR)
        mix[offset:,0] += dry[:-offset,1]*gain
        mix[offset:,1] += dry[:-offset,0]*gain
    # Gentle transient rounding, not hard clipping; peak headroom for encoding.
    mix = np.tanh(mix*1.25)
    mix *= 10**(-1.5/20)/np.max(np.abs(mix))
    fade = round(.8*SR)
    mix[-fade:] *= np.linspace(1,0,fade)[:,None]**2
    assert np.isfinite(mix).all() and np.max(np.abs(mix)) < 1
    pcm = np.round(mix*32767).astype('<i2')
    path = OUT / (name+'.wav')
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return {'file':path.name,'seconds':len(mix)/SR,'peak_dbfs':round(20*np.log10(np.max(np.abs(mix))),2),
            'rms_dbfs':round(20*np.log10(np.sqrt(np.mean(mix**2))),2),
            'clipped_samples':int(np.count_nonzero(np.abs(pcm.astype(np.int32))>=32767)),
            'first_second_rms':float(np.sqrt(np.mean(mix[:SR]**2)))}


def vlq(n):
    result = [n&127]
    while n>>7:
        n >>= 7
        result.insert(0,(n&127)|128)
    return bytes(result)


def track(messages):
    data,previous = bytearray(),0
    for tick,msg in sorted(messages,key=lambda x:(x[0],x[1][0])):
        data.extend(vlq(tick-previous)); data.extend(msg); previous=tick
    data.extend(b'\x00\xff\x2f\x00')
    return b'MTrk'+struct.pack('>I',len(data))+data


def midi():
    tracks=[track([(0,b'\xff\x51\x03'+round(60000000/BPM).to_bytes(3,'big')),
                   (0,b'\xff\x58\x04\x04\x02\x18\x08'),(0,b'\xff\x59\x02\x00\x00')])]
    for ch,program in PROGRAM.items():
        messages=[(0,bytes([0xC0|ch,program]))]
        for e in events:
            if CHANNEL[e['kind']] != ch:
                continue
            pitch=PERC.get(e['kind'],e['pitch'])
            velocity=int(np.clip(76+17*np.log2(e['gain']/.13),25,110))
            messages.extend([(round(e['beat']*PPQ),bytes([0x90|ch,pitch,velocity])),
                             (round((e['beat']+e['duration'])*PPQ),bytes([0x80|ch,pitch,0]))])
        tracks.append(track(messages))
    (OUT/'warga-lagi-hepi.mid').write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tracks),PPQ)+b''.join(tracks))


if __name__ == '__main__':
    master=render('warga-lagi-hepi',events,26*4)
    hook=render('warga-lagi-hepi-hook',[e for e in events if e['beat']<32],32)
    midi()
    report={'title':'Warga Lagi Hepi','tempo_bpm':BPM,'key':'C major','meter':'4/4',
            'sample_rate':SR,'pcm_bits':16,'channels':2,'note_events':len(events),
            'files':[master,hook],
            'direction':'Original cheerful comic theme; immediate whistle motif, plucked offbeats, marimba answers and stop-time jokes.',
            'instruments':['synthetic whistle','marimba','plucked strings','bass','comic low reed','light percussion'],
            'external_audio_or_midi_used':False,'game_modified':False,
            'notes':'Synthetic instrumental demo, not live instruments. Listening endings, not seamless loops. MIDI timbres depend on player. QA is technical, not a human listening test.'}
    (OUT/'info.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))
