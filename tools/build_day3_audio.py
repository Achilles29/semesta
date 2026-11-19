"""Assemble Day 3 dialogue, timed captions and an original changing music score.

The reveal cue has an energetic dance feel and is an original composition;
the copyrighted Richard Jersey recording is not embedded in this draft.
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/audio/produksi/episode-004"
SOURCE = BASE / "generated-v2"
OUT = BASE / "release-v1"
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100
DURATION = 107.0
SAMPLES = round(RATE * DURATION)
TIMES = {
    "01": 0.15, "03": 5.03, "02": 9.65, "04": 15.02,
    "05": 18.75, "06": 30.0, "07": 42.0, "08": 48.15,
    "09": 50.7, "10": 54.0, "11": 60.7, "12": 66.1,
    "13": 84.5, "14": 93.0,
}
ORDER = list(TIMES)
meta = {item["id"]: item for item in json.loads((SOURCE / "speech-provenance.json").read_text())}
assert set(ORDER) == set(meta)


def decode(path: Path) -> np.ndarray:
    process = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-acodec", "pcm_s16le",
         "-ac", "1", "-ar", str(RATE), "-"],
        check=True, capture_output=True,
    )
    return np.frombuffer(process.stdout, dtype="<i2").astype(np.float32) / 32768


def place(track: np.ndarray, signal: np.ndarray, when: float, gain: float = 1.0) -> None:
    at = round(when * RATE)
    length = min(len(signal), len(track) - at)
    if length > 0:
        track[at:at + length] += signal[:length] * gain


voice = np.zeros((SAMPLES, 2), dtype=np.float32)
cues = []
for ident in ORDER:
    item = meta[ident]
    raw = decode(SOURCE / item["file"])
    source_rms = float(np.sqrt(np.mean(raw * raw)))
    source_peak = float(np.max(np.abs(raw)))
    gain = min(0.12 / max(source_rms, 1e-6), 0.64 / max(source_peak, 1e-6))
    clip = raw * gain
    fade = min(round(0.016 * RATE), len(clip) // 4)
    clip[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
    clip[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    start = TIMES[ident]
    at = round(start * RATE)
    assert at + len(clip) <= SAMPLES, ident
    voice[at:at + len(clip)] += clip[:, None] * np.array([0.7071, 0.7071], dtype=np.float32)
    end = start + len(clip) / RATE
    assert not cues or start >= cues[-1]["end"] + 0.02, f"overlap before {ident}"
    cues.append({"id": ident, "role": item["role"], "text": item["text"],
                 "start": round(start, 3), "end": round(end, 3),
                 "voice": item["voice"], "source_file": item["file"],
                 "gain": round(gain, 3), "words": item["word_boundaries"]})

reveal = TIMES["03"] + next(word["start"] for word in meta["03"]["word_boundaries"]
                            if word["text"] == "Prabowow")
assert 7 <= reveal < 8

# Musical sections: dry empty-box opening; upbeat original dance cue at the
# name reveal; comic presentation; low tension at the empty kitchen/road;
# constructive rhythm after the president stops the ceremony; CTA refrain.
music = np.zeros((SAMPLES, 2), dtype=np.float32)
fx = np.zeros((SAMPLES, 2), dtype=np.float32)
rng = np.random.default_rng(20261118)


def add_note(at: float, hz: float, length: float, amp: float, pan: float = 0,
             harmonic: float = 0.23, attack: float = 0.009) -> None:
    n = max(1, round(length * RATE))
    t = np.arange(n, dtype=np.float32) / RATE
    env = np.minimum(1, t / max(attack, .001)) * np.exp(-t / max(length * .45, .05))
    sound = (np.sin(2 * np.pi * hz * t) + harmonic * np.sin(4 * np.pi * hz * t)) * env * amp
    left = math.sqrt((1 - pan) / 2)
    right = math.sqrt((1 + pan) / 2)
    place(music[:, 0], sound, at, left)
    place(music[:, 1], sound, at, right)


def kick(at: float, amp: float) -> None:
    n = round(.22 * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    phase = 2 * np.pi * (75 * t + (110 - 75) * (1 - np.exp(-t * 30)) / 30)
    sound = np.sin(phase) * np.exp(-t * 23) * amp
    place(music[:, 0], sound, at, .70)
    place(music[:, 1], sound, at, .70)


def snare(at: float, amp: float) -> None:
    n = round(.14 * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    noise = rng.standard_normal(n).astype(np.float32)
    sound = noise * np.exp(-t * 35) * amp
    place(music[:, 0], sound, at, .62)
    place(music[:, 1], sound, at, .68)


def hat(at: float, amp: float) -> None:
    n = round(.055 * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    noise = rng.standard_normal(n).astype(np.float32)
    sound = (noise - np.convolve(noise, np.ones(15) / 15, mode="same")) * np.exp(-t * 75) * amp
    place(music[:, 0], sound, at, .62)
    place(music[:, 1], sound, at, .68)


def sequence(start: float, end: float, bpm: float, mode: str) -> None:
    step = 60 / bpm
    pitches = {"intro": [146.83, 164.81, 196, 164.81],
               "dance": [164.81, 220, 246.94, 196],
               "pitch": [164.81, 196, 220, 196],
               "tension": [146.83, 155.56, 146.83, 130.81],
               "work": [164.81, 196, 220, 246.94],
               "cta": [196, 220, 246.94, 220]}[mode]
    beats = math.ceil((end - start) / step)
    for i in range(beats):
        at = start + i * step
        if at >= end - .03:
            break
        if mode != "tension":
            kick(at, .08 if mode == "dance" else .035)
            if i % 2:
                snare(at, .025 if mode == "dance" else .012)
            hat(at + step / 2, .012 if mode == "dance" else .006)
        else:
            if i % 2 == 0:
                kick(at, .020)
            hat(at + step * .55, .004)
        add_note(at, pitches[i % 4], step * .88,
                 .035 if mode == "dance" else .018 if mode in ("work", "cta") else .012,
                 pan=(-.20 if i % 2 else .20), harmonic=.36 if mode == "dance" else .18)
        if mode == "dance" and i % 2 == 0:
            # A short brass-like answer, distinct from the licensed song.
            add_note(at + step * .38, pitches[(i + 2) % 4] * 2, step * .42, .019,
                     pan=.22, harmonic=.52, attack=.02)


sequence(0, reveal, 100, "intro")
sequence(reveal, 15.0, 148, "dance")
sequence(15.0, 41.5, 118, "pitch")
sequence(41.5, 65.5, 92, "tension")
sequence(65.5, 90.0, 122, "work")
sequence(90.0, DURATION, 118, "cta")


def effect(at: float, hz: float, amp: float, length: float = .18) -> None:
    n = round(length * RATE)
    t = np.arange(n, dtype=np.float32) / RATE
    wavelet = (np.sin(2 * np.pi * hz * t) + .24 * np.sin(2 * np.pi * hz * 1.7 * t)) * np.exp(-t * 27) * amp
    place(fx[:, 0], wavelet, at, .68)
    place(fx[:, 1], wavelet, at, .72)


effect(.25, 490, .08)     # Gufron opens the box.
effect(41.8, 390, .07)   # The same box interrupts the campaign music.
effect(53.3, 130, .07, .28)  # Truck reaches the unrepaired road.
effect(90.5, 490, .06)   # The motif returns at the ending.

# A gentle envelope ducks music during spoken words while keeping the bed audible.
activity = np.zeros(SAMPLES, dtype=np.float32)
for cue in cues:
    a = max(0, round((cue["start"] - .1) * RATE))
    b = min(SAMPLES, round((cue["end"] + .15) * RATE))
    activity[a:b] = 1
window = round(.08 * RATE)
padded = np.pad(activity, (window // 2, window - window // 2))
cumulative = np.concatenate(([0.0], np.cumsum(padded, dtype=np.float64)))
smooth = ((cumulative[window:] - cumulative[:-window]) / window).astype(np.float32)[:SAMPLES]
music *= (0.74 - .37 * smooth)[:, None]
music *= np.minimum(1, (DURATION - np.arange(SAMPLES) / RATE) / 1.1)[:, None]
music *= 6.0
fx *= 1.6
master = voice + music + fx
peak = float(np.max(np.abs(master)))
if peak > .88:
    multiplier = .88 / peak
    for track in (voice, music, fx, master):
        track *= multiplier


def write_wav(name: str, audio: np.ndarray) -> None:
    with wave.open(str(OUT / name), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(np.round(np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes())


for filename, data in (("day3-dialogue.wav", voice), ("day3-music.wav", music),
                       ("day3-fx.wav", fx), ("day3-master.wav", master)):
    write_wav(filename, data)

# Captions use provider word boundaries. Group naturally, preserving the exact
# supplied words and punctuation. There is no artificial speech acceleration.
captions = []
for cue in cues:
    original = cue["text"].split()
    boundaries = cue["words"]
    assert len(original) == len(boundaries), (cue["id"], len(original), len(boundaries))
    group = []
    for i, (word, timing) in enumerate(zip(original, boundaries)):
        if not group:
            start = cue["start"] + timing["start"]
        group.append(word)
        line = " ".join(group)
        final = i == len(original) - 1
        punctuation = word.endswith((".", "?", "!", ":"))
        if final or (len(group) >= 3 and (punctuation or len(line) >= 31 or len(group) >= 6)):
            end = cue["start"] + timing["start"] + timing["duration"] + .12
            captions.append({"cue_id": cue["id"], "role": cue["role"],
                             "start": round(start, 3), "end": round(end, 3),
                             "text": line})
            group = []
for a, b in zip(captions, captions[1:]):
    a["end"] = min(a["end"], b["start"])
    assert a["end"] > a["start"]


def stamp(time: float, sep: str) -> str:
    ms = round(time * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"


for extension, separator in (("srt", ","), ("vtt", ".")):
    lines = ["WEBVTT", ""] if extension == "vtt" else []
    for number, caption in enumerate(captions, 1):
        lines.extend([str(number),
                      f"{stamp(caption['start'], separator)} --> {stamp(caption['end'], separator)}",
                      caption["text"], ""])
    (OUT / f"subtitles.{extension}").write_text("\n".join(lines))

scenes = [
    {"id": "box_open", "start": 0, "end": 5, "description": "Gufron opens the empty lunchbox"},
    {"id": "president_reveal", "start": 5, "end": 15, "description": "Fictional tally; Prabowow dances with entourage"},
    {"id": "kitchen_program", "start": 15, "end": 30, "description": "Program Kuliner Indonesia building and plan"},
    {"id": "cooperative_program", "start": 30, "end": 41.5, "description": "Koperasi Desa Meriah Putih building and plan"},
    {"id": "box_unfilled", "start": 41.5, "end": 53, "description": "Kitchen has no delivery"},
    {"id": "road_block", "start": 53, "end": 65.5, "description": "Day 1 pothole blocks the truck"},
    {"id": "decision", "start": 65.5, "end": 83, "description": "Prabowow cancels ribbon cutting"},
    {"id": "return_box", "start": 83, "end": DURATION, "description": "Same empty box and citizen choice"},
]
timeline = {"version": "day3-v1-review", "duration": DURATION, "fps": 12,
            "reveal_music_start": round(reveal, 3),
            "music_source": "original code-generated cue inspired by energetic dance, not the licensed Oke Gas recording",
            "voice_source": "Edge TTS synthetic draft voices; no Prabowo voice clone",
            "scenes": scenes, "cues": cues, "captions": captions}
(OUT / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2))
print(json.dumps({"duration": DURATION, "reveal_music_start": round(reveal, 3),
                  "cues": len(cues), "captions": len(captions),
                  "master_peak_dbfs": round(20 * math.log10(float(np.max(np.abs(master)))), 2),
                  "voice_rms_dbfs": round(20 * math.log10(float(np.sqrt(np.mean(voice**2)))), 2),
                  "music_rms_dbfs": round(20 * math.log10(float(np.sqrt(np.mean(music**2)))), 2),
                  "out": str(OUT)}, indent=2))
