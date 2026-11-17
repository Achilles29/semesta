"""Measure the final mix and inspect caption layout on existing CPU scene previews.
These images are geometry/layout diagnostics, NOT browser screenshots or AV review.
"""
import json
import math
import re
import subprocess
import wave
import sys
from pathlib import Path
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
version='v16-r3' if '--v16-r3' in sys.argv else 'v16-r2'
OUT=ROOT/f'public/audio/produksi/episode-002/release-{version}'
QA=ROOT/f'docs/record/production-{version}-review';QA.mkdir(exist_ok=True)
report=json.loads((OUT/'review.json').read_text(encoding='utf-8'))
captions=json.loads((OUT/'subtitles.json').read_text(encoding='utf-8'))['cues']
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
master=OUT/f'episode-002-{version}-master.wav'
decode=subprocess.run([ffmpeg,'-v','error','-i',str(master),'-f','null','NUL'],capture_output=True,text=True,check=True)
assert not decode.stderr.strip(),decode.stderr
measure=subprocess.run([ffmpeg,'-hide_banner','-i',str(master),'-af','ebur128=peak=true','-f','null','NUL'],capture_output=True,text=True,check=True)
summary=measure.stderr.rsplit('Summary:',1)[-1]
report['loudness_review']={'integrated_lufs':float(re.search(r'I:\s+([-\d.]+) LUFS',summary)[1]),
    'true_peak_dbtp':float(re.search(r'Peak:\s+([-\d.]+) dBFS',summary)[1]),'full_decode':'passed'}
assert report['loudness_review']['true_peak_dbtp']<=-1.5

def read(name):
    with wave.open(str(OUT/name),'rb') as wav:
        assert wav.getframerate()==44100 and wav.getnchannels()==2
        return np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').reshape(-1,2)/32768.
voice=read(f'episode-002-{version}-dialogue.wav');music=read(f'episode-002-{version}-music.wav')
mask=np.abs(voice).max(axis=1)>.015
report['music_relative_to_active_voice_rms_db']=round(20*math.log10(np.sqrt(np.mean(music[mask]**2))/np.sqrt(np.mean(voice[mask]**2))),2)
timeline=json.loads((OUT/'timeline.json' if version=='v16-r3' else OUT.parent/'release-v16/timeline.json').read_text(encoding='utf-8'))
a=round((timeline['events']['impact']+.01)*44100);b=round(timeline['events']['push']*44100)
assert np.max(np.abs(music[a:b]))==0
assert len(voice)==len(music)==round(timeline['duration']*44100)
font_path='C:/Windows/Fonts/arialbd.ttf'
font=ImageFont.truetype(font_path,26);small=ImageFont.truetype(font_path,15)
full_font=ImageFont.truetype(font_path,52)
for cue in captions:
    assert all(full_font.getlength(line)<=1080*.60-32 for line in cue['lines'])
sources=[('01-road-1',1,0),('02-road-2',2,0),('06-road-6',6,1),
         ('10-road-10',10,0),('14-road-14',14,0),('16-road-16',16,1)]
if version=='v16-r3': sources=[(f'{n:02}-road-{n}',17,None) for n in range(18,24)]
board=Image.new('RGB',(1080,2*660),'#18282e')
for index,(filename,cue_id,phrase) in enumerate(sources):
    if version=='v16-r3':
        shot=timeline['shots'][int(filename[:2])-1];sample_time=shot['start']+(shot['end']-shot['start'])*.55
        c=next((c for c in captions if c['start']<=sample_time<c['end']),None)
        if c is None: c=dict(text='',lines=[''],speaker='narator',start=sample_time)
    else:c=[c for c in captions if c['cue_id']==f'v16-{cue_id}'][phrase]
    frame_folder=QA if version=='v16-r3' else ROOT/'docs/record/production-v16-review'
    im=Image.open(frame_folder/f'{filename}.png').convert('RGBA')
    layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
    w,h=im.size;cx=w/2;top=h*.19;pad=26*.22
    name={'bahlil':'BAHLIL','mama-ghufron':'GUFRON'}.get(c['speaker'],'')
    speaker_height=26*(.56*1.3+.16) if name else 0
    width=max(font.getlength(s) for s in c['lines'])+26*.6
    height=len(c['lines'])*26*1.15+pad*2+speaker_height
    bounds=(cx-width/2,top,cx+width/2,top+height)
    assert bounds[0]>=.20*w and bounds[2]<=.80*w and bounds[1]>=.18*h and bounds[3]<=.65*h
    d.rounded_rectangle(bounds,radius=8,fill=(12,21,27,204))
    yy=top+pad
    if name:
        d.text((cx,yy),name,font=small,anchor='mt',fill='#ffe297');yy+=speaker_height
    for line in c['lines']:
        d.text((cx,yy),line,font=font,anchor='mt',fill='white',stroke_width=1,stroke_fill='#202020');yy+=26*1.15
    clean=Image.alpha_composite(im,layer);clean.convert('RGB').save(QA/(filename+'-caption.png'))
    guide=Image.new('RGBA',im.size);g=ImageDraw.Draw(guide)
    for box in [(0,0,w,h*.18),(0,h*.65,w,h),(0,0,w*.08,h),(w*.80,0,w,h)]:
        g.rectangle(box,fill=(210,25,45,40))
    g.line((cx,0,cx,h),fill=(60,180,200,120),width=1)
    g.rectangle(bounds,outline='#37dfb1',width=1)
    reviewed=Image.alpha_composite(clean,guide).convert('RGB')
    reviewed.save(QA/(filename+'-safe-area.png'))
    tile=reviewed.resize((360,640));x=index%3*360;y=index//3*660
    board.paste(tile,(x,y+20));ImageDraw.Draw(board).text((x+8,y+4),f"{filename} | {c['start']:.2f}s | CPU LAYOUT ONLY",fill='white')
board.save(QA/'caption-layout-contact.jpg')
report['layout_review']={'source':'Existing CPU geometry frames, not browser captures',
    'samples':len(sources),'all_cues_width_checked':True,'safe_area':'Provisional editorial exclusions, not official platform UI',
    'artifacts':QA.relative_to(ROOT).as_posix()}
(OUT/'review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'audio':report['loudness_review'],'music_voice_rms_db':report['music_relative_to_active_voice_rms_db'],'layout':report['layout_review']},indent=2))
