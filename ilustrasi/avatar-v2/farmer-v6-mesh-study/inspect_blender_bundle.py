"""List objects and collections in Blender Studio's CC0 human base-mesh bundle."""

import os
from pathlib import Path
import bpy
from mathutils import Vector

bundle = Path(os.environ["SEMESTA_BASE_MESH_BUNDLE"])
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(str(bundle)) as (source, target):
    target.objects = [name for name in source.objects if name in {
        "stylized_body_male", "GEO-body_male_stylized", "GEO-body_male_stylized.eye.L",
        "GEO-body_male_stylized.eye.R", "stylized_head", "Head - Generic Topology",
    }]
for obj in target.objects:
    if obj:
        print("ASSET", obj.name, obj.type, "vertices", len(obj.data.vertices) if obj.type == "MESH" else 0,
              "location", tuple(obj.location), "dimensions", tuple(obj.dimensions),
              "modifiers", [m.name for m in obj.modifiers],
              "parent", obj.parent.name if obj.parent else None)

body = bpy.data.objects["GEO-body_male_stylized"]
print("GROUPS", [g.name for g in body.vertex_groups][:40], "MATERIALS", [m.name for m in body.data.materials])
print("BOUNDS", [(min(v.co[i] for v in body.data.vertices), max(v.co[i] for v in body.data.vertices)) for i in range(3)])
bpy.context.scene.collection.objects.link(body)
body.location.x = 0
for modifier in list(body.modifiers):
    if modifier.type == "MASK":
        body.modifiers.remove(modifier)
for name in ("GEO-body_male_stylized.eye.L", "GEO-body_male_stylized.eye.R"):
    eye = bpy.data.objects[name]
    bpy.context.scene.collection.objects.link(eye)
world = bpy.data.worlds.new("preview world")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1
bpy.context.scene.world = world
light_data = bpy.data.lights.new("preview light", "AREA")
light_data.energy = 700
light = bpy.data.objects.new("preview light", light_data)
bpy.context.scene.collection.objects.link(light)
light.location = (0, -3, 4)
light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()
cam_data = bpy.data.cameras.new("preview camera")
cam = bpy.data.objects.new("preview camera", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (0, -4.8, 1.0)
cam.rotation_euler = (Vector((0, 0, .9)) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_data.type = "ORTHO"
cam_data.ortho_scale = 2.1
bpy.context.scene.camera = cam
bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"
bpy.context.scene.render.resolution_x = 700
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.filepath = str(Path(__file__).resolve().parent / "cc0-base-mesh-preview.png")
bpy.ops.render.render(write_still=True)
