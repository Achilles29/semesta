"""Build Day 2 speech timeline, subtitles, and original series music.

Run: python3 tools/build_day2_audio.py
The paid HeyGen source PCM files are immutable. This creates a new release folder.
"""
from __future__ import annotations
import importlib.util
import json
import math
import re
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "public/audio/produksi/episode-003"
GEN = BASE / "generated"
OUT = BASE / "release-v1"
RATE = 44100
DURATION = 97.5
FRAMES = round(DURATION * RATE)
assert not OUT.exists(), "Release exists; choose a new release name"
OUT.mkdir(parents=True)
meta = json.loads((GEN / "voice-provenance.json").read_text())
sources = {}
for role in ["narrator", "bu_warung", "panitia", "bahlil", "gufron"]:
    a = np.fromfile(GEN / (role + ".source.pcm"), dtype="<i2").astype(np.float32) / 32768
    assert abs(len(a) / RATE - meta[role]["duration"]) < .01
    sources[role] = a

# Source ranges use provider word times for every actor. Narrator intervals are
# from the same provider response, recorded at phrase boundaries.
word_ranges = {
    "bu_warung": [(0, 1), (1, 13), (13, 27), (27, 38)],
    "panitia": [(0, 9), (9, 13), (13, 16)],
    "bahlil": [(0, 4), (4, 13)],
    "gufron": [(0, 5), (5, 15), (15, 36)],
}
narrator_ranges = [(0.256, 7.381), (7.808, 13.860), (14.414, 17.358),
                   (17.870, 25.780), (26.761, 44.272)]

def source_range(role, index):
    if role == "narrator":
        return narrator_ranges[index]
    a, b = word_ranges[role][index]
    words = meta[role]["words"]
    return words[a]["start_time"], words[b-1]["end_time"]

# Scene windows are editorial guides. Starts below are measured against accepted
# 1x takes; no speech is stretched to fit a scene.
scenes = [
    {"id": "hook", "start": 0, "end": 8.2, "visual": "berita bursa, stempel tertahan"},
    {"id": "gufron", "start": 8.2, "end": 18.5, "visual": "follower nol, lubang jalan"},
    {"id": "kursi", "start": 18.5, "end": 32.5, "visual": "Bahlil tiba, Panitia siapkan kursi"},
    {"id": "berkas", "start": 32.5, "end": 50, "visual": "formulir verifikasi belum diisi"},
    {"id": "maju", "start": 50, "end": 67.5, "visual": "Gufron memutuskan ikut maju"},
    {"id": "keputusan", "start": 67.5, "end": 78, "visual": "stempel dikunci, dua map sejajar"},
    {"id": "pilih", "start": 78, "end": DURATION, "visual": "kartu pilihan dan kursi kosong"},
]
rows = [
    ("01", "hook", "narrator", 0, .20, "Kursi Wapres kosong. Bahlil disebut masuk bursa. Di sini, cap lolos mau turun sebelum berkas dibuka.",
     ["Kursi Wapres kosong.", "Bahlil disebut masuk bursa.", "Di sini, cap lolos mau turun", "sebelum berkas dibuka."]),
    ("02", "hook", "bu_warung", 0, 7.55, "Tahan.", ["Tahan."]),
    ("03", "gufron", "narrator", 1, 9.00, "Gufron masih murung. Day satu belum menambah follower. Mobil kemarin sudah keluar; lubangnya belum.",
     ["Gufron masih murung.", "Day satu belum menambah follower.", "Mobil kemarin sudah keluar;", "lubangnya belum."]),
    ("04", "gufron", "gufron", 0, 15.75, "Yang lolos baru mobilnya, Bu.", ["Yang lolos baru mobilnya, Bu."]),
    ("05", "kursi", "panitia", 0, 18.65, "Pak Bahlil sudah ramai disebut. Kursinya kita isi sekarang.",
     ["Pak Bahlil sudah ramai disebut.", "Kursinya kita isi sekarang."]),
    ("06", "kursi", "bahlil", 0, 22.20, "Diindaa... saya baru sampai.", ["Diindaa... saya baru sampai."]),
    ("07", "kursi", "bu_warung", 1, 24.65, "Disebut di bursa itu belum berarti ditetapkan di sini. Berkasnya sudah dicek?",
     ["Disebut di bursa itu belum berarti", "ditetapkan di sini.", "Berkasnya sudah dicek?"]),
    ("08", "kursi", "panitia", 1, 30.10, "Menyusul. Yang penting cepat.", ["Menyusul.", "Yang penting cepat."]),
    ("09", "berkas", "narrator", 2, 33.10, "Panitia sudah punya stempel. Pemeriksaannya belum.",
     ["Panitia sudah punya stempel.", "Pemeriksaannya belum."]),
    ("10", "berkas", "bu_warung", 2, 36.65, "Syarat belum diperiksa. Rencana kerja juga belum dibaca. Mau melantik atau mau coba-coba?",
     ["Syarat belum diperiksa.", "Rencana kerja juga belum dibaca.", "Mau melantik atau mau coba-coba?"]),
    ("11", "berkas", "panitia", 2, 42.95, "Berkasnya bisa menyusul.", ["Berkasnya bisa menyusul."]),
    ("12", "berkas", "gufron", 1, 44.75, "Kemarin pita dulu, jalan belakangan. Sekarang stempel dulu, syarat belakangan?",
     ["Kemarin pita dulu, jalan belakangan.", "Sekarang stempel dulu, syarat belakangan?"]),
    ("13", "maju", "bahlil", 1, 50.25, "Diindaa. Kalau mau diperiksa, periksa saja. Jangan cap dulu.",
     ["Diindaa.", "Kalau mau diperiksa, periksa saja.", "Jangan cap dulu."]),
    ("14", "maju", "gufron", 2, 54.30, "Saya cuma mau jalan itu beres. Tapi kalau kursi ini mau diisi asal cepat, saya ikut maju. Periksa berkas saya juga.",
     ["Saya cuma mau jalan itu beres.", "Tapi kalau kursi ini mau diisi asal cepat,", "saya ikut maju.", "Periksa berkas saya juga."]),
    ("15", "maju", "bu_warung", 3, 62.30, "Nah. Dua orang mau maju, dua-duanya pakai aturan yang sama.",
     ["Nah. Dua orang mau maju,", "dua-duanya pakai aturan yang sama."]),
    ("16", "keputusan", "narrator", 3, 68.00, "Hari ini belum ada yang boleh duduk. Buka berkas dulu, baru tentukan siapa yang layak. Lubang jalannya tetap jadi pekerjaan pertama.",
     ["Hari ini belum ada yang boleh duduk.", "Buka berkas dulu, baru tentukan siapa yang layak.", "Lubang jalannya tetap jadi pekerjaan pertama."]),
    ("17", "pilih", "narrator", 4, 78.20, "Kalau berkas mereka lengkap, siapa yang kalian pilih memimpin Republik WKWKWK: Bahlil, Gufron, atau cari calon lain? Tulis satu nama dan satu alasan di komentar. Follow jadi warga. Besok berkasnya dibuka, dan janji soal jalan Day satu kita tagih.",
     ["Kalau berkas mereka lengkap,", "siapa yang kalian pilih memimpin Republik WKWKWK:", "Bahlil, Gufron, atau cari calon lain?", "Tulis satu nama dan satu alasan di komentar.", "Follow jadi warga.", "Besok berkasnya dibuka,", "dan janji soal jalan Day satu kita tagih."]),
]
# Narrator caption phrase bounds from the returned character and word timing.
narrator_phrases = {
    0: [(0.256, 1.493), (1.920, 3.755), (4.181, 6.144), (6.272, 7.381)],
    1: [(7.808, 8.875), (9.301, 10.923), (11.300, 12.665), (13.134, 13.860)],
    2: [(14.414, 15.822), (16.334, 17.358)],
    3: [(17.870, 19.449), (19.961, 22.905), (23.433, 25.780)],
    4: [(26.761, 27.999), (28.383, 31.241), (31.839, 34.484),
        (35.141, 37.915), (38.256, 39.237), (39.707, 41.072),
        (41.499, 44.272)],
}
voice = np.zeros((FRAMES, 2), dtype=np.float32)
cues, captions = [], []
role_rms = {}
for role, data in sources.items():
    rms = float(np.sqrt(np.mean(data * data)))
    peak = float(np.max(np.abs(data)))
    role_rms[role] = {"source_rms": rms, "source_peak": peak,
                      "gain": float(min(.78 / peak, .10 / rms))}
for id_, scene, role, src_index, start, written, phrases in rows:
    source_start, source_end = source_range(role, src_index)
    pad_before, pad_after = .045, .10
    a = max(0, round((source_start - pad_before) * RATE))
    b = min(len(sources[role]), round((source_end + pad_after) * RATE))
    clip = sources[role][a:b].copy() * role_rms[role]["gain"]
    fade = min(round(.012 * RATE), len(clip) // 3)
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    at = round(start * RATE)
    assert at + len(clip) <= FRAMES
    voice[at:at+len(clip)] += clip[:, None] * np.array([.7071, .7071], dtype=np.float32)
    end = (at + len(clip)) / RATE
    assert not cues or start > cues[-1]["end"], "speech overlap " + id_
    cue = {"id": id_, "scene": scene, "role": role, "text": written,
           "start": start, "end": end, "source_start": a/RATE, "source_end": b/RATE,
           "source_file": role + ".source.pcm"}
    cues.append(cue)
    if role == "narrator":
        bounds = narrator_phrases[src_index]
        assert len(bounds) == len(phrases)
        sub_ranges = [(start + (x - a/RATE), start + (y - a/RATE)) for x, y in bounds]
    else:
        wa, wb = word_ranges[role][src_index]
        provider_words = meta[role]["words"][wa:wb]
        counts = [len(re.findall(r"\w+", phrase)) for phrase in phrases]
        assert sum(counts) == len(provider_words), (id_, counts, [x["text"] for x in provider_words])
        sub_ranges = []
        cursor = 0
        for count in counts:
            first, last = provider_words[cursor], provider_words[cursor+count-1]
            sub_ranges.append((start + (first["start_time"] - a/RATE),
                               start + (last["end_time"] - a/RATE)))
            cursor += count
    for i, (phrase, (ca, cb)) in enumerate(zip(phrases, sub_ranges)):
        assert ca < cb and start - .01 <= ca and cb <= end + .01
        captions.append({"id": id_ + "-" + str(i+1), "cue_id": id_, "role": role,
                         "start": round(ca, 3), "end": round(cb + .10, 3),
                         "text": phrase, "timing_source": "HeyGen word timing" if role != "narrator" else "HeyGen narrator phrase timing"})
assert cues[-1]["end"] < DURATION
for i, c in enumerate(captions[:-1]):
    c["end"] = min(c["end"], captions[i+1]["start"])
    assert c["end"] > c["start"]

# Reuse the series' original notes and instruments in a fresh 97.5s arrangement.
composition = ROOT / "ilustrasi/musik/warga-lagi-hepi/buat_musik.py"
spec = importlib.util.spec_from_file_location("warga_music", composition)
score = importlib.util.module_from_spec(spec)
spec.loader.exec_module(score)
music = np.zeros((FRAMES, 2), dtype=np.float32)
rng = np.random.default_rng(20261117)
scheduled = []
for event in score.events:
    beat = event["beat"]
    if beat < 96:
        offsets = [0, 45]
    elif beat < 104:
        offsets = [90]
    else:
        offsets = []
    for offset in offsets:
        at = offset + (beat if beat < 96 else beat - 96) * score.BEAT
        if at > DURATION - .2:
            continue
        sound = score.synth(event["kind"], event["pitch"], event["duration"] * score.BEAT, rng)
        gain = event["gain"] * (.55 if event["kind"] in ("whistle", "reed") else .68)
        n = min(len(sound), FRAMES - round(at * RATE))
        theta = (event["pan"] + 1) * math.pi/4
        pos = round(at * RATE)
        music[pos:pos+n, 0] += sound[:n] * gain * math.cos(theta)
        music[pos:pos+n, 1] += sound[:n] * gain * math.sin(theta)
        scheduled.append({"kind": event["kind"], "at": round(at, 3), "pitch": event["pitch"]})
# A short sting as the stamp is stopped, then reduced music while the rule is read.
fx = np.zeros((FRAMES, 2), dtype=np.float32)
def tick(at, freq, gain):
    n = round(.20 * RATE)
    t = np.arange(n) / RATE
    y = (np.sin(2*np.pi*freq*t) + .28*np.sin(2*np.pi*freq*1.5*t)) * np.exp(-t*34) * gain
    pos = round(at*RATE)
    fx[pos:pos+n] += y[:min(n,FRAMES-pos),None] * np.array([.68,.72],dtype=np.float32)
tick(7.52, 970, .11)
tick(32.9, 560, .055)
tick(67.7, 730, .07)
# Long-window speech activity envelope; don't pump between adjacent words.
activity = np.zeros(FRAMES, dtype=np.float32)
for c in cues:
    a = max(0, round((c["start"]-.12)*RATE)); b = min(FRAMES, round((c["end"]+.22)*RATE))
    activity[a:b] = 1
window = round(.08 * RATE)
padded = np.pad(activity, (window // 2, window - window // 2))
cumulative = np.concatenate(([0.0], np.cumsum(padded, dtype=np.float64)))
activity = ((cumulative[window:] - cumulative[:-window]) / window).astype(np.float32)[:FRAMES]
music *= (.22 - .115*activity)[:,None]
music *= np.clip((DURATION-np.arange(FRAMES)/RATE)/1.15,0,1)[:,None]
master = voice + music + fx
peak = float(np.max(np.abs(master)))
if peak > .88:
    master *= .88/peak
    voice *= .88/peak
    music *= .88/peak
    fx *= .88/peak

def write(name, signal):
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
        w.writeframes(np.round(np.clip(signal,-1,1)*32767).astype("<i2").tobytes())

write("day2-dialogue.wav", voice)
write("day2-music.wav", music)
write("day2-fx.wav", fx)
write("day2-master.wav", master)

def stamp(t, sep=","):
    ms = round(t*1000)
    h,ms = divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f"{h:02}:{m:02}:{s:02}{sep}{ms:03}"

for ext, sep in [("srt", ","), ("vtt", ".")]:
    lines = ["WEBVTT", ""] if ext == "vtt" else []
    for i, c in enumerate(captions, 1):
        lines.extend([str(i), f"{stamp(c['start'],sep)} --> {stamp(c['end'],sep)}", c["text"], ""])
    (OUT / ("subtitles."+ext)).write_text("\n".join(lines), encoding="utf-8")

(OUT / "timeline.json").write_text(json.dumps({"version":"day2-v1","duration":DURATION,
    "scenes":scenes,"cues":cues,"captions":captions,"music_events":scheduled,
    "voice_levels":role_rms,"speech_speed":1,"listening_review":"not_performed"},
    ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"seconds":DURATION,"cues":len(cues),"captions":len(captions),
    "peak_dbfs":round(20*math.log10(float(np.max(np.abs(master)))),2),
    "output":str(OUT)},indent=2))
