#!/usr/bin/env python3
"""Validate a GLB character without requiring Blender or third-party packages."""
import argparse
import json
import math
import struct
from pathlib import Path

EXPECTED = ('Idle', 'Walk', 'Run', 'Interact', 'Wave', 'Hoe', 'Watering', 'Harvest')
PBR_SLOTS = ('baseColorTexture', 'metallicRoughnessTexture')


def glb_json(path):
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b'glTF':
        raise ValueError('Header GLB tidak valid.')
    version, declared = struct.unpack_from('<II', data, 4)
    if version != 2 or declared != len(data):
        raise ValueError(f'GLB harus versi 2 dengan panjang header sesuai file (versi={version}, panjang={declared}/{len(data)}).')
    offset = 12
    document = None
    chunks = []
    while offset < len(data):
        if offset + 8 > len(data):
            raise ValueError('Chunk GLB terpotong.')
        size, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        chunk = data[offset:offset + size]
        if len(chunk) != size:
            raise ValueError('Panjang chunk GLB tidak cocok.')
        offset += size
        chunks.append((kind, size))
        if kind == 0x4E4F534A:
            document = json.loads(chunk.decode('utf-8').rstrip('\x00 '))
    if document is None:
        raise ValueError('Chunk JSON glTF tidak ditemukan.')
    return document, chunks


def compose(node):
    if 'matrix' in node:
        return node['matrix']
    tx, ty, tz = node.get('translation', (0, 0, 0))
    sx, sy, sz = node.get('scale', (1, 1, 1))
    x, y, z, w = node.get('rotation', (0, 0, 0, 1))
    xx, yy, zz = x*x, y*y, z*z
    xy, xz, yz = x*y, x*z, y*z
    wx, wy, wz = w*x, w*y, w*z
    # glTF matrices are column-major.
    return [
        (1-2*(yy+zz))*sx, (2*(xy+wz))*sx, (2*(xz-wy))*sx, 0,
        (2*(xy-wz))*sy, (1-2*(xx+zz))*sy, (2*(yz+wx))*sy, 0,
        (2*(xz+wy))*sz, (2*(yz-wx))*sz, (1-2*(xx+yy))*sz, 0,
        tx, ty, tz, 1,
    ]


def multiply(a, b):
    return [sum(a[k*4+r] * b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]


def point(m, x, y, z):
    v = (x, y, z, 1)
    out = [sum(m[c*4+r] * v[c] for c in range(4)) for r in range(4)]
    return tuple(out[i] / out[3] if out[3] else out[i] for i in range(3))


def collect_bounds(doc):
    nodes = doc.get('nodes', [])
    accessors = doc.get('accessors', [])
    low = [math.inf, math.inf, math.inf]
    high = [-math.inf, -math.inf, -math.inf]
    roots = doc.get('scenes', [{}])[doc.get('scene', 0)].get('nodes', []) if doc.get('scenes') else []
    def visit(index, parent):
        node = nodes[index]
        matrix = multiply(parent, compose(node))
        if 'mesh' in node:
            for primitive in doc.get('meshes', [])[node['mesh']].get('primitives', []):
                accessor_index = primitive.get('attributes', {}).get('POSITION')
                if accessor_index is None:
                    continue
                accessor = accessors[accessor_index]
                if 'min' not in accessor or 'max' not in accessor:
                    continue
                pmin, pmax = accessor['min'], accessor['max']
                for x in (pmin[0], pmax[0]):
                    for y in (pmin[1], pmax[1]):
                        for z in (pmin[2], pmax[2]):
                            pos = point(matrix, x, y, z)
                            for axis in range(3):
                                low[axis] = min(low[axis], pos[axis])
                                high[axis] = max(high[axis], pos[axis])
        for child in node.get('children', []):
            visit(child, matrix)
    identity = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
    for root in roots:
        visit(root, identity)
    if any(math.isinf(value) for value in low + high):
        return None
    return {'min': [round(x, 3) for x in low], 'max': [round(x, 3) for x in high], 'size': [round(high[i]-low[i], 3) for i in range(3)]}


def inspect(path):
    doc, chunks = glb_json(path)
    meshes = doc.get('meshes', [])
    primitives = [primitive for mesh in meshes for primitive in mesh.get('primitives', [])]
    accessors = doc.get('accessors', [])
    triangles = 0
    vertices = 0
    uv_primitives = 0
    normal_primitives = 0
    skinned_primitives = 0
    for primitive in primitives:
        attributes = primitive.get('attributes', {})
        mode = primitive.get('mode', 4)
        pos = accessors[attributes['POSITION']]['count'] if 'POSITION' in attributes else 0
        vertices += pos
        count = accessors[primitive['indices']]['count'] if 'indices' in primitive else pos
        triangles += count // 3 if mode == 4 else max(0, count - 2) if mode in (5, 6) else 0
        uv_primitives += int('TEXCOORD_0' in attributes)
        normal_primitives += int('NORMAL' in attributes)
        skinned_primitives += int('JOINTS_0' in attributes and 'WEIGHTS_0' in attributes)
    joints = max((len(skin.get('joints', [])) for skin in doc.get('skins', [])), default=0)
    images = doc.get('images', [])
    materials = doc.get('materials', [])
    textured_materials = sum(bool(material.get('pbrMetallicRoughness', {}).get('baseColorTexture')) for material in materials)
    materials_with_normal = sum('normalTexture' in material for material in materials)
    clips = []
    for animation in doc.get('animations', []):
        duration = 0.0
        for sampler in animation.get('samplers', []):
            index = sampler.get('input')
            if index is not None and 'max' in accessors[index]:
                duration = max(duration, max(accessors[index]['max']))
        clips.append({'name': animation.get('name') or '(tanpa nama)', 'duration': round(duration, 3), 'channels': len(animation.get('channels', []))})
    available = {clip['name'].lower() for clip in clips}
    report = {
        'file': str(path), 'bytes': path.stat().st_size, 'glbVersion': 2,
        'nodes': len(doc.get('nodes', [])), 'meshes': len(meshes), 'primitives': len(primitives),
        'vertices': vertices, 'triangles': triangles, 'skinnedPrimitives': skinned_primitives,
        'skins': len(doc.get('skins', [])), 'bones': joints, 'materials': len(materials),
        'texturedMaterials': textured_materials, 'materialsWithNormalMap': materials_with_normal,
        'images': len(images), 'uvPrimitives': uv_primitives, 'normalPrimitives': normal_primitives,
        'clips': clips, 'missingExpectedClips': [name for name in EXPECTED if name.lower() not in available],
        'bounds': collect_bounds(doc), 'chunks': [{'type': 'JSON' if kind == 0x4E4F534A else 'BIN' if kind == 0x004E4942 else hex(kind), 'bytes': size} for kind, size in chunks],
    }
    warnings = []
    if not primitives:
        warnings.append('Tidak ada primitive mesh.')
    if not skinned_primitives:
        warnings.append('Tidak ada mesh dengan JOINTS_0 dan WEIGHTS_0.')
    if triangles > 35000:
        warnings.append(f'{triangles:,} segitiga melampaui rentang awal player 15k–35k yang tercantum di task.md; ukur ulang pada perangkat sasaran.')
    if len(primitives) > 50:
        warnings.append(f'{len(primitives)} primitive menambah draw call potensial; sebagian node outfit disembunyikan per racikan.')
    if materials_with_normal == 0:
        warnings.append('Tidak ada normal map material; detail mikro saat ini mengandalkan base color/roughness.')
    if not clips:
        warnings.append('Tidak ada klip animasi.')
    elif report['missingExpectedClips']:
        warnings.append('Klip belum tersedia: ' + ', '.join(report['missingExpectedClips']) + '.')
    source = Path('tools/create_chibi_avatar.py')
    if path.name == 'warga-chibi-base.glb' and source.exists() and 'primitive_uv_sphere_add' in source.read_text(errors='ignore'):
        warnings.append('Riwayat generator lokal membuat bagian tubuh dari primitive Blender lalu menggabungkannya; GLB valid dan terskeleton, tetapi belum memenuhi target karakter produksi premium pada task.md.')
    bounds_min_y = report['bounds']['min'][1] if report['bounds'] else None
    report['groundClearance'] = bounds_min_y
    if bounds_min_y is not None and abs(bounds_min_y) > 0.05:
        warnings.append(f'Batas bawah bbox berada pada y={bounds_min_y}; periksa apakah kaki menapak di y=0 dalam preview.')
    if uv_primitives < len(primitives):
        warnings.append(f'{len(primitives) - uv_primitives} primitive tidak memiliki TEXCOORD_0.')
    if normal_primitives < len(primitives):
        warnings.append(f'{len(primitives) - normal_primitives} primitive tidak memiliki NORMAL.')
    report['warnings'] = warnings
    report['productionReady'] = bool(
        primitives and skinned_primitives == len(primitives) and joints >= 1 and clips
        and textured_materials and triangles <= 35000 and len(primitives) <= 50
        and not report['missingExpectedClips'] and bounds_min_y is not None and abs(bounds_min_y) <= 0.05
    )
    return report


def markdown(report):
    clips = ', '.join(f"`{x['name']}` ({x['duration']}s, {x['channels']} channel)" for x in report['clips']) or 'Tidak ada.'
    bounds = report['bounds'] or 'Tidak dapat dihitung.'
    lines = [
        '# Audit aset karakter Semesta', '',
        f"- Status file GLB: **valid glTF 2.0** ({report['bytes']:,} byte).",
        f"- Status produksi: **{'lulus gate awal' if report['productionReady'] else 'belum siap sebagai aset premium'}**.",
        f"- Mesh/node/primitive: {report['meshes']} / {report['nodes']} / {report['primitives']}.",
        f"- Segitiga/vertex: {report['triangles']:,} / {report['vertices']:,}.",
        f"- Skinned primitive / skin / tulang: {report['skinnedPrimitives']} / {report['skins']} / {report['bones']}.",
        f"- Material / material ber-base-color texture / normal map / gambar: {report['materials']} / {report['texturedMaterials']} / {report['materialsWithNormalMap']} / {report['images']}.",
        f"- Primitive dengan UV / normal: {report['uvPrimitives']} / {report['normalPrimitives']}.",
        f"- Klip animasi: {clips}.",
        f"- Bounding box dunia (x, y, z): `{bounds}`.", '', '## Temuan', '',
        f"- Jarak bbox bawah dari y=0: `{report['groundClearance']}` unit (indikator kasar; bukan pemeriksaan kontak kaki saat animasi).",
    ]
    lines += [f'- {warning}' for warning in report['warnings']] or ['- Tidak ada peringatan pada gate awal.']
    lines += ['', '## Batas validasi', '', 'Laporan ini memeriksa struktur GLB, bukan penilaian artistik otomatis. Ekspor valid dan memiliki skeleton tidak otomatis berarti model berkualitas premium. Validasi visual akhir tetap perlu ditinjau pada preview 360° dan perangkat sasaran.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', default='public/models/characters/warga-chibi-base.glb')
    parser.add_argument('--report', default='docs/CHARACTER_ASSET_VALIDATION.md')
    args = parser.parse_args()
    path = Path(args.input)
    report = inspect(path)
    output = Path(args.report)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown(report), encoding='utf-8')
    print(markdown(report))
    print(f'\nLaporan ditulis: {output}')
    return 0 if report['productionReady'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
