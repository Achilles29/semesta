"""Named review sheets built from the same V15 presets used at runtime."""
import html
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'ilustrasi/avatar-v2/farmer-v15-proportions'

def package_citizens():
    roster = json.loads((ROOT / 'game-src/citizen-roster.json').read_text(encoding='utf-8'))
    citizens = roster['citizens']
    revision=roster.get('designRevision','warga-style-2')
    font_path = Path('C:/Windows/Fonts/segoeui.ttf')
    font = ImageFont.truetype(str(font_path), 22)
    small = ImageFont.truetype(str(font_path), 17)
    title = ImageFont.truetype(str(font_path), 33)
    for page in range((len(citizens)+11)//12):
        sheet = Image.new('RGB', (960, 1910), '#e8eeeb')
        draw = ImageDraw.Draw(sheet)
        draw.rectangle((0, 0, 960, 86), fill='#173d39')
        draw.text((22, 16), f'REPUBLIK WKWKWK  /  WARGA {page+1}', font=title, fill='white')
        for i, citizen in enumerate(citizens[page*12:page*12+12]):
            x, y = i%3*320, 100+i//3*450
            portrait = ImageOps.contain(Image.open(OUT/'presets'/f"{citizen['presetId']}.png").convert('RGB'), (308, 389))
            sheet.paste(portrait, (x+(320-portrait.width)//2, y))
            draw.text((x+14, y+394), citizen['name'], font=font, fill='#163a35')
            role = citizen['role']
            while draw.textlength(role, font=small) > 291:
                role = role[:-2].rstrip('…')+'…'
            draw.text((x+14, y+424), role, font=small, fill='#4a605a')
        sheet.save(OUT/f'warga-gelombang-1-{page+1}.jpg', quality=94)
    cards = []
    for c in citizens:
        name, role, notes = map(html.escape, (c['name'], c['role'], c['designNotes']))
        face = f'<p><a href="presets/{c["presetId"]}-face.png?v={revision}">Lihat wajah dari sudut tiga perempat</a></p>' if (OUT/'presets'/f"{c['presetId']}-face.png").exists() else ''
        cards.append(f'<article data-search="{html.escape(c["name"]+" "+c["role"], quote=True)}"><a href="presets/{c["presetId"]}.png?v={revision}"><img loading="lazy" src="presets/{c["presetId"]}.png?v={revision}" alt="Karakter {name}"></a><div><h2>{name}</h2><strong>{role}</strong><p>{notes}</p>{face}</div></article>')
    faces = [c for c in citizens if (OUT/'presets'/f"{c['presetId']}-face.png").exists()]
    if faces:
        sheet = Image.new('RGB', (1200, 420*((len(faces)+3)//4)), '#e8eeeb')
        draw = ImageDraw.Draw(sheet)
        for i,c in enumerate(faces):
            x, y = i%4*300, i//4*420
            portrait = ImageOps.contain(Image.open(OUT/'presets'/f"{c['presetId']}-face.png").convert('RGB'), (294, 380))
            sheet.paste(portrait, (x+(300-portrait.width)//2, y))
            draw.text((x+14, y+385), c['name'], font=font, fill='#163a35')
        sheet.save(OUT/'warga-wajah-detail.jpg', quality=95)
    page = '''<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>48 warga pertama — Republik Wkwkwk</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e8eeeb;color:#193b35;font:16px/1.5 system-ui}header{background:#173d39;color:white;padding:38px max(22px,calc((100vw - 1250px)/2))}h1{font-size:clamp(30px,5vw,54px);line-height:1.1;margin:12px 0}header a{color:#bdecd9}main{max-width:1300px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:white;border-radius:12px;overflow:hidden}article[hidden]{display:none}article img{width:100%;display:block}article div{padding:16px}h2{margin:0;font-size:22px;overflow-wrap:anywhere}article p{color:#53655e;font-size:14px}input{width:100%;max-width:650px;padding:14px;border:1px solid #9aafa4;border-radius:10px;font:inherit;margin:0 0 24px}strong{font-size:15px}</style>
<header><span>REPUBLIK WKWKWK / GELOMBANG 1</span><h1>48 nama. 48 karakter.</h1><p>Potret dari model game. Nama, pakaian, wajah, postur dan atribut profesi dikurasi per warga.</p><p><a href="../../../admin/?view=avatars">Buka Studio Avatar 3D</a> · <a href="../../../admin/?view=production">Buka Produksi</a></p><small>DD digabung sementara. Peran mengikuti usulan warga; desain tidak merekonstruksi wajah asli.</small></header>
<main><label for="search">Cari nama atau profesi</label><br><input id="search" type="search" placeholder="Contoh: dokter, polisi, Xel"><div class="grid">'''+''.join(cards)+'''</div></main><script>document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase('id-ID');document.querySelectorAll('article').forEach(c=>c.hidden=!c.dataset.search.toLocaleLowerCase('id-ID').includes(q));});</script></html>'''
    (OUT/'warga-gelombang-1.html').write_text(page, encoding='utf-8')
    print(f'Citizen gallery and 4 named contact sheets: {len(citizens)} portraits')

if __name__ == '__main__':
    package_citizens()
