"""Delivery verification. Does not claim browser/GPU interaction."""
import hashlib,html,io,json,re,struct,urllib.request,datetime
from pathlib import Path
from PIL import Image
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions'
report=json.loads((OUT/'runtime-test.json').read_text());assert report['passed']
checks=[]
runtime=ROOT/'public/models/characters/v15/runtime'
runtime_manifest=json.loads((ROOT/'game-src/avatar-v15-runtime-manifest.json').read_text())
runtime_files=set(runtime_manifest.values())
for filename in runtime_manifest.values():
 data=json.loads((runtime/filename).read_text());runtime_files.update(i['uri'] for i in data['images']);runtime_files.update(b['uri'] for b in data['buffers'])
for filename in runtime_files:
 data=(runtime/filename).read_bytes();assert hashlib.sha256(data).hexdigest().startswith(filename.split('.')[0])
 assert data==(ROOT/'assets/game/models/characters/v15/runtime'/filename).read_bytes()
 with urllib.request.urlopen(urllib.request.Request('http://localhost/project/public/models/characters/v15/runtime/'+filename,method='HEAD'),timeout=15) as response:assert response.status==200
for p in report['profiles']:
 files=[OUT/p['id']/'avatar.glb',ROOT/'public/models/characters/v15'/f"{p['id']}.glb",ROOT/'assets/game/models/characters/v15'/f"{p['id']}.glb"]
 for path in files:assert hashlib.sha256(path.read_bytes()).hexdigest()==p['sha256'],str(path)
 b=files[0].read_bytes();length=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+length]);start=28+length
 assert struct.unpack_from('<I',b,8)[0]==len(b)
 images=[]
 for image in doc['images']:
  v=doc['bufferViews'][image['bufferView']];im=Image.open(io.BytesIO(b[start+v.get('byteOffset',0):start+v.get('byteOffset',0)+v['byteLength']]));im.load();images.append({'name':image['name'],'size':im.size})
 assert (OUT/p['id']/'avatar.blend').stat().st_size>1000000
 url='http://localhost/project/public/models/characters/v15/'+p['id']+'.glb'
 with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=15) as response:assert response.status==200 and int(response.headers['Content-Length'])==len(b)
 checks.append({'id':p['id'],'sha256':p['sha256'],'bytes':len(b),'decodedTextures':len(images),'httpStatus':200})
for f in json.loads((OUT/'source/manifest.json').read_text())['files']:assert hashlib.sha256((OUT/'source'/f['path']).read_bytes()).hexdigest()==f['sha256']
for f in json.loads((OUT/'source/cmu/manifest.json').read_text()):assert hashlib.sha256((OUT/'source/cmu'/f['path']).read_bytes()).hexdigest()==f['sha256']
beauty_root=OUT/'source/citizen-beauty'
beauty_manifest=json.loads((beauty_root/'manifest.json').read_text(encoding='utf-8'))
beauty_files=beauty_manifest['files']+beauty_manifest['derivatives']
for f in beauty_files:
 assert hashlib.sha256((beauty_root/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
catalog=json.loads((ROOT/'game-src/avatar-v15-catalog.json').read_text(encoding='utf-8'))
for p in report['profiles']:
 build=json.loads((OUT/p['id']/'citizen-art-build.json').read_text(encoding='utf-8'))
 assert build['revision']==catalog['variationRevision'] and build['rigUnchanged'] and build['animationsUnchanged']
revision=catalog['motionRevision']
for p in report['profiles']:
 for gait in p['locomotion'].values():assert gait['revision']==revision and gait['source'].startswith('CMU ')
reader=imageio_ffmpeg.read_frames(str(OUT/'motion-comparison.mp4'),pix_fmt='rgb24');meta=next(reader);count=sum(1 for frame in reader)
assert count==92 and meta['fps']==24 and abs(meta['duration']-92/24)<.1
page=(OUT/'review.html').read_text(encoding='utf-8');links=set(re.findall(r'(?:href|src|poster)="([^"]+)"',page))
for link in links:
 if '?' not in link and not link.startswith(('http','#')) and link!='release-check.json':assert (OUT/link).exists(),link
for filename in ['review.html','motion-comparison.mp4']:
 with urllib.request.urlopen(urllib.request.Request('http://localhost/project/ilustrasi/avatar-v2/farmer-v15-proportions/'+filename,method='HEAD'),timeout=15) as response:assert response.status==200
with urllib.request.urlopen(urllib.request.Request('http://localhost/project/ilustrasi/avatar-v2/farmer-v15-proportions/motion-comparison.mp4',headers={'Range':'bytes=0-1023'}),timeout=15) as response:assert response.status==206 and len(response.read())==1024
manifest=json.loads((ROOT/'assets/game/.vite/manifest.json').read_text());bundle=ROOT/'assets/game'/manifest['game-src/main.js']['file'];assert 'semesta-arka-v15' in bundle.read_text(encoding='utf-8')
assert revision in bundle.read_text(encoding='utf-8')
assert catalog['variationRevision'] in bundle.read_text(encoding='utf-8')
with urllib.request.urlopen('http://localhost/project/',timeout=15) as response:
 assert response.status==200 and manifest['game-src/main.js']['file'] in response.read().decode('utf-8')
with urllib.request.urlopen('http://localhost/project/assets/game/'+manifest['game-src/main.js']['file'],timeout=15) as response:
 assert response.status==200 and response.read()==bundle.read_bytes()
presets=json.loads((ROOT/'game-src/avatar-v15-presets.json').read_text(encoding='utf-8'))
for preset in presets:
 name=preset['id']+'.png';portrait=(OUT/'presets'/name).read_bytes()
 assert portrait==(ROOT/'public/models/characters/v15/portraits'/name).read_bytes()
 assert portrait==(ROOT/'assets/game/models/characters/v15/portraits'/name).read_bytes()
citizens=json.loads((ROOT/'game-src/citizen-roster.json').read_text(encoding='utf-8'))['citizens']
gallery_url='http://localhost/project/ilustrasi/avatar-v2/farmer-v15-proportions/warga-gelombang-1.html'
with urllib.request.urlopen(gallery_url,timeout=15) as response:
 assert response.status==200
 gallery=response.read().decode('utf-8')
assert gallery.count('<article ')==len(citizens)==48
for citizen in citizens:
 assert '<h2>'+html.escape(citizen['name'])+'</h2>' in gallery
 assert 'presets/'+citizen['presetId']+'.png?v=' in gallery
for name in ['v15-warga-angel.png','v15-warga-aku-ardhyy.png','v15-warga-fale.png']:
 with urllib.request.urlopen('http://localhost/project/public/models/characters/v15/portraits/'+name,timeout=15) as response:
  assert response.read()==(OUT/'presets'/name).read_bytes(),name
admin=(ROOT/'application/views/admin.php').read_text(encoding='utf-8');assert 'SEMESTA_AVATAR_V15_BASE' in admin and 'SEMESTA_FARMER_MODEL' not in admin
result={'passed':True,'revision':revision,'cmuSourceHashesVerified':True,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'profiles':checks,'linkedFiles':len(links),'video':{'frames':count,'seconds':meta['duration'],'fps':meta['fps'],'size':meta['size']},'httpRange206':True,'browserInteractionVerified':False,'gpuFPSMeasured':False}
result['runtimeFilesVerified']=len(runtime_files)
result['citizenSourceHashesVerified']=len(beauty_files)
result['citizenBuildsPreserveRigAndAnimation']=True
result['namedCitizenGalleryVerified']=len(citizens)
result['mainPageCurrentBundleVerified']=True
result['httpBundleHashVerified']=True
result['variationRevision']=catalog['variationRevision'];result['presetPortraitsVerified']=len(presets)
(OUT/'release-check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
