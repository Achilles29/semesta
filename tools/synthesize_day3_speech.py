"""Create Day 3 draft speech with distinct Indonesian synthetic voices.

Run with the local edge-tts virtualenv. This is a reproducible temporary voice
track for the fictional cast, and does not impersonate a real recording.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/produksi/episode-004/generated-v2"
OUT.mkdir(parents=True, exist_ok=True)

CUES = [
    ("01", "gufron", "Makanannya mana? Yang dikirim cuma pita?"),
    ("02", "narrator", "Baru terpilih, jadwal gunting pita sudah menunggu."),
    ("03", "bu_warung", "Usulan warga terbanyak: Pak Prabowow Subiyoyo!"),
    ("04", "tedi", "Pak, jam sepuluh gunting pita dua gedung."),
    ("05", "prabowow", "Tunggu. Program Kuliner Indonesia dulu. Dapur masak, makanan sampai ke warga, bahan dibeli dari petani sini."),
    ("06", "prabowow", "Lalu koperasi desa. Hasil kebun warga masuk rak, harganya jelas, untungnya kembali ke anggota. Begitu baru namanya program."),
    ("07", "gufron", "Pak, gedungnya siap difoto. Kotak saya dari tadi masih kosong."),
    ("08", "dadan", "Bahannya belum masuk."),
    ("09", "mas_daro", "Truknya belum lewat."),
    ("10", "bu_warung", "Satu lubang bikin dua program macet. Ini jalan yang kemarin diresmikan."),
    ("11", "gufron", "Saya sudah bilang, pita dulu, jalan belakangan."),
    ("12", "prabowow", "Cukup jogetnya. Jangan gunting pita dulu. Buka jalan itu, periksa dapurnya, isi raknya dengan barang warga. Saya mau lihat yang sampai ke warga, bukan cuma papan namanya."),
    ("13", "gufron", "Kalau besok kotak ini harus terisi, kita cek yang mana dulu: dapurnya, atau koperasi yang kirim bahan?"),
    ("14", "narrator", "Tulis KULINER atau KOPDES, tambah satu syarat wajib. Follow jadi warga. Pilihan kalian menentukan inspeksi Day 4."),
]

VOICES = {
    "gufron": ("jv-ID-DimasNeural", "+0%", "+8Hz"),
    "narrator": ("id-ID-GadisNeural", "-3%", "-8Hz"),
    "bu_warung": ("jv-ID-SitiNeural", "+2%", "+0Hz"),
    "tedi": ("id-ID-ArdiNeural", "+6%", "+8Hz"),
    "prabowow": ("id-ID-ArdiNeural", "-12%", "-28Hz"),
    "dadan": ("su-ID-JajangNeural", "-4%", "-7Hz"),
    "mas_daro": ("id-ID-ArdiNeural", "+0%", "-5Hz"),
}


async def create(item: tuple[str, str, str], semaphore: asyncio.Semaphore) -> dict:
    number, role, words = item
    voice, rate, pitch = VOICES[role]
    media = OUT / f"{number}-{role}.mp3"
    metadata = OUT / f"{number}-{role}.json"
    if media.exists() and metadata.exists():
        return json.loads(metadata.read_text())
    async with semaphore:
        stream = edge_tts.Communicate(words, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
        chunks, word_boundaries = [], []
        async for event in stream.stream():
            if event["type"] == "audio":
                chunks.append(event["data"])
            elif event["type"] == "WordBoundary":
                word_boundaries.append({"text": event["text"],
                                        "start": round(event["offset"] / 10_000_000, 3),
                                        "duration": round(event["duration"] / 10_000_000, 3)})
        if not chunks:
            raise RuntimeError(f"No audio returned for {number}-{role}")
        media.write_bytes(b"".join(chunks))
        result = {"id": number, "role": role, "text": words, "voice": voice,
                  "rate": rate, "pitch": pitch, "file": media.name,
                  "word_boundaries": word_boundaries,
                  "source": "Edge TTS synthetic draft voice"}
        metadata.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"created {media.name} ({len(chunks)} audio chunks)", flush=True)
        return result


async def main() -> None:
    semaphore = asyncio.Semaphore(3)
    results = await asyncio.gather(*(create(item, semaphore) for item in CUES))
    (OUT / "speech-provenance.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
