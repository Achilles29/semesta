"""Temporary speech for Day 3 satire v3; Gufron uses existing HeyGen takes."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/produksi/episode-004/generated-satire-v3"
OUT.mkdir(parents=True, exist_ok=True)

CUES = [
    ("n1", "narrator", "Di laporan, kotak makan Gufron sudah dibagikan. Di dalamnya cuma pita. Siapa yang makan?"),
    ("n2", "narrator", "Dua puluh menit sebelumnya, usulan warga memilih Pak Prabowow. Hari pertamanya, dapur dan koperasi sudah menunggu kamera."),
    ("t1", "tedi", "Pak, dapur dan Kopdes Meriah Putih siap difoto."),
    ("p1", "prabowow", "Kalau kamera siap, resmikan saja."),
    ("n3", "narrator", "Masaknya belum. Sayur dari koperasi pun belum dibeli."),
    ("f1", "farmer", "Itu sayur saya. Dipajang buat foto, harga belinya belum disepakati."),
    ("t2", "tedi", "Pinjam lima menit lagi, Pak."),
    ("f2", "farmer", "Boleh. Tapi jangan tulis sudah dibeli."),
    ("n4", "narrator", "Foto selesai. Sayur pulang bersama petani. Dapur tak punya bahan. Tapi laporan sudah bilang makanan dibagikan."),
    ("n5", "narrator", "Besok warga periksa yang mana dulu: nota pembelian koperasi, atau laporan porsi dapur? Tulis NOTA atau LAPORAN, tambah satu bukti yang wajib diumumkan. Follow, kita buka berkasnya."),
]

VOICES = {
    "narrator": ("id-ID-GadisNeural", "-3%", "-8Hz"),
    "tedi": ("id-ID-ArdiNeural", "+6%", "+8Hz"),
    "prabowow": ("id-ID-ArdiNeural", "-12%", "-28Hz"),
    "farmer": ("su-ID-JajangNeural", "-2%", "-4Hz"),
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
