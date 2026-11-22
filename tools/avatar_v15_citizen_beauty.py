"""Native Blender beauty pass using pinned CC0 MakeHuman graphical sources.

Keeps the approved rig, rest matrices and actions unchanged. Hair is exported as
ordinary skinned geometry with standard glTF materials, shared by game/portraits.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

from avatar_v14_common import ROOT, MH, finish, material, mesh, obj_data, smooth, target

SOURCE = ROOT / 'ilustrasi/avatar-v2/farmer-v15-proportions/source/citizen-beauty'
HAIRS = {
    'longStraight': 'long01',
    'longWavy': 'long01',
    'longPonytail': 'ponytail01',
    'braided': 'braid01',
    'bobSoft': 'bob02',
    'shortModern': 'short04',
}


def _snapshot_geometry(obj, transform):
    """Apply the same basis displacement to every morph; repeated runs are exact."""
    keys = list(obj.data.shape_keys.key_blocks) if obj.data.shape_keys else []
    items = [(key.name, key.data) for key in keys] if keys else [('Basis', obj.data.vertices)]
    saved = {}
    for name, vertices in items:
        attribute = obj.data.attributes.get('beautyOriginal_' + name)
        if not attribute:
            attribute = obj.data.attributes.new('beautyOriginal_' + name, 'FLOAT_VECTOR', 'POINT')
            for vertex, datum in zip(vertices, attribute.data):
                datum.vector = vertex.co
        saved[name] = [datum.vector.copy() for datum in attribute.data]
    basis = saved[items[0][0]]
    offsets = [transform(point) - point for point in basis]
    for name, vertices in items:
        for index, vertex in enumerate(vertices):
            vertex.co = saved[name][index] + offsets[index]
    if keys:
        for vertex, point in zip(obj.data.vertices, keys[0].data):
            vertex.co = point.co
    obj.data.update()


def _female_face(rig, profile):
    if profile['sex'] != 'female':
        return
    skin = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.get('avatarSlot') == 'skin' and not o.get('authoringOnly'))
    eyes = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.get('avatarSlot') == 'eyes' and not o.get('v15Variation'))
    original_eyes = eyes.data.attributes.get('beautyOriginal_Basis')
    eye_points = [datum.vector for datum in original_eyes.data] if original_eyes else [v.co for v in eyes.data.vertices]
    eye_z = sum(v.z for v in eye_points) / len(eye_points)
    eye_y = min(v.y for v in eye_points)
    unit = profile['height'] / 1.78

    def sculpt(point):
        p = point.copy()
        front = 1 - smooth(eye_y + .018*unit, eye_y + .105*unit, p.y)
        jaw = math.exp(-((p.z-(eye_z-.084*unit))/(.035*unit))**2)*front
        nose = math.exp(-(p.x/(.018*unit))**2)*math.exp(-((p.z-(eye_z-.029*unit))/(.027*unit))**2)*front
        brow = math.exp(-((p.z-(eye_z+.018*unit))/(.014*unit))**2)*math.exp(-((abs(p.x)-.036*unit)/(.027*unit))**2)*front
        eyelid = math.exp(-((abs(p.x)-.036*unit)/(.029*unit))**4)*math.exp(-((p.z-eye_z)/(.019*unit))**4)*front
        # Small continuous changes retain a realistic adult face. Applying the
        # identical displacement to eyes, lids, mouth and every morph preserves
        # the existing expression deltas and avoids seams when she speaks.
        p.x *= 1 - .092*jaw - .04*nose
        p.y += .0018*unit*nose + .0018*unit*brow
        p.z += (p.z-eye_z)*.075*eyelid
        brow_arch = math.exp(-((abs(point.x)-.046*unit)/(.020*unit))**2)
        p.z += .0022*unit*brow*brow_arch
        mouth_corner = math.exp(-((abs(point.x)-.026*unit)/(.010*unit))**2)*math.exp(-((point.z-(eye_z-.061*unit))/(.011*unit))**2)*front
        p.z += .0009*unit*mouth_corner
        return p

    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH' or obj.get('v15CitizenBeauty'):
            continue
        if obj.name == 'Anatomy_Source' or obj.get('avatarSlot') in ['skin', 'eyes', 'brows', 'teeth']:
            _snapshot_geometry(obj, sculpt)
            obj['v15FemaleBeautySculpt'] = True
    # Thinner brows retain their original UVs and the full expression contract.
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or obj.get('avatarSlot') != 'brows':
            continue
        basis = obj.data.attributes.get('beautyOriginal_Basis')
        source = [datum.vector.copy() for datum in basis.data] if basis else [v.co.copy() for v in obj.data.vertices]
        centres = {side: sum(p.z for p in source if (p.x >= 0) == (side > 0))/sum(1 for p in source if (p.x >= 0) == (side > 0)) for side in [-1, 1]}
        def brow_shape(point):
            p = sculpt(point)
            centre = centres[1 if p.x >= 0 else -1]
            p.z = centre + (p.z-centre)*.82
            return p
        _snapshot_geometry(obj, brow_shape)


def _anatomy_map(rig, profile):
    """Map original body IDs exactly; nearby displacement fits helper lashes."""
    original, _, faces = obj_data(MH / '3dobjs/base.obj')
    body_ids = sorted({i for group, indices, _ in faces if group == 'body' for i in indices})
    anatomy = bpy.data.objects.get('Anatomy_Source')
    if not anatomy or len(anatomy.data.vertices) != len(body_ids):
        raise RuntimeError('Beauty fitting requires the unmerged full Anatomy_Source')
    fitted = {index: vertex.co.copy() for index, vertex in zip(body_ids, anatomy.data.vertices)}
    # Reconstruct pre-profile source coordinates for non-body helper vertices.
    sex = profile['sex']
    macro = ROOT/'ilustrasi/avatar-v2/farmer-v15-proportions/source' if sex == 'female' else MH/'targets/macrodetails'
    points = [v.copy() for v in original]
    for ethnicity, weight in [('asian', .55), ('caucasian', .30), ('african', .15)]:
        delta = target(macro/f'{ethnicity}-{sex}-young.target', len(points))
        points = [p+d*weight for p, d in zip(points, delta)]
    delta = target(macro/f'universal-{sex}-young-maxmuscle-averageweight.target', len(points))
    points = [p+d*(.22 if sex == 'female' else .38) for p, d in zip(points, delta)]
    bottom = min(points[i].y for i in body_ids)
    scale = 1.78/(max(points[i].y for i in body_ids)-bottom)
    before = [Vector((p.x*scale, -p.z*scale, (p.y-bottom)*scale+.025)) for p in points]
    tree = KDTree(len(body_ids))
    for index in body_ids:
        tree.insert(before[index], index)
    tree.balance()
    head_scale = profile.get('headScale', 1.14)
    height_scale = profile['height']/(1.78+.270*(head_scale-1))

    def at(index):
        if index not in fitted:
            neighbours = tree.find_n(before[index], 4)
            weights = [1/max(distance, .0001)**2 for _, _, distance in neighbours]
            total = sum(weights)
            result = Vector()
            for (_, source_index, _), weight in zip(neighbours, weights):
                offset = before[index]-before[source_index]
                # Hair helpers extend down the back; only skull helpers inherit
                # the full head enlargement. Nearby body displacement carries
                # the profile's sex/body fitting into the remaining envelope.
                local_scale = 1+smooth(1.49, 1.585, before[index].z)*(head_scale-1)
                offset = Vector((offset.x*local_scale, offset.y*local_scale, offset.z*local_scale*height_scale))
                result += (fitted[source_index]+offset)*(weight/total)
            fitted[index] = result
        return fitted[index]
    return at


def _read_proxy(folder, stem, at):
    vertices, uv, faces = obj_data(folder/(stem+'.obj'))
    scales = [1., 1., 1.]
    bindings = []
    reading = False
    for line in (folder/(stem+'.mhclo')).read_text(encoding='utf-8').splitlines():
        fields = line.split()
        if not fields or fields[0].startswith('#'):
            continue
        if fields[0] in ['x_scale', 'y_scale', 'z_scale']:
            axis = {'x_scale': 0, 'y_scale': 2, 'z_scale': 1}[fields[0]]
            source_axis = {'x_scale': 0, 'y_scale': 1, 'z_scale': 2}[fields[0]]
            scales[source_axis] = abs(at(int(fields[1]))[axis]-at(int(fields[2]))[axis])/float(fields[3])
        if fields[0] == 'verts':
            reading = True
            continue
        if reading:
            if len(fields) == 1 and fields[0].isdigit():
                bindings.append(([int(fields[0])], [1.], Vector()))
            elif len(fields) == 9 and fields[0].isdigit():
                bindings.append((list(map(int, fields[:3])), list(map(float, fields[3:6])), Vector(tuple(map(float, fields[6:9])))))
            elif bindings:
                break
    if len(bindings) != len(vertices):
        raise RuntimeError(f'Incomplete MakeHuman binding for {stem}: {len(bindings)}/{len(vertices)}')
    adapted = []
    for indices, weights, offset in bindings:
        point = sum((at(index)*weight for index, weight in zip(indices, weights)), Vector())
        point += Vector((offset.x*scales[0], -offset.z*scales[2], offset.y*scales[1]))
        adapted.append(point)
    return adapted, uv, faces, bindings


def _bind(obj, rig, long=False):
    obj.parent = rig
    head = obj.vertex_groups.new(name='head')
    chest = obj.vertex_groups.new(name='chest') if long else None
    upper = rig.data.bones['neck'].head_local.z
    lower = rig.data.bones['chest'].head_local.z
    for vertex in obj.data.vertices:
        weight = .62*(1-smooth(lower, upper, vertex.co.z)) if long else 0
        head.add([vertex.index], 1-weight, 'REPLACE')
        if chest and weight:
            chest.add([vertex.index], weight, 'REPLACE')
    modifier = obj.modifiers.new('Citizen beauty skin', 'ARMATURE')
    modifier.object = rig


def _new_material(name, color, texture, alpha=False, roughness=.7):
    existing = bpy.data.materials.get(name)
    if existing:
        # A saved authoring blend may retain packed pixels from the previous
        # build. Reload this pinned derivative so an updated source cannot be
        # silently hidden by the old packed albedo during GLB export.
        for node in existing.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                node.image.filepath = str(texture)
                if node.image.packed_file:
                    node.image.unpack(method='REMOVE')
                node.image.reload()
        return existing
    result = material(name, color, roughness, texture=texture, alpha=alpha)
    result['v15CitizenBeauty'] = True
    return result


def _lashes(rig, at):
    folder = SOURCE/'eyelashes/eyelashes01'
    adapted, uv, faces, _ = _read_proxy(folder, 'eyelashes01', at)
    mat = _new_material('Citizen natural eyelashes', (.012, .008, .006), folder/'eyelashes01.png', alpha=True, roughness=.78)
    obj = mesh('Citizen natural eyelashes', adapted, [indices for _, indices, _ in faces], mat, [[uv[index] for index in uvs] for _, _, uvs in faces])
    obj['avatarSlot'] = 'lashes'
    obj['avatarFixedColor'] = True
    obj['v15CitizenBeauty'] = True
    _bind(obj, rig)
    # Lashes follow eyelid morphs through the nearest fitted face surface.
    skin = next(o for o in bpy.context.scene.objects if o.type == 'MESH' and o.get('avatarSlot') == 'skin' and not o.get('authoringOnly'))
    keys = skin.data.shape_keys.key_blocks
    basis = keys[0]
    tree = KDTree(len(basis.data))
    for index, point in enumerate(basis.data):
        tree.insert(point.co, index)
    tree.balance()
    neighbours = []
    for point in adapted:
        nearby = tree.find_n(point, 3)
        values = [(index, 1/max(distance, .0001)**2) for _, index, distance in nearby]
        total = sum(weight for _, weight in values)
        neighbours.append([(index, weight/total) for index, weight in values])
    obj.shape_key_add(name='Basis')
    for source in list(keys)[1:]:
        if not source.name.startswith(('Expr_', 'Id_')):
            continue
        key = obj.shape_key_add(name=source.name)
        for vertex, nearby in zip(key.data, neighbours):
            vertex.co += sum(((source.data[index].co-basis.data[index].co)*weight for index, weight in nearby), Vector())
    return obj


def build_beauty(rig):
    """Build six real hairstyles plus female face materials/eyelashes in-place."""
    if not (SOURCE/'manifest.json').exists():
        raise RuntimeError('Run tools/fetch_citizen_beauty_assets.py before this build')
    profile = json.loads(rig['avatarProfile'])
    for obj in list(bpy.context.scene.objects):
        if obj.get('v15CitizenBeauty'):
            bpy.data.objects.remove(obj, do_unlink=True)
    _female_face(rig, profile)
    if profile['sex'] == 'female':
        skin_material = _new_material('Citizen adult female skin', (1, 1, 1), SOURCE/'skins/young_asian_female/young_lightskinned_female_diffuse3.png', roughness=.65)
        brow_material = _new_material('Citizen neutral brow strands', (1, 1, 1), SOURCE/'derived/eyebrow001-neutral.png', alpha=True, roughness=.78)
        for obj in bpy.context.scene.objects:
            if obj.type != 'MESH':
                continue
            slot = obj.get('avatarSlot')
            if slot == 'skin' or obj.name == 'Anatomy_Source':
                obj.data.materials.clear()
                obj.data.materials.append(skin_material)
                obj['avatarTintMode'] = 'absolute'
            elif slot == 'brows':
                obj.data.materials.clear()
                obj.data.materials.append(brow_material)
                obj['avatarTintMode'] = 'absolute'
                obj['avatarNeutralAlbedo'] = True
    at = _anatomy_map(rig, profile)
    built = []
    for style, asset in HAIRS.items():
        folder = SOURCE/'hair'/asset
        adapted, uv, faces, _ = _read_proxy(folder, asset, at)
        if style == 'longWavy':
            skull = rig.data.bones['head'].head_local.z
            for point in adapted:
                strength = 1-smooth(skull-.15, skull+.03, point.z)
                side = 1 if point.x >= 0 else -1
                point.x += side*.016*strength*math.sin(point.z*32+side*.8)
                point.y += .011*strength*math.cos(point.z*27+point.x*8)
        mat = _new_material('Citizen neutral hair '+asset, (1, 1, 1), SOURCE/'derived'/(asset+'-neutral.png'), alpha=True, roughness=.64)
        obj = mesh('Citizen hair '+style, adapted, [indices for _, indices, _ in faces], mat, [[uv[index] for index in uvs] for _, _, uvs in faces])
        # The original low-poly proxy has broad quads across the parting. Bake
        # one smooth subdivision into the shared GLB geometry, before skinning,
        # so close-up portraits and the game share the same softened silhouette.
        finish(obj, subdivide=1)
        # Hair is made from separate overlapping ribbons. Their disconnected
        # seam normals otherwise create wide light bands over the skull, even
        # with smooth polygons. Blend only the cap into a shared scalp normal;
        # lower strands keep their authored surface direction.
        scalp_z = rig.data.bones['head'].head_local.z + .090*profile['height']/1.78
        scalp_centre = Vector((0, -.018, scalp_z))
        normals = []
        for vertex in obj.data.vertices:
            radial = vertex.co-scalp_centre
            radial.z *= 1.12
            if radial.length:
                radial.normalize()
            weight = .84*smooth(scalp_z-.045, scalp_z+.025, vertex.co.z)
            normals.append(vertex.normal.lerp(radial, weight).normalized())
        obj.data.normals_split_custom_set_from_vertices(normals)
        obj['avatarSlot'] = 'hair'
        obj['avatarVariantGroup'] = 'hairStyle'
        obj['avatarVariant'] = style
        obj['avatarTintMode'] = 'absolute'
        obj['avatarNeutralAlbedo'] = True
        obj['v15CitizenBeauty'] = True
        obj['sourceAsset'] = 'MakeHuman CC0 '+asset
        _bind(obj, rig, long=style in ['longStraight', 'longWavy', 'longPonytail', 'braided'])
        built.append(obj.name)
    if profile['sex'] == 'female':
        built.append(_lashes(rig, at).name)
    bpy.context.view_layer.update()
    return {'styles': list(HAIRS), 'objects': built, 'femaleFace': profile['sex'] == 'female', 'sourceManifest': str(SOURCE/'manifest.json')}
