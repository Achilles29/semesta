"""Check the concrete local review deliverables, exported copies and video."""
import hashlib,json,re,datetime,urllib.request
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ilustrasi/avatar-v2/farmer-v13-body'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
copies=[OUT/'farmer-v13-body.glb',ROOT/'public/models/characters/semesta-farmer-v13.glb',ROOT/'assets/game/models/characters/semesta-farmer-v13.glb']
hashes={str(p.relative_to(ROOT)):sha(p) for p in copies};assert len(set(hashes.values()))==1
page=(OUT/'review.html').read_text(encoding='utf-8');links=re.findall(r'(?:src|href)="([^"]+)"',page)
for link in links:
    if '?' in link or link.startswith(('http:','https:','#')):continue
    assert (OUT/link).is_file(),f'Missing linked artifact: {link}'
reader=imageio_ffmpeg.read_frames(str(OUT/'body-demo.mp4'));video=next(reader);frames=sum(1 for _ in reader)
assert frames==144 and video['fps']==12 and video['size']==(480,660),(video,frames)
base='http://localhost/project/';http={}
for relative in ['ilustrasi/avatar-v2/farmer-v13-body/review.html','ilustrasi/avatar-v2/farmer-v13-body/body-demo.mp4','public/models/characters/semesta-farmer-v13.glb']:
    with urllib.request.urlopen(urllib.request.Request(base+relative,method='HEAD'),timeout=15) as response:
        assert response.status==200;http[relative]={'status':response.status,'bytes':int(response.headers['Content-Length'])}
assert http['public/models/characters/semesta-farmer-v13.glb']['bytes']==copies[0].stat().st_size
with urllib.request.urlopen(urllib.request.Request(base+'ilustrasi/avatar-v2/farmer-v13-body/body-demo.mp4',headers={'Range':'bytes=0-1023'}),timeout=15) as response:
    assert response.status==206 and len(response.read())==1024
report={'passed':True,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hashes':hashes,'linkedArtifacts':len(links),'video':{'frames':frames,'fps':video['fps'],'size':video['size'],'duration':video['duration'],'decodedCompletely':True},'http':http,'videoRangeRequest':206,'browserInteractionVerified':False,'gpuFpsMeasured':False}
(OUT/'release-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
