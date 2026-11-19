"""Make a reviewable Day 2 revision from the immutable first release.

The dialogue is carried over until approved replacement character takes exist.
"""
from __future__ import annotations

import json
import math
import shutil
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/audio/produksi/episode-003"
SOURCE = BASE / "release-v1"
OUT = BASE / "release-v2"
OUT.mkdir(exist_ok=True)


def read(name: str) -> tuple[np.ndarray, tuple[int, int, int]]:
    with wave.open(str(SOURCE / name)) as wav:
        params = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())
        data = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
    return data.astype(np.float32).reshape(-1, params[0]) / 32768, params


def write(name: str, audio: np.ndarray, params: tuple[int, int, int]) -> None:
    with wave.open(str(OUT / name), "wb") as wav:
        wav.setnchannels(params[0])
        wav.setsampwidth(params[1])
        wav.setframerate(params[2])
        wav.writeframes(np.round(np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())


dialogue, params = read("day2-dialogue.wav")
music, music_params = read("day2-music.wav")
effects, effects_params = read("day2-fx.wav")
assert params == music_params == effects_params == (2, 2, 44100)
music *= 3.2
master = dialogue + music + effects
peak = float(np.max(np.abs(master)))
assert peak < 0.95, f"Mix clips at {peak:.3f}"

write("day2-dialogue.wav", dialogue, params)
write("day2-music.wav", music, params)
write("day2-fx.wav", effects, params)
write("day2-master.wav", master, params)
for name in ("subtitles.srt", "subtitles.vtt", "speech-envelope.json", "day2-cover.png"):
    shutil.copy2(SOURCE / name, OUT / name)
timeline = json.loads((SOURCE / "timeline.json").read_text())
timeline["version"] = "day2-v2-review"
timeline["music_gain_relative_to_v1"] = 3.2
timeline["voice_status"] = "v1 HeyGen clone takes retained pending user-provided replacement exports"
(OUT / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2))
print(json.dumps({"master_peak_dbfs": round(20 * math.log10(peak), 2),
                  "music_rms_dbfs": round(20 * math.log10(float(np.sqrt(np.mean(music**2)))), 2),
                  "output": str(OUT)}, indent=2))
