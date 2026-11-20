"""Build the review from actual GLB renders and encode a matched motion video."""
import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'
catalog=json.loads((ROOT/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
report=json.loads((OUT/'runtime-test.json').read_text());font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
a=Image.open(OUT.parent/'farmer-v14-jrpg/v14-front.png').convert('RGB');b=Image.open(OUT/'male-balanced-front.png').convert('RGB')
sheet=Image.new('RGB',(1400,955),'#101b20');sheet.paste(a,(0,55));sheet.paste(b,(700,55));d=ImageDraw.Draw(sheet)
d.text((24,14),'V14 · sebelum revisi',font=font,fill='white');d.text((724,14),'V15 · proporsi direvisi',font=font,fill='white');sheet.save(OUT/'comparison.jpg',quality=94)
frames=OUT/'motion-video-frames';frames.mkdir(exist_ok=True)
for i in range(92):
 a=Image.open(OUT/'motion-cmu/male-balanced'/f'{i:04}-front.png').convert('RGB');b=Image.open(OUT/'motion-cmu/male-balanced'/f'{i:04}-side.png').convert('RGB')
 im=Image.new('RGB',(560,472),'#101b20');im.paste(a,(0,72));im.paste(b,(280,72));d=ImageDraw.Draw(im)
 label='Jalan' if i<52 else 'Lari';d.text((14,10),f'{label} · depan',font=font,fill='white');d.text((294,10),f'{label} · samping',font=font,fill='white')
 d.text((14,40),'V15 revisi gerak · GLB aktual · 24 fps · sumber CMU',font=small,fill='#b5c9cc');im.save(frames/f'{i:04}.png')
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-framerate','24','-i',str(frames/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',str(OUT/'motion-comparison.mp4')],capture_output=True,check=True)
sheet=Image.new('RGB',(1680,1640),'#101b20');d=ImageDraw.Draw(sheet)
d.text((14,8),'V15 gerak CMU | Jalan: dua baris atas | Lari: dua baris bawah',font=font,fill='white')
for index,frame in enumerate([0,4,8,13,17,21,52,55,59,62,65,69]):
 for row,view in enumerate(['front','side']):sheet.paste(Image.open(OUT/'motion-cmu/male-balanced'/f'{frame:04}-{view}.png'),((index%6)*280,40+(index//6*2+row)*400))
sheet.save(OUT/'motion-contact.jpg',quality=94)
from package_avatar_v15_release import package_review
package_review()
