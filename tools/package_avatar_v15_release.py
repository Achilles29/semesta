"""Publish review and preset portraits after rendering and validating the assets."""
import json,html,shutil
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'
def package_review():
    catalog=json.loads((ROOT/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
    presets=json.loads((ROOT/'game-src/avatar-v15-presets.json').read_text(encoding='utf-8'))
    integration=json.loads((OUT/'integration-test.json').read_text(encoding='utf-8'))
    runtime=json.loads((OUT/'runtime-package.json').read_text(encoding='utf-8'))
    folder=ROOT/'public/models/characters/v15/portraits';folder.mkdir(exist_ok=True)
    for preset in presets:shutil.copyfile(OUT/'presets'/f"{preset['id']}.png",folder/f"{preset['id']}.png")
    sheet=Image.new('RGB',(1200,275*((len(presets)+5)//6)),'#e9eeeb');draw=ImageDraw.Draw(sheet)
    for i,preset in enumerate(presets):
        image=ImageOps.contain(Image.open(OUT/'presets'/f"{preset['id']}.png").convert('RGB'),(195,245));x=i%6*200;y=i//6*275
        sheet.paste(image,(x+(200-image.width)//2,y));draw.text((x+10,y+248),preset['name'],fill='#233b32');draw.text((x+10,y+261),preset['config']['profileId'],fill='#42564c')
    sheet.save(OUT/'presets-contact.jpg',quality=92)
    uniforms=[p for p in presets if p['config']['appearance']['topStyle'] in ['tactical','camo','civilService','safariWhite','police','operator','racing','firefighter','pilot','labcoat']]
    sheet=Image.new('RGB',(1440,500*((len(uniforms)+3)//4)),'#e9eeeb');draw=ImageDraw.Draw(sheet)
    for i,preset in enumerate(uniforms):
        image=Image.open(OUT/'presets'/f"{preset['id']}.png").convert('RGB');x=i%4*360;y=i//4*500
        sheet.paste(image,(x,y));draw.text((x+12,y+470),preset['name'],fill='#233b32')
    sheet.save(OUT/'uniforms-contact.jpg',quality=94)
    styles=list(catalog['fields']['bottomStyle']['options'].items())
    bottoms=Image.new('RGB',(240*len(styles),335),'#e9eeeb');draw=ImageDraw.Draw(bottoms)
    for i,(key,label) in enumerate(styles):
        image=ImageOps.contain(Image.open(OUT/'presets'/f'wardrobe-bottom-{key}.png').convert('RGB'),(235,300))
        bottoms.paste(image,(i*240+(240-image.width)//2,0));draw.text((i*240+12,310),label,fill='#233b32')
    bottoms.save(OUT/'wardrobe-bottoms.jpg',quality=94)
    shapes=list(catalog['fields']['faceShape']['options'].items())
    faces=Image.new('RGB',(240*len(shapes),335),'#e9eeeb');draw=ImageDraw.Draw(faces)
    for i,(key,label) in enumerate(shapes):
        image=ImageOps.contain(Image.open(OUT/'presets'/f'identity-{key}-face.png').convert('RGB'),(235,300))
        faces.paste(image,(i*240+(240-image.width)//2,0));draw.text((i*240+12,310),label,fill='#233b32')
    faces.save(OUT/'identity-faces.jpg',quality=94)
    shutil.copyfile(OUT/'presets/v15-arka.png',folder.parent/'portrait.png')
    (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'presets.json').write_text(json.dumps(presets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    labels={p['id']:p['label'] for p in catalog['profiles']}
    cards=''.join(f'<figure><a href="presets/{p["id"]}.png"><img loading="lazy" src="presets/{p["id"]}.png?v={catalog["variationRevision"]}" alt="{html.escape(p["name"])}"></a><figcaption><b>{html.escape(p["name"])}</b><br>{labels[p["config"]["profileId"]]}</figcaption></figure>' for p in presets)
    options=''.join(f'<tr><th>{html.escape(f["label"])}</th><td>{html.escape(", ".join(f["options"].values()))}</td></tr>' for f in catalog['fields'].values())
    sources=''.join(f'<li>{p["label"]}: <a href="{p["id"]}/avatar.glb">GLB</a> / <a href="{p["id"]}/avatar.blend">Blender</a></li>' for p in catalog['profiles'])
    page=f'''<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V15 - Karakter game dan konten</title>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#12231f;color:#e9f1eb;font:16px/1.6 system-ui}}main{{max-width:1200px;margin:auto;padding:40px 24px}}h1{{font-size:42px;line-height:1.15}}a{{color:#aad9c0}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}}figure{{margin:0;background:#20382e;border-radius:12px;overflow:hidden}}figure img{{width:100%;display:block}}figcaption{{padding:12px}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;padding:12px;border-bottom:1px solid #385044}}video{{max-width:100%;background:#101b20}}.note{{padding:20px;background:#254735;border-radius:12px}}footer{{margin-top:40px}}</style>
<main><p>SEMESTA / AVATAR V15</p><h1>Satu karakter untuk game dan konten.</h1><p>Model aktif V15, enam profil tubuh, dan {len(presets)} karakter siap pakai. Model V11 dan kandidat sebelumnya sudah keluar dari alur pilihan aktif.</p><p><a href="../../../admin/?view=avatars">Buka Studio Avatar</a> / <a href="../../../">Buka game</a> / <a href="presets.json">Konfigurasi {len(presets)} karakter</a></p>
<h2>Warga gelombang 1</h2><p>48 warga dengan identitas visual dan atribut profesi. <a href="warga-gelombang-1.html">Buka galeri bernama dan cari profesi</a>. Model Pasca Bowow dan tokoh Day 1 tetap tersedia.</p><a href="uniforms-contact.jpg"><img src="uniforms-contact.jpg?v={catalog['variationRevision']}" alt="Kombinasi seragam warga" style="width:100%"></a>
<h2>Karakter siap pakai</h2><p>Gambar berikut dirender dari GLB yang dikirim ke game, dengan pilihan katalog yang sama.</p><div class="grid">{cards}</div>
<h2>Bawahan dan pakaian sesuai karakter</h2><p>Koleksi warga menambah rok pensil, A-line dan panggung, setelan balap, damkar, pilot, jas medis serta rompi operator. Blouse, blazer dan satin mengikuti bentuk tubuh; seragam polisi memakai cokelat dan cokelat tua. Pilihan slim, tapered, regular, loose, wide-leg, cargo dan dua potongan denim tetap tersedia. Bentuk dan warna seragam tidak bergantung pada palet kasual. Semua gambar memakai profil dan kamera yang sama.</p><a href="wardrobe-bottoms.jpg"><img src="wardrobe-bottoms.jpg?v={catalog['variationRevision']}" alt="Pilihan potongan dan seragam celana" style="width:100%"></a><p><a href="wardrobe-before.jpg">Bandingkan dengan wardrobe sebelumnya</a> / <a href="wardrobe-test.json">Uji geometri bawahan</a></p>
<h2>Variasi yang tersedia</h2><p>Pria/perempuan dengan postur kurus, ideal, dan gemuk. Bentuk wajah memakai morph identitas; pakaian, rambut dan aksesori memakai geometri fitted. Warna iris memiliki tekstur tersendiri.</p><table>{options}</table>
<h2>Gerak yang dipertahankan</h2><video controls preload="metadata" poster="motion-contact.jpg" src="motion-comparison.mp4"></video><p>Video pemeriksaan gerak yang disetujui sebelum penambahan wardrobe. Klipnya tetap sama: kepala tegak, jalan dan joging dari CMU. Game kini menyesuaikan cadence dengan kecepatan profil, tanpa pantulan tambahan. Shift atau tombol LARI mengaktifkan joging.</p>
<h2>Verifikasi</h2><div class="note">Enam profil lulus pemeriksaan bobot, deformasi, loop, kontak kaki dan kestabilan kepala. {integration['variationCases']} pilihan variasi diuji; {integration['phpRoundtrips']} konfigurasi melewati validator PHP dan JavaScript. {len(presets)} preset dirender. Pengujian interaksi browser dan FPS GPU belum dilakukan.</div><p>Game memuat sekitar {round(runtime['sharedRuntimeBytes']/1000000)} MB aset bersama untuk enam profil; Studio memuat profil sesuai permintaan. Belum ada LOD, simulasi kain atau IK tanah. Kombinasi ekstrem tetap perlu pemeriksaan artistik; uji numerik tidak menjamin seluruh kombinasi bebas clipping. Jaket dan seragam menutup rompi, selempang dan sabuk; topi bermahkota menutup rambut tanpa menghapus pilihan yang tersimpan.</p>
<h2>Sumber yang dapat diedit</h2><ul>{sources}</ul><footer><a href="README.md">Dokumentasi</a> / <a href="catalog.json">Katalog</a> / <a href="runtime-test.json">Uji gerak</a> / <a href="integration-test.json">Uji integrasi</a> / <a href="release-check.json">Pemeriksaan rilis</a></footer></main></html>'''
    (OUT/'review.html').write_text(page,encoding='utf-8');print('V15_RELEASE_REVIEW_READY')
if __name__=='__main__':package_review()
