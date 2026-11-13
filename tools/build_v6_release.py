"""Assemble all approved V6 voices, original score and timed Foley.
No synthesis, no time stretching. Refuses an incomplete episode or overwrite.
"""
import json
import math
import wave
from pathlib import Path
import numpy as np

root = Path(__file__).resolve().parents[1]
audio = root / 'public/audio/produksi/episode-002'
source = audio / 'generated-v6-follow'
out = audio / 'release-v6'
plan = json.loads((audio / 'revision-v6/dialogue-plan.json').read_text(encoding='utf-8'))
review = json.loads((source / 'audio-review.json').read_text(encoding='utf-8'))
rate = 44100

def read_wav(path):
    with wave.open(str(path), 'rb') as w:
        assert w.getframerate() == rate and w.getsampwidth() == 2
        samples = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, w.getnchannels()).astype(np.float64) / 32768
    return samples if samples.shape[1] == 2 else np.repeat(samples, 2, axis=1)

def write_wav(path, samples):
    with path.open('xb') as f:
        with wave.open(f, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(np.round(np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())

def write_json(path, data):
    with path.open('x', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False); f.write('\n')

meta = json.loads((source / 'komeng.metadata.json').read_text(encoding='utf-8'))
assert not meta['provider'].get('isError')
provider = next(json.loads(c['text']) for c in meta['provider']['content'] if c['type'] == 'text')
chars = provider['original_characters']
assert ''.join(c['text'] for c in chars) == meta['request']['text']
komeng = read_wav(source / 'komeng.source.wav')
assert abs(len(komeng) / rate - provider['duration']) < .03
parts = {}
for c in review['cues']:
    parts[c['id']] = (read_wav(source / c['file']), {'file': c['file'], 'source_start_frame': c['source_start_frame'], 'source_end_frame': c['source_end_frame']})
offset = 0
for c in [c for c in plan['cues'] if c['role'] == 'komeng']:
    start = meta['request']['text'].index(c['spoken_text'], offset)
    end = start + len(c['spoken_text']); offset = end
    first = math.floor(max(0, chars[start]['start_time'] - .12) * rate)
    last = math.ceil(min(len(komeng)/rate, chars[end-1]['end_time'] + .12) * rate)
    parts[c['id']] = (komeng[first:last], {'file': 'komeng.source.wav', 'source_start_frame': first, 'source_end_frame': last})
assert len(parts) == len(plan['cues']) == 14
assert not out.exists(), 'Release exists; use a new version rather than overwrite accepted media'
out.mkdir()

pauses = {'001': .25, '002': .65, '003': .4, '004': .3, '005': 4.2,
          '006': .25, '007': 1.0, '008': 1.1, '009': 3.2, '010': 1.1,
          '011': 2.2, '012': .65, '013': .35, '014': 2.5}
segments, cues, cursor = [], [], 0
for c in plan['cues']:
    samples, provenance = parts[c['id']]
    active = samples[np.max(np.abs(samples), axis=1) > .008]
    rms = np.sqrt(np.mean(active**2)) if active.size else .05
    gain = min(2.0, max(.6, 10**(-20/20) / max(rms, .001)), .88/max(np.max(np.abs(samples)), .001))
    data = samples * gain
    write_wav(out / f"{c['id']}-{c['role']}.wav", data)
    start = cursor / rate
    segments.append(data); cursor += len(data)
    audio_end = cursor / rate
    gap = round(pauses[c['id']] * rate)
    segments.append(np.zeros((gap, 2))); cursor += gap
    cues.append({**c, 'start': start, 'audio_end': audio_end, 'end': cursor/rate,
                 'gain_db': round(20*np.log10(gain), 3), 'source': provenance,
                 'file': f"{c['id']}-{c['role']}.wav"})
voice = np.concatenate(segments)
by_id = {c['id']: c for c in cues}
music = read_wav(audio / 'music-v1/antre-rendang-komedi-80s.wav')
assert len(music) >= len(voice)
music = music[:len(voice)].copy()
envelope = np.ones(len(voice)) * .55
for c in cues:
    a = max(0, round((c['start']-.12)*rate)); b = min(len(voice), round((c['audio_end']+.2)*rate))
    envelope[a:b] = .24
# Smooth ducking transitions without altering any speech samples.
window = max(1, round(.04*rate))
envelope = np.convolve(envelope, np.ones(window)/window, mode='same')
times = np.arange(len(voice))/rate
envelope *= np.clip((times-by_id['002']['audio_end'])/.7, 0, 1)
envelope *= np.clip((len(voice)/rate-times)/1.2, 0, 1)
music *= envelope[:,None]
fx = np.zeros_like(voice); rng = np.random.default_rng(602)
events = []
def effect(kind, at, duration, level):
    n = round(duration*rate); t = np.arange(n)/rate
    if kind == 'sweep':
        noise = rng.standard_normal(n); sound = (noise-np.roll(noise,1))*.18*np.sin(np.pi*t/duration)**2
    else:
        sound = (rng.standard_normal(n)*.45 + np.sin(2*np.pi*180*t)*.4)*np.exp(-t*45)
    sound *= level / max(np.max(np.abs(sound)), .001)
    a = round(at*rate); b = min(len(fx), a+n)
    fx[a:b] += sound[:b-a,None]
    events.append({'type':kind,'time':at,'duration':duration})
lift = by_id['005']['audio_end']
effect('chair', lift+1.25, .16, .07)
for t in (lift+1.7, lift+2.4, lift+3.1): effect('sweep', t, .45, .045)
clap = by_id['008']['audio_end']
for t in (clap+.15, clap+.48): effect('clap', t, .14, .07)
effect('tray', by_id['009']['audio_end']+2.3, .12, .06)
effect('chair', by_id['011']['audio_end']+1.1, .14, .05)
mix = voice + music + fx
peak = float(np.max(np.abs(mix))); master_gain = min(1, .94/max(peak, .001))
write_wav(out/'episode-002-v6-dialogue.wav', voice*master_gain)
write_wav(out/'episode-002-v6-music-fx.wav', (music+fx)*master_gain)
write_wav(out/'episode-002-v6-master.wav', mix*master_gain)
names = ['Sapu sebelum pidato', 'Warga memberi tugas', 'Kursi diangkat', 'Melayani es teh', 'Kursi untuk pelanggan', 'Follow menjadi warga']
scenes = []
for i, name in enumerate(names, 1):
    group = [c for c in cues if c['scene'] == i]
    scenes.append({'id':f'v6-{i}', 'name':name, 'start':group[0]['start'], 'end':group[-1]['end']})
timeline = {'version':'v6', 'duration':len(voice)/rate, 'scenes':scenes, 'cues':cues, 'effects':events,
            'audio_url':'public/audio/produksi/episode-002/release-v6/episode-002-v6-master.wav',
            'voice_note':'Bahlil/Ghufron authorized clones; Komeng approved generic V3 Lewis; Lucian narrator; Maren fictional shopkeeper.',
            'review_status':'technical-checks-passed-listening-and-visual-review-pending',
            'speed':1, 'peak_dbfs':float(20*np.log10(np.max(np.abs(mix*master_gain)))),
            'speech_changed':'gain only; no pitch/speed changes', 'master_gain':master_gain}
write_json(out/'timeline.json', timeline)
for name in ('episode-002-v6-dialogue.wav','episode-002-v6-music-fx.wav','episode-002-v6-master.wav'):
    with wave.open(str(out/name),'rb') as w: assert w.getnframes()==len(voice)
print(json.dumps({'duration':timeline['duration'],'cues':len(cues),'scenes':scenes,'peak_dbfs':timeline['peak_dbfs']}, ensure_ascii=False))
