"""Create a tiny synthetic rig fixture solely to smoke-test Blender I/O.

This is not a character, is never saved in the repo/library, and must not be
used in the game. It builds one hand-authored ring mesh (no primitive operators),
a test armature, UVs, one material, and two short test actions.
"""
import argparse
import math
import sys

import bpy
from mathutils import Vector


def parse_args():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    return parser.parse_args(args)


def main():
    output = parse_args().output
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 9
    scene.render.fps = 30

    arm_data = bpy.data.armatures.new('SMOKE_ONLY_RIG')
    arm = bpy.data.objects.new('SMOKE_ONLY_RIG', arm_data)
    scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    definitions = [
        ('root', (0, 0, 0), (0, 0, .35), None),
        ('pelvis', (0, 0, .35), (0, 0, .75), 'root'),
        ('spine_01', (0, 0, .75), (0, 0, 1.10), 'pelvis'),
        ('chest', (0, 0, 1.10), (0, 0, 1.40), 'spine_01'),
        ('neck', (0, 0, 1.40), (0, 0, 1.52), 'chest'),
        ('head', (0, 0, 1.52), (0, 0, 1.80), 'neck'),
    ]
    bones = {}
    for name, head, tail, parent in definitions:
        bone = arm_data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        bones[name] = bone
    for name, _, _, parent in definitions:
        if parent:
            bones[name].parent = bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.select_set(False)

    heights = (0.0, .45, .82, 1.16, 1.48, 1.80)
    radii = (.17, .24, .22, .20, .115, .20)
    segments = 12
    vertices = []
    for z, radius in zip(heights, radii):
        for index in range(segments):
            angle = math.tau * index / segments
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius * .64, z))
    faces = []
    faces.append(tuple(reversed(range(segments))))
    for ring in range(len(heights) - 1):
        for index in range(segments):
            a = ring * segments + index
            b = ring * segments + (index + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces.append(tuple((len(heights) - 1) * segments + index for index in range(segments)))
    mesh_data = bpy.data.meshes.new('SMOKE_ONLY_RING_MESH')
    mesh_data.from_pydata(vertices, [], faces)
    mesh_data.update()
    mesh = bpy.data.objects.new('SMOKE_ONLY_WEIGHTED_MESH', mesh_data)
    scene.collection.objects.link(mesh)
    for region in ('pelvis', 'spine_01', 'chest', 'head'):
        mesh.vertex_groups.new(name=region)
    for ring, z in enumerate(heights):
        for index in range(segments):
            vertex = ring * segments + index
            if z <= .55:
                mesh.vertex_groups['pelvis'].add([vertex], 1.0, 'REPLACE')
            elif z < .95:
                t = (z - .55) / .40
                mesh.vertex_groups['pelvis'].add([vertex], 1.0 - t, 'REPLACE')
                mesh.vertex_groups['spine_01'].add([vertex], t, 'REPLACE')
            elif z < 1.38:
                mesh.vertex_groups['spine_01'].add([vertex], .35, 'REPLACE')
                mesh.vertex_groups['chest'].add([vertex], .65, 'REPLACE')
            elif z < 1.55:
                mesh.vertex_groups['chest'].add([vertex], .3, 'REPLACE')
                mesh.vertex_groups['head'].add([vertex], .7, 'REPLACE')
            else:
                mesh.vertex_groups['head'].add([vertex], 1.0, 'REPLACE')
    uv = mesh_data.uv_layers.new(name='UVMap')
    for polygon in mesh_data.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh_data.loops[loop_index].vertex_index
            ring, segment = divmod(vertex, segments)
            uv.data[loop_index].uv = (segment / segments, ring / (len(heights) - 1))
    material = bpy.data.materials.new('SMOKE_ONLY_PBR')
    material.diffuse_color = (.24, .45, .72, 1)
    material.use_nodes = True
    mesh.data.materials.append(material)
    modifier = mesh.modifiers.new('SMOKE_ONLY_ARMATURE', 'ARMATURE')
    modifier.object = arm

    arm.animation_data_create()
    for action_name, amplitude in (('Idle', .02), ('Walk', .20)):
        action = bpy.data.actions.new(action_name)
        arm.animation_data.action = action
        pose_bone = arm.pose.bones['spine_01']
        pose_bone.rotation_mode = 'XYZ'
        for frame, value in ((1, 0), (5, amplitude), (9, 0)):
            pose_bone.rotation_euler.y = value
            pose_bone.keyframe_insert(data_path='rotation_euler', frame=frame, group=action_name)
        for curve in action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'BEZIER'
        track = arm.animation_data.nla_tracks.new()
        track.name = action_name
        strip = track.strips.new(action_name, 1, action)
        strip.name = action_name
        strip.mute = True
    arm.animation_data.action = None
    mesh.select_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.wm.save_as_mainfile(filepath=output)
    print(f'SAVED SYNTHETIC I/O FIXTURE ONLY: {output}')


if __name__ == '__main__':
    main()
