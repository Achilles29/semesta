"""Keep an untouched, editable Blender Studio CC0 source next to V7 trials.

Requires SEMESTA_BASE_MESH_BUNDLE pointing to the official v1.4.1 bundle.
"""

import os
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
bundle = Path(os.environ["SEMESTA_BASE_MESH_BUNDLE"])
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(str(bundle)) as (source, target):
    target.objects = [name for name in source.objects if name in {
        "GEO-body_male_stylized",
        "GEO-body_male_stylized.eye.L",
        "GEO-body_male_stylized.eye.R",
    }]
body = bpy.data.objects["GEO-body_male_stylized"]
bpy.context.scene.collection.objects.link(body)
body.location.x = 0
for name in ("GEO-body_male_stylized.eye.L", "GEO-body_male_stylized.eye.R"):
    bpy.context.scene.collection.objects.link(bpy.data.objects[name])
for modifier in list(body.modifiers):
    if modifier.type == "MASK":
        body.modifiers.remove(modifier)
body.name = "CC0_StylizedMale_Original_Proportions"
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / "cc0-base-original.blend"))
print("Saved untouched CC0 base mesh", len(body.data.vertices), "vertices")
