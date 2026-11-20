"""Package actual renders into a local review and a labelled silent demo."""
import json, subprocess, html
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ilustrasi/avatar-v2/farmer-v14-jrpg'
report=json.loads((OUT/'runtime-test.json').read_text())
font_path='C:/Windows/Fonts/segoeui.ttf'
font=ImageFont.truetype(font_path,17);small=ImageFont.truetype(font_path,12)
for view in ['front','side','back','face','hand','feet']:
    a=Image.open(OUT/f'v13-{view}.png').convert('RGB');b=Image.open(OUT/f'v14-{view}.png').convert('RGB')
    sheet=Image.new('RGB',(a.width+b.width,max(a.height,b.height)+65),'#101b20');sheet.paste(a,(0,65));sheet.paste(b,(a.width,65))
    draw=ImageDraw.Draw(sheet);draw.text((24,18),'V13 · proporsi kartun',font=font,fill='#e9dcc5');draw.text((a.width+24,18),'V14 · Arka dewasa',font=font,fill='#e9dcc5')
    sheet.save(OUT/f'comparison-{view}.jpg',quality=94)
timing=json.loads((OUT/'demo-timing.json').read_text());frames=OUT/'video-frames';frames.mkdir(exist_ok=True)
labels={'turn':'Arka V14 · putaran karakter','Walk':'Berjalan · gerakan di tempat','Run':'Berlari · gerakan di tempat','Wave':'Melambaikan tangan','Sit':'Pose duduk','Point':'Menunjuk','Hold':'Memegang properti','face':'Ekspresi & bentuk mulut','hands':'Artikulasi jari'}
for i in range(round(timing['seconds']*timing['fps'])):
    source=Image.open(OUT/'demo-frames'/f'{i:04}.png').convert('RGB')
    frame=Image.new('RGB',(source.width,source.height+64),'#101b20');frame.paste(source,(0,64))
    stage=next(s for s in timing['stages'] if s['start']<=i/timing['fps']<s['end'])
    draw=ImageDraw.Draw(frame);draw.text((14,9),labels[stage['label']],font=font,fill='#f3e6cb');draw.text((14,35),'Render Blender · demo tanpa suara · kandidat',font=small,fill='#abbfc5')
    frame.save(frames/f'{i:04}.png')
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-framerate',str(timing['fps']),'-i',str(frames/'%04d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'arka-demo.mp4')],check=True,capture_output=True)

def gallery(items):
    return '<div class="gallery">'+''.join(f'<figure><a href="{file}"><img loading="lazy" src="{file}" alt="{html.escape(label)}"></a><figcaption>{html.escape(label)}</figcaption></figure>' for file,label in items)+'</div>'

comparisons=gallery([(f'comparison-{v}.jpg',label) for v,label in [('front','Depan'),('side','Samping'),('back','Belakang'),('face','Wajah'),('hand','Tangan'),('feet','Kaki')]])
body=gallery([(f'v14-pose-{p}.png',label) for p,label in [('walk','Walk'),('run','Run'),('wave','Wave'),('sit','Sit'),('point','Point'),('hold','Hold')]])
hands=gallery([(f'v14-hand-{p}.png',label) for p,label in [('open','Terbuka'),('point','Menunjuk'),('grip','Memegang'),('fist','Mengepal')]])
expressions=gallery([(f'v14-face-{p}.png',label) for p,label in [('happy','Senang'),('angry','Kesal'),('sad','Sedih'),('blink','Kedipan'),('AA','Viseme AA'),('OH','Viseme OH')]])
exports=gallery([(f'export-{p}.png',label) for p,label in [('front','GLB · tubuh'),('face','GLB · wajah'),('feet','GLB · sepatu'),('hand-grip','GLB · jari'),('pose-sit','GLB · duduk'),('pose-hold','GLB · properti')]])
page=f'''<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arka V14 — studi karakter dewasa</title>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#101b20;color:#e4e9e8;font:16px/1.6 "Segoe UI",sans-serif}}main{{max-width:1240px;margin:auto;padding:38px 24px 80px}}a{{color:#e8c887}}h1{{font-size:clamp(34px,5vw,62px);line-height:1.1;margin:14px 0}}h2{{font-size:28px;margin-top:60px}}p{{max-width:830px;color:#bdcccf}}.eyebrow{{letter-spacing:.2em;font-size:12px;color:#e8c887}}.hero{{display:grid;grid-template-columns:1fr .75fr;gap:36px;align-items:center}}.hero img{{width:100%;border-radius:14px}}.actions{{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}}.actions a{{background:#25383d;padding:12px 18px;border-radius:6px;text-decoration:none}}.note{{border-left:3px solid #c6a76c;background:#19292e;padding:16px 20px}}.gallery{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}.compare .gallery{{grid-template-columns:repeat(2,minmax(0,1fr))}}figure{{margin:0;background:#1b2b30;border-radius:10px;overflow:hidden}}figure img{{width:100%;display:block}}figcaption{{padding:10px 14px;color:#ccdadc}}video{{max-height:720px;width:100%;background:#080e11}}table{{border-collapse:collapse;width:100%;max-width:830px}}td,th{{text-align:left;border-bottom:1px solid #33444a;padding:12px}}code{{color:#e8c887}}footer{{margin-top:60px;border-top:1px solid #33444a;padding-top:24px;color:#9eb1b6}}@media(max-width:700px){{.hero{{grid-template-columns:1fr}}.hero img{{max-height:620px;object-fit:contain}}.gallery,.compare .gallery{{grid-template-columns:repeat(2,minmax(0,1fr))}}main{{padding:24px 14px}}}}@media(max-width:440px){{.compare .gallery{{grid-template-columns:1fr}}}}</style>
<main><div class="hero"><div><span class="eyebrow">REPUBLIK WKWKWK / CHARACTER STUDY 14</span><h1>Arka.<br>Proporsi baru,<br>karakter dewasa.</h1><p>Satu karakter petualang desa dengan fondasi anatomi baru, wajah bertekstur, jari berartikulasi, serta kostum gading, indigo, dan kulit. Kandidat untuk ditinjau di Studio Avatar.</p><div class="actions"><a href="../../../admin/?view=avatars">Buka Studio Avatar ↗</a><a href="arka-v14.glb" download>Unduh GLB</a><a href="arka-v14.blend" download>Sumber Blender</a></div><p>Pilih <b>V14 · Arka dewasa</b> pada Versi pratinjau. Kontrol ekspresi, jari, animasi, kamera detail, serta pencahayaan tersedia. Bentuk tubuh dan kostum V14 masih satu desain.</p><div class="note">V11 tetap menjadi avatar game. V14 belum setara kualitas artistik Final Fantasy; peningkatan utama ada pada proporsi dewasa, anatomi, wajah, material, dan fondasi rig.</div></div><img src="v14-three-quarter.png" alt="Arka V14 dalam kostum petualang desa"></div>
<section class="compare"><h2>V13 dan V14</h2><p>Render menggunakan kamera, skala tampilan, lantai, dan pencahayaan yang sama. Masing-masing memakai pose idle dari rig sendiri. Klik gambar untuk melihat ukuran penuh.</p>{comparisons}</section>
<section><h2>Bergerak dan berekspresi</h2><p>Demo 14 detik, 12 fps, tanpa suara. Turntable, jalan/lari, gestur, pose duduk, ekspresi dan jari. Video berasal dari file Blender; bukti GLB ditampilkan terpisah di bawah.</p><video controls preload="metadata" poster="v14-three-quarter.png"><source src="arka-demo.mp4" type="video/mp4"></video>{body}</section>
<section><h2>Tangan yang dapat diarahkan</h2><p>Tiga sendi per jari. Kontrol tangan terpisah dari animasi tubuh; socket pegangan memiliki orientasi sendiri.</p>{hands}</section>
<section><h2>Wajah untuk percakapan</h2><p>Ekspresi, kedipan, arah pandang, dan bentuk mulut dasar. Demo viseme memakai urutan waktu yang ditentukan; belum melakukan pengenalan fonem dari audio.</p>{expressions}</section>
<section><h2>Hasil impor ulang GLB</h2><p>Gambar ini dirender setelah mengimpor file GLB kandidat kembali ke Blender. Ini memeriksa mesh, material, rig, morph, dan pose hasil ekspor; bukan screenshot atau pengukuran GPU browser.</p>{exports}</section>
<section><h2>Ukuran dan batas kandidat</h2><table><tr><th>Metrik</th><th>V14</th></tr><tr><td>GLB</td><td>{report['glbBytes']/1e6:.2f} MB</td></tr><tr><td>Segitiga aktif</td><td>{report['triangles']:,}</td></tr><tr><td>Primitive / material</td><td>{report['meshPrimitives']} / {report['materials']}</td></tr><tr><td>Tulang / animasi</td><td>{report['bones']} / {len(report['clips'])}</td></tr><tr><td>Gambar tekstur tertanam</td><td>{len(report['embeddedImages'])}</td></tr><tr><td>Uji vertex animasi</td><td>{report['vertexSamples']:,} sampel</td></tr><tr><td>Uji pijakan</td><td>{report['pathChecks']} sampel</td></tr><tr><td>FPS GPU browser</td><td>Belum diukur</td></tr></table><p>Kandidat ini lebih berat per karakter daripada V13. Belum ada LOD, simulasi kain, IK tanah miring, atau seluruh variasi wardrobe. Rambut, lipatan kostum, bahu, dan pose ekstrem masih membutuhkan pemolesan artistik. Sit/Point/Hold adalah pose bertahan, bukan transisi gerak lengkap.</p></section>
<footer><a href="README.md">Dokumentasi & cara membangun ulang</a> · <a href="SOURCE-LICENSES.md">Sumber & lisensi CC0</a> · <a href="runtime-test.json">Uji runtime</a> · <a href="texture-audit.json">Audit tekstur</a> · <a href="release-check.json">Pemeriksaan rilis lokal</a><p>Seluruh produksi dilakukan lokal. Tidak memakai layanan berbayar atau aset Final Fantasy.</p></footer></main></html>'''
(OUT/'review.html').write_text(page,encoding='utf-8')
print('V14_REVIEW_PACKAGED',OUT/'review.html')
