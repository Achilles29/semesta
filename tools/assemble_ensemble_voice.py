"""Assemble approved multi-speaker dialogue from provider character timestamps.

No synthesis, retiming, pitch shift, or source overwrites. Preserves source PCM.
Usage: python tools/assemble_ensemble_voice.py <generated-v3-ensemble directory>
"""
import hashlib
import json
import math
import sys
import wave
from pathlib import Path

import numpy as np


def write_json(path, data):
    with path.open('x', encoding='utf-8') as output:
        json.dump(data, output, ensure_ascii=False, indent=2)
        output.write('\n')


directory = Path(sys.argv[1]).resolve()
plan = json.loads((directory / 'batch-plan.json').read_text(encoding='utf-8'))
assert plan['request_count'] == len(plan['requests']) == 5
assert len({r['request']['voiceId'] for r in plan['requests']}) == 5
assert plan['dialogue_count'] == len(plan['cues']) == 22
sources, bounds, format_info = {}, {}, None

for request in plan['requests']:
    role = request['role']
    metadata = json.loads((directory / f'{role}.metadata.json').read_text(encoding='utf-8'))
    assert metadata['request'] == request['request']
    assert not metadata['provider'].get('isError')
    result = next(json.loads(c['text']) for c in metadata['provider']['content'] if c['type'] == 'text')
    characters = result['original_characters']
    assert ''.join(c['text'] for c in characters) == request['request']['text'], role
    assert all(len(c['text']) == 1 for c in characters), 'Character offsets must be unambiguous'
    with wave.open(str(directory / f'{role}.source.wav'), 'rb') as wav:
        fmt = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype())
        assert fmt[1] == 2 and fmt[3] == 'NONE'
        if format_info is None:
            format_info = fmt
        assert fmt == format_info
        frame_count = wav.getnframes()
        data = wav.readframes(frame_count)
    rate = fmt[2]
    duration = frame_count / rate
    assert len(data) == frame_count * fmt[0] * fmt[1]
    assert abs(duration - result['duration']) < .03
    previous = 0
    for char in characters:
        assert 0 <= char['start_time'] <= char['end_time'] <= duration + .04
        assert char['start_time'] >= previous - .002
        previous = char['start_time']
    sources[role] = data
    for span in request['spans']:
        start, end = span['start'], span['end']
        cue = next(c for c in plan['cues'] if c['id'] == span['cue_id'])
        assert request['request']['text'][start:end] == cue['spoken_text']
        speech_start = characters[start]['start_time']
        speech_end = characters[end - 1]['end_time']
        earlier = [c for c in characters[:start] if c['text'].strip()]
        later = [c for c in characters[end:] if c['text'].strip()]
        left = (earlier[-1]['end_time'] + speech_start) / 2 if earlier else 0
        right = (speech_end + later[0]['start_time']) / 2 if later else duration
        cut_start = max(0, speech_start - .065, left)
        cut_end = min(duration, speech_end + .1, right)
        first, last = math.floor(cut_start * rate), math.ceil(cut_end * rate)
        assert 0 <= first < last <= frame_count
        bounds[cue['id']] = (first, last, speech_start, speech_end)

channels, width, rate, _ = format_info
stride = channels * width
master = bytearray()
timing = []
# Longer pauses only at punchlines and visible physical reactions; no equal slots.
pauses = {'003': .7, '007': .55, '011': .7, '014': .65, '015': .6,
          '017': .6, '018': .45, '020': .6, '021': .45, '022': 1.0}


def write_wav(path, data):
    with path.open('xb') as file:
        with wave.open(file, 'wb') as wav:
            wav.setnchannels(channels)
            wav.setsampwidth(width)
            wav.setframerate(rate)
            wav.writeframes(data)


for cue in plan['cues']:
    first, last, speech_start, speech_end = bounds[cue['id']]
    data = sources[cue['role']][first * stride:last * stride]
    samples = np.frombuffer(data, dtype='<i2').astype(np.float64)
    assert len(samples) and np.max(np.abs(samples)) > 0
    start_frame = len(master) // stride
    master.extend(data)
    name = f"{cue['id']}-{cue['role']}.wav"
    write_wav(directory / name, data)
    gap = pauses.get(cue['id'], .28)
    master.extend(bytes(round(gap * rate) * stride))
    timing.append({**cue, 'file': name, 'source_file': f"{cue['role']}.source.wav",
                   'source_start_frame': first, 'source_end_frame': last,
                   'source_speech_start_seconds': speech_start,
                   'source_speech_end_seconds': speech_end,
                   'master_start_frame': start_frame, 'start': start_frame / rate,
                   'audio_end': (start_frame + last - first) / rate,
                   'next_start': len(master) / stride / rate,
                   'gap_after_seconds': gap,
                   'peak_dbfs': round(20 * math.log10(np.max(np.abs(samples)) / 32768), 2),
                   'rms_dbfs': round(20 * math.log10(np.sqrt(np.mean(samples ** 2)) / 32768), 2),
                   'source_samples_unchanged': True})

master_path = directory / 'episode-002-dialogue-5-suara.wav'
write_wav(master_path, master)
with wave.open(str(master_path), 'rb') as wav:
    duration = wav.getnframes() / rate
    for cue in timing:
        count = cue['source_end_frame'] - cue['source_start_frame']
        wav.setpos(cue['master_start_frame'])
        expected = sources[cue['role']][cue['source_start_frame'] * stride:cue['source_end_frame'] * stride]
        assert wav.readframes(count) == expected, cue['id']

report = {'status': 'generated-file-verified-awaiting-listening-review',
          'duration_seconds': duration, 'master_file': master_path.name,
          'sha256': hashlib.sha256(master_path.read_bytes()).hexdigest(),
          'source_request_count': 5, 'dialogue_count': 22,
          'speed': 1, 'pitch': 'unchanged', 'lead_in_seconds': 0,
          'format': {'sample_rate_hz': rate, 'channels': channels, 'bit_depth': width * 8},
          'voices': {r['role']: r['voice'] for r in plan['requests']},
          'model_provenance': 'Model omitted; provider selected model and did not return its name.',
          'timing_provenance': 'Provider character alignment, checked against exact submitted text. Not independent transcription.',
          'review_limitations': 'No listening inspection available. User must review accent, resemblance, pronunciation, naturalness and joins. No verified resemblance to real people.',
          'game_playback_integrated': False, 'cues': timing}
write_json(directory / 'verification.json', report)
write_json(directory / 'edit-timing.json', {'duration': duration, 'lead_in': 0, 'cues': timing})
print(json.dumps({'duration_seconds': duration, 'voices': 5, 'dialogues': len(timing),
                  'source_pcm_unchanged': True, 'peaks_dbfs': [c['peak_dbfs'] for c in timing]}, indent=2))
