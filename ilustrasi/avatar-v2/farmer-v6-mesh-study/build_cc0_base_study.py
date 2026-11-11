"""Build a chibi-proportion study from Blender Studio's CC0 stylized male base mesh.

The source mesh is actual hand-authored quad topology, not V5 lofts or the
rejected implicit-body experiment in this directory. This remains a study:
costume, hair, detailed weights and art approval are still outstanding.

Environment: SEMESTA_BASE_MESH_BUNDLE=<human_base_meshes_bundle.blend>
Runtime: Blender 4.5+ --background --python build_cc0_base_study.py
"""

import json
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = Path(os.environ["SEMESTA_BASE_MESH_BUNDLE"])
SOURCE_RIG = ROOT / "assets/avatar-v2/source/semesta_farmer_v5-ps2-style.blend"
NAME = "farmer-v6-cc0-base-study"

bpy.ops.wm.open_mainfile(filepath=str(SOURCE_RIG))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene
rig = bpy.data.objects["SemestaV2_Rig"]
rig.animation_data.action = None
scene.frame_set(1)
for obj in list(bpy.data.objects):
    if obj != rig:
        bpy.data.objects.remove(obj, do_unlink=True)

with bpy.data.libraries.load(str(BASE)) as (source, target):
    target.objects = [name for name in source.objects if name in {
        "GEO-body_male_stylized",
        "GEO-body_male_stylized.eye.L",
        "GEO-body_male_stylized.eye.R",
    }]

body = bpy.data.objects["GEO-body_male_stylized"]
scene.collection.objects.link(body)
body.name = "V6_BlenderStudio_CC0_StylizedBody"
body.location = (0, 0, 0)
for modifier in list(body.modifiers):
    body.modifiers.remove(modifier)
if body.animation_data:
    body.animation_data_clear()


def smoothstep(lo, hi, value):
    t = max(0., min(1., (value - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def chibi_point(point):
    x, y, z = point
    # Art direction: enlarge the head while keeping neck/shoulder attachment.
    t = smoothstep(1.37, 1.52, z)
    x *= 1 + .72 * t
    y = -.018 + (y + .018) * (1 + .48 * t)
    if z > 1.42:
        z = 1.42 + (z - 1.42) * 1.30
    # Slightly shorten the adult leg while preserving floor contact.
    elif z < .82:
        z = z * .91
    else:
        z = .82 * .91 + (z - .82) * ((1.42 - .82 * .91) / .60)
    return Vector((x, y, z))


for vertex in body.data.vertices:
    vertex.co = chibi_point(vertex.co)
body.data.update()

clay = bpy.data.materials.new("V6 clay - inspect topology and silhouette")
clay.diffuse_color = (.72, .64, .54, 1)
clay.use_nodes = True
clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.72, .64, .54, 1)
clay.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = .82
body.data.materials.clear()
body.data.materials.append(clay)
for face in body.data.polygons:
    face.use_smooth = True

groups = {bone.name: body.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
for vertex in body.data.vertices:
    x, y, z = vertex.co
    ax = abs(x)
    side = "L" if x > 0 else "R"
    weights = {}
    if z > 1.405:
        head = smoothstep(1.385, 1.50, z)
        weights = {"neck": 1 - head, "head": head}
    elif ax > .205 and z > .69:
        shoulder = smoothstep(.19, .32, ax)
        elbow = smoothstep(.38, .51, ax)
        wrist = smoothstep(.49, .59, ax)
        weights = {
            "chest": 1 - shoulder,
            f"clavicle.{side}": shoulder * (1 - smoothstep(.24, .34, ax)),
            f"upper_arm.{side}": shoulder * (1 - elbow),
            f"forearm.{side}": elbow * (1 - wrist),
            f"hand.{side}": wrist,
        }
    elif z < .85:
        hip = 1 - smoothstep(.66, .88, z)
        midline = smoothstep(.016, .095, ax)
        knee = 1 - smoothstep(.38, .52, z)
        ankle = 1 - smoothstep(.11, .21, z)
        weights = {
            "root": 1 - hip * midline,
            f"thigh.{side}": hip * midline * (1 - knee),
            f"calf.{side}": hip * midline * knee * (1 - ankle),
            f"foot.{side}": hip * midline * knee * ankle,
        }
    else:
        chest = smoothstep(.98, 1.22, z)
        neck = smoothstep(1.30, 1.42, z)
        root = 1 - smoothstep(.81, .93, z)
        weights = {"root": root,
                   "spine": (1 - chest) * (1 - root),
                   "chest": chest * (1 - neck),
                   "neck": neck}
    total = sum(max(0., value) for value in weights.values())
    if total < 1e-7:
        weights = {"root": 1.}
        total = 1.
    for name, value in weights.items():
        if value > 1e-5:
            groups[name].add([vertex.index], value / total, "REPLACE")

body.parent = rig
modifier = body.modifiers.new("V6 rig test", "ARMATURE")
modifier.object = rig

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 720
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("V6 neutral studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.46, .46, .46, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .85
scene.world = world


def area(name, location, energy, size):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, .94)) - light.location).to_track_quat("-Z", "Y").to_euler()


area("key", (-3, -4, 4.5), 450, 4)
area("fill", (3, -1, 3), 280, 3)
area("rim", (1, 3, 3), 300, 3)
camera_data = bpy.data.cameras.new("V6 orthographic comparison")
camera = bpy.data.objects.new("V6 orthographic comparison", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = 2.18


def render(name, location):
    camera.location = location
    camera.rotation_euler = (Vector((0, 0, .95)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(HERE / f"{NAME}-{name}.png")
    bpy.ops.render.render(write_still=True)


for view, location in (("front", (0, -4.8, 1.03)),
                       ("left", (-4.8, 0, 1.03)),
                       ("back", (0, 4.8, 1.03))):
    render(view, location)

for action_name, frame in (("Walk", 7), ("Hoe", 8)):
    rig.animation_data.action = bpy.data.actions[action_name]
    scene.frame_set(frame)
    render("pose-" + action_name.lower(), (3.0, -4.2, 1.66))
rig.animation_data.action = None
scene.frame_set(1)

bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / f"{NAME}.blend"))
bpy.ops.export_scene.gltf(filepath=str(HERE / f"{NAME}.glb"),
                          export_format="GLB", use_selection=True,
                          export_animations=True, export_animation_mode="NLA_TRACKS",
                          export_skins=True, export_materials="EXPORT", export_yup=True)
report = {
    "status": "CC0 sculptable base-mesh study; art and deformation not approved",
    "source": "Blender Studio Human Base Meshes v1.4.1, CC0",
    "sourceUrl": "https://www.blender.org/download/demo-files/",
    "vertices": len(body.data.vertices),
    "polygons": len(body.data.polygons),
    "bones": len(rig.data.bones),
    "liveAssetChanged": False,
}
(HERE / f"{NAME}-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
