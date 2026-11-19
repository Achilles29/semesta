"""Generate the locked Day 2 election script, one exact cue per file.

Gufron is supplied by the existing private HeyGen clone in the same directory.
All other voices are Indonesian synthetic drafts with stable role assignments.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/audio/produksi/episode-003/generated-election-v4"
OUT.mkdir(parents=True, exist_ok=True)

# Scene ID, role, exact approved line. Keep this order identical to script 012.
CUES = [
    (1, "petugas", "Gibrun, tiga puluh enam. Ditolak."),
    (1, "narrator", "Siangnya, berkas yang sama lolos. Umurnya masih tiga puluh enam. Yang berubah apa?"),
    (2, "bu_warung", "Kemarin cuma nambah dua follower. Jalan masuk malah bolong. Gufron, mau duduk sampai kapan?"),
    (2, "gufron", "Saya daftar. Siapa pun yang menang, jalan ini jangan cuma jadi latar foto."),
    (3, "petugas", "Pendaftaran dibuka. Syarat umur empat puluh. Gufron, empat puluh empat. Berkas diterima."),
    (4, "petugas", "Prabowow boleh. Gibrun baru tiga puluh enam. Jadi, pasangan ini ditolak."),
    (4, "prabowow", "Kalau Gibrun ditolak, saya tunggu. Saya tidak maju sendiri."),
    (5, "jokowow", "Saya ayah Gibrun, sekaligus ketua panitia. Saya bawa aturan ini ke MK."),
    (5, "bu_warung", "Bapak ayah calon dan ketua panitia. Saya ikut. Warga perlu lihat prosesnya."),
    (6, "narrator", "Di MK, ketua majelisnya paman Gibrun. Ia tetap ikut memutus."),
    (6, "hakim", "Putusan majelis: minimal empat puluh, atau pernah terpilih jadi kepala daerah."),
    (6, "bu_warung", "Paman memutus urusan keponakan? Catat nama hakimnya."),
    (7, "petugas", "Ini putusan tertulisnya. Bukti Gibrun pernah terpilih jadi wali kota cocok. Pasangan diterima."),
    (7, "gufron", "Pagi ditolak, siang diterima. Tempel alasannya. Warga berhak lihat apa yang berubah."),
    (8, "narrator", "Sepuluh warga memilih. Sepuluh suara dihitung."),
    (8, "bu_warung", "Enam untuk Prabowow dan Gibrun. Empat untuk Gufron. Pas sepuluh."),
    (9, "petugas", "Hasilnya enam banding empat. Prabowow presiden pertama."),
    (9, "gufron", "Pak Presiden, lubangnya di belakang kursi Bapak."),
    (9, "prabowow", "Sebentar. Foto dulu."),
    (10, "bu_warung", "Suara sah. Tapi kenapa ayah calon yang mengajukan, lalu pamannya ikut memutus?"),
    (10, "narrator", "Mau buka berkas atau catatan sidang dulu? Komen BERKAS atau SIDANG. Follow jadi warga; kita tagih jawabannya."),
]

VOICES = {
    "narrator": ("id-ID-ArdiNeural", "+0%", "+0Hz"),
    "bu_warung": ("su-ID-TutiNeural", "+0%", "+0Hz"),
    "petugas": ("id-ID-GadisNeural", "+0%", "+0Hz"),
    "prabowow": ("id-ID-ArdiNeural", "-4%", "-8Hz"),
    "jokowow": ("jv-ID-DimasNeural", "+0%", "+0Hz"),
    "hakim": ("id-ID-ArdiNeural", "-6%", "-4Hz"),
}


async def generate(index, scene, role, words, semaphore):
    ident = f"e{index:02d}"
    if role == "gufron":
        return {"id": ident, "scene": scene, "role": role, "text": words,
                "source": "Private HeyGen Gufron clone, split from gufron-heygen.wav"}
    voice, rate, pitch = VOICES[role]
    media = OUT / f"{ident}-{role}.mp3"
    meta = OUT / f"{ident}-{role}.json"
    if media.exists() and meta.exists():
        cached=json.loads(meta.read_text())
        if cached.get("text")==words:return cached
    async with semaphore:
        for attempt in range(3):
            chunks, boundaries = [], []
            try:
                stream = edge_tts.Communicate(words, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
                async for event in stream.stream():
                    if event["type"] == "audio": chunks.append(event["data"])
                    elif event["type"] == "WordBoundary":
                        boundaries.append({"text": event["text"],
                            "start": round(event["offset"]/10_000_000, 3),
                            "duration": round(event["duration"]/10_000_000, 3)})
                if chunks:break
            except edge_tts.exceptions.NoAudioReceived:
                if attempt == 2:raise
            await asyncio.sleep(1.5*(attempt+1))
        if not chunks: raise RuntimeError(f"No audio for {ident}")
        media.write_bytes(b"".join(chunks))
        data = {"id":ident,"scene":scene,"role":role,"text":words,"file":media.name,
                "voice":voice,"rate":rate,"pitch":pitch,"word_boundaries":boundaries,
                "source":"Edge TTS synthetic draft"}
        meta.write_text(json.dumps(data,ensure_ascii=False,indent=2))
        print(media.name,flush=True)
        return data


async def main():
    semaphore = asyncio.Semaphore(1)
    results = await asyncio.gather(*(generate(i,*cue,semaphore) for i,cue in enumerate(CUES,1)))
    (OUT/"speech-provenance.json").write_text(json.dumps(results,ensure_ascii=False,indent=2))


if __name__ == "__main__": asyncio.run(main())
