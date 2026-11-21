"""Split accepted HeyGen takes at returned character boundaries; never regenerate.
Original WAV files remain unchanged. Timings are measured, not estimated word grids.
"""
import json, pathlib, re, wave, math, struct, hashlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
folder = ROOT / 'public/audio/produksi/day-1'
records = json.loads((ROOT / 'docs/script/day1-voice-provenance.json').read_text(encoding='utf-8'))
manifest = {}
for actor, record in records.items():
    chars = record['original_characters']
    text = ''.join(c['text'] for c in chars)
    cursor = 0
    with wave.open(str(folder / record.get('originalFile', actor + '-original.wav')), 'rb') as src:
        params = src.getparams(); raw = src.readframes(src.getnframes())
    rate, stride = params.framerate, params.sampwidth * params.nchannels
    for i, line in enumerate(record['lines']):
        index = text.index(line, cursor); cursor = index + len(line)
        selected = chars[index:cursor]
        spoken = [c for c in selected if re.match(r'\w', c['text'])]
        start = max(0, spoken[0]['start_time'] - .08)
        end = min(record['duration'], selected[-1]['end_time'] + .16 if '[laughs]' in line else spoken[-1]['end_time'] + .16)
        first, last = round(start * rate), round(end * rate)
        clip = raw[first * stride:last * stride]
        key = f'{actor}-{i + 1:02d}'
        filename = key + '-' + hashlib.sha256(clip).hexdigest()[:12] + '.wav'
        with wave.open(str(folder / filename), 'wb') as dst:
            dst.setparams(params); dst.writeframes(clip)
        envelope = []
        if params.sampwidth != 2: raise ValueError('Expected signed PCM16 for envelope')
        samples = struct.unpack('<' + 'h' * (len(clip)//2), clip)
        step = round(rate / 30) * params.nchannels
        for offset in range(0, len(samples), step):
            block = samples[offset:offset + step]
            rms = math.sqrt(sum((v / 32768)**2 for v in block) / max(1,len(block)))
            envelope.append(round(min(1, max(0, (rms - .008) * 8)), 3))
        display = line.replace(' [laughs]', '')
        laugh_index = line.find('[laughs]')
        manifest[key] = {'file':filename,'speaker':actor,'text':display,
            'duration':(last-first)/rate,'sourceStart':first/rate,'sourceEnd':last/rate,
            'envelopeFps':30,'envelope':envelope,
            'words':[{'text':w['text'],'start':round(w['start_time']-first/rate,4),'end':round(w['end_time']-first/rate,4)} for w in record['original_words'] if w['start_time']>=start and w['end_time']<=end and 'laugh' not in w['text']]}
        if laugh_index >= 0:
            manifest[key]['laughStart'] = selected[laugh_index]['start_time']-first/rate
out = ROOT / 'game-src/production-day1-audio.json'
out.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n',encoding='utf-8')
print(f'Prepared {len(manifest)} dialogue clips; originals preserved.')
