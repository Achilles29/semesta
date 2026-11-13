"""Validate original PCM WAVs and assemble them without time/pitch changes.

Usage: python tools/assemble_episode_voice.py public/audio/produksi/episode-002/generated-v2
Reports JSON to stdout; original clips and provider metadata are never rewritten.
"""
import json
import sys
import wave
from pathlib import Path

directory = Path(sys.argv[1]).resolve()
timeline = json.loads((directory / 'edit-timing.json').read_text(encoding='utf-8'))
batch = json.loads((directory / 'batch-plan.json').read_text(encoding='utf-8'))
assert len(timeline['cues']) == len(batch['requests']) == 19
format_info = None
clips = []
for cue in timeline['cues']:
    stem = f"{cue['id']}-{cue['role']}"
    meta = json.loads((directory / (stem + '.metadata.json')).read_text(encoding='utf-8'))
    request = next(r for r in batch['requests'] if r['id'] == cue['id'])
    assert meta['request'] == request['request'] and not meta['provider_error']
    with wave.open(str(directory / (stem + '.wav')), 'rb') as wav:
        current = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getcomptype())
        assert current[3] == 'NONE', 'Only PCM supported; never silently transcode'
        if format_info is None:
            format_info = current
        assert current == format_info, 'All original clips must share format'
        frames = wav.getnframes()
        duration = frames / wav.getframerate()
        data = wav.readframes(frames)
        assert len(data) == frames * current[0] * current[1], 'Truncated WAV'
        assert duration <= cue['end'] - cue['start'], f"Cue {cue['id']} exceeds picture slot; adjust edit, not speech speed"
        assert abs(duration - meta['result']['duration']) < .03
        assert any(data), 'Empty audio'
    clips.append((cue, data, frames, duration, stem + '.wav'))

channels, sample_width, rate, _ = format_info
frame_bytes = channels * sample_width
report = {'status': 'generated-file-verified-listening-review-pending',
          'voice': 'Lucian - Conversational & Easygoing', 'speed': 1,
          'pronunciation': {'written': 'WKWKWK', 'spoken': 'wekawekaweka'},
          'review': 'File integrity, duration and placement checked. No listening/independent transcription available; user review required.',
          'format': {'channels': channels, 'bit_depth': sample_width * 8, 'sample_rate_hz': rate},
          'clips': [], 'masters': []}
for cue, data, frames, duration, name in clips:
    report['clips'].append({**cue, 'file': name, 'measured_duration_seconds': duration,
                            'master_start_seconds': cue['start'],
                            'play_master_start_seconds': cue['start'] + timeline['lead_in'],
                            'master_audio_end_seconds': cue['start'] + duration,
                            'source_frame_count': frames})
for lead, name in [(0, 'episode-002-vo-timeline-90s.wav'),
                   (timeline['lead_in'], 'episode-002-vo-play-93s.wav')]:
    output = directory / name
    assert not output.exists(), f'Output already exists; refusing overwrite: {output}'
    length = round((timeline['duration'] + lead) * rate)
    samples = bytearray(length * frame_bytes)
    for cue, data, frames, duration, source in clips:
        start = round((cue['start'] + lead) * rate) * frame_bytes
        samples[start:start + len(data)] = data
    with wave.open(str(output), 'wb') as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sample_width)
        wav.setframerate(rate)
        wav.writeframes(samples)
    # Reopen and check every clip region byte-for-byte; zero padding is intentional.
    with wave.open(str(output), 'rb') as wav:
        assert wav.getnframes() == length
        for cue, data, frames, duration, source in clips:
            wav.setpos(round((cue['start'] + lead) * rate))
            assert wav.readframes(frames) == data, f'Changed source: {source}'
    report['masters'].append({'file': name, 'measured_duration_seconds': length / rate,
                               'lead_in_seconds': lead, 'speed': 1, 'source_samples_unchanged': True})
report['total_original_speech_seconds'] = sum(c[3] for c in clips)
print(json.dumps(report, ensure_ascii=False, indent=2))
