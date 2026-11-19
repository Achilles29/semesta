"""Measure the Day 3 dialogue stem for deterministic mouth motion at 30 fps."""
import json
import os
import wave
from pathlib import Path

import numpy as np

release = Path(__file__).resolve().parents[1] / 'public/audio/produksi/episode-004' / os.environ.get('DAY3_RELEASE', 'release-v1')
with wave.open(str(release / 'day3-dialogue.wav')) as source:
    rate = source.getframerate()
    channels = source.getnchannels()
    assert source.getsampwidth() == 2 and channels == 2
    samples = np.frombuffer(source.readframes(source.getnframes()), '<i2').astype(np.float32) / 32768
mono = samples.reshape(-1, channels).mean(axis=1)
fps = 30
values = []
for index in range(round(len(mono) / rate * fps) + 1):
    part = mono[round(index * rate / fps):round((index + 1) * rate / fps)]
    rms = float(np.sqrt(np.mean(part * part))) if len(part) else 0.0
    values.append(round(min(1, max(0, (rms - .008) / .12)) ** .65, 3))
(release / 'speech-envelope.json').write_text(json.dumps({
    'source': 'day3-dialogue.wav', 'fps': fps, 'method': 'RMS', 'values': values,
}, separators=(',', ':')))
print(release / 'speech-envelope.json', len(values))
