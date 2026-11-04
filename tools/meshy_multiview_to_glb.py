#!/usr/bin/env python3
"""Optional Meshy multi-view-to-GLB adapter. No network call without explicit submit consent.

Preflight never calls the provider. `submit` requires both MESHY_API_KEY and
--confirm-credit-use. Generated GLBs can only be downloaded under V2 source/, not
directly into the live game or approved character directory.
"""
import argparse
import base64
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V2_SOURCE = (ROOT / 'assets' / 'avatar-v2' / 'source').resolve()
API_ROOT = 'https://api.meshy.ai/openapi/v1'
MAX_IMAGE_BYTES = 20 * 1024 * 1024


def validate_views(paths):
    if not 2 <= len(paths) <= 4:
        raise ValueError('Multi-view 3D needs 2–4 images of the same design. Put the straight front view first.')
    result = []
    for value in paths:
        path = Path(value).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(path)
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            raise ValueError(f'Unsupported image type: {path.name}')
        size = path.stat().st_size
        if size > MAX_IMAGE_BYTES:
            raise ValueError(f'{path.name} is over the documented 20 MiB image limit.')
        try:
            from PIL import Image
            with Image.open(path) as image:
                if image.width < 32 or image.height < 32 or image.width * image.height > 178_956_970:
                    raise ValueError(f'Image dimensions out of the documented range: {path.name} {image.size}')
                dimensions = list(image.size)
        except ImportError:
            dimensions = None
        result.append({'path': str(path), 'bytes': size, 'dimensions': dimensions, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    return result


def request(method, endpoint, payload=None):
    key = os.environ.get('MESHY_API_KEY', '').strip()
    if not key:
        raise RuntimeError('MESHY_API_KEY is not set. Keep the key in a protected environment variable; do not put it in code or command arguments.')
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f'{API_ROOT}{endpoint}', data=body, method=method,
        headers={'Authorization': f'Bearer {key}', 'Accept': 'application/json', **({'Content-Type': 'application/json'} if body else {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as error:
        message = error.read().decode('utf-8', 'replace')
        raise RuntimeError(f'Meshy returned HTTP {error.code}: {message[:1000]}') from None


def fetch_data_uri(item):
    suffix = Path(item['path']).suffix.lower()
    mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp'}[suffix]
    return f"data:{mime};base64,{base64.b64encode(Path(item['path']).read_bytes()).decode('ascii')}"


def safe_download_url(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ('assets.meshy.ai', 'assets.meshy.ai.cn'):
        raise ValueError('Refusing a GLB download URL outside the official Meshy asset host.')
    return url


def parser():
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest='command', required=True)
    preflight = commands.add_parser('preflight', help='Validate views locally. Does not call Meshy.')
    preflight.add_argument('--views', nargs='+', required=True)
    submit = commands.add_parser('submit', help='Create a paid/credit-consuming task after explicit confirmation.')
    submit.add_argument('--views', nargs='+', required=True)
    submit.add_argument('--confirm-credit-use', action='store_true', help='Required. Confirms that provider credits may be used for this generation.')
    status = commands.add_parser('status', help='Check an existing task (network request, no generation task).')
    status.add_argument('task_id')
    download = commands.add_parser('download', help='Download a completed generated GLB into V2 source only.')
    download.add_argument('task_id')
    download.add_argument('--output', required=True)
    return root


def main():
    args = parser().parse_args()
    if args.command in ('preflight', 'submit'):
        views = validate_views(args.views)
        if args.command == 'preflight':
            print(json.dumps({'provider': 'Meshy multi-image-to-3D', 'networkCalled': False, 'imageCount': len(views), 'frontView': views[0], 'otherViews': views[1:], 'parameters': {'ai_model': 'meshy-7.1', 'should_texture': True, 'enable_pbr': True, 'target_formats': ['glb']}, 'note': 'Review current provider credits and data/license terms before submitting.'}, indent=2))
            return 0
        if not args.confirm_credit_use:
            raise RuntimeError('No request sent. Add --confirm-credit-use only after deciding to spend the account credits.')
        payload = {'image_urls': [fetch_data_uri(item) for item in views], 'ai_model': 'meshy-7.1', 'should_texture': True, 'enable_pbr': True, 'target_formats': ['glb']}
        result = request('POST', '/multi-image-to-3d', payload)
        print(json.dumps({'provider': 'Meshy', 'task_id': result.get('result'), 'requestSent': True, 'creditUseConfirmed': True, 'imageCount': len(views)}, indent=2))
        return 0
    if args.command == 'status':
        result = request('GET', f"/multi-image-to-3d/{args.task_id}")
        # Remove expiring result URLs and other secrets from terminal output.
        model_urls = result.pop('model_urls', {})
        print(json.dumps({**result, 'hasGlbResult': bool(model_urls.get('glb'))}, indent=2))
        return 0
    if args.command == 'download':
        destination = Path(args.output).expanduser().resolve()
        if not destination.is_relative_to(V2_SOURCE) or destination.suffix.lower() != '.glb':
            raise ValueError(f'Generated files must remain in {V2_SOURCE}; do not download directly to live assets.')
        if destination.exists():
            raise FileExistsError(f'Refusing to overwrite {destination}')
        task = request('GET', f"/multi-image-to-3d/{args.task_id}")
        if task.get('status') != 'SUCCEEDED' or not task.get('model_urls', {}).get('glb'):
            raise RuntimeError(f"Task is not complete with a GLB: status={task.get('status')}")
        url = safe_download_url(task['model_urls']['glb'])
        with urllib.request.urlopen(url, timeout=180) as response:
            glb = response.read()
        if len(glb) < 20 or glb[:4] != b'glTF' or int.from_bytes(glb[4:8], 'little') != 2:
            raise RuntimeError('Downloaded output did not have a glTF 2.0 GLB header.')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(glb)
        print(json.dumps({'path': str(destination), 'bytes': len(glb), 'sha256': hashlib.sha256(glb).hexdigest(), 'status': 'unreviewed_source_only', 'providerCreditsReported': task.get('consumed_credits')}, indent=2))
        return 0
    return 2


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f'ERROR: {error}', file=sys.stderr)
        raise SystemExit(2)
