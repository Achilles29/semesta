"""An original sunny town instrumental; no borrowed melody, MIDI or samples.
Standalone Python/numpy renderer. Does not import or modify the game or first song.
"""
from pathlib import Path
import json
import math
import struct
import wave
import numpy as np

OUT = Path(__file__).resolve().parent
SR, BPM, PPQ = 44100, 112, 480
BEAT = 60 / BPM
BARS = 32
DURATION = BARS * 4 * BEAT + 3.2
rng = np.random.default_rng(271126)
mix = np.zeros((round(DURATION * SR), 2))
events = []
channels = {'accordion': 0, 'flute': 1, 'guitar': 2, 'bass': 3, 'bell': 4, 'brush': 9, 'shaker': 9}


def env(t, hold, attack=.018, release=.1):
    return np.minimum(t / attack, 1) * np.clip((hold + release - t) / release, 0, 1) ** 1.5


def synth(kind, note, hold):
    f = 440 * 2 ** ((note - 69) / 12)
    tail = .6 if kind in ('guitar', 'bell') else .16
    t = np.arange(round((hold + tail) * SR)) / SR
    phase = 2 * np.pi * f * t
    if kind == 'accordion':
        # Two very gently detuned reed banks; dark upper partials avoid a buzzy lead.
        y = np.zeros_like(t)
        for h, amp in enumerate([1, .29, .16, .06, .025, .012], 1):
            y += amp * (.55 * np.sin(phase * h * .9993) + .45 * np.sin(phase * h * 1.0007 + .08))
        return y * env(t, hold, .022, .16) * (.94 + .035 * np.sin(2 * np.pi * 4.8 * t))
    if kind == 'flute':
        phase = 2 * np.pi * np.cumsum(f * (1 + .0018 * np.minimum(t / .2, 1) * np.sin(2 * np.pi * 4.5 * t))) / SR
        return (np.sin(phase) + .13 * np.sin(2 * phase) + .035 * np.sin(3 * phase)) * env(t, hold, .03, .16)
    if kind == 'guitar':
        y = np.zeros_like(t)
        for h in range(1, 16):
            y += math.sin(h * .23 * np.pi) / h ** 1.3 * np.sin(phase * h * (1 + .000015 * h * h)) * np.exp(-t * (2 + .5 * h))
        return y * env(t, hold, .003, .6)
    if kind == 'bass':
        return (np.sin(phase) + .23 * np.sin(phase * 2) + .05 * np.sin(phase * 3)) * np.exp(-t * 2.1) * env(t, hold, .012, .16)
    if kind == 'bell':
        return (np.sin(phase) * np.exp(-t * 4) + .12 * np.sin(phase * 3.98) * np.exp(-t * 15)) * env(t, hold, .002, .6)
    noise = rng.normal(0, 1, len(t))
    if kind == 'brush':
        softened = np.convolve(noise, np.ones(5) / 5, mode='same')
        return (softened * .7 + .15 * np.sin(2 * np.pi * 180 * t)) * np.exp(-t * 22) * env(t, hold, .008, .16)
    if kind == 'shaker':
        return (noise - np.convolve(noise, np.ones(8) / 8, mode='same')) * np.exp(-t * 48) * env(t, hold, .004, .16)
    raise ValueError(kind)


def add(kind, note, beat, beats, gain, pan=0):
    onset = max(0, beat * BEAT + rng.uniform(-.004, .004))
    y = synth(kind, note, beats * BEAT) * gain * rng.uniform(.97, 1.03)
    start = round(onset * SR)
    n = min(len(y), len(mix) - start)
    angle = (pan + 1) * np.pi / 4
    mix[start:start+n, 0] += y[:n] * math.cos(angle)
    mix[start:start+n, 1] += y[:n] * math.sin(angle)
    pitch = {'brush': 38, 'shaker': 82}.get(kind, note)
    velocity = max(25, min(102, round(68 + 15 * math.log2(max(gain, .01) / .08))))
    events.append((channels[kind], pitch, onset / BEAT, beats, velocity))


# F-major original progression. Slash chords keep a conversational walking bass.
chords = {
    'F': (41, [57, 60, 65]), 'C/E': (40, [55, 60, 64]),
    'Dm': (38, [57, 62, 65]), 'Bb': (46, [58, 62, 65]),
    'Gm': (43, [58, 62, 67]), 'C': (48, [55, 60, 64]),
    'Am': (45, [57, 60, 64]), 'A7': (45, [55, 61, 64]),
    'F/A': (45, [57, 60, 65]), 'Csus': (48, [55, 60, 65]),
}
theme_harmony = ['F', 'C/E', 'Dm', 'Bb', 'F/A', 'Gm', 'C', 'F']
bridge_harmony = ['Bb', 'Am', 'Gm', 'C', 'Dm', 'A7', 'Bb', 'C']
progression = ['F', 'C'] + theme_harmony + bridge_harmony + theme_harmony + ['Bb', 'F/A', 'Gm', 'C', 'F', 'F']
assert len(progression) == BARS

# Hand-composed melody: little rests and offbeat answers, not a transcribed theme.
# Pitch numbers are MIDI notes; each phrase stays within its four-beat bar.
theme = [
    [(0, 69, .7), (1, 72, .4), (1.5, 74, .4), (2, 72, .7), (3, 69, .4), (3.5, 67, .35)],
    [(.25, 67, .65), (1.25, 64, .65), (2.5, 67, .4), (3, 72, .7)],
    [(0, 74, .95), (1.5, 72, .4), (2, 69, .75), (3, 65, .65)],
    [(.5, 65, .4), (1, 67, .4), (1.5, 70, .7), (2.5, 69, .4), (3, 65, .7)],
    [(0, 69, .7), (1, 72, 1.15), (2.5, 69, .4), (3, 67, .7)],
    [(0, 70, .65), (1, 69, .4), (1.5, 67, .75), (2.5, 65, .4), (3, 67, .65)],
    [(.25, 64, .65), (1.25, 67, .65), (2.5, 72, .4), (3, 70, .65)],
    [(0, 69, .65), (1, 67, .4), (1.5, 65, 1.55)],
]
bridge = [
    [(0, 74, 1.15), (1.5, 77, .4), (2, 74, .65), (3, 70, .65)],
    [(.5, 72, .65), (1.5, 69, .65), (2.5, 67, 1.05)],
    [(0, 67, .4), (.5, 70, .4), (1, 74, .65), (2, 72, .65), (3, 70, .65)],
    [(0, 67, 1.35), (2, 64, .65), (3, 67, .65)],
    [(.5, 69, .4), (1, 74, 1.05), (2.5, 77, .4), (3, 76, .65)],
    [(0, 73, 1.1), (1.5, 76, .4), (2, 73, .65), (3, 69, .65)],
    [(0, 70, .65), (1, 74, .65), (2, 77, 1.15)],
    [(.5, 76, .65), (1.5, 74, .4), (2, 72, .65), (3, 67, .65)],
]
coda = [
    [(0, 70, .65), (1, 74, 1.15), (2.5, 72, .4), (3, 70, .65)],
    [(0, 69, 1.1), (1.5, 72, .4), (2, 69, 1.2)],
    [(.5, 67, .65), (1.5, 70, .65), (2.5, 69, .4), (3, 67, .65)],
    [(0, 64, .65), (1, 67, .65), (2, 72, .65), (3, 70, .65)],
    [(0, 69, .65), (1, 67, .4), (1.5, 65, 2)],
    [],
]

for bar, chord in enumerate(progression):
    root, notes = chords[chord]
    start = bar * 4
    energy = .72 if bar < 2 else .9 if bar < 10 else .83 if bar < 18 else 1 if bar < 26 else .82
    if bar == 31:
        for i, pitch in enumerate(notes):
            add('guitar', pitch, start + i * .065, 2.6, .11, -.35)
            add('accordion', pitch, start + .05, 1.6, .026, -.1)
        add('bass', root, start, 2.2, .14)
        add('bell', 77, start + .3, .9, .04, .4)
        continue
    # Light 2-beat bass and offbeat strums, with a few alternating picked notes.
    fifth = root + (8 if chord in ['C/E', 'F/A'] else 7)
    add('bass', root, start, .88, .145 * energy, -.03)
    add('bass', fifth, start + 2, .8, .105 * energy, -.03)
    if bar % 4 == 3 and bar < 30:
        next_root = chords[progression[bar+1]][0]
        add('bass', next_root - 2, start + 3.5, .35, .068, -.03)
    for beat in [1, 3]:
        for i, pitch in enumerate(notes):
            add('guitar', pitch, start + beat + i * .025, .65, .058 * energy, -.4)
    for beat, pitch in [(0, notes[0]), (.52, notes[-1]), (2, notes[1]), (2.52, notes[-1])]:
        add('guitar', pitch, start + beat, .7, .071 * energy, -.25)
    if 2 <= bar < 30:
        for step in range(8):
            add('shaker', 82, start + step * .5 + (.025 if step % 2 else 0), .08, .0085 if step % 2 else .0045, .4)
        for beat in [1, 3]:
            add('brush', 38, start + beat, .14, .024 * energy, .16)
    if bar < 2:
        for beat, pitch in [(1, notes[1]+12), (2.5, notes[-1]+12)]:
            add('bell', pitch, start + beat, .5, .041, .34)
        continue
    phrase = theme[bar-2] if bar < 10 else bridge[bar-10] if bar < 18 else theme[bar-18] if bar < 26 else coda[bar-26]
    lead = 'flute' if 10 <= bar < 18 else 'accordion'
    for beat, pitch, hold in phrase:
        add(lead, pitch, start + beat, hold, .105 * energy if lead == 'accordion' else .12 * energy, .02 if lead == 'accordion' else .14)
    # Flute replies in phrase gaps; bridge has a little accordion accompaniment.
    if bar in [9, 25]:
        add('flute', 72, start + 3.1, .32, .075, .2)
        add('flute', 69, start + 3.55, .32, .068, .2)
    if 10 <= bar < 18:
        for pitch in notes[:2]:
            add('accordion', pitch, start + 1, .65, .024, -.17)
            add('accordion', pitch, start + 3, .65, .021, -.17)
    if bar in [5, 13, 21, 29]:
        add('bell', notes[-1] + 12, start + 3.5, .45, .027, .42)

dry = mix.copy()
for sec, gain in [(.067, .07), (.107, .055), (.163, .038), (.229, .028), (.313, .018), (.431, .011)]:
    offset = round(sec * SR)
    mix[offset:, 0] += dry[:-offset, 1] * gain
    mix[offset:, 1] += dry[:-offset, 0] * gain * .94
mix -= mix.mean(axis=0)
mix *= min(3, 10 ** (-1.5/20) / np.max(np.abs(mix)))
n = round(.02 * SR)
mix[:n] *= np.linspace(0, 1, n)[:, None]
n = round(1.5 * SR)
mix[-n:] *= np.linspace(1, 0, n)[:, None] ** 1.6
assert np.isfinite(mix).all() and np.max(np.abs(mix)) < 1
pcm = np.round(mix * 32767).astype('<i2')
wav = OUT / 'jalan-ke-alun-alun.wav'
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())


def vlq(n):
    result = [n & 127]
    while n >> 7:
        n >>= 7
        result.insert(0, (n & 127) | 128)
    return bytes(result)


def track(messages):
    data, previous = bytearray(), 0
    for tick, message in sorted(messages, key=lambda e: (e[0], e[1][0])):
        data.extend(vlq(tick - previous))
        data.extend(message)
        previous = tick
    data.extend(b'\x00\xff\x2f\x00')
    return b'MTrk' + struct.pack('>I', len(data)) + data


tracks = [track([(0, b'\xff\x51\x03' + round(60000000/BPM).to_bytes(3, 'big')), (0, b'\xff\x58\x04\x04\x02\x18\x08')])]
for ch, program in [(0, 21), (1, 73), (2, 24), (3, 32), (4, 12), (9, 0)]:
    messages = [(0, bytes([0xC0 | ch, program]))]
    for channel, pitch, beat, beats, velocity in events:
        if channel == ch:
            messages.extend([(round(beat * PPQ), bytes([0x90 | ch, pitch, velocity])), (round((beat+beats) * PPQ), bytes([0x80 | ch, pitch, 0]))])
    tracks.append(track(messages))
(OUT / 'jalan-ke-alun-alun.mid').write_bytes(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), PPQ) + b''.join(tracks))
report = {
    'title': 'Jalan ke Alun-Alun', 'type': 'original town instrumental demo',
    'creative_direction': 'Warm, cheerful small-town life-sim atmosphere; user reference: Harvest Moon Back to Nature, Town. Not a cover or transcription.',
    'tempo_bpm': BPM, 'meter': '4/4', 'key': 'F major', 'bars': BARS,
    'seconds': len(mix) / SR, 'sample_rate': SR, 'channels': 2, 'pcm_bits': 16,
    'instruments': ['synthetic accordion', 'flute', 'plucked guitar', 'bass', 'wooden bell', 'brush percussion', 'shaker'],
    'peak_dbfs': round(20 * math.log10(float(np.max(np.abs(mix)))), 2),
    'rms_dbfs': round(20 * math.log10(float(np.sqrt(np.mean(mix**2)))), 2),
    'clipped_samples': int(np.count_nonzero(np.abs(pcm.astype(np.int32)) >= 32767)),
    'note_events': len(events), 'external_audio_or_midi_used': False,
    'game_modified': False, 'first_song_modified': False,
    'reference_catalog': 'https://musicbrainz.org/release/751562c2-18e8-4da7-9197-ca47a63b56c4',
    'notes': 'Listening version with composed ending, not seamless loop. Synthetic demo, not studio instruments. MIDI is editable and may sound different. Technical validation does not replace human listening.'
}
(OUT / 'info.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
print(str(wav))
