#!/usr/bin/env python3
"""Read-only structural audit for a glTF 2.0 binary character asset.

Uses only Python's standard library. Pillow is optional for embedded image details.
This does not judge artistic quality, UV overlap, or animated deformation.
"""
import argparse
import importlib.util
import json
import math
import os
import shutil
import subprocess
import struct
import sys
from collections import Counter
from pathlib import Path

from validate_character_glb import collect_bounds

COMPONENTS = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def read_glb(path):
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b'glTF':
        raise ValueError('Not a GLB file or header is truncated.')
    version, declared = struct.unpack_from('<II', data, 4)
    if version != 2 or declared != len(data):
        raise ValueError(f'Expected glTF 2.0 with exact file length; got version {version}, length {declared}/{len(data)}.')
    offset = 12
    document, binary = None, b''
    chunks = []
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError('Truncated GLB chunk header.')
        size, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        chunk = data[offset:offset + size]
        if len(chunk) != size:
            raise ValueError('Truncated GLB chunk body.')
        offset += size
        chunks.append({'type': 'JSON' if kind == 0x4E4F534A else 'BIN' if kind == 0x004E4942 else hex(kind), 'bytes': size})
        if kind == 0x4E4F534A:
            document = json.loads(chunk.decode('utf-8').rstrip('\x00 '))
        elif kind == 0x004E4942:
            binary = chunk
    if document is None:
        raise ValueError('Missing GLB JSON chunk.')
    return document, binary, chunks


def accessor_values(doc, binary, accessor_index):
    accessor = doc['accessors'][accessor_index]
    if 'bufferView' not in accessor or accessor.get('sparse'):
        return None
    code, width = COMPONENTS[accessor['componentType']]
    lanes = WIDTHS[accessor['type']]
    view = doc['bufferViews'][accessor['bufferView']]
    stride = view.get('byteStride', lanes * width)
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    fmt = '<' + code * lanes
    result = []
    for index in range(accessor['count']):
        result.append(struct.unpack_from(fmt, binary, start + index * stride))
    return result


def triangle_count(primitive, doc):
    attributes = primitive.get('attributes', {})
    positions = doc['accessors'][attributes['POSITION']]['count'] if 'POSITION' in attributes else 0
    count = doc['accessors'][primitive['indices']]['count'] if 'indices' in primitive else positions
    mode = primitive.get('mode', 4)
    return count // 3 if mode == 4 else max(0, count - 2) if mode in (5, 6) else 0


def image_report(doc, binary):
    try:
        from PIL import Image
    except ImportError:
        Image = None
    images = []
    for index, image in enumerate(doc.get('images', [])):
        item = {'index': index, 'name': image.get('name'), 'mimeType': image.get('mimeType'), 'embedded': 'bufferView' in image, 'uri': image.get('uri')}
        if Image and 'bufferView' in image:
            view = doc['bufferViews'][image['bufferView']]
            start = view.get('byteOffset', 0)
            raw = binary[start:start + view['byteLength']]
            try:
                decoded = Image.open(__import__('io').BytesIO(raw))
                item.update({'format': decoded.format, 'width': decoded.width, 'height': decoded.height, 'channels': len(decoded.getbands()), 'bands': list(decoded.getbands()), 'mode': decoded.mode, 'bytes': len(raw)})
            except Exception as error:
                item['decodeError'] = str(error)
        images.append(item)
    return images


def inspect(path):
    doc, binary, chunks = read_glb(path)
    accessors = doc.get('accessors', [])
    meshes = []
    primitive_count = triangle_total = vertex_total = 0
    skin_primitive_count = normal_count = uv_count = 0
    uv_samples = []
    uv_vertices = uv_outside = 0
    weight_stats = Counter()
    for mesh in doc.get('meshes', []):
        primitive_rows = []
        mesh_triangles = mesh_vertices = 0
        for primitive in mesh.get('primitives', []):
            attrs = primitive.get('attributes', {})
            tris = triangle_count(primitive, doc)
            verts = accessors[attrs['POSITION']]['count'] if 'POSITION' in attrs else 0
            primitive_count += 1
            triangle_total += tris
            vertex_total += verts
            mesh_triangles += tris
            mesh_vertices += verts
            is_skinned = 'JOINTS_0' in attrs and 'WEIGHTS_0' in attrs
            skin_primitive_count += int(is_skinned)
            normal_count += int('NORMAL' in attrs)
            uv_count += int('TEXCOORD_0' in attrs)
            row = {'triangles': tris, 'vertices': verts, 'material': primitive.get('material'), 'skinned': is_skinned, 'hasUV': 'TEXCOORD_0' in attrs, 'hasNormals': 'NORMAL' in attrs}
            if 'TEXCOORD_0' in attrs:
                values = accessor_values(doc, binary, attrs['TEXCOORD_0'])
                if values:
                    low = [min(v[i] for v in values) for i in range(2)]
                    high = [max(v[i] for v in values) for i in range(2)]
                    outside = sum(any(c < -1e-4 or c > 1.0001 for c in uv[:2]) for uv in values)
                    uv_vertices += len(values)
                    uv_outside += outside
                    row['uvBounds'] = [list(map(lambda n: round(n, 4), low)), list(map(lambda n: round(n, 4), high))]
                    row['uvOutside01VertexRatio'] = round(outside / len(values), 5)
                    uv_samples.append(row['uvBounds'])
            if is_skinned:
                values = accessor_values(doc, binary, attrs['WEIGHTS_0'])
                if values:
                    for weights in values:
                        positive = sum(value > 1e-5 for value in weights)
                        weight_stats[str(positive)] += 1
                        if sum(weights) < .99:
                            weight_stats['sumBelow0.99'] += 1
            primitive_rows.append(row)
        meshes.append({'name': mesh.get('name', '(unnamed)'), 'primitives': len(mesh.get('primitives', [])), 'vertices': mesh_vertices, 'triangles': mesh_triangles, 'primitiveDetails': primitive_rows})

    nodes = doc.get('nodes', [])
    skin_reports = []
    for skin in doc.get('skins', []):
        joints = skin.get('joints', [])
        parents = {}
        for parent_index, node in enumerate(nodes):
            for child in node.get('children', []):
                parents[child] = parent_index
        skin_reports.append({
            'name': skin.get('name'), 'jointCount': len(joints),
            'bones': [{'name': nodes[index].get('name', '(unnamed)'), 'parent': nodes[parents[index]].get('name') if index in parents else None} for index in joints],
            'inverseBindMatricesAccessor': skin.get('inverseBindMatrices'),
            'skeletonRoot': nodes[skin['skeleton']].get('name') if 'skeleton' in skin else None,
        })
    animations = []
    for animation in doc.get('animations', []):
        paths = Counter()
        targets = Counter()
        max_time = 0.0
        for sampler in animation.get('samplers', []):
            index = sampler.get('input')
            if index is not None and 'max' in accessors[index]:
                max_time = max(max_time, max(accessors[index]['max']))
        for channel in animation.get('channels', []):
            target = channel.get('target', {})
            path_name = target.get('path', '?')
            bone = nodes[target['node']].get('name', '(unnamed)') if 'node' in target else '(no node)'
            paths[path_name] += 1
            targets[bone] += 1
        root_translation = any(channel.get('target', {}).get('path') == 'translation' and nodes[channel.get('target', {}).get('node', -1)].get('name') in ('root', 'Root', 'Armature') for channel in animation.get('channels', []) if 0 <= channel.get('target', {}).get('node', -1) < len(nodes))
        animations.append({'name': animation.get('name', '(unnamed)'), 'durationSeconds': round(max_time, 4), 'channels': len(animation.get('channels', [])), 'targetPaths': dict(paths), 'targetNames': dict(targets), 'hasRootTranslation': root_translation, 'hasScaleTracks': bool(paths.get('scale'))})
    materials = []
    for material in doc.get('materials', []):
        pbr = material.get('pbrMetallicRoughness', {})
        materials.append({'name': material.get('name', '(unnamed)'), 'baseColorFactor': pbr.get('baseColorFactor'), 'baseColorTexture': pbr.get('baseColorTexture'), 'metallicFactor': pbr.get('metallicFactor', 1), 'roughnessFactor': pbr.get('roughnessFactor', 1), 'metallicRoughnessTexture': pbr.get('metallicRoughnessTexture'), 'normalTexture': material.get('normalTexture'), 'occlusionTexture': material.get('occlusionTexture'), 'emissiveTexture': material.get('emissiveTexture')})
    images = image_report(doc, binary)
    image_mem = sum(item.get('bytes', 0) for item in images)
    bins = Counter()
    for mesh in meshes:
        tris = mesh['triangles']
        bucket = '0-99' if tris < 100 else '100-499' if tris < 500 else '500-1,999' if tris < 2000 else '2,000-9,999' if tris < 10000 else '10,000+'
        bins[bucket] += 1
    package = json.loads(Path('package.json').read_text(encoding='utf-8')) if Path('package.json').is_file() else {}
    existing_assets = []
    for relative in ('public/models/characters/warga-chibi-base.glb', 'public/models/characters/warga-chibi-base.blend', 'public/models/characters/gallery/raka-warga-01.glb', 'public/models/characters/gallery/raka-warga-01.png', 'public/models/characters/gallery/karakter-harvestmoon-warga-3d.png'):
        candidate = Path(relative)
        if candidate.is_file():
            existing_assets.append({'path': relative, 'bytes': candidate.stat().st_size, 'kind': candidate.suffix.lower()})
    blender = shutil.which('blender') or os.environ.get('BLENDER_EXECUTABLE')
    blender_version = None
    if blender:
        try:
            blender_version = subprocess.run([blender, '--version'], capture_output=True, text=True, timeout=15, check=False).stdout.splitlines()[0]
        except (OSError, subprocess.SubprocessError, IndexError):
            blender_version = 'executable found; version query failed'
    environment = {
        'python': sys.version.split()[0], 'blenderExecutable': blender, 'blenderVersion': blender_version,
        'nodeExecutable': shutil.which('node'), 'npmExecutable': shutil.which('npm'),
        'pillowAvailable': importlib.util.find_spec('PIL') is not None,
        'bpyAvailableInHostPython': importlib.util.find_spec('bpy') is not None,
        'threeDependency': package.get('dependencies', {}).get('three'),
        'viteDependency': package.get('devDependencies', {}).get('vite'),
        'configured3dServiceCredentialsFound': False,
        'meshyApiKeyConfigured': bool(os.environ.get('MESHY_API_KEY', '').strip()),
        'note': 'An optional, credit-gated Meshy multi-view adapter is in tools/meshy_multiview_to_glb.py. No Meshy key was found. No paid generation request was made.'
    }
    return {
        'file': str(path), 'bytes': path.stat().st_size, 'validGlbV2Header': True, 'chunks': chunks,
        'environment': environment, 'existingCharacterAssets': existing_assets,
        'worldBounds': collect_bounds(doc), 'meshTriangleDistribution': dict(bins),
        'sceneNodes': len(nodes), 'meshObjects': len(meshes), 'primitiveCount': primitive_count,
        'triangleCount': triangle_total, 'vertexCount': vertex_total,
        'skinnedPrimitives': skin_primitive_count, 'unskinnedPrimitives': primitive_count - skin_primitive_count,
        'normalPrimitives': normal_count, 'uvPrimitives': uv_count, 'uvAccessorsComputed': len(uv_samples),
        'uvBoundsAcrossPrimitives': [[round(min(pair[0][axis] for pair in uv_samples), 5) for axis in range(2)], [round(max(pair[1][axis] for pair in uv_samples), 5) for axis in range(2)]] if uv_samples else None,
        'uvVertices': uv_vertices, 'uvOutside01Vertices': uv_outside,
        'weightInfluenceHistogram': dict(weight_stats), 'skins': skin_reports,
        'materials': materials, 'materialCount': len(materials), 'images': images,
        'embeddedImageBytes': image_mem, 'animations': animations,
        'largestMeshes': sorted([{'name': m['name'], 'triangles': m['triangles'], 'primitives': m['primitives']} for m in meshes], key=lambda item: item['triangles'], reverse=True)[:20],
    }


def markdown(report):
    lines = [
        '# SEMESTA Avatar V2 — source asset audit', '',
        f"- Source: `{report['file']}` ({report['bytes']:,} bytes); GLB v2 header/chunks parse successfully.",
        f"- Host: Python {report['environment']['python']}; Blender runtime: {report['environment']['blenderVersion'] or 'not available'} ({report['environment']['blenderExecutable'] or 'no executable on PATH'}); Node/npm: {report['environment']['nodeExecutable'] or 'not installed'} / {report['environment']['npmExecutable'] or 'not installed'}.",
        f"- Runtime package versions: Three.js `{report['environment']['threeDependency']}`, Vite `{report['environment']['viteDependency']}`. Pillow available: {report['environment']['pillowAvailable']}; host `bpy`: {report['environment']['bpyAvailableInHostPython']}.",
        f"- Character asset world bounds (x,y,z): `{report['worldBounds']}`.",
        '- Existing character files: ' + ', '.join(f"`{item['path']}` ({item['bytes']:,} bytes, {item['kind']})" for item in report['existingCharacterAssets']) + '.',
        f"- Scene nodes / mesh objects / draw primitives: {report['sceneNodes']} / {report['meshObjects']} / {report['primitiveCount']}.",
        f"- Triangles / vertices: {report['triangleCount']:,} / {report['vertexCount']:,}.",
        f"- Skinned / unskinned primitives: {report['skinnedPrimitives']} / {report['unskinnedPrimitives']}.",
        f"- GLB skins / joints: {len(report['skins'])} / {report['skins'][0]['jointCount'] if report['skins'] else 0}; vertex influence histogram: `{report['weightInfluenceHistogram']}`.",
        f"- Primitive UV / normals: {report['uvPrimitives']} / {report['normalPrimitives']}.",
        f"- Computed UV range across primitives: `{report['uvBoundsAcrossPrimitives']}`; vertices outside [0,1]: {report['uvOutside01Vertices']}/{report['uvVertices']}.",
        f"- Materials / embedded images / embedded image bytes: {report['materialCount']} / {len(report['images'])} / {report['embeddedImageBytes']:,}.",
        f"- Bone count: {report['skins'][0]['jointCount'] if report['skins'] else 0}.",
        '', '## Geometry distribution (largest GLB mesh objects)', '', '| Mesh object | Triangles | Primitives |', '|---|---:|---:|',
    ]
    lines += [f"| {item['name']} | {item['triangles']:,} | {item['primitives']} |" for item in report['largestMeshes']]
    lines += ['', 'Mesh-object triangle bins:', '']
    lines += [f'- {bucket}: {count} mesh objects' for bucket, count in report['meshTriangleDistribution'].items()]
    lines += ['', '## Repository/runtime format', '',
        '- Runtime uses vanilla Three.js (`three ^0.187.0`) and `GLTFLoader`; skinned instances use `SkeletonUtils.clone` and independent `AnimationMixer` instances.',
        '- Avatar Studio mixes static preset records with optional `modelFile` GLB and `thumbnail` image fields. User-created palette presets are configuration JSON stored through the existing `avatar_library` API; those are not independent modular mesh assets.',
        '- The live game currently loads the legacy `warga-chibi-base.glb` as the base model. V2 manifests are intentionally separate and not runtime-loaded.',
        '- `assets/game/` is the current Vite deployment directory; the character source files are under `public/models/characters/`.',
        '', '## Skeleton', '', '```text']
    if report['skins']:
        lines += [f"{bone['name']}" + (f"  (parent: {bone['parent']})" if bone['parent'] else '  (root)') for bone in report['skins'][0]['bones']]
    else:
        lines.append('(no skin)')
    lines += ['```', '', '## Textures and materials', '', '| Image | Resolution | Channels | Format | Bytes |', '|---|---:|---:|---|---:|']
    for item in report['images']:
        resolution = f"{item.get('width', '?')}×{item.get('height', '?')}"
        lines.append(f"| {item.get('name') or item['index']} | {resolution} | {item.get('channels', '?')} ({'/'.join(item.get('bands', []))}) | {item.get('format', item.get('mimeType', '?'))} | {item.get('bytes', '?')} |")
    if report['images']:
        dimensions = sorted({(item.get('width'), item.get('height'), item.get('mode')) for item in report['images']})
        image_summary = f"Embedded images report dimensions/modes {dimensions}."
    else:
        image_summary = 'This GLB contains no embedded image files.'
    has_base_images = any(material['baseColorTexture'] for material in report['materials'])
    has_normal = any(material['normalTexture'] for material in report['materials'])
    has_ao = any(material['occlusionTexture'] for material in report['materials'])
    has_mr = any(material['metallicRoughnessTexture'] for material in report['materials'])
    lines += ['', f'Observed: {image_summary} Base-color image references present: {has_base_images}; normal map: {has_normal}; AO map: {has_ao}; metallic-roughness map: {has_mr}. Materials not backed by image maps use PBR factors.', '', '## Animation clips', '', '| Clip | Duration | Channels | Target paths |', '|---|---:|---:|---|']
    for animation in report['animations']:
        root = 'yes' if animation['hasRootTranslation'] else 'no'
        lines.append(f"| {animation['name']} | {animation['durationSeconds']}s | {animation['channels']} | {', '.join(f'{k}: {v}' for k, v in animation['targetPaths'].items())}; root translation: {root}; scale tracks: {'yes' if animation['hasScaleTracks'] else 'no'} |")
    lines += ['', 'Current required clips not found: `Run`, `Interact`, `Wave`, `Hoe`, `Watering`, `Harvest`, `Carry`, `Sit`. The two existing clips target translation/scale channels; the report distinguishes pelvis/root translation where named as `root`, `Root`, or `Armature`. Inspect root motion and bone scaling in Blender before using them with game-driven movement.', '', '## Visual and provenance assessment', '',
        '- Manually inspected `public/models/characters/warga-chibi-preview.png` and `public/models/characters/gallery/raka-warga-01.png` in the repository. They show separate, rounded primitive parts with visible gaps at shoulders, wrists, hips/legs, and neck; the torso and head silhouettes are simple, material detail is low, and the pose is stiff. These images are renders, not 3D source assets.',
        '- `tools/create_chibi_avatar.py` explicitly calls Blender primitive sphere, cube, cone, torus, and cylinder creation operators and assigns each part wholly to one bone before joining by category. The GLB weight scan reports all 65,474 vertices with exactly one positive bone influence; this rigid per-part weighting explains hard seams and poor bending at joints. The rig has no dedicated pelvis, clavicle, toe, finger, or facial-control bones. It is a prototype generator, not a suitable production source mesh or an approved path for V2 final characters.',
        '- The existing generator starts by deleting the current Blender scene and writes directly to the legacy `.blend`/`.glb` paths. It was not run. Do not use it as the V2 pipeline.',
        '- The V2 pipeline does not run this generator and does not modify or overwrite either existing GLB/Blend file.',
        '- AI 3D: an optional Meshy multi-view API adapter is in `tools/meshy_multiview_to_glb.py`. No Meshy API key was found. Preflight is local-only; submission requires explicit credit confirmation and was not called.', '', '## Not measurable from this host-only audit', '',
        'UV coordinate bounds are computed from GLB accessors, but UV island packing, texel density, overlap, seam placement, disconnected component intent, facial appeal, skin-weight quality, and animation deformation require visual Blender review. The available portable Blender was used to prove structural import/export/reimport only; no visual or deformation approval is implied.', '',
        '## Production decision', '', '**Reject as a premium source mesh.** The existing GLB is structurally loadable but was built from primitives and the visual review does not pass the requested target. `raka-warga-01.glb` is exported from the same Blender source, not an independent sculpted source. The gallery PNG is 2D only. No suitable external source mesh or configured 3D generation credential was found, so mesh-dependent V2 production is stopped pending a licensed source character.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', default='public/models/characters/warga-chibi-base.glb')
    parser.add_argument('--markdown', default='docs/AVATAR_V2_SOURCE_AUDIT.md')
    parser.add_argument('--json', default='assets/avatar-v2/reports/source-audit.json')
    args = parser.parse_args()
    report = inspect(Path(args.input))
    md, js = Path(args.markdown), Path(args.json)
    md.parent.mkdir(parents=True, exist_ok=True)
    js.parent.mkdir(parents=True, exist_ok=True)
    md.write_text(markdown(report), encoding='utf-8')
    js.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Wrote {md} and {js}; structural parse passed, premium-source decision: REJECT.')


if __name__ == '__main__':
    main()
