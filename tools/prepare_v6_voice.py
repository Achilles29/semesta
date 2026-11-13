"""Verify and split V6 source speech without synthesis or speed/pitch changes.

Writes a clearly marked partial review montage if any character is missing.
Provider alignment is not an independent listening/transcription check.
"""
import hashlib
import json
import math
import sys
import wave
from pathlib import Path


directory = Path(sys.argv[1]).resolve()
plan = json.loads((directory.parent / 'revision-v6/dialogue-plan.json').read_text(encoding='utf-8'))
batch = json.loads((directory / 'batch-plan.json').read_text(encoding='utf-8'))
sources, cuts, timings = {}, {}, []
format_info = None


def save_json(path, value):
    with path.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')


for item in batch['requests']:
    role = item['role']
    metadata_path = directory / f'{role}.metadata.json'
    source_path = directory / f'{role}.source.wav'
    if not metadata_path.exists() or not source_path.exists():
        continue
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    assert metadata['request'] == item['request']
    assert not metadata['provider'].get('isError')
    result = next(json.loads(c['text']) for c in metadata['provider']['content'] if c['type'] == 'text')
    chars = result['original_characters']
    assert ''.join(c['text'] for c in chars) == item['request']['text'], role
    assert all(len(c['text']) == 1 for c in chars)
    with wave.open(str(source_path), 'rb') as wav:
        fmt = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype())
        frames = wav.getnframes()
        data = wav.readframes(frames)
    assert fmt[1] == 2 and fmt[3] == 'NONE'
    if format_info is None:
        format_info = fmt
    assert fmt == format_info
    rate, stride = fmt[2], fmt[0] * fmt[1]
    duration = frames / rate
    assert abs(duration - result['duration']) < 0.03
    assert len(data) == frames * stride and any(data)
    assert all(0 <= c['start_time'] <= c['end_time'] <= duration + .01 for c in chars)
    assert all(a['start_time'] <= b['start_time'] + .002 for a, b in zip(chars, chars[1:]))
    sources[role] = {'duration_seconds': duration, 'voice_id': item['request']['voiceId'],
                     'source_file': source_path.name, 'sha256': hashlib.sha256(data).hexdigest(),
                     'model': 'server-selected; response did not identify model'}
    for span in item['spans']:
        cue = next(c for c in plan['cues'] if c['id'] == span['cue_id'])
        start, end = span['start'], span['end']
        assert item['request']['text'][start:end] == cue['spoken_text']
        speech_start, speech_end = chars[start]['start_time'], chars[end - 1]['end_time']
        earlier = [c for c in chars[:start] if c['text'].isalnum()]
        later = [c for c in chars[end:] if c['text'].isalnum()]
        left = (earlier[-1]['end_time'] + speech_start) / 2 if earlier else 0
        right = (speech_end + later[0]['start_time']) / 2 if later else duration
        first = math.floor(max(0, speech_start - .12, left) * rate)
        last = math.ceil(min(duration, speech_end + .15, right) * rate)
        assert 0 <= first < last <= frames
        cuts[cue['id']] = {'data': data[first * stride:last * stride], 'first': first,
                           'last': last, 'role': role, 'cue': cue}

assert format_info, 'No available source audio'
channels, width, rate, _ = format_info
stride = channels * width


def save_wav(path, data):
    with path.open('xb') as f:
        with wave.open(f, 'wb') as wav:
            wav.setnchannels(channels)
            wav.setsampwidth(width)
            wav.setframerate(rate)
            wav.writeframes(data)


missing = [c for c in plan['cues'] if c['id'] not in cuts]
montage = bytearray()
for cue in plan['cues']:
    if cue['id'] not in cuts:
        continue
    part = cuts[cue['id']]
    filename = f"{cue['id']}-{cue['role']}.wav"
    save_wav(directory / filename, part['data'])
    beginning = len(montage) / stride / rate
    montage.extend(part['data'])
    ending = len(montage) / stride / rate
    pause = .65 if cue['id'] in ('002', '005', '008', '011', '014') else .3
    montage.extend(bytes(round(pause * rate) * stride))
    timings.append({**cue, 'file': filename, 'duration_seconds': len(part['data']) / stride / rate,
                    'source_file': f"{cue['role']}.source.wav", 'source_start_frame': part['first'],
                    'source_end_frame': part['last'], 'montage_start_seconds': beginning,
                    'montage_end_seconds': ending, 'gap_after_seconds': pause,
                    'source_samples_unchanged': True})

montage_name = 'PREVIEW-PARSIAL-TANPA-KOMENG.wav' if missing else 'episode-002-v6-dialogue.wav'
save_wav(directory / montage_name, montage)
with wave.open(str(directory / montage_name), 'rb') as wav:
    for cue in timings:
        wav.setpos(round(cue['montage_start_seconds'] * rate))
        count = cue['source_end_frame'] - cue['source_start_frame']
        assert wav.readframes(count) == cuts[cue['id']]['data']

report = {'status': 'partial-awaiting-missing-voice-and-listening' if missing else 'awaiting-listening',
          'montage_file': montage_name, 'duration_seconds': len(montage) / stride / rate,
          'available_cues': len(timings), 'missing_cues': missing, 'sources': sources,
          'sample_rate_hertz': rate, 'channels': channels, 'speed': 1.0, 'pitch_changed': False,
          'game_integrated': False, 'background_music_mixed': False,
          'listening_review_passed': False,
          'review_limit': 'PCM, text/alignment, durations and source-to-cut mapping checked. No independent listening/transcription check; user must review pronunciation and resemblance.',
          'montage_note': 'Missing lines omitted, not replaced. Montage timing is for audio review, not the final cinematic timeline.',
          'cues': timings}
save_json(directory / 'audio-review.json', report)
print(json.dumps({k: report[k] for k in ('status', 'montage_file', 'duration_seconds', 'available_cues')}, ensure_ascii=False))
print(json.dumps({'source_durations': {r: s['duration_seconds'] for r, s in sources.items()},
                  'missing_cue_ids': [c['id'] for c in missing]}, ensure_ascii=False))
