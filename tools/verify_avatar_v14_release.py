"""Verify local candidate delivery, embedded pixels, provenance and demo decode."""
import datetime, hashlib, io, json, re, struct, urllib.request
from pathlib import Path
from urllib.parse import unquote
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ilustrasi/avatar-v2/farmer-v14-jrpg'
paths=[OUT/'arka-v14.glb',ROOT/'public/models/characters/semesta-farmer-v14.glb',ROOT/'assets/game/models/characters/semesta-farmer-v14.glb']
hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
assert len(set(hashes.values()))==1,'Source/public/build GLB differ'
runtime=json.loads((OUT/'runtime-test.json').read_text());assert runtime['passed'] and runtime['sha256']==next(iter(hashes.values()))
data=paths[0].read_bytes();assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);start=28+size;images=[]
for source in doc['images']:
    view=doc['bufferViews'][source['bufferView']];blob=data[start+view.get('byteOffset',0):start+view.get('byteOffset',0)+view['byteLength']]
    im=Image.open(io.BytesIO(blob));im.load();images.append(dict(name=source['name'],size=im.size,mode=im.mode,bytes=len(blob)))
texture_report=dict(allDecoded=True,glbSHA256=runtime['sha256'],decodedEmbeddedImages=images)
(OUT/'texture-audit.json').write_text(json.dumps(texture_report,indent=2))
source_checks=0
for path,folder in [(OUT/'source/makehuman/manifest.json',OUT/'source/makehuman'),(OUT/'source/system-manifest.json',OUT/'source/system')]:
    manifest=json.loads(path.read_text())
    for item in manifest['files']:
        p=folder/item['path'];assert p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],str(p);source_checks+=1
page=(OUT/'review.html').read_text(encoding='utf-8');links=[]
for value in re.findall(r'(?:href|src|poster)="([^"]+)"',page):
    if '?' in value or value.startswith(('http:','https:','#')):continue
    if value=='release-check.json':links.append(value);continue
    p=(OUT/unquote(value)).resolve();assert p.is_file(),value;links.append(value)
reader=imageio_ffmpeg.read_frames(str(OUT/'arka-demo.mp4'),pix_fmt='rgb24');video=next(reader);count=0
for frame in reader:count+=1
assert count==168 and abs(video['duration']-14)<.1 and video['fps']==12,(count,video)
checks=[]
base='http://localhost/project/'
for path in ['ilustrasi/avatar-v2/farmer-v14-jrpg/review.html','ilustrasi/avatar-v2/farmer-v14-jrpg/arka-demo.mp4','public/models/characters/semesta-farmer-v14.glb']:
    with urllib.request.urlopen(urllib.request.Request(base+path,method='HEAD'),timeout=15) as response:
        assert response.status==200;checks.append(dict(path=path,status=response.status,bytes=response.headers.get('Content-Length')))
with urllib.request.urlopen(urllib.request.Request(base+'ilustrasi/avatar-v2/farmer-v14-jrpg/arka-demo.mp4',headers={'Range':'bytes=0-1023'}),timeout=15) as response:
    assert response.status==206 and len(response.read())==1024
with urllib.request.urlopen(base+'admin/?view=avatars',timeout=15) as response:
    admin=response.read().decode('utf-8')
    advertised='semesta-farmer-v14.glb' in admin and 'farmer-v14-jrpg/review.html' in admin
    login_required=not advertised and 'Panel Admin' in admin and 'password' in admin
    assert advertised or login_required,'Unexpected admin response'
admin_source=(ROOT/'application/views/admin.php').read_text(encoding='utf-8')
assert 'semesta-farmer-v14.glb' in admin_source and 'farmer-v14-jrpg/review.html' in admin_source
manifest=json.loads((ROOT/'assets/game/.vite/manifest.json').read_text())
bundle=ROOT/'assets/game'/next(iter(manifest.values()))['file'];assert 'semesta-arka-v14' in bundle.read_text(encoding='utf-8')
result=dict(passed=True,checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),hashes=hashes,sourceFilesVerified=source_checks,linkedFilesVerified=len(set(links)),embeddedImagesDecoded=len(images),video=dict(frames=count,seconds=video['duration'],fps=video['fps'],size=video['size']),http=checks,rangeRequest206=True,adminCandidateConfiguredInSource=True,adminAdvertisesCandidate=advertised,adminLoginRequired=login_required,browserInteractionVerified=False,gpuFPSMeasured=False)
(OUT/'release-check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
