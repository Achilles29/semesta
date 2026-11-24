"""Download accepted takes once and cut measured Day 3 dialogue without synthesis.

The retained HeyGen word timestamps define every cut and subtitle boundary.
Run from any directory: python tools/prepare_day3_audio.py
Original PCM WAVs, generation provenance and source ranges remain reproducible.
"""
from __future__ import annotations

import array
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "public/audio/produksi/day-3"
PROVENANCE = ROOT / "docs/script/day3-voice-provenance.json"
SCRIPT = ROOT / "game-src/production-day3-script.json"
MANIFEST = ROOT / "game-src/production-day3-audio.json"


def tokens(text):
    return re.findall(r"[\w]+", text.casefold(), flags=re.UNICODE)


def write_json(path, value, compact=False):
    path.write_text(json.dumps(value, ensure_ascii=False,
                              **({"separators": (",", ":")} if compact else {"indent": 2})) + "\n",
                    encoding="utf-8")


def envelope_for(raw, rate, channels):
    samples = array.array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    step = round(rate / 30) * channels
    envelope = []
    for offset in range(0, len(samples), step):
        block = samples[offset:offset + step]
        rms = math.sqrt(sum((value / 32768) ** 2 for value in block) / len(block))
        envelope.append(round(min(1, max(0, (rms - .008) * 8)), 3))
    return envelope


def main():
    records = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted((ROOT / "docs/script/day3-audio-work").glob("*.json")) if p.stem not in ("takes", "r3-plan")}
    script = json.loads(SCRIPT.read_text(encoding="utf-8"))
    # Keep every published key: an authored draft may still reference a v1 take.
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    prepared = 0
    FOLDER.mkdir(parents=True, exist_ok=True)
    for actor, record in records.items():
        if record.get("status") not in ("generated", "prepared_clips"):
            raise ValueError(f"{actor}: accepted generation not available; do not synthesize implicitly")
        original = FOLDER / record.get("originalFile", "day3r2-" + actor + "-original.wav")
        if not original.exists():
            with urllib.request.urlopen(record["audio_url"], timeout=60) as response:
                original.write_bytes(response.read())
        source_hash = hashlib.sha256(original.read_bytes()).hexdigest()
        if record.get("sourceSha256") and record["sourceSha256"] != source_hash:
            raise ValueError(f"{actor}: original take has changed")
        with wave.open(str(original), "rb") as source:
            params = source.getparams()
            raw = source.readframes(source.getnframes())
        if params.sampwidth != 2 or params.comptype != "NONE":
            raise ValueError(f"{actor}: expected unchanged PCM16 WAV")
        rate, stride = params.framerate, params.sampwidth * params.nchannels
        source_duration = params.nframes / rate
        words = record["original_words"]
        assert all(0 <= w["start_time"] < w["end_time"] <= source_duration for w in words), actor
        assert all(words[i]["start_time"] >= words[i - 1]["end_time"] - .001
                   for i in range(1, len(words))), actor
        cursor, ranges = 0, []
        cues = record.get("sourceCues", [cue for cue in [{"key": r["audioKey"], "shot": r["id"], **r} for r in script["shots"] if r.get('audioKey')] if cue["speaker"] == actor])
        assert record["submittedText"] == "\n\n".join(cue["spokenText"] for cue in cues), actor
        for cue in cues:
            expected = tokens(cue["spokenText"])
            selected = words[cursor:cursor + len(expected)]
            actual = [token for word in selected for token in tokens(word["text"])]
            if actual != expected:
                raise ValueError(f"{cue['key']}: returned word alignment differs: {actual} != {expected}")
            cursor += len(expected)
            first = max(0, round((selected[0]["start_time"] - .08) * rate))
            last = min(params.nframes, round((selected[-1]["end_time"] + .16) * rate))
            clip = raw[first * stride:last * stride]
            filename = cue["key"] + "-" + hashlib.sha256(clip).hexdigest()[:12] + ".wav"
            with wave.open(str(FOLDER / filename), "wb") as output:
                output.setparams(params)
                output.writeframes(clip)
            entry = {
                "file": filename, "directory": "day-3", "speaker": record.get("actor", actor),
                "text": cue["text"], "spokenText": cue["spokenText"],
                "duration": (last - first) / rate,
                "sourceStart": first / rate, "sourceEnd": last / rate,
                "envelopeFps": 30, "envelope": envelope_for(clip, rate, params.nchannels),
                "words": [{"text": "Xel" if w["text"].casefold() == "ksel" else w["text"],
                           "start": round(w["start_time"] - first / rate, 4),
                           "end": round(w["end_time"] - first / rate, 4)} for w in selected],
            }
            if record.get("actor", actor) != "narrator":
                entry["castId"] = record.get("actor", actor)
            assert entry["envelope"] and max(entry["envelope"]) > .05, cue["key"]
            assert all(0 <= w["start"] < w["end"] <= entry["duration"] for w in entry["words"]), cue["key"]
            manifest[cue["key"]] = entry
            prepared += 1
            ranges.append({"key": cue["key"], "shot": cue["shot"], "file": filename,
                           "sourceStart": entry["sourceStart"], "sourceEnd": entry["sourceEnd"]})
            print(f"{cue['key']}: {entry['duration']:.4f}s ({cue['shot']})")
        assert cursor == len(words), f"{actor}: unassigned returned words"
        record.update(originalFile=original.name, sourceSha256=source_hash,
                      sourceDuration=source_duration, sampleRate=rate, channels=params.nchannels,
                      status="prepared_clips", clips=ranges)
        record.setdefault("review", {"fullListening": False}).update(timestampsValidated=True, signalValidated=True,
                                fullListeningPerformed=False,
                                listeningLimitation="Full audio listening and subjective Indonesian pronunciation review were unavailable in this environment.")
    assert {row["speaker"] for row in script["shots"] if row.get('audioKey')} <= {r.get("actor", key) for key,r in records.items()}
    for cue in [{"key": r["audioKey"], "shot": r["id"], **r} for r in script["shots"] if r.get('audioKey')]:
        clip = manifest.get(cue["key"])
        assert clip and clip["text"] == cue["text"] and clip["spokenText"] == cue["spokenText"], cue["key"]
    write_json(MANIFEST, manifest, compact=True)
    write_json(PROVENANCE, records)
    script["status"] = "measured_audio_ready_listening_pending"
    write_json(SCRIPT, script)
    print(f"Prepared {prepared} measured cues from {len(records)} unchanged originals; "
          f"{len(manifest)} total keys retained for saved drafts. Full listening remains pending.")


if __name__ == "__main__":
    main()
