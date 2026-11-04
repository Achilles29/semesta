"""Non-destructive Blender audit/export pipeline for SEMESTA Avatar V2.

Example:
  blender --background --factory-startup --python tools/blender_avatar_v2_pipeline.py -- \
    --input /path/to/licensed-source.glb --mode inspect

Export is opt-in and restricted to assets/avatar-v2. It does not sculpt, retopologize,
decimate, remap UVs, edit weights, or alter animation. Those require artist review.
"""
import argparse
import json
import math
import os
import re
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
V2_ROOT = (ROOT / 'assets' / 'avatar-v2').resolve()
V2_TEST_ROOT = (Path(tempfile.gettempdir()) / 'semesta-avatar-v2-smoke').resolve()
REQUIRED_CLIPS = ('Idle', 'Walk', 'Run', 'Interact', 'Wave', 'Hoe', 'Water', 'Harvest', 'Carry', 'Sit')


def options():
    raw = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, help='Licensed GLB, glTF, FBX, OBJ, or Blend source.')
    parser.add_argument('--mode', choices=('inspect', 'export'), default='inspect')
    parser.add_argument('--output', help='For export mode, destination GLB under assets/avatar-v2/characters/.')
    parser.add_argument('--report', help='Report output; defaults beside the source report folder in assets/avatar-v2/reports/.')
    parser.add_argument('--normalize-height', type=float, help='Opt in to uniform character-root scaling and ground centering to this Blender-space Z height, e.g. 1.8. No geometry or skin weights are edited.')
    parser.add_argument('--yaw-degrees', type=float, default=0, help='Artist-confirmed global Z rotation in Blender coordinates; standard source assumes -Y is forward. Applied only with --normalize-height.')
    parser.add_argument('--allow-test-output', action='store_true', help=f'Allow an isolated pipeline test export only under {V2_TEST_ROOT}; this is never a production asset.')
    parser.add_argument('--force', action='store_true', help='Allow replacing an existing file only inside the V2 library.')
    return parser.parse_args(raw)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_source(path):
    suffix = path.suffix.lower()
    if suffix == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(path))
    elif suffix in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    elif suffix == '.obj':
        if hasattr(bpy.ops.wm, 'obj_import'):
            bpy.ops.wm.obj_import(filepath=str(path))
        else:
            bpy.ops.import_scene.obj(filepath=str(path))
    else:
        raise ValueError('Supported source formats: .glb, .gltf, .fbx, .obj, .blend')


def components(mesh):
    if not mesh.vertices:
        return 0
    parent = list(range(len(mesh.vertices)))
    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index
    for edge in mesh.edges:
        a, b = edge.vertices
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra
    return len({find(index) for index in range(len(mesh.vertices))})


def material_signature(material):
    if not material:
        return '(none)'
    if not material.use_nodes:
        color = tuple(round(float(v), 4) for v in material.diffuse_color)
        return json.dumps({'nodes': False, 'color': color, 'roughness': round(float(material.roughness), 4), 'metallic': round(float(material.metallic), 4)}, sort_keys=True)
    nodes = []
    for node in material.node_tree.nodes:
        item = {'type': node.bl_idname, 'name': node.name}
        image = getattr(node, 'image', None)
        if image:
            item['image'] = image.filepath or image.name
        for socket_name in ('Base Color', 'Roughness', 'Metallic', 'Alpha'):
            socket = node.inputs.get(socket_name)
            if socket and hasattr(socket, 'default_value'):
                value = socket.default_value
                try:
                    item[socket_name] = [round(float(v), 5) for v in value]
                except TypeError:
                    item[socket_name] = round(float(value), 5)
        nodes.append(item)
    links = sorted((link.from_node.name, link.from_socket.name, link.to_node.name, link.to_socket.name) for link in material.node_tree.links)
    return json.dumps({'nodes': nodes, 'links': links}, sort_keys=True)


def mesh_report(obj):
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    boundary = sum(1 for edge in bm.edges if edge.is_boundary)
    non_manifold = sum(1 for edge in bm.edges if not edge.is_manifold)
    bm.free()
    bad_normals = sum(1 for polygon in mesh.polygons if not all(math.isfinite(v) for v in polygon.normal))
    uv = []
    for layer in mesh.uv_layers:
        values = [tuple(loop.uv) for loop in layer.data]
        low = [min(v[i] for v in values) for i in range(2)] if values else [0, 0]
        high = [max(v[i] for v in values) for i in range(2)] if values else [0, 0]
        outside = sum(1 for v in values if any(c < -1e-4 or c > 1.0001 for c in v))
        uv.append({'name': layer.name, 'loopCount': len(values), 'bounds': [[round(x, 5) for x in low], [round(x, 5) for x in high]], 'outside01LoopRatio': round(outside / len(values), 5) if values else 0})
    group_weights = Counter()
    zero_weight_vertices = 0
    for vertex in mesh.vertices:
        positive = sum(1 for item in vertex.groups if item.weight > 1e-5)
        group_weights[str(positive)] += 1
        if positive == 0:
            zero_weight_vertices += 1
    armature_modifiers = [{'name': modifier.name, 'armature': modifier.object.name if modifier.object else None, 'preserveVolume': getattr(modifier, 'use_deform_preserve_volume', None)} for modifier in obj.modifiers if modifier.type == 'ARMATURE']
    return {
        'name': obj.name, 'vertices': len(mesh.vertices), 'edges': len(mesh.edges), 'polygons': len(mesh.polygons),
        'trianglesEvaluated': sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons),
        'looseOrDisconnectedVertexComponents': components(mesh), 'materials': [slot.material.name if slot.material else None for slot in obj.material_slots],
        'uvLayers': uv, 'customNormals': bool(getattr(mesh, 'has_custom_normals', False)), 'nonFinitePolygonNormals': bad_normals,
        'boundaryEdges': boundary, 'nonManifoldEdges': non_manifold,
        'skinWeightsPositiveInfluencesPerVertex': dict(group_weights), 'zeroWeightVertices': zero_weight_vertices,
        'vertexGroups': [group.name for group in obj.vertex_groups], 'armatureModifiers': armature_modifiers,
    }


def audit_scene(source):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    material_users = defaultdict(list)
    for material in bpy.data.materials:
        material_users[material_signature(material)].append(material.name)
    duplicates = [names for names in material_users.values() if len(names) > 1]
    actions = []
    for action in bpy.data.actions:
        frames = [key.co.x for curve in action.fcurves for key in curve.keyframe_points] if hasattr(action, 'fcurves') else []
        paths = Counter(curve.data_path.rsplit('.', 1)[-1] for curve in action.fcurves) if hasattr(action, 'fcurves') else Counter()
        bone_targets = sorted({match.group(1) for curve in action.fcurves if (match := re.search(r'pose\.bones\["([^"]+)"\]', curve.data_path))}) if hasattr(action, 'fcurves') else []
        actions.append({'name': action.name, 'frameRange': [min(frames), max(frames)] if frames else None, 'channelCount': len(action.fcurves) if hasattr(action, 'fcurves') else 0, 'paths': dict(paths), 'boneTargets': bone_targets})
    images = []
    for image in bpy.data.images:
        images.append({'name': image.name, 'filepath': image.filepath, 'size': list(image.size), 'channels': image.channels, 'packed': image.packed_file is not None, 'source': image.source})
    armature_reports = []
    for armature in armatures:
        armature_reports.append({'name': armature.name, 'boneCount': len(armature.data.bones), 'bones': [{'name': bone.name, 'parent': bone.parent.name if bone.parent else None, 'head': [round(x, 5) for x in bone.head_local], 'tail': [round(x, 5) for x in bone.tail_local], 'deform': bone.use_deform} for bone in armature.data.bones]})
    return {
        'source': str(source), 'blenderVersion': bpy.app.version_string,
        'sceneObjectCount': len(bpy.context.scene.objects), 'meshObjectCount': len(meshes),
        'meshes': [mesh_report(obj) for obj in meshes], 'armatures': armature_reports,
        'materials': [{'name': material.name, 'users': material.users, 'signature': material_signature(material)} for material in bpy.data.materials],
        'duplicateMaterialSignatureGroups': duplicates, 'images': images, 'actions': actions,
        'sceneBounds': bounds(meshes),
        'sceneBoundsNote': 'Union of Blender object bound boxes transformed by object matrices. It includes all imported variant meshes and does not evaluate armature deformation or hide-state intent; use the exported GLB accessor audit for file bounds.',
        'manualReviewRequired': ['front/back orientation and approved style silhouette', 'UV island overlap and texel density', 'facial quality and shading', 'joint deformation under required animation poses', 'clothing/body intersection', 'hat/hair/accessory attachment and floating checks'],
        'automationLimits': ['No topology edits, decimation, retopology, UV repair, weight painting, rig retargeting, or animation fabrication are performed.'],
    }


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not points:
        return None
    return {'min': [round(min(p[i] for p in points), 5) for i in range(3)], 'max': [round(max(p[i] for p in points), 5) for i in range(3)], 'size': [round(max(p[i] for p in points) - min(p[i] for p in points), 5) for i in range(3)]}


def write_report(report, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def export_glb(path, allow_test_output=False):
    path = path.resolve()
    if path.suffix.lower() != '.glb' or not (path.is_relative_to(V2_ROOT) or (allow_test_output and path.is_relative_to(V2_TEST_ROOT))):
        raise ValueError(f'Export destination must be a .glb under {V2_ROOT}; isolated tests may use {V2_TEST_ROOT}')
    path.parent.mkdir(parents=True, exist_ok=True)
    operator = getattr(bpy.ops.export_scene, 'gltf', None)
    if operator is None:
        raise RuntimeError('Blender glTF 2.0 exporter is unavailable; enable/install the official glTF exporter add-on for this Blender version.')
    properties = operator.get_rna_type().properties
    args = {'filepath': str(path), 'export_format': 'GLB'}
    requested = {
        'use_selection': False, 'export_animations': True, 'export_skins': True,
        'export_materials': 'EXPORT', 'export_image_format': 'AUTO', 'export_yup': True,
        'export_apply': False, 'export_texcoords': True, 'export_normals': True,
    }
    args.update({key: value for key, value in requested.items() if key in properties})
    # Export only weighted character geometry, its armature, and rigid objects
    # parented to a bone. This avoids accidentally shipping preview floors/cameras.
    rig_names = {modifier.object.name for obj in bpy.context.scene.objects if obj.type == 'MESH' for modifier in obj.modifiers if modifier.type == 'ARMATURE' and modifier.object}
    if not rig_names:
        raise ValueError('No mesh with an armature modifier was found; inspect/rig the character before GLB export.')
    repaired_hierarchy = parent_skinned_meshes_to_rig()
    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    eligible_meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        has_rig = any(modifier.type == 'ARMATURE' and modifier.object and modifier.object.name in rig_names for modifier in obj.modifiers)
        bone_parented = obj.parent and obj.parent.type == 'ARMATURE' and obj.parent_type == 'BONE'
        if has_rig or bone_parented:
            eligible_meshes.append(obj)
            obj.select_set(True)
    if not eligible_meshes:
        raise ValueError('No character mesh was eligible for export.')
    args['use_selection'] = True
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE' and obj.name in rig_names:
            obj.select_set(True)
        if obj.type == 'EMPTY' and obj.name == 'SEMESTA_V2_NormalizationRoot':
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE' and obj.name in rig_names)
    operator(**args)
    return repaired_hierarchy


def parent_skinned_meshes_to_rig():
    """Satisfy glTF exporter hierarchy while preserving each mesh world transform."""
    repaired = []
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        armature = next((modifier.object for modifier in obj.modifiers
                         if modifier.type == 'ARMATURE' and modifier.object), None)
        if not armature or obj.parent == armature:
            continue
        world = obj.matrix_world.copy()
        obj.parent = armature
        obj.matrix_parent_inverse = armature.matrix_world.inverted()
        obj.matrix_world = world
        repaired.append(obj.name)
    return repaired


def character_objects():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    rig_names = {modifier.object.name for obj in meshes for modifier in obj.modifiers if modifier.type == 'ARMATURE' and modifier.object}
    rigs = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE' and obj.name in rig_names]
    eligible = set(rigs)
    for obj in meshes:
        has_rig = any(modifier.type == 'ARMATURE' and modifier.object and modifier.object.name in rig_names for modifier in obj.modifiers)
        bone_parented = obj.parent and obj.parent.type == 'ARMATURE' and obj.parent_type == 'BONE'
        if has_rig or bone_parented:
            eligible.add(obj)
    if not rigs or not any(obj.type == 'MESH' for obj in eligible):
        raise ValueError('Normalization/export requires at least one character armature and an armature-linked mesh.')
    return eligible


def normalize_character(target_height, yaw_degrees):
    eligible = character_objects()
    hierarchy_repairs = parent_skinned_meshes_to_rig()
    eligible = character_objects()
    meshes = [obj for obj in eligible if obj.type == 'MESH']
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points:
        raise ValueError('Cannot normalize character: no mesh bounds.')
    low = [min(point[i] for point in points) for i in range(3)]
    high = [max(point[i] for point in points) for i in range(3)]
    height = high[2] - low[2]
    if height <= 1e-6:
        raise ValueError('Cannot normalize character with zero/invalid height.')
    scale = target_height / height
    angle = math.radians(yaw_degrees)
    rotation = Matrix.Rotation(angle, 3, 'Z')
    transformed = [rotation @ (Vector(point) * scale) for point in points]
    new_low = [min(point[i] for point in transformed) for i in range(3)]
    new_high = [max(point[i] for point in transformed) for i in range(3)]
    root = bpy.data.objects.new('SEMESTA_V2_NormalizationRoot', None)
    root.empty_display_type = 'PLAIN_AXES'
    bpy.context.scene.collection.objects.link(root)
    root.rotation_euler.z = angle
    root.scale = (scale, scale, scale)
    root.location = (-(new_low[0] + new_high[0]) * .5, -(new_low[1] + new_high[1]) * .5, -new_low[2])
    # Parent only character hierarchy roots and preserve their current world matrices.
    for obj in eligible:
        ancestor = obj.parent
        inside = False
        while ancestor:
            if ancestor in eligible:
                inside = True
                break
            ancestor = ancestor.parent
        if inside:
            continue
        world_matrix = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = world_matrix
    return {
        'applied': True, 'root': root.name, 'heightBefore': round(height, 6),
        'targetHeight': target_height, 'uniformScale': round(scale, 8),
        'yawDegreesZ': yaw_degrees, 'centeredXZ': True,
        'feetGroundedAtZ0InBlender': True, 'topologyOrWeightsChanged': False,
        'skinnedMeshParentRepairs': hierarchy_repairs,
        'manualDirectionCheckRequired': 'Confirm the face direction in a preview before selecting --yaw-degrees; this automation cannot recognize which side is the face.'
    }


def main():
    args = options()
    source = Path(args.input).expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f'Source file does not exist: {source}')
    report_path = Path(args.report).resolve() if args.report else (V2_ROOT / 'reports' / (source.stem + '-blender-audit.json'))
    reset_scene()
    import_source(source)
    initial = audit_scene(source)
    if args.normalize_height is not None:
        if args.normalize_height <= 0:
            raise ValueError('--normalize-height must be positive.')
        initial['normalization'] = normalize_character(args.normalize_height, args.yaw_degrees)
    if args.mode == 'inspect':
        write_report(initial, report_path)
        print(f'Inspection report written to {report_path}')
        return
    if not args.output:
        raise ValueError('--output is required for export mode.')
    output = Path(args.output).expanduser().resolve()
    if output.exists() and not args.force:
        raise FileExistsError(f'Refusing to overwrite existing asset: {output}; pass --force only after reviewing the file.')
    export_repairs = export_glb(output, allow_test_output=args.allow_test_output)
    # Reimport the export in a clean scene and capture its actual exported structure.
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(output))
    exported = audit_scene(output)
    exported['exportedFrom'] = str(source)
    exported['normalization'] = initial.get('normalization', {'applied': False})
    exported['skinnedMeshParentRepairsBeforeExport'] = export_repairs
    exported['sourceAuditSummary'] = {'meshObjectCount': initial['meshObjectCount'], 'armatureCount': len(initial['armatures']), 'actionCount': len(initial['actions'])}
    source_bones = {bone['name'] for armature in initial['armatures'] for bone in armature['bones']}
    exported_bones = {bone['name'] for armature in exported['armatures'] for bone in armature['bones']}
    source_actions = {action['name'] for action in initial['actions']}
    exported_actions = {action['name'] for action in exported['actions']}
    exported['roundTripMissingSourceBones'] = sorted(source_bones - exported_bones)
    exported['roundTripMissingSourceActions'] = sorted(source_actions - exported_actions)
    exported['missingRequiredClips'] = sorted(set(REQUIRED_CLIPS) - exported_actions)
    exported['roundTripSkinnedMeshObjectCount'] = sum(bool(mesh['armatureModifiers']) for mesh in exported['meshes'])
    exported['roundTripValidated'] = bool(exported['roundTripSkinnedMeshObjectCount'] > 0 and exported['armatures'] and not exported['roundTripMissingSourceBones'] and not exported['roundTripMissingSourceActions'])
    exported['productionReady'] = False
    exported['productionReadinessNote'] = 'Round-trip validation is structural only. This pipeline never marks production ready; a real character must additionally pass visual, joint-deformation, animation, license, and target-device review.'
    exported['roundTripNote'] = 'Structural reimport only; visual, rigging, materials, and animation deformation still require artist review.'
    write_report(exported, report_path)
    if not exported['roundTripValidated']:
        raise RuntimeError(f'Export did not round-trip with mesh and armature; report: {report_path}')
    print(f'GLB exported to {output}; reimport report written to {report_path}')


if __name__ == '__main__':
    main()
