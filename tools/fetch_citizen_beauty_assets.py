"""Fetch selected pinned CC0 MakeHuman graphical assets; execute no vendor code.

The existing ZIP directory fixes the source entries. Individual SHA256 and ZIP
CRC checks record and verify the downloaded material, mesh and proxy files.
"""
import concurrent.futures
import hashlib
import json
import struct
import time
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'ilustrasi/avatar-v2/farmer-v15-proportions/source/citizen-beauty'
DIRECTORY = ROOT / 'ilustrasi/avatar-v2/farmer-v14-jrpg/source/pack-directory.json'
URL = 'https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip'
PREFIXES = [
    'skins/young_asian_female/', 'skins/young_caucasian_female/',
    'eyelashes/eyelashes01/', 'eyebrows/eyebrow001/', 'hair/long01/', 'hair/braid01/',
    'hair/ponytail01/', 'hair/bob01/', 'hair/bob02/', 'hair/short04/',
]


def fetch_range(start, end):
    for attempt in range(3):
        try:
            request = urllib.request.Request(URL, headers={'Range': f'bytes={start}-{end}', 'User-Agent': 'Semesta-asset-build/1'})
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status != 206:
                    raise RuntimeError('Source must honor ZIP byte ranges')
                payload = response.read()
                content_range = response.headers.get('Content-Range', '')
                if not content_range.startswith(f'bytes {start}-'):
                    raise RuntimeError('Unexpected source byte range: ' + content_range)
                return payload
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def neutral_hair_assets():
    """Keep hair strand opacity/contrast, remove baked dye before runtime tinting."""
    import numpy as np
    from PIL import Image, ImageFilter
    result = []
    folder = SOURCE / 'derived'
    folder.mkdir(parents=True, exist_ok=True)
    for prefix in [p for p in PREFIXES if p.startswith(('hair/', 'eyebrows/'))]:
        name = prefix.split('/')[1]
        original = SOURCE / prefix / (name + ('_diffuse.png' if prefix.startswith('hair/') else '.png'))
        image = Image.open(original).convert('RGBA')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        rgba = np.asarray(image, dtype=np.float32) / 255
        luminance = rgba[:, :, :3] @ np.array([.2126, .7152, .0722])
        mask = rgba[:, :, 3] > .35
        reference = max(.05, float(np.quantile(luminance[mask], .92)))
        neutral = np.clip(luminance / reference * .82, .13, 1)
        operation = '1024px maximum; normalized grayscale strand albedo; original alpha preserved'
        if prefix.startswith('hair/'):
            # Vendor hair diffuse includes broad photographic highlights. A
            # weighted local mean removes that baked light before tinting; fine
            # strands, braid structure and transparency remain in the albedo.
            alpha = rgba[:, :, 3]
            weighted = Image.fromarray(np.round(luminance*alpha*255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(18))
            coverage = Image.fromarray(np.round(alpha*255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(18))
            local = np.asarray(weighted, dtype=np.float32)/np.maximum(np.asarray(coverage, dtype=np.float32), 1)
            detail = np.clip(luminance/np.maximum(local, .045), .24, 1.8)
            neutral = np.clip(.68*detail**.68, .20, .96)
            operation += '; alpha-weighted 18px local illumination removed; fine strand contrast preserved'
        neutral[rgba[:, :, 3] < .001] = 0
        rgba[:, :, :3] = neutral[:, :, None]
        path = folder / (name + '-neutral.png')
        Image.fromarray(np.round(rgba * 255).astype('uint8'), 'RGBA').save(path)
        data = path.read_bytes()
        result.append({'path': path.relative_to(SOURCE).as_posix(), 'source': original.relative_to(SOURCE).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'operation': operation})
    return result


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    entries = json.loads(DIRECTORY.read_text(encoding='utf-8'))
    manifest_path = SOURCE / 'manifest.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    known = {f['path']: f for f in previous.get('files', [])}

    def group(prefix):
        selected = [e for e in entries if e['name'].startswith(prefix) and e['size'] and not e['name'].endswith('.thumb')]
        if not selected:
            raise RuntimeError('Missing pinned asset: ' + prefix)
        if all((SOURCE/e['name']).exists() and e['name'] in known and hashlib.sha256((SOURCE/e['name']).read_bytes()).hexdigest() == known[e['name']]['sha256'] for e in selected):
            print('Verified cached', prefix, flush=True)
            return [known[e['name']] for e in selected]
        start = min(e['offset'] for e in selected)
        end = max(e['offset'] + e['compressed'] + 512 for e in selected)
        chunk = fetch_range(start, end)
        output = []
        for entry in selected:
            offset = entry['offset'] - start
            header = struct.unpack_from('<4s5H3I2H', chunk, offset)
            if header[0] != b'PK\x03\x04':
                raise RuntimeError('Invalid ZIP local header')
            begin = offset + 30 + header[-2] + header[-1]
            raw = chunk[begin:begin + entry['compressed']]
            raw = zlib.decompress(raw, -15) if entry['method'] == 8 else raw
            if len(raw) != entry['size'] or zlib.crc32(raw) & 0xffffffff != header[6]:
                raise RuntimeError('ZIP size/CRC mismatch: ' + entry['name'])
            path = SOURCE / entry['name']
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            output.append({'path': entry['name'], 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
        print('Fetched', prefix, flush=True)
        return output

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        files = sum(list(pool.map(group, PREFIXES)), [])
    manifest = {'version': 1, 'url': URL, 'license': 'CC0-1.0', 'licenseEvidence': 'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html', 'sourceDirectorySha256': hashlib.sha256(DIRECTORY.read_bytes()).hexdigest(), 'files': files, 'derivatives': neutral_hair_assets()}
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('CITIZEN_BEAUTY_ASSETS_READY', len(files), flush=True)


if __name__ == '__main__':
    main()
