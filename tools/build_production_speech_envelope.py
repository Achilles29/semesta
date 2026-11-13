"""Derive animation-only RMS values from the approved dialogue stem; no synthesis."""
import json
import math
import wave
from pathlib import Path
import numpy as np

root = Path(__file__).resolve().parents[1]
folder = root / 'public/audio/produksi/episode-002/release-v6'
with wave.open(str(folder / 'episode-002-v6-dialogue.wav'), 'rb') as source:
    assert source.getsampwidth() == 2
    rate = source.getframerate()
    data = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(float)
    data = data.reshape(-1, source.getnchannels()).mean(axis=1) / 32768
fps = 30
values = []
for i in range(math.ceil(len(data) / rate * fps)):
    frame = data[int(i * rate / fps):int((i + 1) * rate / fps)]
    rms = float(np.sqrt(np.mean(frame * frame))) if len(frame) else 0
    values.append(round(min(1, max(0, (rms - .008) / .12)) ** .65, 3))
result = {'source': 'episode-002-v6-dialogue.wav', 'fps': fps,
          'method': 'RMS speech activity, not phoneme or forced alignment', 'values': values}
(folder / 'speech-envelope.json').write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
print(f'Generated {len(values)} speech activity frames; audio unchanged.')
