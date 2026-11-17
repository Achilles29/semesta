"""Add aligned subtitles and a new original comic arrangement; never resynthesize speech.

Run once: python tools/build_v16_r2.py
Existing releases are immutable. Source timing is the provider's final mapped characters.
"""
import hashlib
import importlib.util
import json
import math
import re
import shutil
import wave
from pathlib import Path

import numpy as np
from PIL import ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/audio/produksi/episode-002'
OLD, OUT = BASE / 'release-v16', BASE / 'release-v16-r2'
RATE = 44100
assert not OUT.exists(), 'Use a new release directory instead of overwriting a release.'
timeline = json.loads((OLD / 'timeline.json').read_text(encoding='utf-8'))
OUT.mkdir()


def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        assert (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (RATE, 2, 2)
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, 2) / 32768.


def write_wav(name, data):
    assert np.isfinite(data).all() and np.max(np.abs(data)) < 1
    with wave.open(str(OUT / name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(np.round(data * 32767).astype('<i2').tobytes())


# Retain exact dialogue bytes, not a re-encoded/normalized/retimed approximation.
shutil.copy2(OLD / 'episode-002-v16-dialogue.wav', OUT / 'episode-002-v16-r2-dialogue.wav')
shutil.copy2(OLD / 'episode-002-v16-fx.wav', OUT / 'episode-002-v16-r2-fx.wav')
voice = read_wav(OLD / 'episode-002-v16-dialogue.wav')
fx = read_wav(OLD / 'episode-002-v16-fx.wav')
frames = len(voice)
t = np.arange(frames) / RATE

# Reuse our own composition's instruments/motif, not any borrowed soundtrack.
# Import is side-effect-free: its __main__ exports are not executed.
composition = ROOT / 'ilustrasi/musik/warga-lagi-hepi/buat_musik.py'
spec = importlib.util.spec_from_file_location('original_composition', composition)
score = importlib.util.module_from_spec(spec); spec.loader.exec_module(score)
music = np.zeros_like(voice)
rng = np.random.default_rng(161702)
scheduled = []
impact, push = timeline['events']['impact'], timeline['events']['push']


def instrument(kind, pitch, when, hold, gain, pan=0):
    start = round(when * RATE)
    if start >= frames or start < 0: return
    sound = score.synth(kind, pitch, hold, rng) * gain
    n = min(len(sound), frames - start)
    angle = (pan + 1) * math.pi / 4
    music[start:start+n, 0] += sound[:n] * math.cos(angle)
    music[start:start+n, 1] += sound[:n] * math.sin(angle)
    scheduled.append(dict(kind=kind, pitch=pitch, start=when, duration=hold, gain=gain))


# Whistle hook, offbeat plucked chords, syncopated bass, marimba replies,
# kick/rim/shaker groove at 128 BPM. Restart the hook as the officials push.
for offset, end in [(0, impact), (push, timeline['duration'] - .7)]:
    for note in score.events:
        at = offset + note['beat'] * score.BEAT
        if at >= end: continue
        # Leave space for words: rhythm/bass remain, whistle is a supporting layer.
        balance = .48 if note['kind'] == 'whistle' else .8 if note['kind'] == 'reed' else 1
        instrument(note['kind'], note['pitch'], at, note['duration'] * score.BEAT,
                   note['gain'] * balance, note['pan'])

# A short celebratory answer at the ribbon, not an unrelated effect every cut.
cut = timeline['events']['cut']
for i, pitch in enumerate([72, 76, 79]):
    instrument('marimba', pitch, cut + i * .085, .15, .10, .18)

# Deliberate stop-time: silence lets the wheel impact and dry narrator line land.
gate = np.ones(frames)
gate *= 1 - np.clip((t - (impact - .055)) / .055, 0, 1)
gate += np.clip((t - push) / .065, 0, 1)
gate *= np.clip((timeline['duration'] - t) / .65, 0, 1)
music *= gate[:, None]

# Smooth cue-derived ducking, with recovery between sentences. No VO processing.
speech = np.zeros(frames)
for cue in timeline['cues']:
    start = cue['characters'][0]['start_time']
    end = cue['characters'][-1]['end_time']
    envelope = np.minimum(np.clip((t - start + .09) / .09, 0, 1),
                          np.clip((end + .22 - t) / .22, 0, 1))
    speech = np.maximum(speech, envelope)
duck = .64 - .34 * speech
music *= duck[:, None]

# Reduce only the music if it needs headroom: dialogue bytes/timing are unchanged.
music_gain = 1.
while np.max(np.abs(voice + fx + music * music_gain)) > 10 ** (-1.7 / 20):
    music_gain *= .96
    assert music_gain > .02, 'Existing speech/FX itself exceeds the headroom target.'
music *= music_gain
master = voice + fx + music
write_wav('episode-002-v16-r2-music.wav', music)
write_wav('episode-002-v16-r2-master.wav', master)

# Natural phrase boundaries, expressed as cumulative word counts in each take.
# Timestamps come from actual aligned characters, never equal-duration estimates.
breaks = [[5,9], [5,7,11], [3], [4,7,11], [4], [1,6], [3], [2,3,8],
          [5,8], [4], [2], [5,8], [2,5,7], [5], [5,7], [5,10], [5,8,11]]
font_path = Path('C:/Windows/Fonts/arialbd.ttf')
font = ImageFont.truetype(str(font_path), 52)
width = 1080 * .60 - 32


def wrap(text):
    words = text.split()
    if font.getlength(text) <= width: return [text]
    candidates = [(' '.join(words[:i]), ' '.join(words[i:])) for i in range(1, len(words))]
    candidates = [p for p in candidates if max(map(font.getlength, p)) <= width]
    assert candidates, 'Regroup rather than shrink caption: ' + text
    return list(min(candidates, key=lambda p: abs(font.getlength(p[0]) - font.getlength(p[1]))))


captions = []
for cue, boundaries in zip(timeline['cues'], breaks, strict=True):
    words = list(re.finditer(r'\S+', cue['spoken_text']))
    assert boundaries[-1] == len(words)
    first = 0
    for last in boundaries:
        a, b = words[first].start(), words[last-1].end()
        spoken = cue['spoken_text'][a:b]
        display = spoken.replace('wekawekaweka', 'WKWKWK')
        characters = cue['characters']
        captions.append(dict(id=f"{cue['id']}-caption-{first+1}", cue_id=cue['id'],
            speaker=cue['role'], start=characters[a]['start_time'],
            speech_end=characters[b-1]['end_time'], end=min(cue['end'], characters[b-1]['end_time']+.18),
            text=display, spoken_text=spoken, lines=wrap(display),
            source_character_start=a, source_character_end=b, mode='subtitle'))
        first = last

warnings = []
for i, caption in enumerate(captions):
    if i+1 < len(captions):
        caption['end'] = min(caption['end'], captions[i+1]['start'])
    duration = caption['end'] - caption['start']
    assert duration > 0 and 0 <= caption['start'] < caption['end'] <= timeline['duration']
    cps = len(caption['text']) / duration
    caption['characters_per_second'] = round(cps, 2)
    if duration < .8 or cps > 20:
        warnings.append(dict(id=caption['id'], duration=round(duration, 3), cps=round(cps, 2),
            reason='Actual spoken timing; no speech speed change or early punchline reveal.'))
for cue in timeline['cues']:
    covered = ' '.join(c['spoken_text'] for c in captions if c['cue_id'] == cue['id'])
    assert covered == cue['spoken_text'], cue['id']

save('subtitles.json', dict(version='v16-r2', duration=timeline['duration'], cues=captions,
    timing_source='../release-v16/timeline.json:characters', display_aliases={'wekawekaweka':'WKWKWK'},
    layout=dict(font='Arial Bold', reference_font_px=52, frame_width=1080,
                centered_width=.60, top=.19, max_lines=2,
                safe_zone='Editorial fallback only: L8%, R20%, T18%, B35%; not platform-certified.'),
    listening_review='not_performed'))


def stamp(seconds, separator=','):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02}{separator}{ms:03}'


for extension, separator in [('srt', ','), ('vtt', '.')]:
    content = 'WEBVTT\n\n' if extension == 'vtt' else ''
    for i, c in enumerate(captions, 1):
        content += f"{i}\n{stamp(c['start'], separator)} --> {stamp(c['end'], separator)}\n" + '\n'.join(c['lines']) + '\n\n'
    (OUT / ('subtitles.' + extension)).write_text(content, encoding='utf-8')

save('music-score.json', dict(title='Warga Lagi Hepi — Jalan Rusak edit', bpm=score.BPM,
    composition_source=composition.relative_to(ROOT).as_posix(), events=scheduled,
    stop_time=[impact,push], external_audio_used=False, speech_speed=1, speech_pitch=1))
save('review.json', dict(version='v16-r2', duration=frames/RATE,
    dialogue_sha256=hashlib.sha256((OUT/'episode-002-v16-r2-dialogue.wav').read_bytes()).hexdigest(),
    original_dialogue_sha256=hashlib.sha256((OLD/'episode-002-v16-dialogue.wav').read_bytes()).hexdigest(),
    peak_dbfs=20*math.log10(np.max(np.abs(master))), music_headroom_gain=music_gain,
    subtitle_count=len(captions), full_spoken_text_covered=True, timing_warnings=warnings,
    font_file=str(font_path), font_distributed=False, listening_review='not_performed',
    browser_av_review='not_performed', loudness_review='Run FFmpeg ebur128 on the final master.'))
print(json.dumps(dict(output=str(OUT), seconds=frames/RATE, subtitles=len(captions),
                     timing_warnings=warnings, peak_dbfs=20*math.log10(np.max(np.abs(master)))), indent=2))
