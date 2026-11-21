"""Prepare the user-supplied Oke Gas excerpt without altering the source AAC."""
import hashlib, json, pathlib, subprocess
import imageio_ffmpeg

root = pathlib.Path(__file__).resolve().parents[1]
source = root / 'docs/record/oke gas.aac'
target = root / 'public/audio/produksi/day-1/oke-gas-opening.mp3'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y', '-ss', '0.04', '-i', str(source),
                '-t', '8', '-ar', '48000', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', str(target)], check=True)
metadata = {'source':'docs/record/oke gas.aac','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'sourceStart':.04,'duration':8,'file':target.name,'bpm':145,
            'tempoNote':'Initial estimate from transient spacing ~0.414 s; not manual listening verification.',
            'use':'Intro under narrator, opening dance, closing dance; source supplied by user.'}
(root / 'game-src/production-day1-music.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(target)
