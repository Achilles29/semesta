"""Fetch pinned CC0 graphical inputs; never installs or executes external code.

Uses byte ranges to extract selected files from the official system asset pack.
The checked-in manifests pin source URLs and SHA256 for subsequent reproduction.
"""
import concurrent.futures, hashlib, io, json, struct, urllib.request, zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'ilustrasi/avatar-v2/farmer-v14-jrpg/source'
URL='https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip'

def fetch_range(start,end):
    with urllib.request.urlopen(urllib.request.Request(URL,headers={'Range':f'bytes={start}-{end}'}),timeout=100) as response:
        if response.status!=206:raise RuntimeError('Server must honor byte ranges')
        return response.read()

def main():
    entries=json.loads((SOURCE/'pack-directory.json').read_text())
    prefixes=['skins/young_asian_male/','skins/young_caucasian_male/','hair/short02/','hair/short03/','eyes/high-poly/','eyebrows/eyebrow001/','teeth/teeth_base/','eyes/materials/brown_eye.png']
    def group(prefix):
        selected=[e for e in entries if e['name'].startswith(prefix) and e['size'] and not e['name'].endswith('.thumb')]
        start=min(e['offset'] for e in selected);end=max(e['offset']+e['compressed']+512 for e in selected)
        chunk=fetch_range(start,end);result=[]
        for e in selected:
            i=e['offset']-start;h=struct.unpack_from('<4s5H3I2H',chunk,i);data=i+30+h[-2]+h[-1]
            raw=chunk[data:data+e['compressed']];raw=zlib.decompress(raw,-15) if e['method']==8 else raw
            assert len(raw)==e['size']
            path=SOURCE/'system'/e['name'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
            result.append(dict(path=e['name'],bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
        print('Fetched',prefix,flush=True);return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:files=sum(list(pool.map(group,prefixes)),[])
    (SOURCE/'system-manifest.json').write_text(json.dumps(dict(url=URL,license='CC0-1.0',licenseEvidence='https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',files=files),indent=2))

if __name__=='__main__':main()
