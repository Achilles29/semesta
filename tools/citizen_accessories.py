"""Portrait counterpart of game-src/citizen-accessories.js.

All dimensions, colors and fitting origins come from the shared JSON. Geometry
is made in the glTF bind-pose space, changed from (X,Y,Z) to Blender (X,-Z,Y),
then weighted wholly to its anchor bone. This avoids pose-dependent fitting and
bone-parent tail offsets when the portrait renderer selects Idle/Walk/Run.
"""
import json
import math
from bisect import bisect_left
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
DESIGNS = json.loads((ROOT / 'game-src/citizen-accessory-designs.json').read_text(encoding='utf-8'))
CITIZENS = {
    citizen['presetId']: citizen
    for citizen in json.loads((ROOT / 'game-src/citizen-roster.json').read_text(encoding='utf-8'))['citizens']
}


def _sphere(hemisphere=False):
    width, height = (32, 16) if hemisphere else (24, 16)
    extent = math.pi / 2 if hemisphere else math.pi
    points = []
    for row in range(height + 1):
        theta = extent * row / height
        for col in range(width):
            phi = 2 * math.pi * col / width
            points.append(Vector((math.cos(phi) * math.sin(theta), math.cos(theta), math.sin(phi) * math.sin(theta))))
    faces = []
    for row in range(height):
        for col in range(width):
            a, b = row * width + col, row * width + (col + 1) % width
            if row == 0:
                faces.append((a, b + width, a + width))
            elif row == height - 1 and not hemisphere:
                faces.append((a, b, a + width))
            else:
                faces.append((a, b, b + width, a + width))
    return points, faces


def _box():
    points = [Vector(p) for p in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return points, faces


def _cylinder():
    count = 32
    points = [Vector((math.cos(i * math.tau / count), y, math.sin(i * math.tau / count))) for y in (-1,1) for i in range(count)]
    faces = [(i, (i+1)%count, (i+1)%count+count, i+count) for i in range(count)]
    faces.extend([tuple(reversed(range(count))), tuple(range(count, 2*count))])
    return points, faces


def _tube(part):
    """Linear CurvePath sampled by arc length, matching the runtime's TubeGeometry."""
    path = [Vector(p) for p in part['points']]
    lengths = [0.0]
    for a, b in zip(path, path[1:]):
        lengths.append(lengths[-1] + (b-a).length)
    if lengths[-1] <= 0:
        raise ValueError('Citizen accessory tube must have a nonzero path')
    segments = max(32, len(path)*3)
    centers = []
    for i in range(segments+1):
        distance = lengths[-1]*i/segments
        edge = min(max(1, bisect_left(lengths, distance)), len(path)-1)
        fraction = (distance-lengths[edge-1])/(lengths[edge]-lengths[edge-1])
        centers.append(path[edge-1].lerp(path[edge], fraction))
    tangents = []
    for i in range(segments+1):
        before, after = centers[max(0,i-1)], centers[min(segments,i+1)]
        tangents.append((after-before).normalized())
    # Parallel transport prevents arbitrary frame flips at the corners.
    tangent = tangents[0]
    axis_index = min(range(3), key=lambda j: abs(tangent[j]))
    axis = Vector(tuple(1 if j == axis_index else 0 for j in range(3)))
    normal = tangent.cross(tangent.cross(axis)).normalized()
    points, faces = [], []
    sides = 8
    for i, (center, tangent) in enumerate(zip(centers, tangents)):
        if i:
            cross = tangents[i-1].cross(tangent)
            if cross.length > 1e-8:
                rotation = Matrix.Rotation(math.acos(max(-1,min(1,tangents[i-1].dot(tangent)))),3,cross.normalized())
                normal = rotation @ normal
        binormal = tangent.cross(normal).normalized()
        for j in range(sides):
            angle = math.tau*j/sides
            points.append(center+part['radius']*(-math.cos(angle)*normal+math.sin(angle)*binormal))
        if i:
            for j in range(sides):
                a, b = (i-1)*sides+j, (i-1)*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides))
    return points, faces


def _linear_color(hex_color):
    value = hex_color.lstrip('#')
    channels = [int(value[i:i+2],16)/255 for i in (0,2,4)]
    return [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in channels]


def _material(part):
    key = f"CitizenMaterial_{part['color']}_{part.get('roughness',.55)}_{part.get('metalness',0)}"
    mat = bpy.data.materials.get(key)
    if mat:
        return mat
    mat = bpy.data.materials.new(key)
    mat['citizenAccessoryMaterial'] = True
    mat.use_nodes = True
    color = (*_linear_color(part['color']), 1)
    mat.diffuse_color = color
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Roughness'].default_value = part.get('roughness',.55)
    shader.inputs['Metallic'].default_value = part.get('metalness',0)
    return mat


def clear_citizen_accessories():
    for obj in list(bpy.context.scene.objects):
        if obj.get('citizenAccessory'):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data.users == 0:
                bpy.data.meshes.remove(data)


def add_citizen_accessories(rig, preset, avatar_objects=None):
    """Replace generated role accessories without modifying base avatar meshes."""
    clear_citizen_accessories()
    citizen = CITIZENS.get(preset['id'])
    fit = DESIGNS['profiles'].get(preset['config']['profileId'])
    if not citizen or not fit:
        return []
    inverse_rig = rig.matrix_world.inverted()
    result = []
    for kind in citizen.get('accessories',[]):
        definition = DESIGNS['accessories'][kind]
        bone = definition['bone']
        if bone not in rig.data.bones:
            raise ValueError(f'Citizen accessory {kind} requires bone {bone}')
        origin = Vector(fit[bone])
        for index, part in enumerate(definition['parts']):
            shape = part['shape']
            if shape == 'box':
                points, faces = _box()
            elif shape == 'cylinder':
                points, faces = _cylinder()
            elif shape == 'tube':
                points, faces = _tube(part)
            else:
                points, faces = _sphere(shape == 'hemisphere')
            scale = part.get('scale',[1,1,1])
            # Three Euler XYZ transforms a vector by Rx * Ry * Rz.
            rx,ry,rz = part.get('rotation',[0,0,0])
            rotation = Matrix.Rotation(rx,3,'X') @ Matrix.Rotation(ry,3,'Y') @ Matrix.Rotation(rz,3,'Z')
            position = origin + Vector(part.get('position',[0,0,0]))
            vertices = []
            for point in points:
                world = position + rotation @ Vector(tuple(point[i]*scale[i] for i in range(3)))
                vertices.append(inverse_rig @ Vector((world.x,-world.z,world.y)))
            name = f'Citizen_{kind}_{index}'
            data = bpy.data.meshes.new(name)
            data.from_pydata(vertices,[],faces)
            data.update()
            # Recalculate shared-primitive winding in the Blender basis.
            bm = bmesh.new()
            bm.from_mesh(data)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
            bm.to_mesh(data)
            bm.free()
            obj = bpy.data.objects.new(name,data)
            bpy.context.collection.objects.link(obj)
            obj['citizenAccessory'] = kind
            obj['citizenPreset'] = preset['id']
            obj.data.materials.append(_material(part))
            for polygon in data.polygons:
                polygon.use_smooth = shape != 'box' and not (shape == 'cylinder' and len(polygon.vertices)>4)
            obj.parent = rig
            group = obj.vertex_groups.new(name=bone)
            group.add(list(range(len(data.vertices))),1,'REPLACE')
            modifier = obj.modifiers.new('Citizen accessory follows '+bone,'ARMATURE')
            modifier.object = rig
            result.append(obj)
    bpy.context.view_layer.update()
    return result
