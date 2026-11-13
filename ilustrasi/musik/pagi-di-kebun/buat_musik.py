"""Original standalone instrumental demo. Does not read or change game code.

Requires Python + numpy. Run from any directory; outputs alongside this script.
All notes and synthesized sounds are authored here; no external samples.
"""
from pathlib import Path
import json
import math
import struct
import wave
import numpy as np

OUT = Path(__file__).resolve().parent
SR = 44100
BPM = 96
BEAT = 60 / BPM
BARS = 32
END = BARS * 3 * BEAT
LENGTH = END + 3.5
RNG = np.random.default_rng(181126)
mix = np.zeros((math.ceil(LENGTH * SR), 2), dtype=np.float64)
events = []


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def envelope(t, hold, attack=.025, release=.13):
    env = np.minimum(t / attack, 1)
    return env * np.clip((hold + release - t) / release, 0, 1) ** 1.6


def voice(kind, note, duration):
    f = hz(note)
    if kind == 'flute':
        t = np.arange(int((duration + .16) * SR)) / SR
        # Delayed vibrato, breath noise, mellow overtones and soft articulation.
        vibrato = .0023 * np.clip((t - .12) / .18, 0, 1) * np.sin(2 * np.pi * 4.7 * t)
        phase = 2 * np.pi * np.cumsum(f * (1 + vibrato)) / SR
        y = np.sin(phase) + .15 * np.sin(phase * 2 + .12) + .045 * np.sin(phase * 3)
        noise = RNG.normal(0, 1, len(t))
        breath = np.convolve(noise, np.ones(11) / 11, mode='same') * .025
        return (y + breath) * envelope(t, duration, .035, .16) * (.96 + .04 * np.sin(2 * np.pi * 3.8 * t))
    if kind == 'guitar':
        t = np.arange(int((min(duration, 1.35) + .55) * SR)) / SR
        y = np.zeros_like(t)
        # Plucked-string harmonics decay faster toward the upper spectrum.
        for h in range(1, 19):
            if h * f > 16000:
                break
            amp = math.sin(h * .24 * np.pi) / h ** 1.2
            y += amp * np.sin(2 * np.pi * f * h * (1 + .000018 * h * h) * t) * np.exp(-t * (1.7 + h * .48))
        return y * (1 - np.exp(-t * 900)) * envelope(t, duration, .003, .55)
    if kind == 'bass':
        t = np.arange(int((duration + .2) * SR)) / SR
        phase = 2 * np.pi * f * t
        y = np.sin(phase) + .23 * np.sin(phase * 2) + .055 * np.sin(phase * 3)
        return y * np.exp(-t * 1.9) * envelope(t, duration, .012, .2)
    if kind == 'mallet':
        t = np.arange(int(1.5 * SR)) / SR
        y = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.8)
        y += .16 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t * 20)
        return y * (1 - np.exp(-t * 1200)) * np.minimum((1.5 - t) / .08, 1)
    if kind == 'pad':
        t = np.arange(int((duration + .45) * SR)) / SR
        y = np.zeros_like(t)
        for h in range(1, 5):
            y += (np.sin(2 * np.pi * f * h * .999 * t) + np.sin(2 * np.pi * f * h * 1.001 * t)) / (2 * h ** 2.2)
        return y * envelope(t, duration, .24, .45) * .65
    if kind == 'shaker':
        t = np.arange(int(.105 * SR)) / SR
        noise = RNG.normal(0, 1, len(t))
        return (noise - np.convolve(noise, np.ones(9) / 9, mode='same')) * np.exp(-t * 48) * np.minimum(t / .006, 1)
    if kind == 'wood':
        t = np.arange(int(.12 * SR)) / SR
        return (np.sin(2 * np.pi * 870 * t) + .33 * np.sin(2 * np.pi * 1430 * t)) * np.exp(-t * 62) * np.minimum(t / .002, 1)
    raise ValueError(kind)


CHANNEL = {'flute': 0, 'guitar': 1, 'bass': 2, 'mallet': 3, 'pad': 4, 'shaker': 9, 'wood': 9}


def add(kind, note, beat, beats, gain, pan=0, humanize=True):
    seconds = max(0, beat * BEAT + (RNG.uniform(-.006, .006) if humanize else 0))
    duration = beats * BEAT
    y = voice(kind, note, duration) * gain * RNG.uniform(.96, 1.04)
    start = round(seconds * SR)
    count = min(len(y), len(mix) - start)
    assert count > 0
    angle = (pan + 1) * np.pi / 4
    mix[start:start+count, 0] += y[:count] * math.cos(angle)
    mix[start:start+count, 1] += y[:count] * math.sin(angle)
    midi_note = {'shaker': 82, 'wood': 76}.get(kind, note)
    velocity = max(24, min(100, round(62 + 17 * math.log2(max(gain, .01) / .075))))
    events.append((CHANNEL[kind], midi_note, seconds / BEAT, beats, velocity))


# G major, gentle 3/4. Two intro bars, eight-bar theme, eight-bar contrast,
# eight-bar reprise, then a six-bar coda. No borrowed melodies or recordings.
chords = {
    'G': (43, [55, 59, 62, 67]), 'G/B': (47, [55, 59, 62, 67]),
    'Em': (40, [55, 59, 64, 67]), 'Bm': (47, [54, 59, 62, 66]),
    'C': (48, [55, 60, 64, 67]), 'Am': (45, [57, 60, 64, 67]),
    'D': (38, [54, 57, 62, 66]), 'Dsus': (38, [55, 57, 62, 67]),
}
theme_chords = ['G', 'Em', 'C', 'D', 'G/B', 'Am', 'D', 'G']
bridge_chords = ['Em', 'Bm', 'C', 'G/B', 'Am', 'C', 'Dsus', 'D']
progression = ['G', 'D'] + theme_chords + bridge_chords + theme_chords + ['C', 'G/B', 'Am', 'D', 'G', 'G']
assert len(progression) == BARS

# Entries: offset in beats, pitch (MIDI), held beats. Rests are intentional.
theme = [
    [(0, 71, .8), (1, 74, .45), (1.5, 79, .7), (2.5, 78, .4)],
    [(0, 76, 1.25), (1.5, 74, .45), (2, 71, .7)],
    [(.5, 72, .45), (1, 76, .9), (2, 74, .45), (2.5, 72, .4)],
    [(0, 69, .9), (1, 74, .8), (2.25, 78, .45)],
    [(0, 79, 1.25), (1.5, 74, .45), (2, 71, .8)],
    [(0, 72, .7), (1, 71, .4), (1.5, 69, 1.1)],
    [(.25, 69, .45), (1, 74, .6), (2, 78, .65)],
    [(0, 79, 1.7)],
]
bridge = [
    [(.5, 76, .7), (1.5, 79, .45), (2, 78, .75)],
    [(0, 74, 1.1), (1.5, 71, 1)],
    [(0, 72, .45), (.5, 74, .45), (1, 76, 1.2), (2.5, 79, .4)],
    [(0, 74, 1.7), (2, 71, .65)],
    [(.5, 69, .7), (1.5, 72, .4), (2, 76, .8)],
    [(0, 79, .9), (1, 76, .7), (2, 72, .75)],
    [(0, 74, .8), (1, 79, 1.3)],
    [(0, 78, 1.2), (1.5, 76, .4), (2, 74, .7)],
]
coda = [
    [(0, 76, 1.1), (1.5, 74, .45), (2, 72, .75)],
    [(0, 71, 1.4), (1.75, 74, .85)],
    [(.5, 72, .7), (1.5, 71, .45), (2, 69, .7)],
    [(0, 69, .65), (1, 74, .65), (2, 78, .7)],
    [(0, 79, 2.35)],
    [],
]
for bar, name in enumerate(progression):
    start = bar * 3
    root, notes = chords[name]
    intensity = .84 if bar < 2 else (.92 if bar < 10 else (1.0 if bar < 26 else .86))
    if bar == 31:
        for i, pitch in enumerate([55, 59, 62, 67]):
            add('guitar', pitch, start + i * .06, 2.7, .09, -.26, False)
        add('bass', root, start, 2, .13, 0, False)
        continue
    # Fingerpicking rather than an unchanging block chord.
    pattern = [0, 2, 1, 3, 2, 1] if bar % 2 == 0 else [0, 1, 2, 3, 1, 2]
    for step, index in enumerate(pattern):
        add('guitar', notes[index], start + step * .5, .78, intensity * (.105 if step in [0, 3] else .077), -.32)
    add('bass', root, start, 1.65, .15 * intensity, -.04)
    if bar > 1 and bar < 30:
        add('bass', root + (7 if name != 'G/B' else 8), start + 2, .75, .085, -.04)
    if 2 <= bar < 30:
        for step in range(6):
            add('shaker', 82, start + step * .5, .15, .012 if step % 2 else .0075, .4)
        add('wood', 76, start + 2, .1, .017 * intensity, -.36)
    # Sparse sustained harmony opens up the contrasting middle section.
    if 10 <= bar < 26:
        for index, pitch in enumerate(notes[:3]):
            add('pad', pitch, start + .05, 2.75, .018, -.5 + index * .5)
    if bar < 2:
        if bar == 1:
            add('mallet', 74, start + 1, .4, .065, .3)
            add('mallet', 78, start + 2, .4, .055, .3)
        continue
    line = theme[bar-2] if bar < 10 else bridge[bar-10] if bar < 18 else theme[bar-18] if bar < 26 else coda[bar-26]
    for offset, pitch, length in line:
        # The reprise gets a tiny answering ornament, not a new lead layered on top.
        add('flute', pitch, start + offset, length, .128 * intensity, .06)
    if bar in [5, 9, 13, 17, 21, 25, 29]:
        add('mallet', notes[-1] + 12, start + 2.25, .35, .043, .43)
        add('mallet', notes[-2] + 12, start + 2.75, .3, .033, .43)

# Short stereo room. A quiet diffuse tail, no pumping or brickwall limiting.
dry = mix.copy()
for seconds, level in [(.071, .075), (.113, .06), (.173, .045), (.239, .033), (.337, .024), (.467, .016), (.613, .009)]:
    delay = round(seconds * SR)
    mix[delay:, 0] += dry[:-delay, 1] * level
    mix[delay:, 1] += dry[:-delay, 0] * level * .94
mix -= mix.mean(axis=0)
mix *= min(3.0, 10 ** (-1.5 / 20) / np.max(np.abs(mix)))
fade_in = int(.02 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(1.8 * SR)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.6
assert np.isfinite(mix).all()
assert np.max(np.abs(mix)) < 1
pcm = np.round(mix * 32767).astype('<i2')
wav_path = OUT / 'pagi-di-kebun.wav'
with wave.open(str(wav_path), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(SR)
    stream.writeframes(pcm.tobytes())


def variable_length(n):
    result = [n & 127]
    while n >> 7:
        n >>= 7
        result.insert(0, (n & 127) | 128)
    return bytes(result)


def chunk(events_list):
    data = bytearray()
    previous = 0
    for tick, message in sorted(events_list, key=lambda e: (e[0], e[1][0])):
        data.extend(variable_length(tick - previous))
        data.extend(message)
        previous = tick
    data.extend(b'\x00\xff\x2f\x00')
    return b'MTrk' + struct.pack('>I', len(data)) + data


# Standard MIDI source can be re-orchestrated in a DAW using better sound banks.
ppq = 480
tempo = round(60000000 / BPM)
tracks = [chunk([(0, b'\xff\x51\x03' + tempo.to_bytes(3, 'big')), (0, b'\xff\x58\x04\x03\x02\x18\x08')])]
for channel, program in [(0, 73), (1, 24), (2, 32), (3, 12), (4, 48), (9, 0)]:
    messages = [(0, bytes([0xC0 | channel, program]))]
    for ch, note, onset, duration, velocity in events:
        if ch == channel:
            messages.append((round(onset * ppq), bytes([0x90 | ch, note, velocity])))
            messages.append((round((onset + duration) * ppq), bytes([0x80 | ch, note, 0])))
    tracks.append(chunk(messages))
(OUT / 'pagi-di-kebun.mid').write_bytes(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), ppq) + b''.join(tracks))
report = {
    'title': 'Pagi di Kebun', 'type': 'original instrumental demo',
    'tempo_bpm': BPM, 'meter': '3/4', 'key': 'G major', 'bars': BARS,
    'seconds': len(mix) / SR, 'sample_rate': SR, 'channels': 2, 'pcm_bits': 16,
    'instruments': ['synthetic flute', 'plucked guitar', 'acoustic-style bass', 'wooden mallet', 'soft sustained harmony', 'shaker', 'wood percussion'],
    'peak_dbfs': round(20 * math.log10(float(np.max(np.abs(mix)))) , 2),
    'rms_dbfs': round(20 * math.log10(float(np.sqrt(np.mean(mix ** 2)))) , 2),
    'clipped_samples': int(np.count_nonzero(np.abs(mix) >= 1)),
    'note_events': len(events), 'external_samples': False, 'game_modified': False,
    'notes': 'Standalone listening version with ending and reverb tail; not a seamless game loop. MIDI uses General MIDI patches and will sound different from the custom WAV synthesizer. Technical checks only; no claim of studio mastering or subjective listening verification.',
}
(OUT / 'info.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
print(str(wav_path))

