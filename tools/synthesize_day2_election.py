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
OUT = ROOT / "public/audio/produksi/episode-003/generated-election-v3"
OUT.mkdir(parents=True, exist_ok=True)

# Scene ID, role, exact approved line. Keep this order identical to script 012.
CUES = [
    (1, "narrator", "Pagi Gibrun ditolak: umur tiga puluh enam, syarat empat puluh. Siang dia lolos. Umurnya tetap. Apa yang berubah?"),
    (2, "bu_warung", "Kemarin yang follow cuma dua. Sekarang warga tiga. Jalan masuk malah bolong. Saya pasang pembatas dulu."),
    (2, "petugas", "Pendaftaran presiden pertama dibuka!"),
    (2, "gufron", "Saya daftar. Siapa pun yang menang, jalan ini jangan cuma jadi latar foto."),
    (3, "petugas", "Gufron, empat puluh empat. Syarat usia terpenuhi. Berkas diterima."),
    (3, "narrator", "Satu calon masuk. Lalu pasangan kedua datang."),
    (4, "petugas", "Prabowow memenuhi umur. Gibrun tiga puluh enam. Aturan sekarang tetap empat puluh, meski dia pernah jadi wali kota. Pasangan ini ditolak."),
    (4, "prabowow", "Kalau Gibrun tidak boleh ikut, saya tidak maju sendiri."),
    (5, "narrator", "Jokowow, ketua panitia sekaligus ayah Gibrun, mengajukan permohonan ke MK WKWKWK. Ia tidak bisa mengubah syarat sendiri."),
    (5, "jokowow", "Saya minta majelis menilai: pengalaman kepala daerah yang dipilih warga bisa jadi jalur kedua."),
    (5, "bu_warung", "Bapak ayah calon dan ketua panitia. Hubungan itu saya catat juga."),
    (6, "narrator", "Ketua majelis adalah paman Gibrun. Ia tetap ikut memutus permohonan yang akan menentukan apakah keponakannya bisa mendaftar."),
    (6, "hakim", "Majelis mengabulkan. Syaratnya: minimal empat puluh tahun, atau pernah menjadi kepala daerah hasil pemilihan."),
    (6, "bu_warung", "Pamannya ikut memutus? Catat. Putusannya ada, hubungan keluarganya juga ada."),
    (7, "petugas", "Putusan baru sudah berlaku. Bukti wali kota terpilih cocok. Sekarang pasangan Prabowow–Gibrun diterima."),
    (7, "gufron", "Pagi ditolak, siang diterima. Tempel alasannya. Warga berhak lihat apa yang berubah."),
    (8, "narrator", "Sepuluh warga masuk. Sepuluh surat suara keluar. Penghitungannya terbuka."),
    (8, "bu_warung", "Enam untuk Prabowow–Gibrun, empat untuk Gufron. Jumlahnya sepuluh."),
    (9, "petugas", "Hasilnya enam banding empat. Prabowow presiden pertama, Gibrun wakilnya."),
    (9, "gufron", "Pak Presiden, lubangnya di belakang kursi Bapak."),
    (9, "prabowow", "Saya lihat besok. Hari ini foto dulu."),
    (10, "bu_warung", "Sepuluh suara cocok. Masalahnya, ayah calon mengajukan permohonan, pamannya ikut memutus."),
    (10, "narrator", "Besok buka berkas atau catatan sidang? Komen BERKAS atau SIDANG. Follow jadi warga. Jalan kampung tetap kita tagih."),
]

VOICES = {
    "narrator": ("id-ID-GadisNeural", "-4%", "-12Hz"),
    "bu_warung": ("su-ID-TutiNeural", "-2%", "-5Hz"),
    "petugas": ("id-ID-ArdiNeural", "+4%", "+12Hz"),
    "prabowow": ("id-ID-ArdiNeural", "-13%", "-27Hz"),
    "jokowow": ("jv-ID-DimasNeural", "-3%", "-7Hz"),
    "hakim": ("id-ID-ArdiNeural", "-18%", "-20Hz"),
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
