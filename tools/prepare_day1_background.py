"""Reproducible music bed with soft loop joins; retain the catalog original."""
import hashlib, json, pathlib, subprocess, wave
import numpy as np
import imageio_ffmpeg

root=pathlib.Path(__file__).resolve().parents[1]
source=root/'docs/record/day1-background-v2-original.wav'
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
raw=subprocess.run([ffmpeg,'-v','error','-i',str(source),'-af','loudnorm=I=-18:TP=-2:LRA=9','-ar','48000','-ac','2','-f','f32le','-'],check=True,stdout=subprocess.PIPE).stdout
pcm=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
rate=48000; fade=int(.6*rate); mixed=pcm.copy()
while len(mixed)<180*rate:
    ramp=np.linspace(0,1,fade,dtype=np.float32)[:,None]
    mixed=np.concatenate((mixed[:-fade],mixed[-fade:]*(1-ramp)+pcm[:fade]*ramp,pcm[fade:]))
mixed=mixed[:180*rate]; mixed[:rate]*=np.linspace(0,1,rate)[:,None]; mixed[-rate:]*=np.linspace(1,0,rate)[:,None]
output=root/'public/audio/produksi/day-1/background-new.mp3'
subprocess.run([ffmpeg,'-v','error','-y','-f','f32le','-ar',str(rate),'-ac','2','-i','-','-c:a','libmp3lame','-b:a','192k',str(output)],input=mixed.astype('<f4').tobytes(),check=True)
final=output.with_name('background-'+hashlib.sha256(output.read_bytes()).hexdigest()[:12]+'.mp3');output.replace(final)
metadata={'file':final.name,'duration':180,'source':'docs/record/day1-background-v2-original.wav','catalogId':json.loads((root/'docs/record/day1-background-v2-source.json').read_text())['id'],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'loopCrossfade':.6,'loudnessTargetLUFS':-18,'review':'Catalog-described playful instrumental. Listening review not available in this environment.'}
(root/'game-src/production-day1-background.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print(final)
