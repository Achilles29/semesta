"""Temporary speech for Day 3 satire v2; Gufron is supplied by existing HeyGen takes."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/produksi/episode-004/generated-satire-v2"
OUT.mkdir(parents=True, exist_ok=True)

CUES = [
    ("n1", "narrator", "Gufron buka kotak makan. Isinya pita peresmian. Makanannya? Menyusul."),
    ("n2", "narrator", "Usulan warga memilih Pak Prabowow Subiyoyo. Baru duduk, dua gedung sudah antre di depan kamera."),
    ("t1", "tedi", "Pak, surat laik higiene dapurnya belum ada."),
    ("p1", "prabowow", "Gedungnya sudah ada, kan? Foto papan namanya dulu."),
    ("n3", "narrator", "Papan besar. Formulir pemeriksaan kosong."),
    ("n4", "narrator", "Di koperasi, papan namanya sudah merah putih. Daftar anggota belum diisi. Harga beli hasil petani juga kosong."),
    ("t2", "tedi", "Belum ditulis, Bu. Geser dulu, Bapak masuk foto."),
    ("n5", "narrator", "Dua foto jadi. Dua pertanyaan belum dijawab. Gufron masih pegang pita, petani masih pegang hasil panen."),
    ("n6", "narrator", "Yang kenyang cuma galeri foto."),
    ("n7", "narrator", "Besok kita buka yang mana dulu: surat dapur, atau buku belanja koperasi? Tulis DAPUR atau KOPDES, lalu satu bukti yang wajib mereka tunjukkan. Follow, biar pertanyaan warga tidak ikut ditutup."),
]

VOICES = {
    "narrator": ("id-ID-GadisNeural", "-3%", "-8Hz"),
    "tedi": ("id-ID-ArdiNeural", "+6%", "+8Hz"),
    "prabowow": ("id-ID-ArdiNeural", "-12%", "-28Hz"),
}


async def create(item, semaphore):
    ident, role, words = item
    voice, rate, pitch = VOICES[role]
    media = OUT / f"{ident}-{role}.mp3"
    metadata = OUT / f"{ident}-{role}.json"
    if media.exists() and metadata.exists():
        return json.loads(metadata.read_text())
    async with semaphore:
        stream = edge_tts.Communicate(words, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
        chunks, boundaries = [], []
        async for event in stream.stream():
            if event["type"] == "audio":
                chunks.append(event["data"])
            elif event["type"] == "WordBoundary":
                boundaries.append({"text": event["text"],
                                   "start": round(event["offset"] / 10_000_000, 3),
                                   "duration": round(event["duration"] / 10_000_000, 3)})
        if not chunks:
            raise RuntimeError(f"No audio returned for {ident}")
        media.write_bytes(b"".join(chunks))
        result = {"id": ident, "role": role, "text": words, "voice": voice,
                  "rate": rate, "pitch": pitch, "file": media.name,
                  "word_boundaries": boundaries,
                  "source": "Edge TTS draft; distinct from private HeyGen clones"}
        metadata.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"created {media.name}", flush=True)
        return result


async def main():
    semaphore = asyncio.Semaphore(3)
    results = await asyncio.gather(*(create(item, semaphore) for item in CUES))
    (OUT / "speech-provenance.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
